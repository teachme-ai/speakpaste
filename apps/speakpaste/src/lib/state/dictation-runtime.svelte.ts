import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export type DictationRuntimeStatus =
	| 'Idle'
	| 'Recording'
	| 'Transcribing'
	| 'Pasting'
	| 'Cooldown'
	| 'Error';

export type DictationRuntimeSnapshot = {
	status: DictationRuntimeStatus;
	message?: string | null;
	updatedAtMs: number;
};

const fallbackSnapshot: DictationRuntimeSnapshot = {
	status: 'Idle',
	message: null,
	updatedAtMs: Date.now(),
};

let snapshot = $state<DictationRuntimeSnapshot>(fallbackSnapshot);
let unlisten: UnlistenFn | null = null;

export const dictationRuntime = {
	get snapshot() {
		return snapshot;
	},

	async init() {
		if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) {
			return () => {};
		}

		snapshot = await invoke<DictationRuntimeSnapshot>(
			'get_dictation_runtime_state',
		).catch(() => fallbackSnapshot);

		unlisten = await listen<DictationRuntimeSnapshot>(
			'dictation:state-changed',
			(event) => {
				snapshot = event.payload;
			},
		);

		return () => {
			unlisten?.();
			unlisten = null;
		};
	},

	async setStatus(status: DictationRuntimeStatus, message?: string) {
		if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return;

		const next = await invoke<DictationRuntimeSnapshot>(
			'set_dictation_runtime_state',
			{
				status,
				message: message ?? null,
			},
		).catch(() => null);

		if (next) snapshot = next;
	},
};
