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

		window.addEventListener('speakpaste:pipeline-complete', handleComplete);
		window.addEventListener('speakpaste:pipeline-started', handleStarted);
		window.addEventListener('speakpaste:pipeline-error', handleError);

		return () => {
			window.removeEventListener('speakpaste:pipeline-complete', handleComplete);
			window.removeEventListener('speakpaste:pipeline-started', handleStarted);
			window.removeEventListener('speakpaste:pipeline-error', handleError);
		};
	});

	const modelPath = $derived(deviceConfig.get('transcription.whispercpp.modelPath'));
	const modelLabel = $derived(
		WHISPER_MODELS.find((m) => modelPath.endsWith(m.file.filename))?.id ?? 'tiny.en'
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
		{ label: 'Transcribing locally',active: isTranscribing },
		{ label: 'Pasted',              active: justPasted },
	]);

</script>

<svelte:head><title>SpeakPaste</title></svelte:head>

{#if isOverlay}
	<OverlayStatusPill {recorderState} {isTranscribing} {justPasted} />
{:else}
<div class="relative flex flex-col min-h-screen bg-background overflow-y-auto items-center">
	<div class="w-full max-w-md min-w-0 flex flex-col items-center gap-6 px-4 pb-10">
		<AppHeader />
		<StatePillBar {pills} />

		<MicButton {recorderState} />
		<HintText />
		<EngineBadge {modelLabel} />
		<PipelineControlDeck />

		<div class="flex justify-center mt-10 mb-6">
			<button class="text-sm font-medium text-foreground bg-secondary/50 hover:bg-secondary border border-border/50 transition-all flex items-center gap-2 px-6 py-2.5 rounded-full shadow-sm" onclick={toggleHistory}>
				{#if showHistory}
					<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
					Hide History
				{:else}
					<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
					Show History
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
