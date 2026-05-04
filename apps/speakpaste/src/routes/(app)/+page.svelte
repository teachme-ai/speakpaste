<script lang="ts">
	import { Switch } from '@epicenter/ui/switch';
	import * as Popover from '@epicenter/ui/popover';
	import { createQuery } from '@tanstack/svelte-query';
	import MicIcon from '@lucide/svelte/icons/mic';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import { commandCallbacks } from '$lib/commands';
	import { rpc } from '$lib/query';
	import { recordings } from '$lib/state/recordings.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';

	const getRecorderStateQuery = createQuery(
		() => rpc.recorder.getRecorderState.options,
	);

	const recorderState = $derived(getRecorderStateQuery.data ?? 'IDLE');

	// Derive UI state label from recorder state
	const isTranscribing = $derived(
		recordings.sorted[0]?.transcriptionStatus === 'TRANSCRIBING',
	);

	const stateLabel = $derived(
		recorderState === 'RECORDING'
			? 'Listening'
			: isTranscribing
				? 'Transcribing locally'
				: 'Ready',
	);

	// Last pasted = most recent DONE recording
	const lastPasted = $derived(
		recordings.sorted.find((r) => r.transcriptionStatus === 'DONE'),
	);

	// Recent = last 3 DONE recordings
	const recentItems = $derived(
		recordings.sorted
			.filter((r) => r.transcriptionStatus === 'DONE' && r.transcript.trim())
			.slice(0, 3),
	);

	// Auto-paste toggle — maps to output.transcription.cursor
	const autoPaste = $derived(settings.get('output.transcription.cursor'));

	// Current model name from path
	const modelPath = $derived(deviceConfig.get('transcription.whispercpp.modelPath'));
	const modelLabel = $derived(() => {
		const match = WHISPER_MODELS.find((m) => modelPath.endsWith(m.file.filename));
		return match?.id ?? 'tiny.en';
	});

	function timeAgo(dateStr: string) {
		try {
			return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
		} catch {
			return '';
		}
	}

	// Button ring color by state
	const ringClass = $derived(
		recorderState === 'RECORDING'
			? 'ring-4 ring-blue-400/60 bg-blue-50 dark:bg-blue-950/30'
			: isTranscribing
				? 'ring-4 ring-amber-400/60 bg-amber-50 dark:bg-amber-950/30'
				: 'ring-4 ring-transparent bg-white dark:bg-neutral-800 hover:ring-blue-200 dark:hover:ring-blue-800',
	);
</script>

<svelte:head><title>SpeakPaste</title></svelte:head>

<!-- Top-right settings gear -->
<div class="absolute top-4 right-4 z-10">
	<Popover.Root>
		<Popover.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
					aria-label="Settings"
				>
					<SettingsIcon class="size-5" />
				</button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-72 p-4" align="end" sideOffset={8}>
			<div class="flex flex-col gap-4">
				<!-- Trigger mode -->
				<div class="flex items-center justify-between">
					<span class="text-sm">Trigger mode</span>
					<span class="text-sm text-muted-foreground border rounded px-2 py-0.5">Hold to speak</span>
				</div>

				<!-- Model -->
				<div class="flex items-center justify-between">
					<span class="text-sm">Model</span>
					<select
						class="text-sm border rounded px-2 py-0.5 bg-background"
						value={modelLabel()}
						onchange={(e) => {
							const selected = WHISPER_MODELS.find((m) => m.id === e.currentTarget.value);
							if (selected) {
								const dir = modelPath.substring(0, modelPath.lastIndexOf('/') + 1);
								deviceConfig.set('transcription.whispercpp.modelPath', dir + selected.file.filename);
							}
						}}
					>
						{#each WHISPER_MODELS as model}
							<option value={model.id}>{model.id}</option>
						{/each}
					</select>
				</div>

				<!-- Auto-paste -->
				<div class="flex items-center justify-between">
					<span class="text-sm">Auto-paste</span>
					<Switch
						checked={autoPaste}
						onCheckedChange={(v) => settings.set('output.transcription.cursor', v)}
					/>
				</div>

				<!-- History limit -->
				<div class="flex items-center justify-between">
					<span class="text-sm">History limit</span>
					<input
						type="number"
						min="1"
						max="500"
						class="text-sm border rounded px-2 py-0.5 w-16 bg-background text-right"
						value={settings.get('retention.maxCount')}
						onchange={(e) => {
							const v = parseInt(e.currentTarget.value);
							if (v > 0) settings.set('retention.maxCount', v);
						}}
					/>
				</div>

				<hr class="border-border" />

				<!-- Clear history -->
				<button
					class="text-sm text-left text-muted-foreground hover:text-destructive transition-colors"
					onclick={() => {
						recordings.sorted.forEach((r) => recordings.delete(r.id));
					}}
				>
					Clear history...
				</button>
			</div>
		</Popover.Content>
	</Popover.Root>
</div>

<!-- Main content -->
<div class="flex flex-1 flex-col items-center justify-start gap-6 w-full max-w-2xl mx-auto px-6 pt-10 pb-6">

	<!-- Title -->
	<div class="flex flex-col items-center gap-1 text-center">
		<h1 class="text-4xl font-bold tracking-tight text-foreground">SpeakPaste</h1>
		<p class="text-muted-foreground text-base">Local voice typing for any Mac app.</p>
	</div>

	<!-- State pills -->
	<div class="flex items-center gap-2 flex-wrap justify-center">
		{#each [
			{ label: 'Ready', active: recorderState === 'IDLE' && !isTranscribing },
			{ label: 'Listening', active: recorderState === 'RECORDING' },
			{ label: 'Transcribing locally', active: isTranscribing },
			{ label: 'Pasted', active: false },
		] as pill}
			<span class="flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm transition-all {
				pill.active
					? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
					: 'border-border text-muted-foreground'
			}">
				{#if pill.active}
					<span class="size-2 rounded-full bg-blue-500 animate-pulse"></span>
				{/if}
				{pill.label}
			</span>
		{/each}
	</div>

	<!-- Microphone button -->
	<button
		onclick={() => commandCallbacks.toggleManualRecording()}
		class="size-32 rounded-full shadow-md transition-all duration-200 flex items-center justify-center {ringClass}"
		aria-label={recorderState === 'RECORDING' ? 'Stop recording' : 'Start recording'}
	>
		<MicIcon class="size-10 {recorderState === 'RECORDING' ? 'text-blue-500' : 'text-blue-400'}" />
	</button>

	<!-- Hint text -->
	<div class="flex flex-col items-center gap-0.5 text-center">
		<p class="text-sm text-foreground/80">Hold Fn / Globe to speak</p>
		<p class="text-sm text-muted-foreground">Release to transcribe and paste</p>
	</div>

	<!-- Engine status -->
	<div class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/40 text-sm text-muted-foreground">
		<span class="size-2 rounded-full bg-green-500"></span>
		<span>Local · whisper.cpp · {modelLabel()}</span>
		<ShieldIcon class="size-3.5 text-muted-foreground/60" />
	</div>

	<!-- Auto-paste toggle -->
	<div class="flex items-center justify-between w-full max-w-sm px-4 py-2.5 rounded-xl border border-border bg-background shadow-xs">
		<span class="text-sm font-medium">Auto-paste</span>
		<Switch
			checked={autoPaste}
			onCheckedChange={(v) => settings.set('output.transcription.cursor', v)}
		/>
	</div>

	<!-- Last pasted card -->
	{#if lastPasted?.transcript}
		<div class="w-full max-w-sm rounded-xl border border-border bg-background shadow-xs p-4 flex flex-col gap-1">
			<span class="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Last pasted</span>
			<div class="flex items-start justify-between gap-2">
				<p class="text-sm text-foreground leading-relaxed line-clamp-2">{lastPasted.transcript}</p>
				<span class="text-xs text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
					{timeAgo(lastPasted.recordedAt)}
				</span>
			</div>
		</div>
	{/if}

	<!-- Recent history -->
	{#if recentItems.length > 0}
		<div class="w-full max-w-sm rounded-xl border border-border bg-background shadow-xs p-4 flex flex-col gap-2">
			<span class="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Recent</span>
			<div class="flex flex-col divide-y divide-border">
				{#each recentItems as item}
					<div class="flex items-center gap-2 py-2">
						<ClockIcon class="size-3.5 text-muted-foreground shrink-0" />
						<p class="text-sm text-foreground flex-1 truncate">{item.transcript}</p>
						<span class="text-xs text-muted-foreground whitespace-nowrap shrink-0">
							{timeAgo(item.recordedAt)}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
