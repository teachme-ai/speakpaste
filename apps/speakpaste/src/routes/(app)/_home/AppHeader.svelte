<script lang="ts">
	import SettingsPopover from './SettingsPopover.svelte';
</script>

<div class="relative w-full flex items-start justify-center px-5 pt-8 pb-3">
	<div class="flex flex-col items-center justify-center text-center">
		<img
			src="/apple-touch-icon.png"
			alt=""
			class="mb-3 size-14 rounded-[18px] shadow-lg shadow-black/10 ring-1 ring-black/10 dark:shadow-emerald-950/20 dark:ring-white/10"
		/>
		<p class="text-[10px] font-semibold uppercase tracking-[0.34em] text-emerald-700/80 dark:text-emerald-300/80">
			Private voice-to-cursor
		</p>
		<h1 class="mt-1 text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
			Mynah
		</h1>
		<p class="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
			Local dictation, shaped on this Mac.
		</p>
	</div>

	<div class="absolute top-6 right-6">
		<SettingsPopover />
	</div>
</div>
