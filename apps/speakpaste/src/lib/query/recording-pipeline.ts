import { nanoid } from 'nanoid/non-secure';
import { PIPELINE_EVENTS, TRIGGER_COOLDOWN_MS } from '$lib/constants/app';
import { WhisperingErr } from '$lib/result';
import { services } from '$lib/services';
import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
import { recordings } from '$lib/state/recordings.svelte';
import { settings } from '$lib/state/settings.svelte';
import { transformations } from '$lib/state/transformations.svelte';
import { analytics } from './analytics';
import { delivery } from './delivery';
import { notify } from './notify';
import {
	enterTriggerCooldown,
	markPipelineFinished,
	markPipelineStarted,
	TRANSCRIPTION_TIMEOUT_MS,
	withTimeout,
} from './recording-runtime-guards';
import { sound } from './sound';
import { transcribeBlob } from './transcription';
import { transformer } from './transformer';

export type PipelineSource = 'manual' | 'native' | 'vad' | 'upload';

export type ProcessRecordingPipelineInput = {
	blob: Blob;
	recordingId?: string;
	source: PipelineSource;
	toastId: string;
	completionTitle: string;
	completionDescription: string;
};

type PipelineRecording = {
	id: string;
	title: string;
	recordedAt: string;
	updatedAt: string;
	transcript: string;
	duration: undefined;
	transcriptionStatus: 'UNPROCESSED';
};

type PipelineStageEvent = Parameters<typeof analytics.logEvent>[0] & {
	type: 'pipeline_stage';
};

function logPipelineStage(event: PipelineStageEvent) {
	console.info(
		`[Diagnostics] [Pipeline] ${event.stage} source=${event.source} recording=${event.recording_id}`,
	);
	analytics.logEvent(event);
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
	analytics.logEvent({
		type: 'dictation_timing',
		stage: 'delivery',
		duration_ms: Math.round(deliveryDuration),
		chars: transcribedText.length,
	});
	analytics.logEvent({
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
	analytics.logEvent({
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

export async function processRecordingPipeline({
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
	if (transcribedText === null) return;

	if (transcribedText === '') {
		console.info('[Pipeline] empty transcription — no speech detected');
		notify.info({
			id: transcribeToastId,
			title: 'No speech detected',
			description: 'SpeakPaste did not detect any words in the audio.',
		});
		markPipelineFinished();
		void dictationRuntime.setStatus('Idle', 'Ready');
		window.dispatchEvent(new CustomEvent(PIPELINE_EVENTS.COMPLETE));
		return;
	}

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
