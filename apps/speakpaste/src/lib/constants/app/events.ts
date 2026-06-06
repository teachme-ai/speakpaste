export const PIPELINE_EVENTS = {
	STARTED: 'mynah:pipeline-started',
	COMPLETE: 'mynah:pipeline-complete',
	ERROR: 'mynah:pipeline-error',
} as const;

export type PipelineEventName =
	(typeof PIPELINE_EVENTS)[keyof typeof PIPELINE_EVENTS];
