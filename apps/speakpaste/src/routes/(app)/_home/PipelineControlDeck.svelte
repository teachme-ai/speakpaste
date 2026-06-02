<script lang="ts">
	import { Switch } from '@epicenter/ui/switch';
	import { settings } from '$lib/state/settings.svelte';
	import { transformations } from '$lib/state/transformations.svelte';

	const autoPaste = $derived(settings.get('output.transcription.cursor'));
</script>

<div class="mt-4 flex w-full max-w-sm flex-col gap-4 rounded-[28px] border border-black/10 bg-white/48 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-white/[0.07]">
	<div class="flex items-center justify-between gap-3">
		<div>
			<div class="text-sm font-semibold text-stone-950 dark:text-stone-50">Auto-paste</div>
			<div class="text-xs text-stone-600 dark:text-stone-400">Send text directly into the active app.</div>
		</div>
		<Switch
			checked={autoPaste}
			onCheckedChange={(v) => settings.set('output.transcription.cursor', v)}
		/>
	</div>

	<div class="grid gap-2">
		<div class="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500 dark:text-stone-400">Local mode</div>
		<select
			class="w-full rounded-2xl border border-black/10 bg-white/55 px-3 py-2 text-sm text-stone-950 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 dark:border-white/10 dark:bg-white/10 dark:text-stone-50"
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
