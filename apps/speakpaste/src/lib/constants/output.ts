export const TRANSCRIPTION_CLIPBOARD_BEHAVIORS = [
	'preserve',
	'replace',
	'ask',
] as const;

export type TranscriptionClipboardBehavior =
	(typeof TRANSCRIPTION_CLIPBOARD_BEHAVIORS)[number];

export const TRANSCRIPTION_CLIPBOARD_BEHAVIOR_OPTIONS = [
	{
		value: 'preserve',
		label: 'Preserve my clipboard',
		description: 'Paste at cursor without replacing what you already copied.',
	},
	{
		value: 'replace',
		label: 'Replace with transcript',
		description: 'Leave the latest transcript on the clipboard after dictation.',
	},
	{
		value: 'ask',
		label: 'Ask when clipboard has content',
		description: 'Keep your clipboard unless you choose to copy the transcript.',
	},
] as const satisfies {
	value: TranscriptionClipboardBehavior;
	label: string;
	description: string;
}[];
