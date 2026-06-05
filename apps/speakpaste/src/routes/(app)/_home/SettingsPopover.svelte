<script lang="ts">
	import * as Popover from '@epicenter/ui/popover';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ListIcon from '@lucide/svelte/icons/list';
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
	<Popover.Content class="w-72 p-0 rounded-2xl shadow-xl border border-border bg-popover overflow-hidden" align="end" sideOffset={8}>
		<div class="flex flex-col">
			<div class="flex flex-col py-1">
				<a href="/settings" class="flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors">
					<div class="flex items-center gap-2.5">
						<SettingsIcon class="size-4 text-primary" />
						<span class="text-sm font-medium text-foreground">Control Center</span>
					</div>
					<svg class="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
				</a>
				<a href="/settings/captures" class="flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors">
					<div class="flex items-center gap-2.5">
						<ListIcon class="size-4 text-primary" />
						<span class="text-sm font-medium text-foreground">Captures</span>
					</div>
					<svg class="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
				</a>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
