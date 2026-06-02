<script lang="ts">
	import MicIcon from '@lucide/svelte/icons/mic';
	import { commandCallbacks } from '$lib/commands';

	let { recorderState, isTranscribing, justPasted } = $props<{
		recorderState: string;
		isTranscribing: boolean;
		justPasted: boolean;
	}>();

	const isReady = $derived(recorderState === 'IDLE' && !isTranscribing && !justPasted);
	const isListening = $derived(recorderState === 'RECORDING');
	const isProcessing = $derived(isTranscribing);
	const isConfirmed = $derived(justPasted);
</script>

<div class="flex flex-col items-center justify-center py-6 gap-6">
	<div class="relative flex items-center justify-center">
		<div class="absolute h-[14.5rem] w-[14.5rem] rounded-full bg-stone-950/[0.04] dark:bg-white/[0.04]"></div>

		{#if isReady}
			<div class="glow-soft absolute h-[13rem] w-[13rem] rounded-full border border-emerald-300/15 bg-emerald-500/[0.04]"></div>
			<div class="absolute h-[11.5rem] w-[11.5rem] rounded-full border border-stone-400/25 dark:border-white/10"></div>
		{/if}

		{#if isListening}
			<div class="ring-breathe absolute h-[14rem] w-[14rem] rounded-full border border-emerald-300/25"></div>
			<div class="absolute h-[12.25rem] w-[12.25rem] rounded-full border border-cyan-300/25"></div>
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
				<svg class="h-[12.5rem] w-[12.5rem] opacity-70" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
					<circle cx="100" cy="100" r="74" stroke="rgba(52, 211, 153, 0.18)" stroke-width="1.5" class="wave-rotate" />
					<circle cx="100" cy="100" r="58" stroke="rgba(56, 189, 248, 0.18)" stroke-width="1.5" class="wave-rotate-reverse" />
					<path d="M48 102 C60 84 72 84 84 102 C96 120 108 120 120 102 C132 84 144 84 156 102" stroke="rgba(52, 211, 153, 0.55)" stroke-width="3" stroke-linecap="round" class="wave-breathe" />
					<path d="M58 118 C70 106 82 106 94 118 C106 130 118 130 130 118 C142 106 150 106 160 118" stroke="rgba(56, 189, 248, 0.36)" stroke-width="2" stroke-linecap="round" class="wave-breathe-delayed" />
				</svg>
			</div>
		{/if}

		{#if isProcessing}
			<div class="absolute h-[13.5rem] w-[13.5rem] rounded-full border border-stone-400/20 bg-white/35 dark:bg-white/5"></div>
			<div class="scan-ring absolute h-[12.25rem] w-[12.25rem] rounded-full border border-cyan-300/40"></div>
		{/if}

		{#if isConfirmed}
			<div class="flash-ring absolute h-[13.75rem] w-[13.75rem] rounded-full bg-emerald-400/10"></div>
			<div class="absolute h-[11.75rem] w-[11.75rem] rounded-full border border-emerald-300/25"></div>
		{/if}

		<button
			onclick={() => commandCallbacks.toggleManualRecording()}
			class="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border border-white/80 bg-white/82 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] transition-all duration-200 hover:shadow-[0_28px_70px_-44px_rgba(15,23,42,0.9)] active:scale-95 dark:border-white/10 dark:bg-white/10"
			aria-label={isListening ? 'Stop recording' : 'Start recording'}
		>
			<MicIcon
				class="h-10 w-10 {isListening ? 'text-emerald-500' : isProcessing ? 'text-cyan-500' : isConfirmed ? 'text-emerald-500' : 'text-stone-800 dark:text-stone-100'}"
				strokeWidth={1.6}
			/>
		</button>
	</div>
</div>

<style>
	@keyframes glowSoft {
		0%, 100% { opacity: 0.18; transform: scale(1); }
		50% { opacity: 0.32; transform: scale(1.02); }
	}

	@keyframes waveBreathe {
		0%, 100% { transform: translateY(0); opacity: 0.58; }
		50% { transform: translateY(-5px); opacity: 1; }
	}

	@keyframes waveRotate {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@keyframes ringBreathe {
		0%, 100% { transform: scale(0.98); opacity: 0.38; }
		50% { transform: scale(1.04); opacity: 0.72; }
	}

	@keyframes scanRing {
		0% { box-shadow: inset 0 0 0 0 rgba(56, 189, 248, 0.18); }
		50% { box-shadow: inset 0 0 0 12px rgba(56, 189, 248, 0.1); }
		100% { box-shadow: inset 0 0 0 0 rgba(56, 189, 248, 0.18); }
	}

	@keyframes flashRing {
		0%, 100% { opacity: 0.18; transform: scale(1); }
		50% { opacity: 0.36; transform: scale(1.02); }
	}

	.glow-soft {
		animation: glowSoft 4s ease-in-out infinite;
	}

	.wave-breathe {
		animation: waveBreathe 3.5s ease-in-out infinite;
	}

	.wave-breathe-delayed {
		animation: waveBreathe 3.5s ease-in-out infinite 0.55s;
	}

	.wave-rotate {
		animation: waveRotate 24s linear infinite;
		transform-origin: center;
	}

	.wave-rotate-reverse {
		animation: waveRotate 18s linear infinite reverse;
		transform-origin: center;
	}

	.ring-breathe {
		animation: ringBreathe 2.8s ease-in-out infinite;
	}

	.scan-ring {
		animation: scanRing 2.5s ease-in-out infinite;
	}

	.flash-ring {
		animation: flashRing 1.8s ease-in-out infinite;
	}
</style>
