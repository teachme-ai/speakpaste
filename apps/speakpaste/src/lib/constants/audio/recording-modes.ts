/**
 * Recording mode constants and options
 */

export const RECORDING_MODES = [
	'manual',
	'vad',
	'upload',
	// 'live',
	// 'cpal'
] as const;
export type RecordingMode = (typeof RECORDING_MODES)[number];

export const RECORDING_MODE_OPTIONS = [
	{ label: 'Press to Speak', value: 'manual', icon: '🎙️', desktopOnly: false },
	{ label: 'Hands-free', value: 'vad', icon: '🎤', desktopOnly: false },
	{ label: 'Transcribe File', value: 'upload', icon: '📁', desktopOnly: false },
	// { label: 'Live', value: 'live', icon: '🎬', desktopOnly: false },
	// { label: 'CPAL', value: 'cpal', icon: '🔊', desktopOnly: true },
] as const satisfies {
	label: string;
	value: RecordingMode;
	icon: string;
	desktopOnly: boolean;
}[];
