<script lang="ts">
	import { Switch } from '@epicenter/ui/switch';
	import { settings } from '$lib/state/settings.svelte';

	const autoPaste = $derived(settings.get('output.transcription.cursor'));
</script>

<div class="mt-4 flex w-full max-w-sm flex-col gap-4 rounded-[28px] border border-border bg-card/60 px-5 py-4 shadow-sm">
	<div class="flex items-center justify-between gap-3">
		<div>
			<div class="text-sm font-semibold text-foreground">Auto-paste</div>
			<div class="text-xs text-muted-foreground">Send text directly into the active app.</div>
		</div>
		<Switch
			checked={autoPaste}
			onCheckedChange={(v) => settings.set('output.transcription.cursor', v)}
		/>
	</div>
</div>
