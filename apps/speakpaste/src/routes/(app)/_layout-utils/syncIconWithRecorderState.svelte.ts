import {
	TRAY_ERROR_RESET_MS,
	TRAY_PASTED_RESET_MS,
} from '$lib/constants/app';
import { logDiagnostic } from '$lib/diagnostics/runtime-diagnostics';
import { desktopRpc } from '$lib/query/desktop';
import { deviceConfig } from '$lib/state/device-config.svelte';
import { settings } from '$lib/state/settings.svelte';
import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';

export function syncIconWithRecorderState() {
	let pastedTimer: ReturnType<typeof setTimeout> | undefined;

	function setTrayState(state: 'IDLE' | 'RECORDING' | 'TRANSCRIBING' | 'PASTED' | 'ERROR', reason: string) {
		desktopRpc.tray.setTrayState({ state }).then((result) => {
			if (result.error) {
				logDiagnostic(
					'tray',
					'desktop_rpc_set_state_failed',
					{
						state,
						reason,
						errorTitle: result.error.title,
						errorDescription: result.error.description,
					},
					'error',
				);
			}
		});
	}

	function syncContext() {
		const shortcut = 'Fn key';
		const modelPath = deviceConfig.get('transcription.whispercpp.modelPath');
		const model = WHISPER_MODELS.find((m) => modelPath.endsWith(m.file.filename))?.id ?? 'tiny.en';
		const autoPaste = settings.get('output.transcription.cursor');
		import('$lib/services/desktop/tray').then(({ TrayIconServiceLive }) => {
			TrayIconServiceLive.updateContext({ shortcut, model, autoPaste });
			logDiagnostic('tray', 'context_synced', {
				shortcut,
				model,
				autoPaste,
				modelPath,
			});
		}).catch((error) => {
			logDiagnostic(
				'tray',
				'context_sync_failed',
				{ error: error instanceof Error ? error.message : String(error) },
				'error',
			);
		});
	}

	// Sync tray state and context with dictationRuntime state
	$effect(() => {
		const status = dictationRuntime.snapshot.status;
		console.info(`[Tray] dictationRuntime status → ${status}`);

		if (status === 'Recording') {
			clearTimeout(pastedTimer);
			pastedTimer = undefined;
			setTrayState('RECORDING', status);
		} else if (status === 'Transcribing') {
			clearTimeout(pastedTimer);
			pastedTimer = undefined;
			setTrayState('TRANSCRIBING', status);
		} else if (status === 'Pasting') {
			clearTimeout(pastedTimer);
			pastedTimer = undefined;
			setTrayState('PASTED', status);
		} else if (status === 'Error') {
			clearTimeout(pastedTimer);
			setTrayState('ERROR', status);
			pastedTimer = setTimeout(() => {
				pastedTimer = undefined;
				setTrayState('IDLE', 'ErrorReset');
			}, TRAY_ERROR_RESET_MS);
		} else if (status === 'Cooldown') {
			clearTimeout(pastedTimer);
			pastedTimer = setTimeout(() => {
				pastedTimer = undefined;
				setTrayState('IDLE', 'CooldownReset');
			}, TRAY_PASTED_RESET_MS);
		} else {
			// Idle
			if (pastedTimer === undefined) {
				setTrayState('IDLE', status);
			}
		}
		syncContext();
	});
}
