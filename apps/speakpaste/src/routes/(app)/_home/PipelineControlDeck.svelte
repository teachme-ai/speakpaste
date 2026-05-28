<script lang="ts">
	import { Switch } from '@epicenter/ui/switch';
	import InfoIcon from '@lucide/svelte/icons/info';
	import { settings } from '$lib/state/settings.svelte';
	import { transformations } from '$lib/state/transformations.svelte';

	const autoPaste = $derived(settings.get('output.transcription.cursor'));
</script>

<div class="flex flex-col gap-3 px-5 py-4 rounded-2xl bg-card border border-border shadow-sm w-full max-w-sm mx-auto mt-4">
	<div class="flex items-center gap-3">
		<span class="text-sm font-semibold text-foreground flex-1">Auto-paste</span>
		<Switch
			checked={autoPaste}
			onCheckedChange={(v) => settings.set('output.transcription.cursor', v)}
		/>
		<span class="text-sm text-muted-foreground">Paste in active app</span>
		<InfoIcon class="size-4 text-muted-foreground/50 shrink-0" />
	</div>
	
	<div class="flex items-center gap-2.5 border-t border-border pt-3">
		<span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Pipeline:</span>
		<select
			class="flex-1 text-xs border border-border rounded-lg px-2.5 py-1.5 text-foreground bg-muted cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
			value={settings.get('transformation.selectedId') ?? ''}
			onchange={(e) => settings.set('transformation.selectedId', e.currentTarget.value || null)}
		>
			<option value="">None (Raw Paste)</option>
			{#each transformations.sorted as transform}
				<option value={transform.id}>{transform.title}</option>
			{/each}
		</select>
	</div>
</div>
