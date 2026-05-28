<script lang="ts">
	import ClockIcon from '@lucide/svelte/icons/clock';
	import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	let { recentItems, timeAgo, copyTranscript, deleteRecording } = $props<{
		recentItems: Array<{ id: string; transcript: string; recordedAt: string }>;
		timeAgo: (dateStr: string) => string;
		copyTranscript: (transcript: string) => Promise<void>;
		deleteRecording: (id: string) => Promise<void>;
	}>();
</script>

{#if recentItems.length > 0}
	<div class="w-full min-w-0 rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
		<div class="flex items-center gap-2 px-4 py-3 border-b border-border">
			<ClockIcon class="size-4 text-muted-foreground" />
			<span class="text-sm font-semibold text-foreground">Recent</span>
		</div>
		<div class="divide-y divide-border">
			{#each recentItems as item}
				<div class="group relative flex min-w-0 items-start gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors duration-150">
					<div class="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
						<AudioWaveformIcon class="size-3.5 text-primary" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="line-clamp-2 text-sm leading-relaxed text-foreground break-words select-text">{item.transcript}</p>
					</div>
					<span class="text-xs text-muted-foreground whitespace-nowrap shrink-0 pr-8 pt-0.5">{timeAgo(item.recordedAt)}</span>
					
					<!-- Action buttons overlaying the far right side on hover -->
					<div class="absolute right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-200 bg-card/95 pl-2 py-1 rounded-lg">
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
