<script lang="ts">
	import { Switch } from '@epicenter/ui/switch';
	import * as Popover from '@epicenter/ui/popover';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import ListIcon from '@lucide/svelte/icons/list';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { settings } from '$lib/state/settings.svelte';
	import { recordings } from '$lib/state/recordings.svelte';
	import {
		RecordingModeSelector,
		TranscriptionSelector,
	} from '$lib/components/settings';
	import ManualDeviceSelector from '$lib/components/settings/selectors/ManualDeviceSelector.svelte';

	const autoPaste = $derived(settings.get('output.transcription.cursor'));
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				class="flex size-9 items-center justify-center rounded-full border border-black/10 bg-white/55 text-stone-500 shadow-sm transition-colors hover:bg-white/80 hover:text-stone-900 dark:border-white/10 dark:bg-white/10 dark:text-stone-400 dark:hover:bg-white/15 dark:hover:text-stone-50"
				aria-label="Settings"
			>
				<SettingsIcon class="size-4" />
			</button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-80 p-0 rounded-2xl shadow-xl border border-border bg-popover overflow-hidden" align="end" sideOffset={8}>
		<div class="flex flex-col">
			<!-- Selectors Toolbar -->
			<div class="flex items-center justify-center gap-1.5 px-4 py-3 border-b border-border bg-muted/30">
				<ManualDeviceSelector />
				<TranscriptionSelector />
				<RecordingModeSelector />
			</div>

			<!-- Auto-paste -->
			<div class="flex items-center justify-between px-4 py-3 border-b border-border">
				<div class="flex items-center gap-2.5">
					<ClipboardIcon class="size-4 text-primary" />
					<span class="text-sm font-medium text-foreground">Auto-paste</span>
				</div>
				<Switch
					checked={autoPaste}
					onCheckedChange={(v) => settings.set('output.transcription.cursor', v)}
				/>
			</div>

			<!-- History limit -->
			<div class="flex items-center justify-between px-4 py-3 border-b border-border">
				<div class="flex items-center gap-2.5">
					<ListIcon class="size-4 text-primary" />
					<span class="text-sm font-medium text-foreground">History limit</span>
				</div>
				<input
					type="number"
					min="1"
					max="500"
					class="w-16 border border-border rounded-lg px-2 py-1 text-sm text-foreground bg-muted text-right focus:outline-none focus:ring-1 focus:ring-ring"
					value={settings.get('retention.maxCount')}
					onchange={(e) => {
						const v = parseInt(e.currentTarget.value);
						if (v > 0) settings.set('retention.maxCount', v);
					}}
				/>
			</div>

			<!-- Navigation -->
			<div class="flex flex-col border-b border-border py-1">
				<a href="/recordings" class="flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors">
					<div class="flex items-center gap-2.5">
						<ListIcon class="size-4 text-primary" />
						<span class="text-sm font-medium text-foreground">All Recordings</span>
					</div>
					<svg class="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
				</a>
				<a href="/settings" class="flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors">
					<div class="flex items-center gap-2.5">
						<SettingsIcon class="size-4 text-primary" />
						<span class="text-sm font-medium text-foreground">Full Settings Menu</span>
					</div>
					<svg class="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
				</a>
			</div>

			<!-- Clear history -->
			<button
				class="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
				onclick={() => {
					const ids = recordings.sorted.map((r) => r.id);
					ids.forEach((id) => recordings.delete(id));
				}}
			>
				<TrashIcon class="size-4" />
				Clear history
			</button>
		</div>
	</Popover.Content>
</Popover.Root>
