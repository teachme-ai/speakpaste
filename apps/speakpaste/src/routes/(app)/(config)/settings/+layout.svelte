<script lang="ts">
	import { Button } from '@epicenter/ui/button';
	import { confirmationDialog } from '@epicenter/ui/confirmation-dialog';
	import * as SectionHeader from '@epicenter/ui/section-header';
	import { Separator } from '@epicenter/ui/separator';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { onMount } from 'svelte';
	import { rpc } from '$lib/query';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import SidebarNav from './SidebarNav.svelte';

	let { children } = $props();

	onMount(() => {
		if (!window.__TAURI_INTERNALS__) return;

		import('@tauri-apps/api/window').then(async ({ getCurrentWindow, LogicalSize }) => {
			const currentWindow = getCurrentWindow();
			await currentWindow.setMinSize(new LogicalSize(720, 620));
			await currentWindow.setSize(new LogicalSize(760, 680));
		}).catch((error) => {
			console.error('Failed to resize settings window:', error);
		});
	});
</script>

<main class="mac-window-surface mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col overflow-x-hidden px-4 pb-5 pt-4">
	<div
		class="mac-toolbar -mx-4 -mt-4 mb-1 flex min-h-14 flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
		data-tauri-drag-region
	>
		<div class="flex min-w-0 items-center gap-3">
			<Button href="/" variant="outline" size="sm" class="shrink-0">
				<ArrowLeft class="size-4" />
				Back to Mynah
			</Button>
			<SectionHeader.Root class="min-w-0 space-y-0.5">
				<SectionHeader.Title level={2} class="text-[19px] font-semibold tracking-tight"
					>Settings</SectionHeader.Title
				>
				<SectionHeader.Description class="text-[15px]">
					App-level preferences for dictation, output, privacy, and appearance.
				</SectionHeader.Description>
			</SectionHeader.Root>
		</div>
		<div class="flex shrink-0 items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					confirmationDialog.open({
						title: 'Reset All Settings',
						description:
							'This will reset all settings to their default values. This action cannot be undone.',
						confirm: { text: 'Reset Settings', variant: 'destructive' },
						onConfirm: () => {
							settings.reset();
							deviceConfig.reset();
							rpc.notify.success({
								title: 'Settings reset',
								description: 'All settings have been reset to defaults.',
							});
						},
					});
				}}
				class="shrink-0"
			>
				<RotateCcw class="size-4" />
				Reset…
			</Button>
		</div>
	</div>
	<Separator class="my-5" />
	<div class="flex min-w-0 flex-col gap-6 sm:flex-row">
		<aside class="w-full shrink-0 sm:w-56"><SidebarNav /></aside>
		<main class="min-w-0 flex-1 p-1">{@render children()}</main>
	</div>
</main>
