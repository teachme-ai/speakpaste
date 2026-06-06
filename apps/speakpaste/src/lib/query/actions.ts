import { nanoid } from 'nanoid/non-secure';
import { defineErrors } from 'wellcrafted/error';
import { Ok } from 'wellcrafted/result';
import { COMMAND_KEYS } from '$lib/constants/app';
import { rpc } from '$lib/query';
import { defineMutation } from '$lib/query/client';
import { WhisperingErr } from '$lib/result';
import { FsServiceLive } from '$lib/services/desktop/fs';
import { deviceConfig } from '$lib/state/device-config.svelte';
import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
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
import { processRecordingPipeline } from './recording-pipeline';
import { recorder } from './recorder';
import {
	clearManualRecordingStartTime,
	consumeManualRecordingDuration,
	finishRecordingOperation,
	isInTriggerCooldown,
	isPipelineActive,
	markManualRecordingStarted,
	tryBeginRecordingOperation,
} from './recording-runtime-guards';
import { sound } from './sound';
import { text } from './text';
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
