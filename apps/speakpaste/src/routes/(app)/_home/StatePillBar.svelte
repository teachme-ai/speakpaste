<script lang="ts">
	import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform';

	let { pills } = $props<{
		pills: Array<{ label: string; active: boolean }>;
	}>();

	function pillClasses(pill: { label: string; active: boolean }) {
		if (!pill.active) {
			return 'border-border bg-card/35 text-muted-foreground';
		}

		switch (pill.label) {
			case 'Listening':
				return 'border-destructive/30 bg-destructive/10 text-destructive shadow-[0_12px_30px_-20px_var(--color-red-500)]';
			case 'Pasted':
				return 'border-primary/20 bg-primary text-primary-foreground shadow-[0_12px_30px_-20px_var(--ring)]';
			default:
				return 'border-border bg-card text-foreground shadow-sm';
		}
	}
</script>

<div class="flex flex-wrap items-center justify-center gap-2 px-6 pt-3 pb-6" role="status" aria-live="polite">
	{#each pills as pill}
		<span class="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all duration-300 {pillClasses(pill)}">
			{#if pill.active}
				<span class="relative flex size-2.5 shrink-0">
					{#if pill.label === 'Listening'}
						<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60"></span>
					{/if}
					<span class="relative inline-flex size-2.5 rounded-full bg-current"></span>
				</span>
			{:else}
				<AudioWaveformIcon class="size-3.5 shrink-0 text-current opacity-70" />
			{/if}
			{pill.label}
		</span>
	{/each}
</div>
