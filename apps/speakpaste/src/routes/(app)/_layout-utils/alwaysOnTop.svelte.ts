import { getCurrentWindow } from '@tauri-apps/api/window';
import { settings } from '$lib/state/settings.svelte';
import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
import { vadRecorder } from '$lib/state/vad-recorder.svelte';

export function syncWindowAlwaysOnTopWithRecorderState() {
	$effect(() => {
		const setAlwaysOnTop = (value: boolean) =>
			getCurrentWindow().setAlwaysOnTop(value);
		const status = dictationRuntime.snapshot.status;

		switch (settings.get('ui.alwaysOnTop')) {
			case 'Always':
				setAlwaysOnTop(true);
				break;
			case 'When Recording and Transcribing':
				if (
					status === 'Recording' ||
					status === 'Transcribing' ||
					status === 'Pasting' ||
					vadRecorder.state === 'SPEECH_DETECTED'
				) {
					setAlwaysOnTop(true);
				} else {
					setAlwaysOnTop(false);
				}
				break;
			case 'When Recording':
				if (
					status === 'Recording' ||
					vadRecorder.state === 'SPEECH_DETECTED'
				) {
					setAlwaysOnTop(true);
				} else {
					setAlwaysOnTop(false);
				}
				break;
			case 'Never':
				setAlwaysOnTop(false);
				break;
		}
	});
}
