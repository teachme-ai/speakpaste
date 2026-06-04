import { createQuery } from '@tanstack/svelte-query';
import {
	PIPELINE_EVENTS,
	TRAY_ERROR_RESET_MS,
	TRAY_PASTED_RESET_MS,
} from '$lib/constants/app';
import { rpc } from '$lib/query';
import { desktopRpc } from '$lib/query/desktop';
import { deviceConfig } from '$lib/state/device-config.svelte';
import { settings } from '$lib/state/settings.svelte';
import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';

export function syncIconWithRecorderState() {
	const getRecorderStateQuery = createQuery(
		() => rpc.recorder.getRecorderState.options,
	);

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

	// IDLE / RECORDING from recorder state
	$effect(() => {
		const state = getRecorderStateQuery.data;
		if (!state) return;
		console.info(`[Tray] recorder → ${state}`);
		desktopRpc.tray.setTrayState({ state });
		syncContext();
	});

	// TRANSCRIBING / PASTED / ERROR from pipeline events
	if (typeof window !== 'undefined') {
		window.addEventListener(PIPELINE_EVENTS.STARTED, () => {
			console.info('[Tray] → TRANSCRIBING');
			desktopRpc.tray.setTrayState({ state: 'TRANSCRIBING' });
		});

		window.addEventListener(PIPELINE_EVENTS.COMPLETE, () => {
			console.info('[Tray] → PASTED');
			desktopRpc.tray.setTrayState({ state: 'PASTED' });
			clearTimeout(pastedTimer);
			pastedTimer = setTimeout(() => {
				desktopRpc.tray.setTrayState({ state: 'IDLE' });
			}, TRAY_PASTED_RESET_MS);
		});

		window.addEventListener(PIPELINE_EVENTS.ERROR, () => {
			console.info('[Tray] → ERROR');
			desktopRpc.tray.setTrayState({ state: 'ERROR' });
			clearTimeout(pastedTimer);
			pastedTimer = setTimeout(() => {
				desktopRpc.tray.setTrayState({ state: 'IDLE' });
			}, TRAY_ERROR_RESET_MS);
		});
	}
}
