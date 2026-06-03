<script lang="ts">
	import SettingsPopover from './SettingsPopover.svelte';
</script>

<div class="relative w-full flex items-start justify-center px-5 pt-8 pb-3">
	<div class="flex flex-col items-center justify-center text-center">
		<p class="text-[10px] font-semibold uppercase tracking-[0.34em] text-emerald-700/80 dark:text-emerald-300/80">
			Private voice-to-cursor
		</p>
		<h1 class="mt-1 text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
			SpeakPaste
		</h1>
		<p class="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
			Local dictation, shaped on this Mac.
		</p>
	</div>

	<div class="absolute top-6 right-6">
		<SettingsPopover />
	</div>
</div>
