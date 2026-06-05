import {
	defineErrors,
	extractErrorMessage,
	type InferErrors,
} from 'wellcrafted/error';
import type { Result } from 'wellcrafted/result';
import type { TRANSCRIPTION_SERVICE_IDS } from '$lib/constants/transcription';

export const AnalyticsError = defineErrors({
	LogEventFailed: ({ cause }: { cause: unknown }) => ({
		message: `Failed to log analytics event: ${extractErrorMessage(cause)}`,
		cause,
	}),
});
export type AnalyticsError = InferErrors<typeof AnalyticsError>;

// Use the TranscriptionServiceId type directly
type TranscriptionServiceId = (typeof TRANSCRIPTION_SERVICE_IDS)[number];

// Settings sections that can be logged
type SettingsSection =
	| 'transcription'
	| 'shortcuts'
	| 'audio'
	| 'appearance'
	| 'analytics'
	| 'recording';

/**
 * Discriminated union of all loggable events.
 * Each event has a 'type' field and optional additional properties.
 * No personal data or user-generated content is ever collected.
 */
export type Event =
	// Application lifecycle
	| { type: 'app_started' }
	// Recording completion events - always include blob_size, duration when available
	| { type: 'manual_recording_completed'; blob_size: number; duration?: number }
	| { type: 'vad_recording_completed'; blob_size: number; duration?: number }
	| { type: 'file_uploaded'; blob_size: number }
	// Transcription events
	| { type: 'transcription_requested'; provider: TranscriptionServiceId }
	| {
			type: 'transcription_completed';
			provider: TranscriptionServiceId;
			duration: number;
	  }
	| {
			type: 'transcription_failed';
			provider: TranscriptionServiceId;
			error_title: string;
			error_description?: string;
	  }
	// Compression events
	| {
			type: 'compression_completed';
			provider: TranscriptionServiceId;
			original_size: number;
			compressed_size: number;
			compression_ratio: number;
	  }
	| {
			type: 'compression_failed';
			provider: TranscriptionServiceId;
			error_message: string;
	  }
	| {
			type: 'dictation_timing';
			stage: 'transcription' | 'delivery' | 'pipeline';
			duration_ms: number;
			chars?: number;
	  }
	| {
			type: 'pipeline_stage';
			stage:
				| 'recording_created'
				| 'audio_save_started'
				| 'transcription_started'
				| 'transcription_completed'
				| 'transcription_failed'
				| 'delivery_started'
				| 'delivery_completed'
				| 'audio_save_completed'
				| 'audio_save_failed'
				| 'pipeline_completed'
				| 'pipeline_failed'
				| 'transformation_started'
				| 'transformation_completed'
				| 'transformation_failed'
				| 'transformation_skipped';
			recording_id: string;
			source: 'manual' | 'native' | 'vad' | 'upload';
			duration_ms?: number;
			blob_size?: number;
			chars?: number;
			error_title?: string;
			error_description?: string;
	  }
	| {
			type: 'transcription_cleanup_applied';
			original_chars: number;
			cleaned_chars: number;
			emptied: boolean;
	  }
	// Settings events
	| { type: 'settings_changed'; section: SettingsSection };

/**
 * Analytics service interface that provides utilities for event logging.
 * Both desktop and web implementations must conform to this interface.
 */
export type AnalyticsService = {
	/**
	 * Send an event to the analytics provider.
	 * Events are typed and validated at compile time.
	 */
	logEvent: (event: Event) => Promise<Result<void, AnalyticsError>>;
};
