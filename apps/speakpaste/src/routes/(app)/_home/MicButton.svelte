<script lang="ts">
	import MicIcon from '@lucide/svelte/icons/mic';
	import { commandCallbacks } from '$lib/commands';

	let { recorderState } = $props<{ recorderState: string }>();
</script>

<div class="flex flex-col items-center justify-center py-6 gap-8">
	<div class="relative flex items-center justify-center">
		<!-- Outer glow rings -->
		<div class="absolute size-40 rounded-full bg-primary/15 {recorderState === 'RECORDING' ? 'animate-ping' : ''}"></div>
		<div class="absolute size-32 rounded-full bg-primary/20"></div>
		<div class="absolute size-28 rounded-full bg-primary/25"></div>
		
		<!-- Waveform lines (organic liquid SVG) -->
		{#if recorderState === 'RECORDING'}
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full scale-110">
				<svg class="w-full h-full opacity-20" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
					<path fill="var(--color-primary)" d="M40,-53C53.7,-45.5,65.8,-32.7,71.2,-17.4C76.6,-2,75.3,15.8,68.4,30.3C61.5,44.8,49,56,34.7,63.1C20.3,70.2,4,73.2,-12.3,71.4C-28.5,69.5,-44.7,62.8,-56.3,51.3C-67.9,39.8,-75,23.5,-75.7,6.9C-76.3,-9.7,-70.6,-26.6,-60.9,-38.5C-51.1,-50.3,-37.4,-57.1,-23.7,-64.1C-10,-71,3.7,-78,18.1,-76.4C32.5,-74.8,47.7,-64.7,40,-53Z" transform="translate(100 100)" class="animate-blob-slow" />
					<path fill="var(--color-primary)" d="M35.6,-48C46.8,-40,57,-29.3,61.8,-16.1C66.5,-2.9,65.7,12.8,59.3,25.8C52.9,38.8,40.8,49,27.1,55C13.4,61,-1.9,62.7,-16.9,59.9C-31.9,57.1,-46.6,49.8,-55.8,38.2C-65.1,26.5,-68.9,10.6,-67.2,-4.5C-65.5,-19.6,-58.3,-33.9,-47.5,-42C-36.8,-50,-22.4,-51.9,-9.2,-50.3C4.1,-48.7,17.4,-43.6,35.6,-48Z" transform="translate(100 100)" class="animate-blob-fast" />
				</svg>
			</div>
		{/if}
		
		<!-- Main button -->
		<button
			onclick={() => commandCallbacks.toggleManualRecording()}
			class="relative z-10 size-20 rounded-full bg-card shadow-lg border border-primary/20 flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95"
			aria-label={recorderState === 'RECORDING' ? 'Stop recording' : 'Start recording'}
		>
			<MicIcon class="size-8 text-primary" strokeWidth={1.5} />
		</button>
	</div>
</div>
