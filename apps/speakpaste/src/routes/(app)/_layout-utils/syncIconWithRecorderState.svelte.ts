import {
	TRAY_ERROR_RESET_MS,
	TRAY_PASTED_RESET_MS,
} from '$lib/constants/app';
import { desktopRpc } from '$lib/query/desktop';
import { deviceConfig } from '$lib/state/device-config.svelte';
import { settings } from '$lib/state/settings.svelte';
import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';

export function syncIconWithRecorderState() {
	let pastedTimer: ReturnType<typeof setTimeout> | undefined;

	function syncContext() {
		const shortcut = 'Fn key';
		const modelPath = deviceConfig.get('transcription.whispercpp.modelPath');
		const model = WHISPER_MODELS.find((m) => modelPath.endsWith(m.file.filename))?.id ?? 'tiny.en';
		const autoPaste = settings.get('output.transcription.cursor');
		import('$lib/services/desktop/tray').then(({ TrayIconServiceLive }) => {
			TrayIconServiceLive.updateContext({ shortcut, model, autoPaste });
		});
	}

	// Sync tray state and context with dictationRuntime state
	$effect(() => {
		const status = dictationRuntime.snapshot.status;
		console.info(`[Tray] dictationRuntime status → ${status}`);

		if (status === 'Recording') {
			clearTimeout(pastedTimer);
			pastedTimer = undefined;
			desktopRpc.tray.setTrayState({ state: 'RECORDING' });
		} else if (status === 'Transcribing') {
			clearTimeout(pastedTimer);
			pastedTimer = undefined;
			desktopRpc.tray.setTrayState({ state: 'TRANSCRIBING' });
		} else if (status === 'Pasting') {
			clearTimeout(pastedTimer);
			pastedTimer = undefined;
			desktopRpc.tray.setTrayState({ state: 'PASTED' });
		} else if (status === 'Error') {
			clearTimeout(pastedTimer);
			desktopRpc.tray.setTrayState({ state: 'ERROR' });
			pastedTimer = setTimeout(() => {
				pastedTimer = undefined;
				desktopRpc.tray.setTrayState({ state: 'IDLE' });
			}, TRAY_ERROR_RESET_MS);
		} else if (status === 'Cooldown') {
			clearTimeout(pastedTimer);
			pastedTimer = setTimeout(() => {
				pastedTimer = undefined;
				desktopRpc.tray.setTrayState({ state: 'IDLE' });
			}, TRAY_PASTED_RESET_MS);
		} else {
			// Idle
			if (pastedTimer === undefined) {
				desktopRpc.tray.setTrayState({ state: 'IDLE' });
			}
		}
		syncContext();
	});
}
