<script lang="ts">
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

	let { engineLabel, modelLabel, profileLabel } = $props<{
		engineLabel: string;
		modelLabel: string;
		profileLabel: string;
	}>();
</script>

<div class="inline-flex items-center gap-3 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-foreground shadow-sm">
	<span class="inline-flex h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_0_8px_var(--success)/15]"></span>
	<div class="flex flex-col leading-tight">
		<span class="font-semibold">On-device signal</span>
		<span class="text-xs text-muted-foreground">
			{engineLabel} · {modelLabel} · {profileLabel}
		</span>
	</div>
	<div class="inline-flex h-9 w-px bg-border" aria-hidden="true"></div>
	<ShieldCheckIcon class="size-4 text-success" />
</div>
