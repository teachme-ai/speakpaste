<script lang="ts">
	import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform';

	let { pills } = $props<{
		pills: Array<{ label: string; active: boolean }>;
	}>();

	function pillClasses(pill: { label: string; active: boolean }) {
		if (!pill.active) {
			return 'border-black/10 bg-white/35 text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-400';
		}

		switch (pill.label) {
			case 'Listening':
				return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 shadow-[0_12px_30px_-20px_rgba(52,211,153,0.65)] dark:text-emerald-300';
			case 'Pasted':
				return 'border-stone-900/20 bg-stone-950 text-stone-50 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.42)] dark:border-white/10';
			default:
				return 'border-black/10 bg-white/65 text-stone-900 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-stone-100';
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
