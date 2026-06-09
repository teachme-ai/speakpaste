<script lang="ts">
	import SettingsPopover from './SettingsPopover.svelte';
</script>

<div class="relative w-full flex items-start justify-center px-5 pt-6 pb-1" data-tauri-drag-region>
	<div class="flex flex-col items-center justify-center text-center" data-tauri-drag-region>
		<img
			src="/apple-touch-icon.png"
			alt=""
			class="mb-3 size-16 rounded-[20px] shadow-lg shadow-black/10 ring-1 ring-black/10 dark:shadow-emerald-950/20 dark:ring-white/10"
		/>
		<p class="text-[13px] font-semibold uppercase tracking-[0.22em] text-primary">
			Private voice-to-cursor
		</p>
		<h1 class="mt-1 text-[33px] font-bold leading-none tracking-tight text-foreground">
			Mynah
		</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Local dictation, shaped on this Mac.
		</p>
	</div>

	<div class="absolute top-5 right-5">
		<SettingsPopover />
	</div>
</div>
