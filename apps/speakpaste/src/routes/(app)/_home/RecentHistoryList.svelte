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
	<div class="mac-material w-full min-w-0 overflow-hidden rounded-xl border border-border">
		<div class="flex items-center gap-2 border-b border-border px-4 py-3">
			<ClockIcon class="size-4 text-muted-foreground" />
			<span class="text-sm font-semibold text-foreground">Recent captures</span>
		</div>
		<div class="divide-y divide-border">
			{#each recentItems as item}
				<div class="group relative flex min-w-0 items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent">
					<div class="size-7 rounded-lg bg-primary/12 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
						<AudioWaveformIcon class="size-3.5 text-primary" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="truncate text-[15px] text-foreground/90 select-text">{item.transcript}</p>
					</div>
					<span class="text-xs text-muted-foreground whitespace-nowrap shrink-0 pr-8">{timeAgo(item.recordedAt)}</span>
					
					<!-- Action buttons overlaying the far right side on hover -->
					<div class="absolute right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-200 bg-card/90 pl-2 py-1 rounded-lg">
						<button 
							onclick={() => copyTranscript(item.transcript)}
							class="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
							title="Copy to Clipboard"
						>
							<ClipboardIcon class="size-3.5" />
						</button>
						<button 
							onclick={() => deleteRecording(item.id)}
							class="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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
