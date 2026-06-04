export const PIPELINE_EVENTS = {
	STARTED: 'speakpaste:pipeline-started',
	COMPLETE: 'speakpaste:pipeline-complete',
	ERROR: 'speakpaste:pipeline-error',
} as const;

export type PipelineEventName =
	(typeof PIPELINE_EVENTS)[keyof typeof PIPELINE_EVENTS];
