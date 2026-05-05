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
	import { recordings } from '$lib/state/recordings.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { syncWindowAlwaysOnTopWithRecorderState } from '../_layout-utils/alwaysOnTop.svelte';
	import {
		checkCompressionRecommendation,
		checkFfmpegRecordingMethodCompatibility,
	} from '../_layout-utils/check-ffmpeg';
	import { checkForUpdates } from '../_layout-utils/check-for-updates';
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

	onMount(() => {
		window.commands = commandCallbacks;
		window.goto = goto;

		// Clear any stale shortcut that isn't F7
		const staleKey = 'speakpaste.device.shortcuts.global.toggleManualRecording';
		const stored = localStorage.getItem(staleKey);
		if (stored && !stored.includes('F7')) {
			console.info('[Shortcuts] clearing stale shortcut:', stored);
			localStorage.removeItem(staleKey);
		}

		syncLocalShortcutsWithSettings();
		resetLocalShortcutsToDefaultIfDuplicates();
		registerOnboarding();
		cleanupAccessibilityPermission = registerAccessibilityPermission();
		cleanupMicrophonePermission = registerMicrophonePermission();

		migrationDialog.check();

		if (window.__TAURI_INTERNALS__) {
			syncGlobalShortcutsWithSettings();
			resetGlobalShortcutsToDefaultIfDuplicates();

			Promise.allSettled([
				checkFfmpegRecordingMethodCompatibility(),
				checkCompressionRecommendation(),
				checkForUpdates(),
			]);
		}
	});

	onDestroy(() => {
		cleanupAccessibilityPermission?.();
		cleanupMicrophonePermission?.();
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
