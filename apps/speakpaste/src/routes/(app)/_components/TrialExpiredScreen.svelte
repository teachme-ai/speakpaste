<script lang="ts">
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';

	let { errorMsg } = $props<{ errorMsg?: string | null }>();

	async function openPricing() {
		if (window.__TAURI_INTERNALS__) {
			try {
				const { openPath } = await import('@tauri-apps/plugin-opener');
				await openPath('https://mynah.site/#pricing');
			} catch (e) {
				console.error('Failed to open pricing URL:', e);
			}
		} else {
			window.open('https://mynah.site/#pricing', '_blank');
		}
	}
</script>

<div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-8 select-none overflow-hidden">
	<!-- Ambient Background Gradients -->
	<div class="absolute top-[-20%] left-[-25%] w-[80%] h-[80%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none"></div>
	<div class="absolute bottom-[-20%] right-[-25%] w-[80%] h-[80%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none"></div>

	<!-- Main Card Container -->
	<div class="w-full max-w-[420px] text-center space-y-8 relative z-10">
		<!-- Branding / Icon Header -->
		<div class="flex flex-col items-center space-y-3">
			<div class="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-2xl">
				<img src="/public/mynah_icon_highres.png" alt="Mynah" class="w-14 h-14" />
				<div class="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-zinc-950 border-2 border-zinc-950">
					<SparklesIcon class="w-3.5 h-3.5 fill-current" />
				</div>
			</div>
			<div class="space-y-1">
				<h1 class="text-3xl font-bold tracking-tight text-white font-outfit">Mynah</h1>
				<p class="text-zinc-500 text-xs font-semibold uppercase tracking-widest">On-Device Mac Dictation</p>
			</div>
		</div>

		<!-- Status Info -->
		<div class="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-md space-y-4">
			<div class="flex items-center justify-center space-x-2 text-emerald-400 font-medium">
				<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
				<span class="text-sm tracking-wide">60-Day Trial Expired</span>
			</div>

			<p class="text-zinc-300 text-sm leading-relaxed">
				Thank you for trying Mynah! Your 60-day free trial has completed. 
				To keep typing naturally with on-device dictation and pasting directly to your cursor, please upgrade to a lifetime license.
			</p>

			{#if errorMsg}
				<div class="flex items-start gap-2.5 bg-red-950/20 border border-red-900/30 rounded-xl p-3 text-left">
					<ShieldAlertIcon class="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
					<p class="text-xs text-red-300/90 leading-normal font-mono">{errorMsg}</p>
				</div>
			{/if}
		</div>

		<!-- Upgrade Actions -->
		<div class="space-y-4">
			<button
				onclick={openPricing}
				class="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-semibold text-sm tracking-wide shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:shadow-none transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2"
			>
				<span>Upgrade to Lifetime License</span>
			</button>

			<div class="flex flex-col items-center space-y-1">
				<p class="text-zinc-500 text-xs">One-time payment · Lifetime access</p>
				<p class="text-zinc-600 text-[10px]">No subscriptions. Keep your data private on your Mac.</p>
			</div>
		</div>
	</div>
</div>
