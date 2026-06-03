<script lang="ts">
	import { Switch } from '@epicenter/ui/switch';
	import { settings } from '$lib/state/settings.svelte';

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
</div>
