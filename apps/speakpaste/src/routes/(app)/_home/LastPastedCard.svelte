<script lang="ts">
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	let { lastPasted, timeAgo, copyTranscript, deleteRecording } = $props<{
		lastPasted: { id: string; filename: string; transcript: string; recordedAt: string } | null;
		timeAgo: (dateStr: string) => string;
		copyTranscript: (transcript: string) => Promise<void>;
		deleteRecording: (id: string) => Promise<void>;
	}>();
</script>

{#if lastPasted}
	<div class="group relative w-full min-w-0 overflow-hidden rounded-[28px] border border-black/10 bg-white/58 p-5 shadow-sm transition-all duration-200 hover:bg-white/72 hover:shadow-md dark:border-white/10 dark:bg-white/[0.07] dark:hover:bg-white/10">
		<div class="flex items-center justify-between gap-3 mb-4">
			<div class="flex items-center gap-2">
				<span class="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_0_10px_rgba(56,189,248,0.14)]"></span>
				<span class="text-sm font-semibold text-stone-950 dark:text-stone-50">Latest capture</span>
			</div>
			<span class="text-xs uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">{timeAgo(lastPasted.recordedAt)}</span>
		</div>

		<div class="relative border-l-2 border-emerald-400/45 pl-4">
			<p class="text-sm leading-7 text-stone-800 select-text dark:text-stone-200">{lastPasted.transcript}</p>
		</div>

		<div class="absolute right-3 bottom-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
			<button
				onclick={() => copyTranscript(lastPasted.transcript)}
				class="inline-flex items-center justify-center rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-900/5 hover:text-stone-950 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-stone-50"
				title="Copy to Clipboard"
			>
				<ClipboardIcon class="size-4" />
			</button>
			<button
				onclick={() => deleteRecording(lastPasted.id)}
				class="inline-flex items-center justify-center rounded-full p-2 text-stone-500 transition-colors hover:bg-rose-500/10 hover:text-destructive dark:text-stone-400"
				title="Delete Recording"
			>
				<TrashIcon class="size-4" />
			</button>
		</div>
	</div>
{/if}
