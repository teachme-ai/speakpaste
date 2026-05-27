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
	import { toast } from '@epicenter/ui/sonner';
	import { transformations } from '$lib/state/transformations.svelte';

	let isOverlay = $state(false);

	onMount(() => {
		if (window.__TAURI_INTERNALS__) {
			import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
				const currentWindow = getCurrentWindow();
				isOverlay = currentWindow.label === 'overlay';
			});
		}
	});

	// Automatically control overlay window visibility based on active recording state
	$effect(() => {
		if (window.__TAURI_INTERNALS__) {
			import('@tauri-apps/api/window').then(async ({ getAllWebviewWindows }) => {
				const windows = await getAllWebviewWindows();
				const overlay = windows.find((w) => w.label === 'overlay');
				if (!overlay) return;

				const shouldShow =
					recorderState === 'RECORDING' ||
					isTranscribing ||
					justPasted;

				if (shouldShow) {
					await overlay.show();
					await overlay.setAlwaysOnTop(true);
				} else {
					await overlay.hide();
				}
			});
		}
	});

	import { PATHS } from '$lib/constants/paths';
	import { getShortcutDisplayLabel } from '$lib/constants/keyboard';
	import { commandCallbacks } from '$lib/commands';

	const getRecorderStateQuery = createQuery(
		() => rpc.recorder.getRecorderState.options,
	);

	const recorderState = $derived(getRecorderStateQuery.data ?? 'IDLE');

	let isTranscribingLocal = $state(false);
	const isTranscribing = $derived(isTranscribingLocal);

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

	import { readDir, readTextFile, remove } from '@tauri-apps/plugin-fs';

	// Direct filesystem read for history cards — bypasses Yjs reactivity issue
	let fsRecordings = $state<Array<{id: string, transcript: string, recordedAt: string}>>([]);

	async function deleteRecording(id: string) {
		try {
			recordings.delete(id);
			const path = await PATHS.DB.RECORDING_FILE(id + '.md');
			await remove(path);
			await loadFsRecordings();
			toast.success('Recording deleted');
		} catch (e) {
			try {
				const dir = await PATHS.DB.RECORDINGS();
				const entries = await readDir(dir);
				const mdFile = entries.find((e) => e.name?.includes(id) && e.name.endsWith('.md'))?.name;
				if (mdFile) {
					const path = await PATHS.DB.RECORDING_FILE(mdFile);
					await remove(path);
				}
				recordings.delete(id);
				await loadFsRecordings();
				toast.success('Recording deleted');
			} catch (err) {
				console.error('[SpeakPaste] Failed to delete history item:', err);
				toast.error('Failed to delete recording');
			}
		}
	}

	async function copyTranscript(transcript: string) {
		try {
			await navigator.clipboard.writeText(transcript);
			toast.success('Copied to clipboard');
		} catch (e) {
			console.error('[SpeakPaste] Failed to copy:', e);
			toast.error('Failed to copy');
		}
	}

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

	// Reload history and sync transcribing indicators on pipeline events
	onMount(() => {
		loadFsRecordings();

		const handleComplete = () => {
			console.log('[SpeakPaste] pipeline-complete event received, reloading history');
			isTranscribingLocal = false;
			loadFsRecordings();
		};

		const handleStarted = () => {
			console.log('[SpeakPaste] pipeline-started event received, setting transcribing active');
			isTranscribingLocal = true;
		};

		const handleError = () => {
			console.log('[SpeakPaste] pipeline-error event received, clearing transcribing state');
			isTranscribingLocal = false;
		};

		window.addEventListener('speakpaste:pipeline-complete', handleComplete);
		window.addEventListener('speakpaste:pipeline-started', handleStarted);
		window.addEventListener('speakpaste:pipeline-error', handleError);

		return () => {
			window.removeEventListener('speakpaste:pipeline-complete', handleComplete);
			window.removeEventListener('speakpaste:pipeline-started', handleStarted);
			window.removeEventListener('speakpaste:pipeline-error', handleError);
		};
	});

	const autoPaste = $derived(settings.get('output.transcription.cursor'));

	// Trigger shortcut — reads from actual saved global shortcut, not hardcoded
	const triggerShortcut = $derived(
		deviceConfig.get('shortcuts.global.toggleManualRecording'),
	);
	const triggerLabel = $derived(
		triggerShortcut ? getShortcutDisplayLabel(triggerShortcut) : '⌘ ⇧ ;',
	);

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

{#if isOverlay}
	<div class="fixed inset-0 flex items-center justify-center bg-transparent select-none drag overflow-hidden">
		<!-- Ultra-premium glassmorphism floating status pill -->
		<div class="flex items-center gap-3 px-4 py-2.5 rounded-full border border-white/20 bg-black/60 backdrop-blur-md shadow-2xl transition-all duration-300 transform scale-100 hover:scale-105 active:scale-95">
			{#if recorderState === 'RECORDING'}
				<div class="relative flex items-center justify-center size-5">
					<div class="absolute inset-0 rounded-full bg-red-500/40 animate-ping"></div>
					<MicIcon class="size-4 text-red-500 relative" />
				</div>
				<span class="text-sm font-medium text-white tracking-wide">Listening...</span>
			{:else if isTranscribing}
				<svg class="animate-spin size-4 text-blue-400" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<span class="text-sm font-medium text-white tracking-wide">Transcribing...</span>
			{:else if justPasted}
				<div class="flex items-center justify-center size-5 rounded-full bg-green-500/20">
					<svg class="size-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
					</svg>
				</div>
				<span class="text-sm font-medium text-green-400 tracking-wide">Pasted!</span>
			{/if}
		</div>
	</div>
{:else}
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
			<span class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border {
				pill.active
					? pill.label === 'Listening'
						? 'bg-red-50/90 border-red-300 text-red-600 shadow-sm shadow-red-100'
						: pill.label === 'Transcribing locally'
						? 'bg-blue-50/90 border-blue-300 text-blue-600 shadow-sm shadow-blue-100'
						: pill.label === 'Pasted'
						? 'bg-green-50/90 border-green-300 text-green-600 shadow-sm shadow-green-100'
						: 'bg-white border-blue-300 text-blue-600 shadow-sm'
					: 'bg-white/40 border-gray-300/40 text-gray-400 backdrop-blur-xs'
			}">
				{#if pill.active}
					{#if pill.label === 'Listening'}
						<span class="relative flex size-2 shrink-0">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
						</span>
					{:else if pill.label === 'Transcribing locally'}
						<svg class="animate-spin size-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					{:else if pill.label === 'Pasted'}
						<svg class="size-3.5 text-green-500 shrink-0" viewBox="0 0 16 16" fill="none">
							<path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					{:else}
						<span class="size-2 rounded-full bg-blue-500 shrink-0"></span>
					{/if}
				{:else}
					{#if pill.label === 'Listening'}
						<AudioWaveformIcon class="size-3.5 text-gray-400 shrink-0" />
					{:else if pill.label === 'Transcribing locally'}
						<AudioWaveformIcon class="size-3.5 text-gray-400 shrink-0" />
					{:else if pill.label === 'Pasted'}
						<svg class="size-3.5 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="none">
							<path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					{/if}
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
			<!-- Waveform lines (organic liquid SVG) -->
			{#if recorderState === 'RECORDING'}
				<div class="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full scale-110">
					<svg class="w-full h-full opacity-20" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
						<path fill="#3b82f6" d="M40,-53C53.7,-45.5,65.8,-32.7,71.2,-17.4C76.6,-2,75.3,15.8,68.4,30.3C61.5,44.8,49,56,34.7,63.1C20.3,70.2,4,73.2,-12.3,71.4C-28.5,69.5,-44.7,62.8,-56.3,51.3C-67.9,39.8,-75,23.5,-75.7,6.9C-76.3,-9.7,-70.6,-26.6,-60.9,-38.5C-51.1,-50.3,-37.4,-57.1,-23.7,-64.1C-10,-71,3.7,-78,18.1,-76.4C32.5,-74.8,47.7,-64.7,40,-53Z" transform="translate(100 100)" class="animate-blob-slow" />
						<path fill="#60a5fa" d="M35.6,-48C46.8,-40,57,-29.3,61.8,-16.1C66.5,-2.9,65.7,12.8,59.3,25.8C52.9,38.8,40.8,49,27.1,55C13.4,61,-1.9,62.7,-16.9,59.9C-31.9,57.1,-46.6,49.8,-55.8,38.2C-65.1,26.5,-68.9,10.6,-67.2,-4.5C-65.5,-19.6,-58.3,-33.9,-47.5,-42C-36.8,-50,-22.4,-51.9,-9.2,-50.3C4.1,-48.7,17.4,-43.6,35.6,-48Z" transform="translate(100 100)" class="animate-blob-fast" />
					</svg>
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
				Hold <span class="text-blue-500 font-semibold">Fn key</span> to speak
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

		<!-- Pipeline Control Deck card -->
		<div class="flex flex-col gap-3 px-5 py-4 rounded-2xl bg-white border border-gray-200 shadow-sm w-full max-w-sm mx-6">
			<div class="flex items-center gap-3">
				<span class="text-sm font-semibold text-gray-800 flex-1">Auto-paste</span>
				<Switch
					checked={autoPaste}
					onCheckedChange={(v) => settings.set('output.transcription.cursor', v)}
				/>
				<span class="text-sm text-gray-400">Paste in active app</span>
				<InfoIcon class="size-4 text-gray-300 shrink-0" />
			</div>
			
			<div class="flex items-center gap-2.5 border-t border-gray-100 pt-3">
				<span class="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">Pipeline:</span>
				<select
					class="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-gray-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-300"
					value={settings.get('transformation.selectedId') ?? ''}
					onchange={(e) => settings.set('transformation.selectedId', e.currentTarget.value || null)}
				>
					<option value="">None (Raw Paste)</option>
					{#each transformations.sorted as transform}
						<option value={transform.id}>{transform.title}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Cards section -->
	<div class="flex flex-col gap-3 px-5 pt-2 pb-8">

		<!-- Last pasted card -->
		{#if lastPasted?.transcript}
			<div class="group relative rounded-2xl bg-white border border-gray-200 shadow-sm p-4 transition-all duration-200 hover:shadow-md">
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<FileTextIcon class="size-4 text-gray-500" />
						<span class="text-sm font-semibold text-gray-700">Last pasted</span>
					</div>
					
					<div class="flex items-center gap-2">
						<!-- Performance timing indicator -->
						<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
							⚡ local gpu
						</span>
						<div class="flex items-center gap-1.5 text-xs text-gray-400">
							<ClockIcon class="size-3.5" />
							<span>{timeAgo(lastPasted.recordedAt)}</span>
						</div>
					</div>
				</div>
				<div class="relative px-4 mb-1">
					<span class="absolute left-0 top-0 text-2xl text-gray-200 leading-none font-serif">"</span>
					<p class="text-sm text-gray-700 leading-relaxed line-clamp-3 select-text">{lastPasted.transcript}</p>
					<span class="absolute right-0 bottom-0 text-2xl text-gray-200 leading-none font-serif">"</span>
				</div>
				
				<!-- Action row at bottom right, reveals on hover -->
				<div class="absolute bottom-2.5 right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity duration-200 bg-white/90 backdrop-blur-xs pl-2 py-0.5 rounded-lg">
					<button 
						onclick={() => copyTranscript(lastPasted.transcript)}
						class="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
						title="Copy to Clipboard"
					>
						<ClipboardIcon class="size-3.5" />
					</button>
					<button 
						onclick={() => deleteRecording(lastPasted.id)}
						class="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
						title="Delete Recording"
					>
						<TrashIcon class="size-3.5" />
					</button>
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
						<div class="group relative flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/50 transition-colors duration-150">
							<div class="size-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
								<AudioWaveformIcon class="size-3.5 text-blue-400" />
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm text-gray-700 truncate select-text">{item.transcript}</p>
							</div>
							<span class="text-xs text-gray-400 whitespace-nowrap shrink-0 pr-8">{timeAgo(item.recordedAt)}</span>
							
							<!-- Action buttons overlaying the far right side on hover -->
							<div class="absolute right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-200 bg-white/95 pl-2 py-1 rounded-lg">
								<button 
									onclick={() => copyTranscript(item.transcript)}
									class="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
									title="Copy to Clipboard"
								>
									<ClipboardIcon class="size-3.5" />
								</button>
								<button 
									onclick={() => deleteRecording(item.id)}
									class="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
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
	</div>
</div>
{/if}

<style>
	@keyframes blob-morph {
		0%, 100% {
			transform: translate(100px, 100px) scale(1) rotate(0deg);
		}
		33% {
			transform: translate(102px, 98px) scale(1.08) rotate(120deg);
		}
		66% {
			transform: translate(97px, 103px) scale(0.95) rotate(240deg);
		}
	}
	:global(.animate-blob-slow) {
		animation: blob-morph 10s infinite ease-in-out;
		transform-origin: center;
	}
	:global(.animate-blob-fast) {
		animation: blob-morph 6s infinite ease-in-out reverse;
		transform-origin: center;
	}
</style>
