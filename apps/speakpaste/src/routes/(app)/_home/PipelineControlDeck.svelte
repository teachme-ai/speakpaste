<script lang="ts">
	import { Switch } from '@epicenter/ui/switch';
	import { settings } from '$lib/state/settings.svelte';

	const autoPaste = $derived(settings.get('output.transcription.cursor'));
</script>

<div class="mt-3 flex w-full flex-col gap-4 rounded-xl border border-border bg-secondary/50 px-4 py-3 shadow-sm">
	<div class="flex items-center justify-between gap-3">
		<div>
			<div class="text-[15px] font-semibold text-foreground">Auto-paste</div>
			<div class="text-xs text-muted-foreground">Send text directly into the active app.</div>
		</div>
		<Switch
			checked={autoPaste}
			onCheckedChange={(v) => settings.set('output.transcription.cursor', v)}
		/>
	</div>
</div>
