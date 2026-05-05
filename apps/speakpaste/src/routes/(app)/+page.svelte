<script lang="ts">
	import { Switch } from '@epicenter/ui/switch';
	import * as Popover from '@epicenter/ui/popover';
	import { createQuery } from '@tanstack/svelte-query';
	import MicIcon from '@lucide/svelte/icons/mic';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform';
	import HandIcon from '@lucide/svelte/icons/hand';
	import BoxIcon from '@lucide/svelte/icons/box';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import ListIcon from '@lucide/svelte/icons/list';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import { onMount, untrack } from 'svelte';
	import { rpc } from '$lib/query';
	import { recordings } from '$lib/state/recordings.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';

	import { PATHS } from '$lib/constants/paths';

	const getRecorderStateQuery = createQuery(
		() => rpc.recorder.getRecorderState.options,
	);

	const recorderState = $derived(getRecorderStateQuery.data ?? 'IDLE');

	const isTranscribing = $derived(
		recordings.sorted[0]?.transcriptionStatus === 'TRANSCRIBING',
	);

	// Pasted state: fires when a new recording appears on disk
	let justPasted = $state(false);
	let pastedTimer: ReturnType<typeof setTimeout> | undefined;
	let lastDoneId = $state('');

	// Pasted pill: fires when a new recording appears in fsRecordings
	const latestId = $derived(fsRecordings[0]?.id ?? '');
	$effect(() => {
		if (latestId && latestId !== lastDoneId) {
			untrack(() => {
				lastDoneId = latestId;
				justPasted = true;
				clearTimeout(pastedTimer);
				pastedTimer = setTimeout(() => { justPasted = false; }, 1500);
			});
		}
	});

	const lastPasted = $derived(fsRecordings[0]);
	const recentItems = $derived(fsRecordings.slice(0, 3));

	import { readDir, readTextFile } from '@tauri-apps/plugin-fs';

	// Direct filesystem read for history cards — bypasses Yjs reactivity issue
	let fsRecordings = $state<Array<{id: string, transcript: string, recordedAt: string}>>([]);

	async function loadFsRecordings() {
		try {
			const dir = await PATHS.DB.RECORDINGS();
			const entries = await readDir(dir);
			const mdFiles = entries
				.filter((e) => e.name?.endsWith('.md'))
				.map((e) => e.name!);

			const results = await Promise.all(
				mdFiles.map(async (filename) => {
					try {
						const path = await PATHS.DB.RECORDING_FILE(filename);
						const content = await readTextFile(path);
						// Parse frontmatter
						const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
						if (!match) return null;
						const frontmatter = match[1];
						const transcript = match[2].trim();
						if (!transcript) return null;
						const idMatch = frontmatter.match(/^id:\s*(.+)$/m);
						const dateMatch = frontmatter.match(/^recordedAt:\s*'(.+)'$/m);
						if (!idMatch || !dateMatch) return null;
						return { id: idMatch[1].trim(), transcript, recordedAt: dateMatch[1].trim() };
					} catch { return null; }
				})
			);

			fsRecordings = results
				.filter((r): r is NonNullable<typeof r> => r !== null)
				.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
			console.log('[SpeakPaste] fs recordings loaded:', fsRecordings.length);
		} catch (e) {
			console.warn('[SpeakPaste] fs recordings load failed:', e);
		}
	}

	// Load on mount and after each transcription completes
	onMount(() => { loadFsRecordings(); });

	// Reload from disk after each recording session ends
	let prevRecorderState = 'IDLE';
	$effect(() => {
		const current = recorderState;
		if (prevRecorderState === 'RECORDING' && current === 'IDLE') {
			// Delay to allow Rust to finish writing the markdown file
			setTimeout(() => loadFsRecordings(), 1500);
		}
		prevRecorderState = current;
	});

	const autoPaste = $derived(settings.get('output.transcription.cursor'));

	const modelPath = $derived(deviceConfig.get('transcription.whispercpp.modelPath'));
	const modelLabel = $derived(
		WHISPER_MODELS.find((m) => modelPath.endsWith(m.file.filename))?.id ?? 'tiny.en'
	);

	// Resolve the whisper model directory — uses PATHS.MODELS.WHISPER() on new install
	async function resolveModelDir(): Promise<string> {
		if (modelPath) {
			const lastSlash = modelPath.lastIndexOf('/');
			if (lastSlash > 0) return modelPath.substring(0, lastSlash + 1);
		}
		// New install: resolve from app data dir
		const whisperDir = await PATHS.MODELS.WHISPER();
		return whisperDir + '/';
	}

	async function selectModel(modelId: string) {
		const selected = WHISPER_MODELS.find((m) => m.id === modelId);
		if (!selected) return;
		const dir = await resolveModelDir();
		deviceConfig.set('transcription.whispercpp.modelPath', dir + selected.file.filename);
	}

	function timeAgo(dateStr: string) {
		try {
			return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
		} catch {
			return 'just now';
		}
	}

	const pills = $derived([
		{ label: 'Ready',               active: recorderState === 'IDLE' && !isTranscribing && !justPasted },
		{ label: 'Listening',           active: recorderState === 'RECORDING' },
		{ label: 'Transcribing locally',active: isTranscribing },
		{ label: 'Pasted',              active: justPasted },
	]);
</script>

<svelte:head><title>SpeakPaste</title></svelte:head>

<div class="relative flex flex-col min-h-screen bg-[#f5f0eb] overflow-y-auto">

	<!-- Header: title + settings gear -->
	<div class="flex items-start justify-between px-6 pt-8 pb-2">
		<div class="flex-1 flex flex-col items-center">
			<h1 class="text-2xl font-bold tracking-tight text-gray-900">SpeakPaste</h1>
			<p class="text-sm text-gray-500 mt-0.5">Local voice typing for any Mac app.</p>
		</div>
		<!-- Settings gear — positioned top-right -->
		<div class="absolute top-5 right-5">
			<Popover.Root>
				<Popover.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							class="size-9 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
							aria-label="Settings"
						>
							<SettingsIcon class="size-4" />
						</button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-80 p-0 rounded-2xl shadow-xl border border-gray-100 bg-white overflow-hidden" align="end" sideOffset={8}>
					<div class="flex flex-col">
						<!-- Trigger mode -->
						<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
							<div class="flex items-center gap-2.5">
								<HandIcon class="size-4 text-blue-500" />
								<span class="text-sm font-medium text-gray-800">Trigger mode</span>
							</div>
							<div class="flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1 text-sm text-gray-700 bg-gray-50">
								Hold to speak
								<svg class="size-3 ml-1 text-gray-400" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							</div>
						</div>

						<!-- Model -->
						<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
							<div class="flex items-center gap-2.5">
								<BoxIcon class="size-4 text-blue-500" />
								<span class="text-sm font-medium text-gray-800">Model</span>
							</div>
							<select
								class="border border-gray-200 rounded-lg px-2.5 py-1 text-sm text-gray-700 bg-gray-50 appearance-none pr-6 cursor-pointer"
								value={modelLabel}
								onchange={(e) => selectModel(e.currentTarget.value)}
							>
								{#each WHISPER_MODELS as model}
									<option value={model.id}>{model.id}</option>
								{/each}
							</select>
						</div>

						<!-- Auto-paste -->
						<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
							<div class="flex items-center gap-2.5">
								<ClipboardIcon class="size-4 text-blue-500" />
								<span class="text-sm font-medium text-gray-800">Auto-paste</span>
							</div>
							<Switch
								checked={autoPaste}
								onCheckedChange={(v) => settings.set('output.transcription.cursor', v)}
							/>
						</div>

						<!-- History limit -->
						<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
							<div class="flex items-center gap-2.5">
								<ListIcon class="size-4 text-blue-500" />
								<span class="text-sm font-medium text-gray-800">History limit</span>
							</div>
							<input
								type="number"
								min="1"
								max="500"
								class="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-gray-50 text-right"
								value={settings.get('retention.maxCount')}
								onchange={(e) => {
									const v = parseInt(e.currentTarget.value);
									if (v > 0) settings.set('retention.maxCount', v);
								}}
							/>
						</div>

						<!-- Clear history -->
						<button
							class="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
							onclick={() => {
								const ids = recordings.sorted.map((r) => r.id);
								ids.forEach((id) => recordings.delete(id));
							}}
						>
							<TrashIcon class="size-4" />
							Clear history
						</button>
					</div>
				</Popover.Content>
			</Popover.Root>
		</div>
	</div>

	<!-- State pills -->
	<div class="flex items-center justify-center gap-2 px-6 pt-4 pb-8 flex-wrap">
		{#each pills as pill}
			<span class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border {
				pill.active
					? 'bg-white border-blue-300 text-blue-600 shadow-sm'
					: 'bg-transparent border-gray-300/60 text-gray-400'
			}">
				{#if pill.active}
					<span class="size-2 rounded-full bg-blue-500"></span>
				{:else if pill.label === 'Listening'}
					<AudioWaveformIcon class="size-3.5 text-gray-400" />
				{:else if pill.label === 'Transcribing locally'}
					<AudioWaveformIcon class="size-3.5 text-gray-400" />
				{:else if pill.label === 'Pasted'}
					<svg class="size-3.5 text-gray-400" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
				{/if}
				{pill.label}
			</span>
		{/each}
	</div>

	<!-- Mic button with glow rings -->
	<div class="flex flex-col items-center justify-center py-6 gap-8">
		<div class="relative flex items-center justify-center">
			<!-- Outer glow rings -->
			<div class="absolute size-52 rounded-full bg-blue-100/40 {recorderState === 'RECORDING' ? 'animate-ping' : ''}"></div>
			<div class="absolute size-44 rounded-full bg-blue-100/60"></div>
			<div class="absolute size-36 rounded-full bg-blue-200/50"></div>
			<!-- Waveform lines (decorative) -->
			{#if recorderState === 'RECORDING'}
				<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div class="flex items-center gap-0.5 opacity-30">
						{#each [3,5,8,12,8,14,10,6,10,14,8,12,8,5,3] as h}
							<div class="w-0.5 rounded-full bg-blue-400 animate-pulse" style="height: {h * 2}px"></div>
						{/each}
					</div>
				</div>
			{/if}
			<!-- Main button -->
			<button
				onclick={() => commandCallbacks.toggleManualRecording()}
				class="relative z-10 size-28 rounded-full bg-white shadow-lg border border-blue-100 flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95"
				aria-label={recorderState === 'RECORDING' ? 'Stop recording' : 'Start recording'}
			>
				<MicIcon class="size-12 text-blue-500" strokeWidth={1.5} />
			</button>
		</div>

		<!-- Hint text -->
		<div class="flex flex-col items-center gap-0.5 text-center">
			<p class="text-sm font-medium text-gray-700">
				Hold <span class="text-blue-500 font-semibold">Fn</span> / <span class="text-blue-500 font-semibold">Globe</span> to speak
			</p>
			<p class="text-sm text-gray-500">Release to transcribe and paste</p>
		</div>

		<!-- Engine status badge -->
		<div class="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm text-sm text-gray-600">
			<ShieldCheckIcon class="size-4 text-green-500" />
			<span>Local</span>
			<span class="text-gray-300">·</span>
			<span>whisper.cpp</span>
			<span class="text-gray-300">·</span>
			<span>{modelLabel}</span>
			<span class="size-2 rounded-full bg-green-500 ml-0.5"></span>
		</div>

		<!-- Auto-paste row -->
		<div class="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm w-full max-w-sm mx-6">
			<span class="text-sm font-semibold text-gray-800 flex-1">Auto-paste</span>
			<Switch
				checked={autoPaste}
				onCheckedChange={(v) => settings.set('output.transcription.cursor', v)}
			/>
			<span class="text-sm text-gray-400">Paste after transcription</span>
			<InfoIcon class="size-4 text-gray-300 shrink-0" />
		</div>
	</div>

	<!-- Cards section -->
	<div class="flex flex-col gap-3 px-5 pt-2 pb-8">

		<!-- Last pasted card -->
		{#if lastPasted?.transcript}
			<div class="rounded-2xl bg-white border border-gray-200 shadow-sm p-4">
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<FileTextIcon class="size-4 text-gray-500" />
						<span class="text-sm font-semibold text-gray-700">Last pasted</span>
					</div>
					<div class="flex items-center gap-1.5 text-xs text-gray-400">
						<ClockIcon class="size-3.5" />
						<span>{timeAgo(lastPasted.recordedAt)}</span>
					</div>
				</div>
				<div class="relative px-4">
					<span class="absolute left-0 top-0 text-2xl text-gray-200 leading-none font-serif">"</span>
					<p class="text-sm text-gray-700 leading-relaxed line-clamp-3">{lastPasted.transcript}</p>
					<span class="absolute right-0 bottom-0 text-2xl text-gray-200 leading-none font-serif">"</span>
				</div>
			</div>
		{/if}

		<!-- Recent history -->
		{#if recentItems.length > 0}
			<div class="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
				<div class="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
					<ClockIcon class="size-4 text-gray-500" />
					<span class="text-sm font-semibold text-gray-700">Recent</span>
				</div>
				<div class="divide-y divide-gray-100">
					{#each recentItems as item}
						<div class="flex items-center gap-3 px-4 py-3">
							<div class="size-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
								<AudioWaveformIcon class="size-3.5 text-blue-400" />
							</div>
							<p class="text-sm text-gray-700 flex-1 truncate">{item.transcript}</p>
							<span class="text-xs text-gray-400 whitespace-nowrap shrink-0">{timeAgo(item.recordedAt)}</span>
							<button class="text-gray-300 hover:text-gray-500 transition-colors shrink-0">
								<MoreHorizontalIcon class="size-4" />
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
