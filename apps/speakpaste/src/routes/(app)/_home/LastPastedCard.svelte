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
	<div class="group relative w-full min-w-0 overflow-hidden rounded-[28px] border border-border bg-card/60 p-5 shadow-sm transition-all duration-200 hover:bg-card/85 hover:shadow-md">
		<div class="flex items-center justify-between gap-3 mb-4">
			<div class="flex items-center gap-2">
				<span class="inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_8px_var(--ring)]"></span>
				<span class="text-sm font-semibold text-foreground">Latest capture</span>
			</div>
			<span class="text-xs uppercase tracking-[0.24em] text-muted-foreground">{timeAgo(lastPasted.recordedAt)}</span>
		</div>

		<div class="relative border-l-2 border-primary/50 pl-4">
			<p class="text-sm leading-7 text-foreground/90 select-text">{lastPasted.transcript}</p>
		</div>

		<div class="absolute right-3 bottom-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
			<button
				onclick={() => copyTranscript(lastPasted.transcript)}
				class="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				title="Copy to Clipboard"
			>
				<ClipboardIcon class="size-4" />
			</button>
			<button
				onclick={() => deleteRecording(lastPasted.id)}
				class="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
				title="Delete Recording"
			>
				<TrashIcon class="size-4" />
			</button>
		</div>
	</div>
{/if}
