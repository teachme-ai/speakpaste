import { toast } from '@epicenter/ui/sonner';
import { goto } from '$app/navigation';
import { desktopRpc } from '$lib/query/desktop';
import { deviceConfig } from '$lib/state/device-config.svelte';
import { settings } from '$lib/state/settings.svelte';

export const COMPRESSION_RECOMMENDED_MESSAGE =
	'Audio compression is optional for local workflows. Enable it only when you want smaller recording files.';

export const NAVIGATOR_LOCAL_TRANSCRIPTION_MESSAGE =
	'Compatibility Capture produces compressed audio that needs local conversion. Use Native Mac Capture for local dictation.';

export const RECORDING_COMPATIBILITY_MESSAGE =
	'Compatibility Capture produces compressed audio that needs local conversion. Use Native Mac Capture for local dictation.';

/**
 * Checks if the current recording + transcription configuration will work
 * @returns true if Navigator recording is used with local transcription but FFmpeg is not installed
 */
export function hasNavigatorLocalTranscriptionIssue({
	isFFmpegInstalled,
}: {
	isFFmpegInstalled: boolean;
}): boolean {
	if (!window.__TAURI_INTERNALS__) return false;

	const isUsingNavigator = deviceConfig.get('recording.method') === 'navigator';
	const isUsingLocalTranscription =
		settings.get('transcription.service') === 'whispercpp' ||
		settings.get('transcription.service') === 'parakeet';

	return isUsingNavigator && isUsingLocalTranscription && !isFFmpegInstalled;
}

export function isCompressionRecommended(): boolean {
	return false;
}

/**
 * Checks if FFmpeg recording method is selected but FFmpeg is not installed.
 * Shows a warning toast when this developer-only capture method is incompatible.
 *
 * This function is specifically for validating the FFmpeg recording method selection.
 * It ensures users who have explicitly chosen FFmpeg as their recording method have it installed.
 *
 * @returns Promise<void> - Shows toast notification if FFmpeg method is selected but not installed
 */
export async function checkFfmpegRecordingMethodCompatibility() {
	if (!window.__TAURI_INTERNALS__) return;

	// Only check if FFmpeg recording method is selected
	if (deviceConfig.get('recording.method') !== 'ffmpeg') return;

	const { data: ffmpegInstalled } =
		await desktopRpc.ffmpeg.checkFfmpegInstalled.ensure();
	if (ffmpegInstalled) return; // FFmpeg is installed, all good

	// FFmpeg recording method selected but not installed
	toast.warning('FFmpeg Required for Command-line Capture', {
		description:
			'Command-line Capture needs an external local converter. Native Mac Capture does not.',
		action: {
			label: 'Review capture settings',
			onClick: () => goto('/settings/recording'),
		},
		duration: 15000,
	});
}

/**
 * Checks for compatibility issues between local transcription models and current recording settings.
 * Shows a warning toast with resolution options when incompatible settings are detected.
 *
 * Local transcription models (Whisper C++ and Parakeet) require audio in 16kHz mono WAV format.
 * This function detects when current recording settings won't produce compatible audio and offers
 * the simpler Native Mac Capture path.
 *
 * @returns Promise<void> - Shows toast notification if local transcription has compatibility issues
 */
export async function checkLocalTranscriptionCompatibility() {
	if (!window.__TAURI_INTERNALS__) return;

	const { data: ffmpegInstalled } =
		await desktopRpc.ffmpeg.checkFfmpegInstalled.ensure();

	// Check if there are compatibility issues with local transcription
	if (
		!hasNavigatorLocalTranscriptionIssue({
			isFFmpegInstalled: ffmpegInstalled ?? false,
		})
	)
		return;

	// Recording compatibility issue with local transcription models
	toast.warning('Recording Settings Incompatible', {
		description: RECORDING_COMPATIBILITY_MESSAGE,
		action: {
			label: 'Go to Recording Settings',
			onClick: () => goto('/settings/recording'),
		},
		duration: 15000,
	});
}

export async function checkCompressionRecommendation() {
	if (!window.__TAURI_INTERNALS__) return;

	// Check if compression should be recommended
	if (!isCompressionRecommended()) return;

	const { data: ffmpegInstalled } =
		await desktopRpc.ffmpeg.checkFfmpegInstalled.ensure();
	if (ffmpegInstalled) return;

	toast.info('Compression Available for Local Files', {
		description: COMPRESSION_RECOMMENDED_MESSAGE,
		action: {
			label: 'Go to Transcription Settings',
			onClick: () => goto('/settings/transcription'),
		},
		duration: 10000,
	});
}
