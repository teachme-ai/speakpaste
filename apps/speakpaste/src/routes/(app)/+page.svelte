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
	import { slide } from 'svelte/transition';
	import { onMount, untrack } from 'svelte';
	import { PASTED_INDICATOR_MS, PIPELINE_EVENTS } from '$lib/constants/app';
	import { rpc } from '$lib/query';
	import { recordings } from '$lib/state/recordings.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { deviceConfig } from '$lib/state/device-config.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';
	import { toast } from '@epicenter/ui/sonner';
	import { transformations } from '$lib/state/transformations.svelte';

	import OverlayStatusPill from './_home/OverlayStatusPill.svelte';
	import AppHeader from './_home/AppHeader.svelte';
	import StatePillBar from './_home/StatePillBar.svelte';
	import MicButton from './_home/MicButton.svelte';
	import HintText from './_home/HintText.svelte';
	import EngineBadge from './_home/EngineBadge.svelte';
	import PipelineControlDeck from './_home/PipelineControlDeck.svelte';
	import LastPastedCard from './_home/LastPastedCard.svelte';
	import RecentHistoryList from './_home/RecentHistoryList.svelte';

	let showHistory = $state(false);
	let isOverlay = $state(false);

	async function toggleHistory() {
		showHistory = !showHistory;
		if (window.__TAURI_INTERNALS__) {
			try {
				const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
				const currentWindow = getCurrentWindow();
				if (showHistory) {
					// Expand to show history
					await currentWindow.setSize(new LogicalSize(500, 1100));
				} else {
					// Contract to perfect fit
					await currentWindow.setSize(new LogicalSize(500, 850));
				}
			} catch (e) {
				console.error('Failed to resize window:', e);
			}
		}
	}

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
	import { LOCAL_PERFORMANCE_PROFILE_OPTIONS } from '$lib/constants/audio';

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
				pastedTimer = setTimeout(() => { justPasted = false; }, PASTED_INDICATOR_MS);
			});
		}
	});

	const lastPasted = $derived(fsRecordings[0]);
	const recentItems = $derived(fsRecordings.slice(0, 3));

	import { readDir, readTextFile, remove } from '@tauri-apps/plugin-fs';

	// Direct filesystem read for history cards — shows WAV audio files
	let fsRecordings = $state<Array<{id: string, filename: string, transcript: string, recordedAt: string}>>([]);
	let initialLoadComplete = $state(false);

	async function deleteRecording(id: string) {
		try {
			recordings.delete(id);
			// Delete both WAV and MD files for this recording
			try {
				const wavPath = await PATHS.DB.RECORDING_FILE(id + '.wav');
				await remove(wavPath);
			} catch { /* WAV might not exist */ }
			try {
				const mdPath = await PATHS.DB.RECORDING_FILE(id + '.md');
				await remove(mdPath);
			} catch { /* MD might not exist */ }
			await loadFsRecordings();
			toast.success('Recording deleted');
		} catch (err) {
			console.error('[SpeakPaste] Failed to delete history item:', err);
			toast.error('Failed to delete recording');
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
			const wavFiles = entries
				.filter((e) => e.name?.endsWith('.wav'))
				.map((e) => e.name!);

			const results = await Promise.all(
				wavFiles.map(async (filename) => {
					try {
						const id = filename.replace(/\.wav$/, '');
						// Try to read companion .md file for transcript text
						let transcript = '';
						try {
							const mdPath = await PATHS.DB.RECORDING_FILE(id + '.md');
							const content = await readTextFile(mdPath);
							const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
							if (match) transcript = match[1].trim();
						} catch {
							// No companion MD file
						}
						
						if (!transcript || transcript.trim() === '') return null;
						let recordedAt = new Date().toISOString();
						try {
							const mdPath = await PATHS.DB.RECORDING_FILE(id + '.md');
							const content = await readTextFile(mdPath);
							const dateMatch = content.match(/^recordedAt:\s*'(.+)'$/m);
							if (dateMatch) recordedAt = dateMatch[1].trim();
						} catch {
							// Fallback — no .md date available
						}

						return { id, filename, transcript, recordedAt };
					} catch { return null; }
				})
			);

			fsRecordings = results
				.filter((r): r is NonNullable<typeof r> => r !== null)
				.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
			console.log('[SpeakPaste] WAV recordings loaded:', fsRecordings.length);
		} catch (e) {
			console.warn('[SpeakPaste] WAV recordings load failed:', e);
		} finally {
			initialLoadComplete = true;
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

		window.addEventListener(PIPELINE_EVENTS.COMPLETE, handleComplete);
		window.addEventListener(PIPELINE_EVENTS.STARTED, handleStarted);
		window.addEventListener(PIPELINE_EVENTS.ERROR, handleError);

		return () => {
			window.removeEventListener(PIPELINE_EVENTS.COMPLETE, handleComplete);
			window.removeEventListener(PIPELINE_EVENTS.STARTED, handleStarted);
			window.removeEventListener(PIPELINE_EVENTS.ERROR, handleError);
		};
	});

	const modelPath = $derived(deviceConfig.get('transcription.whispercpp.modelPath'));
	const modelLabel = $derived(
		WHISPER_MODELS.find((m) => modelPath.endsWith(m.file.filename))?.id ?? 'tiny.en'
	);
	const profileLabel = $derived(
		LOCAL_PERFORMANCE_PROFILE_OPTIONS.find(
			(profile) => profile.value === deviceConfig.get('local.performanceProfile'),
		)?.label ?? 'Balanced'
	);

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
		{ label: 'Pasted',              active: justPasted },
	]);

</script>

<svelte:head><title>SpeakPaste</title></svelte:head>

{#if isOverlay}
	<OverlayStatusPill {recorderState} {isTranscribing} {justPasted} />
{:else}
<div class="home-surface relative flex min-h-screen flex-col items-center overflow-y-auto">
	<div class="w-full max-w-md min-w-0 flex flex-col items-center gap-5 px-4 pb-10">
		<AppHeader />
		<StatePillBar {pills} />

		<div class="voice-panel w-full rounded-[32px] border px-6 pt-6 pb-5 shadow-sm">
			<MicButton {recorderState} {isTranscribing} {justPasted} />
			<div class="flex flex-col items-center gap-4">
				<HintText />
				<EngineBadge {modelLabel} {profileLabel} />
			</div>
			<PipelineControlDeck />
		</div>

		<div class="flex justify-center mt-7 mb-5">
			<button class="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-5 py-2.5 text-sm font-semibold text-stone-900 shadow-sm transition-all hover:bg-white/85 dark:border-white/10 dark:bg-white/10 dark:text-stone-50 dark:hover:bg-white/15" onclick={toggleHistory}>
				{#if showHistory}
					<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
					Hide captures
				{:else}
					<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
					Show captures
				{/if}
			</button>
		</div>

		{#if showHistory}
			<!-- Cards section -->
			<div class="flex w-full min-w-0 flex-col gap-3 pt-2 pb-8 mt-2" transition:slide={{ duration: 300 }}>
				{#if !initialLoadComplete}
					<div class="flex w-full flex-col gap-3">
						<div class="h-32 rounded-2xl bg-muted animate-pulse"></div>
						<div class="h-24 rounded-2xl bg-muted animate-pulse"></div>
					</div>
				{:else}
					<LastPastedCard {lastPasted} {timeAgo} {copyTranscript} {deleteRecording} />
					<RecentHistoryList {recentItems} {timeAgo} {copyTranscript} {deleteRecording} />
				{/if}
			</div>
		{/if}
	</div>
</div>
{/if}

<style>
	.home-surface {
		background:
			linear-gradient(180deg, oklch(0.985 0.006 95), oklch(0.94 0.012 105));
		color: oklch(0.22 0.018 240);
	}

	.voice-panel {
		border-color: oklch(0.35 0.02 240 / 0.12);
		background: oklch(1 0 0 / 0.58);
		box-shadow:
			0 1px 0 oklch(1 0 0 / 0.72) inset,
			0 18px 48px oklch(0.28 0.018 240 / 0.12);
		backdrop-filter: blur(18px);
	}

	:global(.dark) .home-surface {
		background:
			linear-gradient(180deg, oklch(0.19 0.014 245), oklch(0.13 0.012 245));
		color: oklch(0.96 0.008 90);
	}

	:global(.dark) .voice-panel {
		border-color: oklch(1 0 0 / 0.1);
		background: oklch(0.24 0.018 245 / 0.58);
		box-shadow:
			0 1px 0 oklch(1 0 0 / 0.08) inset,
			0 18px 52px oklch(0 0 0 / 0.26);
	}
</style>
