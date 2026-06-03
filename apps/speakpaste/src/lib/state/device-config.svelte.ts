import {
	createPersistedMap,
	defineEntry,
	type PersistedMap,
} from '@epicenter/svelte';
import { type } from 'arktype';
import { extractErrorMessage } from 'wellcrafted/error';
import { BITRATES_KBPS, DEFAULT_BITRATE_KBPS } from '$lib/constants/audio';
import { CommandOrControl } from '$lib/constants/keyboard';
import { rpc } from '$lib/query';
import {
	FFMPEG_DEFAULT_GLOBAL_OPTIONS,
	FFMPEG_DEFAULT_INPUT_OPTIONS,
	FFMPEG_DEFAULT_OUTPUT_OPTIONS,
} from '$lib/services/desktop/recorder/ffmpeg';

// ── Per-key definitions ──────────────────────────────────────────────────────

/**
 * Device-bound configuration definitions — secrets, hardware IDs, filesystem
 * paths, and global OS shortcuts that should NEVER sync across devices.
 *
 * Each key has its own schema and default value. Stored individually in
 * localStorage under the `whispering.device.{key}` prefix.
 */
const DEVICE_DEFINITIONS = {
	// ── Recording hardware ────────────────────────────────────────────
	'recording.method': defineEntry(
		type("'cpal' | 'navigator' | 'ffmpeg'"),
		'cpal',
	),
	'recording.cpal.deviceId': defineEntry(type('string | null'), null),
	'recording.navigator.deviceId': defineEntry(type('string | null'), null),
	'recording.ffmpeg.deviceId': defineEntry(type('string | null'), null),
	'recording.navigator.bitrateKbps': defineEntry(
		type.enumerated(...BITRATES_KBPS),
		DEFAULT_BITRATE_KBPS,
	),
	'recording.cpal.outputFolder': defineEntry(type('string | null'), null),
	'recording.cpal.sampleRate': defineEntry(
		type("'16000' | '44100' | '48000'"),
		'16000',
	),
	'local.performanceProfile': defineEntry(
		type("'balanced' | 'intel-fast' | 'apple-silicon-accuracy'"),
		'balanced',
	),
	'recording.ffmpeg.globalOptions': defineEntry(
		type('string'),
		FFMPEG_DEFAULT_GLOBAL_OPTIONS,
	),
	'recording.ffmpeg.inputOptions': defineEntry(
		type('string'),
		FFMPEG_DEFAULT_INPUT_OPTIONS,
	),
	'recording.ffmpeg.outputOptions': defineEntry(
		type('string'),
		FFMPEG_DEFAULT_OUTPUT_OPTIONS,
	),

	// ── Local model paths ─────────────────────────────────────────────
	'transcription.whispercpp.modelPath': defineEntry(type('string'), ''),
	'transcription.parakeet.modelPath': defineEntry(type('string'), ''),
	'transcription.moonshine.modelPath': defineEntry(type('string'), ''),

	// ── Global OS shortcuts (device-specific, never synced) ───────────
	'shortcuts.global.toggleManualRecording': defineEntry(
		type('string | null'),
		`${CommandOrControl}+Shift+F8` as string | null,
	),
	'shortcuts.global.startManualRecording': defineEntry(
		type('string | null'),
		null,
	),
	'shortcuts.global.stopManualRecording': defineEntry(
		type('string | null'),
		null,
	),
	'shortcuts.global.cancelManualRecording': defineEntry(
		type('string | null'),
		null,
	),
	'shortcuts.global.toggleVadRecording': defineEntry(
		type('string | null'),
		null,
	),
	'shortcuts.global.startVadRecording': defineEntry(
		type('string | null'),
		null,
	),
	'shortcuts.global.stopVadRecording': defineEntry(type('string | null'), null),
	'shortcuts.global.pushToTalk': defineEntry(
		type('string | null'),
		null,
	),
	'shortcuts.global.openTransformationPicker': defineEntry(
		type('string | null'),
		null,
	),
	'shortcuts.global.runTransformationOnClipboard': defineEntry(
		type('string | null'),
		null,
	),

	// ── Appearance ────────────────────────────────────────────────────────────
	'appearance.bgOpacity': defineEntry(
		type('number'),
		0, // 0 = fully transparent (vibrancy), 1 = fully opaque
	),
};

// ── Types ────────────────────────────────────────────────────────────────────

type DeviceConfigDefs = typeof DEVICE_DEFINITIONS;
export type DeviceConfigKey = keyof DeviceConfigDefs & string;

/** Infer the value type for a device config key from its definition. */
export type InferDeviceValue<K extends DeviceConfigKey> =
	DeviceConfigDefs[K]['defaultValue'];

// ── Singleton ────────────────────────────────────────────────────────────────

export const deviceConfig: PersistedMap<typeof DEVICE_DEFINITIONS> =
	createPersistedMap({
		prefix: 'speakpaste.device.',
		definitions: DEVICE_DEFINITIONS,
		onError: (key) => {
			console.warn(`Invalid device config for "${key}", using default`);
		},
		onUpdateError: (key, error) => {
			rpc.notify.error({
				title: 'Error updating device config',
				description: extractErrorMessage(error),
			});
		},
	});
