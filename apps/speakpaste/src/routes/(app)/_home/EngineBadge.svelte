<script lang="ts">
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

	let { modelLabel } = $props<{ modelLabel: string }>();
</script>

<div class="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm text-sm text-foreground">
	<ShieldCheckIcon class="size-4 text-success" />
	<span>Local</span>
	<span class="text-muted-foreground/50">·</span>
	<span>whisper.cpp</span>
	<span class="text-muted-foreground/50">·</span>
	<span>{modelLabel}</span>
	<span class="size-2 rounded-full bg-success ml-0.5"></span>
</div>
