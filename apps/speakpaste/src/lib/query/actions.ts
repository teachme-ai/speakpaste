import { nanoid } from 'nanoid/non-secure';
import { defineErrors } from 'wellcrafted/error';
import { Ok } from 'wellcrafted/result';
import {
	COMMAND_KEYS,
	PIPELINE_EVENTS,
	TRIGGER_COOLDOWN_MS,
} from '$lib/constants/app';
import { rpc } from '$lib/query';
import { defineMutation } from '$lib/query/client';
import { WhisperingErr } from '$lib/result';
import { services } from '$lib/services';
import { FsServiceLive } from '$lib/services/desktop/fs';
import { deviceConfig } from '$lib/state/device-config.svelte';
import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
import { recordings } from '$lib/state/recordings.svelte';
import { settings } from '$lib/state/settings.svelte';
import { transformations } from '$lib/state/transformations.svelte';
import { vadRecorder } from '$lib/state/vad-recorder.svelte';
import * as transformClipboardWindow from '$routes/transform-clipboard/transformClipboardWindow.tauri';

const ImportError = defineErrors({
	NoImportableFiles: () => ({
		message: 'No valid audio or video files found',
	}),
});

import { delivery } from './delivery';
import { notify } from './notify';
import { recorder } from './recorder';
import {
	clearManualRecordingStartTime,
	consumeManualRecordingDuration,
	enterTriggerCooldown,
	finishRecordingOperation,
	isInTriggerCooldown,
	isPipelineActive,
	markManualRecordingStarted,
	markPipelineFinished,
	markPipelineStarted,
	TRANSCRIPTION_TIMEOUT_MS,
	tryBeginRecordingOperation,
	withTimeout,
} from './recording-runtime-guards';
import { sound } from './sound';
import { text } from './text';
import { transcribeBlob } from './transcription';
import { transformer } from './transformer';

/**
 * Application actions. These are mutations at the UI boundary that can be invoked
 * from anywhere: command registry, components, state modules, etc.
 *
 * They always return Ok() because there's nowhere left to propagate errors—errors flow
 * sideways through notify.error() instead of up the call stack. Actions are
 * the end of the operation chain.
 */

function isDesktopApp() {
	return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

// Internal mutations for manual recording
const startManualRecording = defineMutation({
	mutationKey: COMMAND_KEYS.START_MANUAL_RECORDING,
	mutationFn: async () => {
		if (!tryBeginRecordingOperation()) {
			console.info('Recording operation already in progress, ignoring start');
			return Ok(undefined);
		}
		void dictationRuntime.setStatus('Recording', 'Preparing microphone');

		settings.set('recording.mode', 'manual');
		if (isDesktopApp() && deviceConfig.get('recording.method') !== 'cpal') {
			deviceConfig.set('recording.method', 'cpal');
		}

		const toastId = nanoid();
		notify.loading({
			id: toastId,
			title: '🎙️ Preparing to record...',
			description: 'Setting up your recording environment...',
		});

		const { data: deviceAcquisitionOutcome, error: startRecordingError } =
			await recorder.startRecording({ toastId });

		finishRecordingOperation();

		if (startRecordingError) {
			void dictationRuntime.setStatus('Error', startRecordingError.message);
			notify.error({ id: toastId, ...startRecordingError });
			return Ok(undefined);
		}

		switch (deviceAcquisitionOutcome.outcome) {
			case 'success': {
				notify.success({
					id: toastId,
					title: '🎙️ SpeakPaste is recording...',
					description: 'Speak now and stop recording when done',
				});
				break;
			}
			case 'fallback': {
				const method = deviceConfig.get('recording.method');
				deviceConfig.set(
					`recording.${method}.deviceId`,
					deviceAcquisitionOutcome.deviceId,
				);
				switch (deviceAcquisitionOutcome.reason) {
					case 'no-device-selected': {
						notify.info({
							id: toastId,
							title: '🎙️ Switched to available microphone',
							description:
								'No microphone was selected, so we automatically connected to an available one. You can update your selection in settings.',
							action: {
								type: 'link',
								label: 'Open Settings',
								href: '/settings/recording',
							},
						});
						break;
					}
					case 'preferred-device-unavailable': {
						notify.info({
							id: toastId,
							title: '🎙️ Switched to different microphone',
							description:
								"Your previously selected microphone wasn't found, so we automatically connected to an available one.",
							action: {
								type: 'link',
								label: 'Open Settings',
								href: '/settings/recording',
							},
						});
						break;
					}
				}
			}
		}
		// Track start time for duration calculation
		markManualRecordingStarted();
		void dictationRuntime.setStatus('Recording', 'Listening');
		console.info('Recording started');
		return Ok(undefined);
	},
});

const stopManualRecording = defineMutation({
	mutationKey: COMMAND_KEYS.STOP_MANUAL_RECORDING,
	mutationFn: async () => {
		if (!tryBeginRecordingOperation()) {
			console.info('Recording operation already in progress, ignoring stop');
			return Ok(undefined);
		}
		void dictationRuntime.setStatus('Transcribing', 'Finalizing recording');

		const toastId = nanoid();
		notify.loading({
			id: toastId,
			title: '⏸️ Stopping recording...',
			description: 'Finalizing your audio capture...',
		});

		const { data, error: stopRecordingError } = await recorder.stopRecording({
			toastId,
		});

		// Release mutex after the actual stop operation completes
		// This allows new recordings to start while pipeline runs
		finishRecordingOperation();

		if (stopRecordingError) {
			void dictationRuntime.setStatus('Error', stopRecordingError.message);
			notify.error({ id: toastId, ...stopRecordingError });
			return Ok(undefined);
		}

		const { blob, recordingId } = data;

		notify.success({
			id: toastId,
			title: '🎙️ Recording stopped',
			description: 'Your recording has been saved',
		});
		console.info('Recording stopped');

		// Log manual recording completion
		const duration = consumeManualRecordingDuration();
		rpc.analytics.logEvent({
			type: 'manual_recording_completed',
			blob_size: blob.size,
			duration,
		});

		// Pipeline runs after mutex is released - new recordings can start
		// while transcription/transformation are in progress
		await processRecordingPipeline({
			blob,
			recordingId,
			source: 'manual',
			toastId,
			completionTitle: '✨ Recording Complete!',
			completionDescription: 'Recording saved and session closed successfully',
		});

		return Ok(undefined);
	},
});

// Internal mutations for VAD recording
const startVadRecording = defineMutation({
	mutationKey: COMMAND_KEYS.START_VAD_RECORDING,
	mutationFn: async () => {
		if (isDesktopApp()) {
			settings.set('recording.mode', 'manual');
			notify.warning({
				title: 'Hands-free mode is paused',
				description:
					'Use Press to Speak for now. Hands-free capture needs an explicit arming design before it can paste safely.',
			});
			return Ok(undefined);
		}

		settings.set('recording.mode', 'vad');

		const toastId = nanoid();
		console.info('Starting voice activated capture');
		notify.loading({
			id: toastId,
			title: '🎙️ Starting voice activated capture',
			description: 'Your voice activated capture is starting...',
		});
		const { data: deviceAcquisitionOutcome, error: startActiveListeningError } =
			await vadRecorder.startActiveListening({
				onSpeechStart: () => {
					notify.success({
						title: '🎙️ Speech started',
						description: 'Recording started. Speak clearly and loudly.',
					});
				},
				onSpeechEnd: async (blob) => {
					const toastId = nanoid();
					notify.success({
						id: toastId,
						title: '🎙️ Voice activated speech captured',
						description: 'Your voice activated speech has been captured.',
					});
					console.info('Voice activated speech captured');
					sound.playSoundIfEnabled('vad-capture');

					// Log VAD recording completion
					rpc.analytics.logEvent({
						type: 'vad_recording_completed',
						blob_size: blob.size,
						// VAD doesn't track duration by default
					});

					await processRecordingPipeline({
						blob,
						source: 'vad',
						toastId,
						completionTitle: '✨ Voice activated capture complete!',
						completionDescription:
							'Voice activated capture complete! Ready for another take',
					});
				},
			});
		if (startActiveListeningError) {
			notify.error({ id: toastId, ...startActiveListeningError });
			return Ok(undefined);
		}

		// Handle device acquisition outcome
		switch (deviceAcquisitionOutcome.outcome) {
			case 'success': {
				notify.success({
					id: toastId,
					title: '🎙️ Voice activated capture started',
					description: 'Your voice activated capture has been started.',
				});
				break;
			}
			case 'fallback': {
				deviceConfig.set(
					'recording.navigator.deviceId',
					deviceAcquisitionOutcome.deviceId,
				);
				switch (deviceAcquisitionOutcome.reason) {
					case 'no-device-selected': {
						notify.info({
							id: toastId,
							title: '🎙️ VAD started with available microphone',
							description:
								'No microphone was selected for VAD, so we automatically connected to an available one. You can update your selection in settings.',
							action: {
								type: 'link',
								label: 'Open Settings',
								href: '/settings/recording',
							},
						});
						break;
					}
					case 'preferred-device-unavailable': {
						notify.info({
							id: toastId,
							title: '🎙️ VAD switched to different microphone',
							description:
								"Your previously selected VAD microphone wasn't found, so we automatically connected to an available one.",
							action: {
								type: 'link',
								label: 'Open Settings',
								href: '/settings/recording',
							},
						});
						break;
					}
				}
			}
		}

		sound.playSoundIfEnabled('vad-start');
		return Ok(undefined);
	},
});

const stopVadRecording = defineMutation({
	mutationKey: COMMAND_KEYS.STOP_VAD_RECORDING,
	mutationFn: async () => {
		const toastId = nanoid();
		console.info('Stopping voice activated capture');
		notify.loading({
			id: toastId,
			title: '⏸️ Stopping voice activated capture...',
			description: 'Finalizing your voice activated capture...',
		});
		const { error: stopVadError } = await vadRecorder.stopActiveListening();
		if (stopVadError) {
			notify.error({ id: toastId, ...stopVadError });
			return Ok(undefined);
		}
		notify.success({
			id: toastId,
			title: '🎙️ Voice activated capture stopped',
			description: 'Your voice activated capture has been stopped.',
		});
		sound.playSoundIfEnabled('vad-stop');
		return Ok(undefined);
	},
});

export const actions = {
	startManualRecording,
	stopManualRecording,
	startVadRecording,
	stopVadRecording,

	processNativeRecording: defineMutation({
		mutationKey: COMMAND_KEYS.PROCESS_NATIVE_RECORDING,
		mutationFn: async ({
			recordingId,
			filePath,
		}: {
			recordingId: string;
			filePath: string;
		}) => {
			const toastId = nanoid();
			const { data: blob, error } = await FsServiceLive.pathToBlob(filePath);
			if (error) {
				notify.error({
					id: toastId,
					title: 'Failed to read background recording',
					description: error.message,
					action: { type: 'more-details', error },
				});
				return Ok(undefined);
			}

			await processRecordingPipeline({
				blob,
				recordingId,
				source: 'native',
				toastId,
				completionTitle: 'Background recording complete',
				completionDescription: 'Recording captured by the native runtime',
			});
			return Ok(undefined);
		},
	}),

	// Toggle manual recording
	toggleManualRecording: defineMutation({
		mutationKey: COMMAND_KEYS.TOGGLE_MANUAL_RECORDING,
		mutationFn: async () => {
			// Block during cooldown (post-paste window)
			if (isInTriggerCooldown()) {
				console.info('[Trigger] ignored — in cooldown');
				return Ok(undefined);
			}
			// Block during transcription/delivery pipeline
			if (isPipelineActive()) {
				console.info('[Trigger] ignored — pipeline running');
				return Ok(undefined);
			}
			const { data: recorderState, error: getRecorderStateError } =
				await recorder.getRecorderState.fetch();
			if (getRecorderStateError) {
				notify.error(getRecorderStateError);
				return Ok(undefined);
			}
			if (recorderState === 'RECORDING') {
				return await stopManualRecording(undefined);
			}
			return await startManualRecording(undefined);
		},
	}),

	// Cancel manual recording
	cancelManualRecording: defineMutation({
		mutationKey: COMMAND_KEYS.CANCEL_MANUAL_RECORDING,
		mutationFn: async () => {
			if (!tryBeginRecordingOperation()) {
				console.info(
					'Recording operation already in progress, ignoring cancel',
				);
				return Ok(undefined);
			}

			const toastId = nanoid();
			notify.loading({
				id: toastId,
				title: '⏸️ Canceling recording...',
				description: 'Cleaning up recording session...',
			});
			const { data: cancelRecordingResult, error: cancelRecordingError } =
				await recorder.cancelRecording({ toastId });

			// Release mutex after the actual cancel operation completes
			finishRecordingOperation();

			if (cancelRecordingError) {
				void dictationRuntime.setStatus('Error', cancelRecordingError.message);
				notify.error({ id: toastId, ...cancelRecordingError });
				return Ok(undefined);
			}
			switch (cancelRecordingResult.status) {
				case 'no-recording': {
					notify.info({
						id: toastId,
						title: 'No active recording',
						description: 'There is no recording in progress to cancel.',
					});
					break;
				}
				case 'cancelled': {
					// Session cleanup is now handled internally by the recorder service
					// Reset start time if recording was cancelled
					clearManualRecordingStartTime();
					notify.success({
						id: toastId,
						title: '✅ All Done!',
						description: 'Recording cancelled successfully',
					});
					void dictationRuntime.setStatus('Idle', 'Recording cancelled');
					sound.playSoundIfEnabled('manual-cancel');
					console.info('Recording cancelled');
					break;
				}
			}
			return Ok(undefined);
		},
	}),

	// Toggle VAD recording
	toggleVadRecording: defineMutation({
		mutationKey: COMMAND_KEYS.TOGGLE_VAD_RECORDING,
		mutationFn: async () => {
			if (
				vadRecorder.state === 'LISTENING' ||
				vadRecorder.state === 'SPEECH_DETECTED'
			) {
				return await stopVadRecording(undefined);
			}
			return await startVadRecording(undefined);
		},
	}),

	// Upload recordings (supports multiple files)
	uploadRecordings: defineMutation({
		mutationKey: COMMAND_KEYS.UPLOAD_RECORDINGS,
		mutationFn: async ({ files }: { files: File[] }) => {
			settings.set('recording.mode', 'upload');
			// Partition files into valid and invalid in a single pass
			const { valid: validFiles, invalid: invalidFiles } = files.reduce<{
				valid: File[];
				invalid: File[];
			}>(
				(acc, file) => {
					const isValid =
						file.type.startsWith('audio/') || file.type.startsWith('video/');
					acc[isValid ? 'valid' : 'invalid'].push(file);
					return acc;
				},
				{ valid: [], invalid: [] },
			);

			if (validFiles.length === 0) {
				return ImportError.NoImportableFiles();
			}

			if (invalidFiles.length > 0) {
				notify.warning({
					title: '⚠️ Some files were skipped',
					description: `${invalidFiles.length} file(s) were not audio or video files`,
				});
			}

			// Process all valid files in parallel
			await Promise.all(
				validFiles.map(async (file) => {
					const arrayBuffer = await file.arrayBuffer();
					const audioBlob = new Blob([arrayBuffer], { type: file.type });

					// Log file upload event
					rpc.analytics.logEvent({
						type: 'file_uploaded',
						blob_size: audioBlob.size,
					});

					// Each file gets its own toast notification
					const toastId = nanoid();
					await processRecordingPipeline({
						blob: audioBlob,
						source: 'upload',
						toastId,
						completionTitle: '📁 File uploaded successfully!',
						completionDescription: file.name,
					});
				}),
			);

			return Ok({
				processedCount: validFiles.length,
				skippedCount: invalidFiles.length,
			});
		},
	}),

	// Open transformation picker to select a transformation
	openTransformationPicker: defineMutation({
		mutationKey: COMMAND_KEYS.OPEN_TRANSFORMATION_PICKER,
		mutationFn: async () => {
			await transformClipboardWindow.toggle();
			return Ok(undefined);
		},
	}),

	// Run selected transformation on clipboard
	runTransformationOnClipboard: defineMutation({
		mutationKey: COMMAND_KEYS.RUN_TRANSFORMATION_ON_CLIPBOARD,
		mutationFn: async () => {
			// Get selected transformation from settings
			const transformationId = settings.get('transformation.selectedId');

			if (!transformationId) {
				return WhisperingErr({
					title: '⚠️ No text rule selected',
					description: 'Select a text rule first if you want clipboard shaping.',
					action: {
						type: 'link',
						label: 'Manage text rules',
						href: '/transformations',
					},
				});
			}

			// Get the transformation from workspace state
			const transformation = transformations.get(transformationId);

			if (!transformation) {
				settings.set('transformation.selectedId', null);
				return WhisperingErr({
					title: '⚠️ Text rule not found',
					description:
						'The selected text rule no longer exists. Select a different one.',
					action: {
						type: 'link',
						label: 'Manage text rules',
						href: '/transformations',
					},
				});
			}

			// Read clipboard text
			const { data: clipboardText, error: readClipboardError } =
				await text.readFromClipboard.fetch();

			if (readClipboardError) {
				return WhisperingErr({
					title: '❌ Failed to read clipboard',
					serviceError: readClipboardError,
				});
			}

			if (!clipboardText?.trim()) {
				return WhisperingErr({
					title: '📋 Empty clipboard',
					description: 'Please copy some text before running a transformation.',
				});
			}

			// Run transformation
			const toastId = nanoid();
			notify.loading({
				id: toastId,
				title: '🔄 Running text rule...',
				description: 'Applying the selected text rule to your clipboard text...',
			});

			const { data: output, error: transformError } =
				await transformer.transformInput({
					input: clipboardText,
					transformation,
				});

			if (transformError) {
				notify.error({ id: toastId, ...transformError });
				return Ok(undefined);
			}

			sound.playSoundIfEnabled('transformationComplete');

			await delivery.deliverTransformationResult({
				text: output,
				toastId,
			});

			return Ok(undefined);
		},
		onError: (error) => {
			notify.error(error);
		},
	}),
};

type ProcessRecordingPipelineInput = {
	blob: Blob;
	recordingId?: string;
	source: PipelineSource;
	toastId: string;
	completionTitle: string;
	completionDescription: string;
};

type PipelineSource = 'manual' | 'native' | 'vad' | 'upload';

type PipelineRecording = {
	id: string;
	title: string;
	recordedAt: string;
	updatedAt: string;
	transcript: string;
	duration: undefined;
	transcriptionStatus: 'UNPROCESSED';
};

type PipelineStageEvent = Parameters<typeof rpc.analytics.logEvent>[0] & {
	type: 'pipeline_stage';
};

function logPipelineStage(event: PipelineStageEvent) {
	console.info(
		`[Diagnostics] [Pipeline] ${event.stage} source=${event.source} recording=${event.recording_id}`,
	);
	rpc.analytics.logEvent(event);
}

function createRecordingRecord(recordingId?: string): PipelineRecording {
	const now = new Date().toISOString();
	return {
		id: recordingId ?? nanoid(),
		title: '',
		recordedAt: now,
		updatedAt: now,
		transcript: '',
		duration: undefined,
		transcriptionStatus: 'UNPROCESSED',
	};
}

async function runSelectedTransformationStage({
	recordingId,
	source,
}: {
	recordingId: string;
	source: PipelineSource;
}) {
	const transformationId = settings.get('transformation.selectedId');

	if (!transformationId) {
		logPipelineStage({
			type: 'pipeline_stage',
			stage: 'transformation_skipped',
			recording_id: recordingId,
			source,
		});
		return;
	}
	const transformation = transformations.get(transformationId);

	if (!transformation) {
		settings.set('transformation.selectedId', null);
		notify.warning({
			title: '⚠️ No matching transformation found',
			description:
				'No matching transformation found. Please select a different transformation.',
			action: {
				type: 'link',
				label: 'Select a different transformation',
				href: '/transformations',
			},
		});
		logPipelineStage({
			type: 'pipeline_stage',
			stage: 'transformation_failed',
			recording_id: recordingId,
			source,
			error_title: 'Selected transformation not found',
		});
		return;
	}

	const transformationStart = performance.now();
	logPipelineStage({
		type: 'pipeline_stage',
		stage: 'transformation_started',
		recording_id: recordingId,
		source,
	});
	const transformToastId = nanoid();
	notify.loading({
		id: transformToastId,
		title: '🔄 Running transformation...',
		description:
			'Applying your selected transformation to the transcribed text...',
	});
	const { data: transformationRun, error: transformError } =
		await transformer.transformRecording({
			recordingId,
			transformation,
		});
	if (transformError) {
		notify.error({ id: transformToastId, ...transformError });
		logPipelineStage({
			type: 'pipeline_stage',
			stage: 'transformation_failed',
			recording_id: recordingId,
			source,
			duration_ms: Math.round(performance.now() - transformationStart),
			error_title: transformError.title,
			error_description: transformError.description,
		});
		return;
	}

	if (transformationRun.status === 'failed') {
		notify.error({
			id: transformToastId,
			title: '⚠️ Transformation error',
			description: transformationRun.error,
			action: { type: 'more-details', error: transformationRun.error },
		});
		logPipelineStage({
			type: 'pipeline_stage',
			stage: 'transformation_failed',
			recording_id: recordingId,
			source,
			duration_ms: Math.round(performance.now() - transformationStart),
			error_title: 'Transformation error',
			error_description: transformationRun.error,
		});
		return;
	}

	sound.playSoundIfEnabled('transformationComplete');

	await delivery.deliverTransformationResult({
		text: transformationRun.output,
		toastId: transformToastId,
	});
	logPipelineStage({
		type: 'pipeline_stage',
		stage: 'transformation_completed',
		recording_id: recordingId,
		source,
		duration_ms: Math.round(performance.now() - transformationStart),
		chars: transformationRun.output.length,
	});
}

function enterPostPipelineCooldown({
	recordingId,
	source,
	pipelineStart,
	chars,
}: {
	recordingId: string;
	source: PipelineSource;
	pipelineStart: number;
	chars: number;
}) {
	markPipelineFinished();
	void dictationRuntime.setStatus('Cooldown', 'Ready shortly');
	enterTriggerCooldown();
	console.info('[Pipeline] complete — cooldown started');
	window.setTimeout(() => {
		void dictationRuntime.setStatus('Idle', 'Ready');
	}, TRIGGER_COOLDOWN_MS);
	window.dispatchEvent(new CustomEvent(PIPELINE_EVENTS.COMPLETE));
	logPipelineStage({
		type: 'pipeline_stage',
		stage: 'pipeline_completed',
		recording_id: recordingId,
		source,
		duration_ms: Math.round(performance.now() - pipelineStart),
		chars,
	});
}

async function finalizeRecordingSuccess({
	recording,
	saveAudioPromise,
	source,
	toastId,
	completionTitle,
	completionDescription,
	transcribedText,
}: {
	recording: PipelineRecording;
	saveAudioPromise: ReturnType<typeof services.blobs.audio.save>;
	source: PipelineSource;
	toastId: string;
	completionTitle: string;
	completionDescription: string;
	transcribedText: string;
}) {
	const audioSaveStart = performance.now();
	const { error: saveAudioError } = await saveAudioPromise;
	if (saveAudioError) {
		notify.warning({
			id: toastId,
			title: '\u26A0\uFE0F Audio not saved',
			description: 'Transcription delivered but audio blob was not saved.',
			action: { type: 'more-details', error: saveAudioError },
		});
		logPipelineStage({
			type: 'pipeline_stage',
			stage: 'audio_save_failed',
			recording_id: recording.id,
			source,
			duration_ms: Math.round(performance.now() - audioSaveStart),
			error_title: saveAudioError.title,
			error_description: saveAudioError.description,
		});
	} else {
		logPipelineStage({
			type: 'pipeline_stage',
			stage: 'audio_save_completed',
			recording_id: recording.id,
			source,
			duration_ms: Math.round(performance.now() - audioSaveStart),
		});
	}

	notify.success({
		id: toastId,
		title: completionTitle,
		description: completionDescription,
	});

	recordings.update(recording.id, {
		transcript: transcribedText,
		transcriptionStatus: 'DONE',
	});
}

async function deliverTranscriptStage({
	recordingId,
	source,
	transcribedText,
	transcribeToastId,
	pipelineStart,
}: {
	recordingId: string;
	source: PipelineSource;
	transcribedText: string;
	transcribeToastId: string;
	pipelineStart: number;
}) {
	sound.playSoundIfEnabled('transcriptionComplete');
	void dictationRuntime.setStatus('Pasting', 'Writing at cursor');
	logPipelineStage({
		type: 'pipeline_stage',
		stage: 'delivery_started',
		recording_id: recordingId,
		source,
		chars: transcribedText.length,
	});
	const deliveryStart = performance.now();
	await delivery.deliverTranscriptionResult({
		text: transcribedText,
		toastId: transcribeToastId,
	});
	const deliveryDuration = performance.now() - deliveryStart;
	const pipelineDuration = performance.now() - pipelineStart;
	console.info(
		`[Telemetry] [Pipeline] Delivery stage took ${deliveryDuration.toFixed(2)}ms`,
	);
	console.info(
		`[Telemetry] [Pipeline] End-to-end processRecordingPipeline took ${pipelineDuration.toFixed(2)}ms for ${transcribedText.length} chars`,
	);
	rpc.analytics.logEvent({
		type: 'dictation_timing',
		stage: 'delivery',
		duration_ms: Math.round(deliveryDuration),
		chars: transcribedText.length,
	});
	rpc.analytics.logEvent({
		type: 'dictation_timing',
		stage: 'pipeline',
		duration_ms: Math.round(pipelineDuration),
		chars: transcribedText.length,
	});
	logPipelineStage({
		type: 'pipeline_stage',
		stage: 'delivery_completed',
		recording_id: recordingId,
		source,
		duration_ms: Math.round(deliveryDuration),
		chars: transcribedText.length,
	});
}

function prepareTranscriptionStage({
	recording,
	blob,
	source,
}: {
	recording: PipelineRecording;
	blob: Blob;
	source: PipelineSource;
}) {
	void dictationRuntime.setStatus('Transcribing', 'Transcribing locally');
	const transcribeToastId = nanoid();
	notify.loading({
		id: transcribeToastId,
		title: '📋 Transcribing...',
		description: 'Your recording is being transcribed...',
	});

	recordings.set(recording);
	recordings.update(recording.id, { transcriptionStatus: 'TRANSCRIBING' });
	logPipelineStage({
		type: 'pipeline_stage',
		stage: 'recording_created',
		recording_id: recording.id,
		source,
		blob_size: blob.size,
	});
	logPipelineStage({
		type: 'pipeline_stage',
		stage: 'audio_save_started',
		recording_id: recording.id,
		source,
		blob_size: blob.size,
	});
	const saveAudioPromise = services.blobs.audio.save(recording.id, blob);
	logPipelineStage({
		type: 'pipeline_stage',
		stage: 'transcription_started',
		recording_id: recording.id,
		source,
		blob_size: blob.size,
	});
	const transcribePromise = transcribeBlob(blob);

	markPipelineStarted();
	console.info('[Pipeline] started — transcription in progress');
	window.dispatchEvent(new CustomEvent(PIPELINE_EVENTS.STARTED));

	return { saveAudioPromise, transcribePromise, transcribeToastId };
}

async function runTranscriptionStage({
	recording,
	source,
	transcribePromise,
	transcribeToastId,
}: {
	recording: PipelineRecording;
	source: PipelineSource;
	transcribePromise: ReturnType<typeof transcribeBlob>;
	transcribeToastId: string;
}) {
	const transcriptionStart = performance.now();
	const { data: transcribedText, error: transcribeError } =
		await withTimeout(
			transcribePromise,
			TRANSCRIPTION_TIMEOUT_MS,
			() =>
				WhisperingErr({
					title: 'Transcription timed out',
					description:
						'SpeakPaste could not finish local transcription in time. You can try again with a shorter recording.',
				}),
		);
	const transcriptionDuration = performance.now() - transcriptionStart;
	console.info(
		`[Telemetry] [Pipeline] Transcription stage took ${transcriptionDuration.toFixed(2)}ms`,
	);
	rpc.analytics.logEvent({
		type: 'dictation_timing',
		stage: 'transcription',
		duration_ms: Math.round(transcriptionDuration),
		chars: transcribedText?.length,
	});

	if (!transcribeError) {
		logPipelineStage({
			type: 'pipeline_stage',
			stage: 'transcription_completed',
			recording_id: recording.id,
			source,
			duration_ms: Math.round(transcriptionDuration),
			chars: transcribedText.length,
		});
		return transcribedText;
	}

	markPipelineFinished();
	void dictationRuntime.setStatus('Error', 'Transcription failed');
	window.dispatchEvent(new CustomEvent(PIPELINE_EVENTS.ERROR));
	recordings.update(recording.id, { transcriptionStatus: 'FAILED' });
	if (transcribeError.name === 'WhisperingError') {
		notify.error({ id: transcribeToastId, ...transcribeError });
		logPipelineStage({
			type: 'pipeline_stage',
			stage: 'transcription_failed',
			recording_id: recording.id,
			source,
			duration_ms: Math.round(transcriptionDuration),
			error_title: transcribeError.title,
			error_description: transcribeError.description,
		});
		return null;
	}
	notify.error({
		id: transcribeToastId,
		title: '\u274C Failed to transcribe recording',
		description: 'Your recording could not be transcribed.',
		action: { type: 'more-details', error: transcribeError },
	});
	logPipelineStage({
		type: 'pipeline_stage',
		stage: 'transcription_failed',
		recording_id: recording.id,
		source,
		duration_ms: Math.round(transcriptionDuration),
		error_title: 'Failed to transcribe recording',
		error_description:
			transcribeError instanceof Error ? transcribeError.message : undefined,
	});
	return null;
}

/**
 * Processes a recording through the full pipeline: save → transcribe → transform
 *
 * This function handles the complete flow from recording creation through transcription:
 * 1. Creates recording metadata and saves to database
 * 2. Handles database save errors
 * 3. Shows completion toast
 * 4. Executes transcription flow
 * 5. Applies transformation if one is selected
 *
 * @param recordingId - Optional recording ID. When provided (e.g., from CPAL recorder),
 * the ID was generated earlier in the pipeline and is passed through for consistency.
 * When omitted (e.g., VAD recording, file uploads), a new ID is generated here using nanoid().
 * This flexibility allows different recording methods to control ID generation at the
 * appropriate point in their respective pipelines.
 */
async function processRecordingPipeline({
	blob,
	recordingId,
	source,
	toastId,
	completionTitle,
	completionDescription,
}: ProcessRecordingPipelineInput) {
	const pipelineStart = performance.now();
	const recording = createRecordingRecord(recordingId);
	const { saveAudioPromise, transcribePromise, transcribeToastId } =
		prepareTranscriptionStage({ recording, blob, source });
	const transcribedText = await runTranscriptionStage({
		recording,
		source,
		transcribePromise,
		transcribeToastId,
	});
	if (!transcribedText) return;

	await deliverTranscriptStage({
		recordingId: recording.id,
		source,
		transcribedText,
		transcribeToastId,
		pipelineStart,
	});

	enterPostPipelineCooldown({
		recordingId: recording.id,
		source,
		pipelineStart,
		chars: transcribedText.length,
	});

	await finalizeRecordingSuccess({
		recording,
		saveAudioPromise,
		source,
		toastId,
		completionTitle,
		completionDescription,
		transcribedText,
	});

	await runSelectedTransformationStage({ recordingId: recording.id, source });
}
