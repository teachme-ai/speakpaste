/**
 * Local transcription service definitions.
 *
 * Download metadata lives beside each local engine implementation. This file is
 * the schema and label source for active transcription services only.
 */
export const TRANSCRIPTION = {
	whispercpp: {
		label: 'Whisper C++',
		location: 'local',
		models: null,
		capabilities: {
			supportsPrompt: true,
			supportsTemperature: false,
			supportsLanguage: true,
		},
	},
	parakeet: {
		label: 'Parakeet',
		location: 'local',
		models: null,
		capabilities: {
			supportsPrompt: false,
			supportsTemperature: false,
			supportsLanguage: false,
		},
	},
	moonshine: {
		label: 'Moonshine',
		location: 'local',
		models: null,
		capabilities: {
			supportsPrompt: false,
			supportsTemperature: false,
			supportsLanguage: false,
		},
	},
} as const;

export type TranscriptionServiceId = keyof typeof TRANSCRIPTION;

export const TRANSCRIPTION_SERVICE_IDS = Object.keys(
	TRANSCRIPTION,
) as TranscriptionServiceId[];

export const TRANSCRIPTION_SERVICE_OPTIONS = TRANSCRIPTION_SERVICE_IDS.map(
	(id) => ({
		value: id,
		label: TRANSCRIPTION[id].label,
	}),
);

export const TRANSCRIPTION_SERVICE_ID_TO_LABEL = Object.fromEntries(
	TRANSCRIPTION_SERVICE_IDS.map((id) => [id, TRANSCRIPTION[id].label]),
) as Record<TranscriptionServiceId, string>;
