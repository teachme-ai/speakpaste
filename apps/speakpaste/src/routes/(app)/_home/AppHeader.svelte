<script lang="ts">
	import SettingsPopover from './SettingsPopover.svelte';
	import ListIcon from '@lucide/svelte/icons/list';
</script>

<div class="relative w-full flex items-start justify-center px-5 pt-8 pb-3">
	<div class="absolute top-6 left-6">
		<a
			href="/recordings"
			class="flex size-9 items-center justify-center rounded-full border border-black/10 bg-white/55 text-stone-500 shadow-sm transition-colors hover:bg-white/80 hover:text-stone-900 dark:border-white/10 dark:bg-white/10 dark:text-stone-400 dark:hover:bg-white/15 dark:hover:text-stone-50"
			aria-label="All Recordings"
		>
			<ListIcon class="size-4" />
		</a>
	</div>

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
