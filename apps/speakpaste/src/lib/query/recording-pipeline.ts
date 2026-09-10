import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
import { notify } from './notify';

interface DictationState {
	status: 'Idle' | 'Recording' | 'Processing' | 'Pasting' | 'Completed' | 'Error';
	text?: string | null;
	error?: string | null;
}

export async function setupDictationListener() {
	return await listen<DictationState>('mynah://dictation_state', (event) => {
		const payload = event.payload;

		if (payload.status === 'Error') {
			void dictationRuntime.setStatus('Error', payload.error || 'Unknown dictation error');
			notify.error({ title: 'Dictation Error', description: payload.error || 'An error occurred during dictation' });
			return;
		}

		if (payload.status === 'Completed' || payload.status === 'Idle') {
			void dictationRuntime.setStatus('Idle', 'Ready');
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
	});
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

