<script lang="ts">
	import * as Popover from '@epicenter/ui/popover';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import InfoIcon from '@lucide/svelte/icons/info';
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				class="flex size-9 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground shadow-sm transition-colors hover:bg-card/90 hover:text-foreground"
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
				<a href="/settings/about" class="flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors">
					<div class="flex items-center gap-2.5">
						<InfoIcon class="size-4 text-primary" />
						<span class="text-sm font-medium text-foreground">About & Credits</span>
					</div>
					<svg class="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
				</a>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
