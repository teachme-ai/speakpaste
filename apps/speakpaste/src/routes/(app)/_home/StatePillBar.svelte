<script lang="ts">
	import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform';

	let { pills } = $props<{
		pills: Array<{ label: string; active: boolean }>;
	}>();
</script>

<div class="flex items-center justify-center gap-2 px-6 pt-4 pb-8 flex-wrap" role="status" aria-live="polite">
	{#each pills as pill}
		<span class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border {
			pill.active
				? pill.label === 'Listening'
					? 'bg-destructive/10 border-destructive/40 text-destructive shadow-sm shadow-destructive/20'
					: pill.label === 'Transcribing locally'
					? 'bg-primary/10 border-primary/40 text-primary shadow-sm shadow-primary/20'
					: pill.label === 'Pasted'
					? 'bg-success/10 border-success/40 text-success shadow-sm shadow-success/20'
					: 'bg-card border-primary/40 text-primary shadow-sm'
				: 'bg-card/40 border-border/40 text-muted-foreground backdrop-blur-xs'
		}">
			{#if pill.active}
				{#if pill.label === 'Listening'}
					<span class="relative flex size-2 shrink-0">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
					</span>
				{:else if pill.label === 'Transcribing locally'}
					<svg class="animate-spin size-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				{:else if pill.label === 'Pasted'}
					<svg class="size-3.5 text-success shrink-0" viewBox="0 0 16 16" fill="none">
						<path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				{:else}
					<span class="size-2 rounded-full bg-primary shrink-0"></span>
				{/if}
			{:else}
				{#if pill.label === 'Listening'}
					<AudioWaveformIcon class="size-3.5 text-muted-foreground shrink-0" />
				{:else if pill.label === 'Transcribing locally'}
					<AudioWaveformIcon class="size-3.5 text-muted-foreground shrink-0" />
				{:else if pill.label === 'Pasted'}
					<svg class="size-3.5 text-muted-foreground shrink-0" viewBox="0 0 16 16" fill="none">
						<path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				{/if}
			{/if}
			{pill.label}
		</span>
	{/each}
</div>
