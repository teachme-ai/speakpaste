/** Versioned boundary shared by the UI/query layer and native pipeline. */
export const DICTATION_CONTRACT_VERSION = 1 as const;

export type DictationAction = 'dictate' | 'clean_ramble' | 'list' | 'prompt' | 'edit_selection' | 'create_prompt';
export type DictationState = 'idle' | 'recording' | 'finishing_speech' | 'transcribing' | 'shaping' | 'awaiting_review' | 'delivering' | 'completed' | 'cancelled' | 'error';
export type TransformStatus = 'success' | 'unchanged' | 'deterministic_fallback' | 'unsupported' | 'cancelled' | 'timeout' | 'rejected' | 'failed';
export type DeliveryStatus = 'inserted_verified' | 'paste_attempted_unverified' | 'copied_only' | 'target_changed' | 'cancelled_before_commit' | 'failed';

export type DictationSessionRequest = {
	contractVersion: typeof DICTATION_CONTRACT_VERSION;
	sessionId: string;
	trigger: 'fn' | 'global_shortcut' | 'ui' | 'vad';
	action: DictationAction;
	voiceOverrideEnabled: boolean;
	configRevision: string;
};

export type TransformRequest = {
	contractVersion: typeof DICTATION_CONTRACT_VERSION;
	sessionId: string;
	action: DictationAction;
	sourceText: string;
	instruction?: string;
	selectedText?: string;
	language?: string;
	outputScript?: string;
};

export type TransformOutcome = {
	contractVersion: typeof DICTATION_CONTRACT_VERSION;
	sessionId: string;
	status: TransformStatus;
	text: string;
	provider: 'raw' | 'deterministic' | 'foundation_models';
	reason?: string;
};

export type DeliveryOutcome = {
	contractVersion: typeof DICTATION_CONTRACT_VERSION;
	sessionId: string;
	status: DeliveryStatus;
	textLength: number;
	reason?: string;
};
