<script lang="ts">
	import { ConfirmationDialog } from '@epicenter/ui/confirmation-dialog';
	import { createQuery } from '@tanstack/svelte-query';
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { commandCallbacks } from '$lib/commands';
	import MoreDetailsDialog from '$lib/components/MoreDetailsDialog.svelte';
	import NotificationLog from '$lib/components/NotificationLog.svelte';
	import { migrationDialog } from '$lib/migration/migration-dialog.svelte';
	import { rpc } from '$lib/query';
	import { services } from '$lib/services';
	import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
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

	onMount(() => {
		window.commands = commandCallbacks;
		window.goto = goto;

		// Migrate stale/conflicting shortcuts to Command+Shift+Return
		// Covers: Space, Spacebar, Command+Shift+Space, Command+Option+R, F7, Command+Shift+; (all previous bad defaults)
		const staleKey = 'speakpaste.device.shortcuts.global.toggleManualRecording';
		const stored = localStorage.getItem(staleKey);
		const BAD_DEFAULTS = ['Space', ';', 'Option+R', 'F7', 'Return', 'F5'];
		const isStale = stored && BAD_DEFAULTS.some((bad) => stored.includes(bad));
		if (isStale) {
			console.info('[Shortcuts] migrating stale shortcut to Command+Shift+Return:', stored);
			localStorage.removeItem(staleKey);
		}

		syncLocalShortcutsWithSettings();
		resetLocalShortcutsToDefaultIfDuplicates();
		registerOnboarding();
		cleanupAccessibilityPermission = registerAccessibilityPermission();
		cleanupMicrophonePermission = registerMicrophonePermission();
		void dictationRuntime.init().then((cleanup) => {
			cleanupDictationRuntime = cleanup;
		});

		migrationDialog.check();

		if (window.__TAURI_INTERNALS__) {
			syncGlobalShortcutsWithSettings();
			resetGlobalShortcutsToDefaultIfDuplicates();

			Promise.allSettled([
				checkFfmpegRecordingMethodCompatibility(),
				checkCompressionRecommendation(),
			]);

			// Standalone Fn Key Global Listener
			import('@tauri-apps/api/event').then(({ listen }) => {
				listen('fn-key-down', () => {
					console.log('[FnKeyListener] fn-key-down event received from backend');
					commandCallbacks.pushToTalk('Pressed');
				}).then((unlisten) => {
					unlistenFnKeyDown = unlisten;
				});

				listen('fn-key-up', () => {
					console.log('[FnKeyListener] fn-key-up event received from backend');
					commandCallbacks.pushToTalk('Released');
				}).then((unlisten) => {
					unlistenFnKeyUp = unlisten;
				});
			});
		}
	});

	onDestroy(() => {
		cleanupAccessibilityPermission?.();
		cleanupMicrophonePermission?.();
		cleanupDictationRuntime?.();
		unlistenFnKeyDown?.();
		unlistenFnKeyUp?.();
	});

	if (window.__TAURI_INTERNALS__) {
		syncWindowAlwaysOnTopWithRecorderState();
		syncIconWithRecorderState();
	}

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
	{@render children()}
</div>

<ConfirmationDialog />
<MoreDetailsDialog />
<NotificationLog />
