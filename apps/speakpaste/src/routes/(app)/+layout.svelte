<script lang="ts">
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { migrateOldSettings } from '$lib/migration/migrate-settings';
	import { rpc } from '$lib/query';
	import { services } from '$lib/services';
	import AppLayout from './_components/AppLayout.svelte';

	// Migrate old monolithic settings blob to per-key stores (one-time, idempotent)
	migrateOldSettings();

	let { children } = $props();

	let unlistenNavigate: UnlistenFn | null = null;

	$effect(() => {
		const isMainWindow = !window.__TAURI_INTERNALS__ || getCurrentWindow().label === 'main';
		if (!isMainWindow) return;

		const unlisten = services.localShortcutManager.listen();
		return () => unlisten();
	});

	$effect(() => {
		const isMainWindow = !window.__TAURI_INTERNALS__ || getCurrentWindow().label === 'main';
		if (!isMainWindow) return;

		rpc.analytics.logEvent({ type: 'app_started' });
	});

	onMount(async () => {
		if (!window.__TAURI_INTERNALS__) return;
		const isMainWindow = getCurrentWindow().label === 'main';
		if (!isMainWindow) return;

		unlistenNavigate = await listen<{ path: string }>(
			'navigate-main-window',
			(event) => {
				goto(event.payload.path);
			},
		);
	});

	onDestroy(() => {
		unlistenNavigate?.();
	});
</script>

<div class="relative flex h-full min-h-svh flex-col">
	<AppLayout>{@render children()}</AppLayout>
</div>
