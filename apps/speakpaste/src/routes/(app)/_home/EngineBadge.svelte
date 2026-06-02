<script lang="ts">
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

	let { modelLabel } = $props<{ modelLabel: string }>();
</script>

<div class="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/55 px-4 py-2 text-sm text-stone-900 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-stone-100">
	<span class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_8px_rgba(52,211,153,0.16)]"></span>
	<div class="flex flex-col leading-tight">
		<span class="font-semibold">On-device signal</span>
		<span class="text-xs text-stone-500 dark:text-stone-400">whisper.cpp · {modelLabel}</span>
	</div>
	<div class="inline-flex h-9 w-px bg-black/10 dark:bg-white/10" aria-hidden="true"></div>
	<ShieldCheckIcon class="size-4 text-emerald-700 dark:text-emerald-300" />
</div>
