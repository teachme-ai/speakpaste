<script lang="ts">
	import MicIcon from '@lucide/svelte/icons/mic';

	let { recorderState, isTranscribing, justPasted } = $props<{
		recorderState: string;
		isTranscribing: boolean;
		justPasted: boolean;
	}>();
</script>

<div class="fixed inset-0 flex items-center justify-center bg-transparent select-none drag overflow-hidden">
	<div class="flex items-center gap-3 px-4 py-2.5 rounded-full border border-white/20 bg-black/60 backdrop-blur-md shadow-2xl transition-all duration-300 transform scale-100 hover:scale-105 active:scale-95">
		{#if recorderState === 'RECORDING'}
			<div class="relative flex items-center justify-center size-5">
				<div class="absolute inset-0 rounded-full bg-destructive/40 animate-ping"></div>
				<MicIcon class="size-4 text-destructive relative" />
			</div>
			<span class="text-sm font-medium text-white tracking-wide">Listening...</span>
		{:else if isTranscribing}
			<svg class="animate-spin size-4 text-primary" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			<span class="text-sm font-medium text-white tracking-wide">Transcribing...</span>
		{:else if justPasted}
			<div class="flex items-center justify-center size-5 rounded-full bg-success/20">
				<svg class="size-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
				</svg>
			</div>
			<span class="text-sm font-medium text-success tracking-wide">Pasted!</span>
		{/if}
	</div>
</div>
