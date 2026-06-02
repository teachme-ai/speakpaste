<script lang="ts">
	import ClockIcon from '@lucide/svelte/icons/clock';
	import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	let { recentItems, timeAgo, copyTranscript, deleteRecording } = $props<{
		recentItems: Array<{ id: string; filename: string; transcript: string; recordedAt: string }>;
		timeAgo: (dateStr: string) => string;
		copyTranscript: (transcript: string) => Promise<void>;
		deleteRecording: (id: string) => Promise<void>;
	}>();
</script>

{#if recentItems.length > 0}
	<div class="w-full min-w-0 overflow-hidden rounded-[24px] border border-black/10 bg-white/48 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
		<div class="flex items-center gap-2 border-b border-black/10 px-4 py-3 dark:border-white/10">
			<ClockIcon class="size-4 text-stone-500 dark:text-stone-400" />
			<span class="text-sm font-semibold text-stone-950 dark:text-stone-50">Recent captures</span>
		</div>
		<div class="divide-y divide-black/10 dark:divide-white/10">
			{#each recentItems as item}
				<div class="group relative flex min-w-0 items-start gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-white/50 dark:hover:bg-white/5">
					<div class="size-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
						<AudioWaveformIcon class="size-3.5 text-emerald-700 dark:text-emerald-300" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="truncate text-sm text-stone-800 select-text dark:text-stone-200">{item.transcript}</p>
					</div>
					<span class="text-xs text-stone-500 whitespace-nowrap shrink-0 pr-8 dark:text-stone-400">{timeAgo(item.recordedAt)}</span>
					
					<!-- Action buttons overlaying the far right side on hover -->
					<div class="absolute right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-200 bg-white/90 pl-2 py-1 rounded-lg dark:bg-stone-950/90">
						<button 
							onclick={() => copyTranscript(item.transcript)}
							class="p-1 rounded-md hover:bg-stone-900/5 text-stone-500 hover:text-stone-950 transition-colors dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-stone-50"
							title="Copy to Clipboard"
						>
							<ClipboardIcon class="size-3.5" />
						</button>
						<button 
							onclick={() => deleteRecording(item.id)}
							class="p-1 rounded-md hover:bg-destructive/10 text-stone-500 hover:text-destructive transition-colors dark:text-stone-400"
							title="Delete"
						>
							<TrashIcon class="size-3.5" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
