<script lang="ts">
	import { ConfirmationDialog } from '@epicenter/ui/confirmation-dialog';
	import { createQuery } from '@tanstack/svelte-query';
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { invoke } from '@tauri-apps/api/core';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import TrialExpiredScreen from './TrialExpiredScreen.svelte';
	import { commandCallbacks } from '$lib/commands';
	import MoreDetailsDialog from '$lib/components/MoreDetailsDialog.svelte';
	import NotificationLog from '$lib/components/NotificationLog.svelte';
	import { logDiagnostic } from '$lib/diagnostics/runtime-diagnostics';
	import { BUILD_INFO } from '$lib/generated/build-info';
	import { migrationDialog } from '$lib/migration/migration-dialog.svelte';
	import { rpc } from '$lib/query';
	import { services } from '$lib/services';
	import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
	import { runtimeConfigBridge } from '$lib/state/runtime-config-bridge';
	import { transformationSteps } from '$lib/state/transformation-steps.svelte';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { recordings } from '$lib/state/recordings.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { syncWindowAlwaysOnTopWithRecorderState } from '../_layout-utils/alwaysOnTop.svelte';
	import {
		checkCompressionRecommendation,
		checkFfmpegRecordingMethodCompatibility,
	} from '../_layout-utils/check-ffmpeg';
	import {
		resetGlobalShortcutsToDefaultIfDuplicates,
		resetLocalShortcutsToDefaultIfDuplicates,
		syncGlobalShortcutsWithSettings,
		syncLocalShortcutsWithSettings,
	} from '../_layout-utils/register-commands';
	import { registerOnboarding } from '../_layout-utils/register-onboarding';
	import {
		registerAccessibilityPermission,
		registerMicrophonePermission,
	} from '../_layout-utils/register-permissions';
	import { syncIconWithRecorderState } from '../_layout-utils/syncIconWithRecorderState.svelte';

	let cleanupAccessibilityPermission: (() => void) | undefined;
	let cleanupMicrophonePermission: (() => void) | undefined;
	let cleanupDictationRuntime: (() => void) | undefined;
	let unlistenFnKeyDown: (() => void) | undefined;
	let unlistenFnKeyUp: (() => void) | undefined;
	let unlistenAudioReady: (() => void) | undefined;

	let trialStatus = $state<{
		isTrialBuild: boolean;
		daysElapsed: number;
		daysRemaining: number;
		isExpired: boolean;
		firstLaunchIso: string;
		error: string | null;
	} | null>(null);

	onMount(() => {
		const isMainWindow = !window.__TAURI_INTERNALS__ || getCurrentWindow().label === 'main';

		if (isMainWindow) {
			if (window.__TAURI_INTERNALS__) {
				invoke('get_trial_status')
					.then((status: any) => {
						trialStatus = status;
						console.log('[Trial] status loaded:', status);
					})
					.catch((err) => {
						console.error('[Trial] failed to load trial status:', err);
					});
			}

			window.commands = commandCallbacks;
			window.goto = goto;
			logDiagnostic('app', 'layout_mount', {
				build: BUILD_INFO,
				userAgent: navigator.userAgent,
				pathname: window.location.pathname,
				installedSetupCompletedAt: localStorage.getItem('mynah.setup.completedAt'),
			});

			// Migrate stale/conflicting shortcuts to Command+Shift+Return
			// Covers: Space, Spacebar, Command+Shift+Space, Command+Option+R, F7, Command+Shift+; (all previous bad defaults)
			const staleKey = 'mynah.device.shortcuts.global.toggleManualRecording';
			const stored = localStorage.getItem(staleKey);
			const BAD_DEFAULTS = ['Space', ';', 'Option+R', 'F7', 'Return', 'F5'];
			const isStale = stored && BAD_DEFAULTS.some((bad) => stored.includes(bad));
			if (isStale) {
				console.info('[Shortcuts] migrating stale shortcut to Command+Shift+Return:', stored);
				localStorage.removeItem(staleKey);
			}
			const retiredGlobalShortcutKeys = [
				'shortcuts.global.cancelManualRecording',
				'shortcuts.global.pushToTalk',
				'shortcuts.global.openTransformationPicker',
				'shortcuts.global.runTransformationOnClipboard',
				'shortcuts.global.toggleVadRecording',
				'shortcuts.global.startVadRecording',
				'shortcuts.global.stopVadRecording',
			];
			for (const key of retiredGlobalShortcutKeys) {
				const storageKey = `mynah.device.${key}`;
				if (localStorage.getItem(storageKey)) {
					console.info('[Shortcuts] removing retired global shortcut:', key);
					localStorage.removeItem(storageKey);
				}
			}
			if (window.__TAURI_INTERNALS__ && settings.get('recording.mode') === 'vad') {
				console.info('[Recording] resetting stale hands-free mode to Press to Speak');
				settings.set('recording.mode', 'manual');
			}
			if (settings.get('shortcut.toggleVadRecording') === 'v') {
				console.info('[Shortcuts] removing stale local hands-free shortcut: v');
				settings.set('shortcut.toggleVadRecording', null);
			}
			const retiredLocalShortcutKeys = [
				'shortcut.openTransformationPicker',
				'shortcut.runTransformationOnClipboard',
			] as const;
			for (const key of retiredLocalShortcutKeys) {
				if (settings.get(key)) {
					console.info('[Shortcuts] removing retired local text rules shortcut:', key);
					settings.set(key, null);
				}
			}
			if (window.__TAURI_INTERNALS__ && deviceConfig.get('recording.method') !== 'cpal') {
				console.info('[Recording] using Native Mac Capture for desktop');
				deviceConfig.set('recording.method', 'cpal');
			}
			logDiagnostic('app', 'startup_config_snapshot', {
				selectedService: settings.get('transcription.service'),
				whisperModelPath: deviceConfig.get('transcription.whispercpp.modelPath'),
				hasWhisperModelPath: Boolean(deviceConfig.get('transcription.whispercpp.modelPath')),
				recordingMethod: deviceConfig.get('recording.method'),
				recordingMode: settings.get('recording.mode'),
				autoPaste: settings.get('output.transcription.cursor'),
				globalToggleShortcut: deviceConfig.get('shortcuts.global.toggleManualRecording'),
			});

			syncLocalShortcutsWithSettings();
			resetLocalShortcutsToDefaultIfDuplicates();
			const isSetupAssistantRequired = registerOnboarding();
			logDiagnostic('setup', 'onboarding_result', {
				isSetupAssistantRequired,
				pathname: window.location.pathname,
			});
			if (!isSetupAssistantRequired) {
				cleanupAccessibilityPermission = registerAccessibilityPermission();
				cleanupMicrophonePermission = registerMicrophonePermission();
			} else {
				logDiagnostic('permissions', 'global_permission_toasts_deferred_for_setup', {
					pathname: window.location.pathname,
				});
			}
		}

		// dictationRuntime must be initialized in BOTH windows so they receive dictate state transitions
		void dictationRuntime.init().then((cleanup) => {
			logDiagnostic('runtime', 'dictation_runtime_initialized', {
				recordingMode: settings.get('recording.mode'),
				recordingMethod: deviceConfig.get('recording.method'),
			});
			cleanupDictationRuntime = cleanup;
		}).catch((error) => {
			logDiagnostic(
				'runtime',
				'dictation_runtime_init_failed',
				{ error: error instanceof Error ? error.message : String(error) },
				'error',
			);
		});

		if (isMainWindow) {
			migrationDialog.check();

			if (window.__TAURI_INTERNALS__) {
				void runtimeConfigBridge
					.syncNowAndReloadNativeShortcuts()
					.then((nativeOwnedCommandIds) => {
						void syncGlobalShortcutsWithSettings({
							skipCommandIds: nativeOwnedCommandIds,
						});
					});
				resetGlobalShortcutsToDefaultIfDuplicates();

				Promise.allSettled([
					checkFfmpegRecordingMethodCompatibility(),
					checkCompressionRecommendation(),
				]);

				// Eagerly initialize tray icon so the bird icon + menu are attached
				// to the config-declared tray immediately on startup
				import('$lib/services/desktop/tray').then(({ TrayIconServiceLive }) => {
					TrayIconServiceLive.setTrayState('IDLE');
					logDiagnostic('tray', 'eager_init_triggered');
				}).catch((error) => {
					logDiagnostic(
						'tray',
						'eager_init_failed',
						{ error: error instanceof Error ? error.message : String(error) },
						'error',
					);
				});

				// Standalone Fn Key Global Listener
				import('@tauri-apps/api/event').then(({ listen }) => {
					listen<{
						recordingId: string;
						filePath: string;
					}>('dictation:audio-ready', (event) => {
						logDiagnostic('recording', 'native_audio_ready_event', {
							recordingId: event.payload.recordingId,
							filePath: event.payload.filePath,
						});
						void rpc.actions.processNativeRecording({
							recordingId: event.payload.recordingId,
							filePath: event.payload.filePath,
						});
					}).then((unlisten) => {
						unlistenAudioReady = unlisten;
					});

					listen('fn-key-down', () => {
						console.log('[FnKeyListener] fn-key-down event received from backend');
						logDiagnostic('fn-listener', 'fn_key_down_event_received');
						commandCallbacks.pushToTalk('Pressed');
					}).then((unlisten) => {
						unlistenFnKeyDown = unlisten;
					});

					listen('fn-key-up', () => {
						console.log('[FnKeyListener] fn-key-up event received from backend');
						logDiagnostic('fn-listener', 'fn_key_up_event_received');
						commandCallbacks.pushToTalk('Released');
					}).then((unlisten) => {
						unlistenFnKeyUp = unlisten;
					});
				});
			}
		}
	});

	onDestroy(() => {
		cleanupAccessibilityPermission?.();
		cleanupMicrophonePermission?.();
		cleanupDictationRuntime?.();
		unlistenFnKeyDown?.();
		unlistenFnKeyUp?.();
		unlistenAudioReady?.();
	});

	if (window.__TAURI_INTERNALS__) {
		syncWindowAlwaysOnTopWithRecorderState();
		syncIconWithRecorderState();
	}

	$effect(() => {
		if (!window.__TAURI_INTERNALS__) return;
		if (settings.get('recording.mode') !== 'vad') return;

		console.info('[Recording] hands-free mode is paused on desktop; using Press to Speak');
		settings.set('recording.mode', 'manual');
	});

	$effect(() => {
		if (!window.__TAURI_INTERNALS__) return;

		deviceConfig.get('recording.method');
		deviceConfig.get('recording.cpal.deviceId');
		deviceConfig.get('recording.navigator.deviceId');
		deviceConfig.get('recording.ffmpeg.deviceId');
		deviceConfig.get('recording.cpal.sampleRate');
		deviceConfig.get('local.performanceProfile');
		deviceConfig.get('recording.cpal.outputFolder');
		deviceConfig.get('transcription.whispercpp.modelPath');
		deviceConfig.get('transcription.parakeet.modelPath');
		deviceConfig.get('shortcuts.global.toggleManualRecording');
		deviceConfig.get('shortcuts.global.startManualRecording');
		deviceConfig.get('shortcuts.global.stopManualRecording');
		deviceConfig.get('shortcuts.global.cancelManualRecording');
		deviceConfig.get('shortcuts.global.pushToTalk');
		settings.get('transcription.service');
		settings.get('output.transcription.cursor');
		const selectedTextRuleId = settings.get('transformation.selectedId');
		if (selectedTextRuleId) {
			transformationSteps.getByTransformationId(selectedTextRuleId);
		}

		runtimeConfigBridge.scheduleSync();
	});

	$effect(() => {
		const strategy = settings.get('retention.strategy');
		if (strategy !== 'limit-count') return;

		const maxCount = settings.get('retention.maxCount');
		const allRecordingIds = recordings.sorted.map((r) => r.id);
		if (allRecordingIds.length <= maxCount) return;

		const idsToDelete = allRecordingIds.slice(maxCount);
		services.blobs.audio.delete(idsToDelete);
		recordings.bulkDelete(idsToDelete);
	});

	let { children } = $props();
</script>

<div class="flex flex-1 flex-col min-w-0 w-full">
	{#if trialStatus && trialStatus.isExpired}
		<TrialExpiredScreen errorMsg={trialStatus.error} />
	{:else}
		{#if trialStatus && trialStatus.isTrialBuild && !trialStatus.isExpired && trialStatus.daysRemaining <= 7}
			<div class="bg-amber-600 text-white text-center text-xs py-1.5 px-4 font-medium select-none flex items-center justify-center space-x-1.5 shrink-0 z-50">
				<span>⚠️ Mynah Trial: {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'} remaining.</span>
				<a href="https://mynah.site/#pricing" target="_blank" rel="noopener noreferrer" class="underline hover:text-amber-100 transition-colors">Buy License</a>
			</div>
		{/if}
		{@render children()}
	{/if}
</div>

<ConfirmationDialog />
<MoreDetailsDialog />
<NotificationLog />
