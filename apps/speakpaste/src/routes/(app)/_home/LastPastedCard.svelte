<script lang="ts">
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform';
	import ClockIcon from '@lucide/svelte/icons/clock';
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
	<div class="group relative w-full min-w-0 rounded-2xl bg-card border border-border shadow-sm p-4 transition-all duration-200 hover:shadow-md">
		<div class="flex min-w-0 items-center justify-between gap-3 mb-3">
			<div class="flex min-w-0 items-center gap-2">
				<FileTextIcon class="size-4 text-muted-foreground" />
				<span class="text-sm font-semibold text-foreground">Last pasted</span>
			</div>
			
			<div class="flex shrink-0 items-center gap-2">
				<!-- Performance timing indicator -->
				<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
					⚡ local gpu
				</span>
				<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
					<ClockIcon class="size-3.5" />
					<span>{timeAgo(lastPasted.recordedAt)}</span>
				</div>
			</div>
		</div>
		<div class="relative px-4 mb-1">
			<span class="absolute left-0 top-0 text-2xl text-muted-foreground/30 leading-none font-serif">"</span>
			<p class="text-sm text-foreground leading-relaxed line-clamp-3 select-text">{lastPasted.transcript}</p>
			<span class="absolute right-0 bottom-0 text-2xl text-muted-foreground/30 leading-none font-serif">"</span>
		</div>
		
		<!-- Action row at bottom right, reveals on hover -->
		<div class="absolute bottom-2.5 right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity duration-200 bg-card/90 backdrop-blur-xs pl-2 py-0.5 rounded-lg">
			<button 
				onclick={() => copyTranscript(lastPasted.transcript)}
				class="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
				title="Copy to Clipboard"
			>
				<ClipboardIcon class="size-3.5" />
			</button>
			<button 
				onclick={() => deleteRecording(lastPasted.id)}
				class="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
				title="Delete Recording"
			>
				<TrashIcon class="size-3.5" />
			</button>
		</div>
	</div>
{/if}
