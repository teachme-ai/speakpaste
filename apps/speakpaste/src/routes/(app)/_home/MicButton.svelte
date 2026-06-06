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
		<div class="absolute h-[14.5rem] w-[14.5rem] rounded-full bg-border/20"></div>

		{#if isReady}
			<div class="glow-soft absolute h-[13rem] w-[13rem] rounded-full border border-primary/20 bg-primary/5"></div>
			<div class="absolute h-[11.5rem] w-[11.5rem] rounded-full border border-border"></div>
		{/if}

		{#if isListening}
			<!-- Continuous radiating sonar ripples using the active theme's primary color -->
			<div class="haptic-sonar absolute h-28 w-28 rounded-full border-2 border-primary/60" style="animation-delay: 0s;"></div>
			<div class="haptic-sonar absolute h-28 w-28 rounded-full border-2 border-primary/60" style="animation-delay: 0.4s;"></div>
			<div class="haptic-sonar absolute h-28 w-28 rounded-full border-2 border-primary/60" style="animation-delay: 0.8s;"></div>

			<div class="ring-breathe absolute h-[14rem] w-[14rem] rounded-full border border-primary/30"></div>
			<div class="absolute h-[12.25rem] w-[12.25rem] rounded-full border border-primary/25"></div>
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
				<svg class="h-[12.5rem] w-[12.5rem] opacity-75" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
					<circle cx="100" cy="100" r="74" stroke="var(--primary)" stroke-opacity="0.25" stroke-width="1.5" class="wave-rotate" />
					<circle cx="100" cy="100" r="58" stroke="var(--primary)" stroke-opacity="0.35" stroke-width="1.5" class="wave-rotate-reverse" />
					<path d="M48 102 C60 84 72 84 84 102 C96 120 108 120 120 102 C132 84 144 84 156 102" stroke="var(--primary)" stroke-opacity="0.75" stroke-width="3.5" stroke-linecap="round" class="wave-breathe" />
					<path d="M58 118 C70 106 82 106 94 118 C106 130 118 130 130 118 C142 106 150 106 160 118" stroke="var(--primary)" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" class="wave-breathe-delayed" />
				</svg>
			</div>
		{/if}

		{#if isProcessing}
			<div class="haptic-ripple-processing absolute h-28 w-28 rounded-full border-2 border-primary"></div>
			<div class="absolute h-[13.5rem] w-[13.5rem] rounded-full border border-border bg-card/40"></div>
			<div class="scan-ring absolute h-[12.25rem] w-[12.25rem] rounded-full border border-primary/50"></div>
		{/if}

		{#if isConfirmed}
			<div class="haptic-ripple-success absolute h-28 w-28 rounded-full border-2 border-success"></div>
			<div class="flash-ring absolute h-[13.75rem] w-[13.75rem] rounded-full bg-success/15"></div>
			<div class="absolute h-[11.75rem] w-[11.75rem] rounded-full border border-success/30"></div>
		{/if}

		<button
			onclick={() => commandCallbacks.toggleManualRecording()}
			class="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border border-border bg-card shadow-[0_20px_50px_-32px_rgba(0,0,0,0.25)] transition-transform duration-75 hover:scale-105 active:scale-90"
			aria-label={isListening ? 'Stop recording' : 'Start recording'}
		>
			<MicIcon
				class="h-10 w-10 {isListening ? 'text-primary' : isProcessing ? 'text-primary animate-pulse' : isConfirmed ? 'text-success' : 'text-primary'}"
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
		50% { transform: translateY(-3px); opacity: 1; }
	}

	@keyframes waveRotate {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@keyframes ringBreathe {
		0%, 100% { transform: scale(0.98); opacity: 0.38; }
		50% { transform: scale(1.03); opacity: 0.72; }
	}

	@keyframes scanRing {
		0% { box-shadow: inset 0 0 0 0 var(--primary); }
		50% { box-shadow: inset 0 0 0 10px var(--primary); opacity: 0.25; }
		100% { box-shadow: inset 0 0 0 0 var(--primary); }
	}

	@keyframes flashRing {
		0%, 100% { opacity: 0.15; transform: scale(1); }
		50% { opacity: 0.30; transform: scale(1.02); }
	}

	@keyframes hapticRipple {
		0% { transform: scale(1); opacity: 0.85; }
		100% { transform: scale(1.75); opacity: 0; }
	}

	@keyframes hapticSonar {
		0% { transform: scale(1); opacity: 0.8; }
		100% { transform: scale(2.4); opacity: 0; }
	}

	.glow-soft {
		animation: glowSoft 3s ease-in-out infinite;
	}

	.wave-breathe {
		animation: waveBreathe 1.2s ease-in-out infinite;
	}

	.wave-breathe-delayed {
		animation: waveBreathe 1.2s ease-in-out infinite 0.2s;
	}

	.wave-rotate {
		animation: waveRotate 14s linear infinite;
		transform-origin: center;
	}

	.wave-rotate-reverse {
		animation: waveRotate 11s linear infinite reverse;
		transform-origin: center;
	}

	.ring-breathe {
		animation: ringBreathe 1.4s ease-in-out infinite;
	}

	.scan-ring {
		animation: scanRing 2s ease-in-out infinite;
	}

	.flash-ring {
		animation: flashRing 1.4s ease-in-out infinite;
	}

	.haptic-ripple {
		animation: hapticRipple 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		pointer-events: none;
	}

	.haptic-ripple-success {
		animation: hapticRipple 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		pointer-events: none;
	}

	.haptic-ripple-processing {
		animation: hapticRipple 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		pointer-events: none;
	}

	.haptic-sonar {
		animation: hapticSonar 1.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
		pointer-events: none;
	}
</style>
