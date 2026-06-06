<script lang="ts">
	import { Toaster } from '@epicenter/ui/sonner';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { onNavigate } from '$app/navigation';
	import { queryClient } from '$lib/query/client';
	import '@epicenter/ui/app.css';
	import * as Tooltip from '@epicenter/ui/tooltip';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Apply UI themes reactively
	$effect(() => {
		if (typeof document !== 'undefined') {
			const theme = settings.get('ui.theme');
			const html = document.documentElement;
			if (theme === 'dark') {
				html.classList.add('dark');
				html.classList.remove('theme-mynah');
			} else if (theme === 'mynah') {
				html.classList.remove('dark');
				html.classList.add('theme-mynah');
			} else {
				// 'pastel' (default light theme)
				html.classList.remove('dark');
				html.classList.remove('theme-mynah');
			}
			localStorage.setItem('ui.theme', theme);
		}
	});
</script>

<svelte:head> <title>Mynah</title> </svelte:head>

<QueryClientProvider client={queryClient}>
	<!-- Uses UI package defaults (300ms delay, 150ms skip) -->
	<Tooltip.Provider> {@render children()} </Tooltip.Provider>
</QueryClientProvider>

<Toaster
	offset={10}
	class="xs:block hidden"
	duration={3000}
	visibleToasts={2}
	closeButton
	toastOptions={{
		classes: {
			toast: 'flex flex-wrap *:data-content:flex-1 text-sm shadow-lg',
			icon: 'shrink-0',
			actionButton: 'mt-2 inline-flex justify-center',
			closeButton: 'mt-2 inline-flex justify-center',
		},
	}}
/>


<style>
	/* Override inspector button to bottom-center, above sidebar (z-10).
	   !important needed because the inspector sets inline styles via style= attribute. */
	:global(#svelte-inspector-host button) {
		bottom: 16px !important;
		left: 50% !important;
		transform: translateX(-50%) !important;
		right: auto !important;
		z-index: 20 !important;
	}
</style>
