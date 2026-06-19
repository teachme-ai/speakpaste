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
	import { dictationRuntime } from '$lib/state/dictation-runtime.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { WHISPER_MODELS } from '$lib/services/transcription/local/whispercpp';
	import { PARAKEET_MODELS } from '$lib/services/transcription/local/parakeet';
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
	const compactWindowSize = { width: 500, height: 720 };

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
					await currentWindow.setMinSize(new LogicalSize(460, 700));
					await currentWindow.setSize(
						new LogicalSize(compactWindowSize.width, compactWindowSize.height),
					);
				}
			} catch (e) {
				console.error('Failed to resize window:', e);
			}
		}
	}

	onMount(() => {
		if (window.__TAURI_INTERNALS__) {
			import('@tauri-apps/api/window').then(async ({ getCurrentWindow, LogicalSize }) => {
				const currentWindow = getCurrentWindow();
				isOverlay = currentWindow.label === 'overlay';
				if (!isOverlay && !showHistory) {
					await currentWindow.setMinSize(new LogicalSize(460, 700));
					await currentWindow.setSize(
						new LogicalSize(compactWindowSize.width, compactWindowSize.height),
					);
				}
			});

			import('@tauri-apps/api/event').then(({ listen }) => {
				listen('dictation-pasted', () => {
					if (isOverlay) {
						justPasted = true;
						clearTimeout(pastedTimer);
						pastedTimer = setTimeout(() => { justPasted = false; }, PASTED_INDICATOR_MS);
					}
				});
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

	const recorderState = $derived(
		dictationRuntime.snapshot.status === 'Recording' ? 'RECORDING' : 'IDLE'
	);

	const isTranscribing = $derived(
		dictationRuntime.snapshot.status === 'Transcribing' ||
		dictationRuntime.snapshot.status === 'Pasting'
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
				pastedTimer = setTimeout(() => { justPasted = false; }, PASTED_INDICATOR_MS);
				if (window.__TAURI_INTERNALS__ && !isOverlay) {
					import('@tauri-apps/api/event').then(({ emit }) => {
						emit('dictation-pasted');
					});
				}
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
			console.error('[Mynah] Failed to delete history item:', err);
			toast.error('Failed to delete recording');
		}
	}

	async function copyTranscript(transcript: string) {
		try {
			await navigator.clipboard.writeText(transcript);
			toast.success('Copied to clipboard');
		} catch (e) {
			console.error('[Mynah] Failed to copy:', e);
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
			console.log('[Mynah] WAV recordings loaded:', fsRecordings.length);
		} catch (e) {
			console.warn('[Mynah] WAV recordings load failed:', e);
		} finally {
			initialLoadComplete = true;
		}
	}

	// Reload history on pipeline events
	onMount(() => {
		loadFsRecordings();

		const handleComplete = () => {
			console.log('[Mynah] pipeline-complete event received, reloading history');
			loadFsRecordings();
		};

		window.addEventListener(PIPELINE_EVENTS.COMPLETE, handleComplete);

		return () => {
			window.removeEventListener(PIPELINE_EVENTS.COMPLETE, handleComplete);
		};
	});

	const activeService = $derived(settings.get('transcription.service'));

	// Whisper C++ derives label from the model filename
	const whisperModelPath = $derived(deviceConfig.get('transcription.whispercpp.modelPath'));
	// Parakeet derives label from the model directory name
	const parakeetModelPath = $derived(deviceConfig.get('transcription.parakeet.modelPath'));

	const engineLabel = $derived(
		activeService === 'parakeet' ? 'Parakeet' : 'whisper.cpp'
	);

	const modelLabel = $derived(
		activeService === 'parakeet'
			? (PARAKEET_MODELS.find((m) =>
					parakeetModelPath.endsWith(m.directoryName)
			  )?.name ?? 'Parakeet TDT 0.6B v3 (INT8)')
			: (WHISPER_MODELS.find((m) =>
					whisperModelPath.endsWith(m.file.filename)
			  )?.id ?? 'tiny.en')
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

	const currentStatus = $derived.by(() => {
		if (recorderState === 'RECORDING') return 'Listening...';
		if (isTranscribing) return 'Transcribing on this Mac...';
		if (justPasted) return 'Pasted';
		return '';
	});

</script>

<svelte:head><title>Mynah</title></svelte:head>

{#if isOverlay}
	<OverlayStatusPill {recorderState} {isTranscribing} {justPasted} />
{:else}
<div class="home-surface mac-window-surface relative flex min-h-screen flex-col items-center overflow-y-auto">
	<div class="w-full max-w-[430px] min-w-0 flex flex-col items-center gap-3 px-4 pb-8">
		<AppHeader />
		<StatePillBar {pills} />

		<div class="voice-panel mac-material w-full rounded-2xl border px-5 pt-4 pb-3">
			<MicButton {recorderState} {isTranscribing} {justPasted} />
			<div class="flex flex-col items-center gap-4">
				<HintText />
				{#if currentStatus}
					<p class="text-[15px] font-medium text-muted-foreground transition-opacity">
						{currentStatus}
					</p>
				{/if}
				<EngineBadge {engineLabel} {modelLabel} {profileLabel} />
			</div>
			<PipelineControlDeck />
		</div>

		<div class="flex justify-center mt-0 mb-5">
			<button class="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/70 px-4 py-2 text-[15px] font-medium text-foreground shadow-sm transition-colors hover:bg-accent" onclick={toggleHistory}>
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
			<div class="flex w-full min-w-0 flex-col gap-3 pt-1 pb-4 mt-1" transition:slide={{ duration: 300 }}>
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
		background-color: var(--background);
	}

	.voice-panel {
		border-color: var(--border);
	}
</style>
