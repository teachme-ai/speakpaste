import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
import { PIPELINE_EVENTS } from '$lib/constants/app';
import { notify } from './notify';

interface DictationState {
	status: 'Idle' | 'Recording' | 'Processing' | 'Pasting' | 'Completed' | 'Error';
	text?: string | null;
	error?: string | null;
}

type SharedListener = {
	promise: Promise<UnlistenFn>;
	references: number;
};

// The layout owns the listener, but hot navigation and test/dev remounts can
// call setup more than once. Share one native subscription so every event is
// handled once and teardown remains safe for each caller.
let sharedListener: SharedListener | null = null;

function handleDictationState(event: { payload: DictationState }) {
	const payload = event.payload;

	if (payload.status === 'Error') {
		void dictationRuntime.setStatus('Error', payload.error || 'Unknown dictation error');
		notify.error({ title: 'Dictation Error', description: payload.error || 'An error occurred during dictation' });
		return;
	}

	if (payload.status === 'Completed' || payload.status === 'Idle') {
		void dictationRuntime.setStatus('Idle', 'Ready');
		if (payload.status === 'Completed' && typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent(PIPELINE_EVENTS.COMPLETE));
		}
		return;
	}

	if (payload.status === 'Pasting') {
		void dictationRuntime.setStatus('Pasting', 'Writing at cursor');
		return;
	}

	if (payload.status === 'Processing') {
		void dictationRuntime.setStatus('Transcribing', 'Transcribing locally');
		return;
	}

	if (payload.status === 'Recording') {
		void dictationRuntime.setStatus('Recording', 'Listening');
		return;
	}
}

export async function setupDictationListener(): Promise<UnlistenFn> {
	if (!sharedListener) {
		const listener: SharedListener = {
			promise: listen<DictationState>('mynah://dictation_state', handleDictationState),
			references: 0,
		};
		sharedListener = listener;
		listener.promise.catch(() => {
			if (sharedListener === listener) sharedListener = null;
		});
	}

	const listener = sharedListener;
	listener.references += 1;
	let released = false;

	return () => {
		if (released) return;
		released = true;
		listener.references -= 1;
		if (listener.references > 0) return;

		void listener.promise.then((unlisten) => {
			if (listener.references === 0) {
				if (sharedListener === listener) sharedListener = null;
				return unlisten();
			}
		});
	};
}

export async function startDictation() {
	await invoke('start_dictation');
}

export async function stopDictation() {
	await invoke('stop_dictation');
}

export async function cancelDictation() {
	await invoke('cancel_dictation');
}
