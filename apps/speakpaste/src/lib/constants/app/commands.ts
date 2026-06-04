export const COMMAND_KEYS = {
	START_MANUAL_RECORDING: ['commands', 'startManualRecording'],
	STOP_MANUAL_RECORDING: ['commands', 'stopManualRecording'],
	START_VAD_RECORDING: ['commands', 'startVadRecording'],
	STOP_VAD_RECORDING: ['commands', 'stopVadRecording'],
	PROCESS_NATIVE_RECORDING: ['commands', 'processNativeRecording'],
	TOGGLE_MANUAL_RECORDING: ['commands', 'toggleManualRecording'],
	CANCEL_MANUAL_RECORDING: ['commands', 'cancelManualRecording'],
	TOGGLE_VAD_RECORDING: ['commands', 'toggleVadRecording'],
	UPLOAD_RECORDINGS: ['recordings', 'uploadRecordings'],
	OPEN_TRANSFORMATION_PICKER: ['commands', 'openTransformationPicker'],
	RUN_TRANSFORMATION_ON_CLIPBOARD: [
		'commands',
		'runTransformationOnClipboard',
	],
} as const;

