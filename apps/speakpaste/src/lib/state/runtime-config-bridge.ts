import { invoke } from '@tauri-apps/api/core';
import { deviceConfig } from '$lib/state/device-config.svelte';
import { settings } from '$lib/state/settings.svelte';
import { transformationSteps } from '$lib/state/transformation-steps.svelte';

type RuntimeTextRule = {
	order: number;
	findText: string;
	replaceText: string;
	useRegex: boolean;
};

type RuntimeConfig = {
	version: number;
	recordingMethod: string;
	recordingDeviceId: string | null;
	recordingSampleRate: number | null;
	recordingOutputFolder: string | null;
	transcriptionEngine: string;
	whisperModelPath: string | null;
	parakeetModelPath: string | null;
	moonshineModelPath: string | null;
	autoPasteEnabled: boolean;
	selectedTextRuleId: string | null;
	textRules: RuntimeTextRule[];
	shortcuts: {
		toggleManualRecording: string | null;
		startManualRecording: string | null;
		stopManualRecording: string | null;
		cancelManualRecording: string | null;
		pushToTalk: string | null;
	};
	updatedAtMs: number;
};

type NativeShortcutReloadResult = {
	registered: Array<{
		commandId: string;
		accelerator: string;
	}>;
	failed: Array<{
		commandId: string;
		accelerator: string;
		reason: string;
	}>;
};

let syncTimer: ReturnType<typeof window.setTimeout> | null = null;

export const runtimeConfigBridge = {
	scheduleSync() {
		if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return;
		if (syncTimer) window.clearTimeout(syncTimer);
		syncTimer = window.setTimeout(() => {
			syncTimer = null;
			void runtimeConfigBridge.syncNow();
		}, 100);
	},

	async syncNow() {
		if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return;
		const config = buildRuntimeConfig();
		await invoke('write_runtime_config', { config }).catch((error) => {
			console.warn('[RuntimeConfig] failed to write runtime config', error);
		});
	},

	async syncNowAndReloadNativeShortcuts() {
		await runtimeConfigBridge.syncNow();
		return runtimeConfigBridge.reloadNativeShortcuts();
	},

	async reloadNativeShortcuts(): Promise<string[]> {
		if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return [];
		const result = await invoke<NativeShortcutReloadResult>(
			'reload_native_global_shortcuts',
		).catch((error) => {
			console.warn('[RuntimeConfig] failed to reload native shortcuts', error);
			return null;
		});

		if (!result) return [];
		if (result.failed.length > 0) {
			console.warn('[RuntimeConfig] native shortcut fallback required', result.failed);
		}
		return result.registered.map((item) => item.commandId);
	},
};

function buildRuntimeConfig(): RuntimeConfig {
	const recordingMethod = deviceConfig.get('recording.method');
	const selectedTextRuleId = settings.get('transformation.selectedId');
	const textRules = selectedTextRuleId
		? transformationSteps
				.getByTransformationId(selectedTextRuleId)
				.filter((step) => step.type === 'find_replace')
				.map((step) => ({
					order: step.order,
					findText: step.findText,
					replaceText: step.replaceText,
					useRegex: step.useRegex,
				}))
		: [];

	return {
		version: 1,
		recordingMethod,
		recordingDeviceId: getRecordingDeviceId(recordingMethod),
		recordingSampleRate: Number(deviceConfig.get('recording.cpal.sampleRate')),
		recordingOutputFolder: deviceConfig.get('recording.cpal.outputFolder'),
		transcriptionEngine: settings.get('transcription.service'),
		whisperModelPath: emptyToNull(
			deviceConfig.get('transcription.whispercpp.modelPath'),
		),
		parakeetModelPath: emptyToNull(
			deviceConfig.get('transcription.parakeet.modelPath'),
		),
		moonshineModelPath: emptyToNull(
			deviceConfig.get('transcription.moonshine.modelPath'),
		),
		autoPasteEnabled: settings.get('output.transcription.cursor'),
		selectedTextRuleId,
		textRules,
		shortcuts: {
			toggleManualRecording: deviceConfig.get(
				'shortcuts.global.toggleManualRecording',
			),
			startManualRecording: deviceConfig.get(
				'shortcuts.global.startManualRecording',
			),
			stopManualRecording: deviceConfig.get('shortcuts.global.stopManualRecording'),
			cancelManualRecording: deviceConfig.get(
				'shortcuts.global.cancelManualRecording',
			),
			pushToTalk: deviceConfig.get('shortcuts.global.pushToTalk'),
		},
		updatedAtMs: Date.now(),
	};
}

function getRecordingDeviceId(recordingMethod: RuntimeConfig['recordingMethod']) {
	switch (recordingMethod) {
		case 'cpal':
			return deviceConfig.get('recording.cpal.deviceId');
		case 'navigator':
			return deviceConfig.get('recording.navigator.deviceId');
		case 'ffmpeg':
			return deviceConfig.get('recording.ffmpeg.deviceId');
		default:
			return null;
	}
}

function emptyToNull(value: string) {
	return value.trim() ? value : null;
}
