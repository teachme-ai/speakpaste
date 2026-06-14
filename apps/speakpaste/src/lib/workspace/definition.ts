import { defineKv, defineTable, type InferTableRow } from '@epicenter/workspace/local';
import { type } from 'arktype';

// ── Constant imports ─────────────────────────────────────────────────────────

import { RECORDING_MODES } from '$lib/constants/audio/recording-modes';
import { TRANSCRIPTION_CLIPBOARD_BEHAVIORS } from '$lib/constants/output';
import { TRANSCRIPTION_SERVICE_IDS } from '$lib/constants/transcription';
import { ALWAYS_ON_TOP_MODES } from '$lib/constants/ui/always-on-top';
import { FFMPEG_DEFAULT_COMPRESSION_OPTIONS } from '$lib/services/desktop/recorder/ffmpeg';

/**
 * Tables store normalized domain entities. Each row is replaced atomically via
 * `table.set()` — there's no field-level merging. Schemas validate on read, so old
 * data stays in storage until explicitly rewritten.
 */
/** Audio recordings captured by the user. One row per recording session. */
const recordings = defineTable(
	type({
		id: 'string',
		title: 'string',
		subtitle: 'string',
		timestamp: 'string',
		createdAt: 'string',
		updatedAt: 'string',
		transcribedText: 'string',
		transcriptionStatus: "'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED'",
		_v: '1',
	}),
	type({
		id: 'string',
		title: 'string',
		recordedAt: 'string',
		updatedAt: 'string',
		transcript: 'string',
		transcriptionStatus: "'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED'",
		'duration?': 'number | undefined',
		_v: '2',
	}),
).migrate((row) => {
	switch (row._v) {
		case 1: {
			return {
				id: row.id,
				title: row.title,
				recordedAt: row.timestamp,
				updatedAt: row.updatedAt,
				transcript: row.transcribedText,
				transcriptionStatus: row.transcriptionStatus,
				duration: undefined,
				_v: 2,
			};
		}
		case 2:
			return row;
	}
});

/** Recording row type inferred from the latest workspace table schema version. */
export type Recording = InferTableRow<typeof recordings>;

/** User-defined transformation pipelines. Each transformation has ordered steps. */
const transformations = defineTable(
	type({
		id: 'string',
		title: 'string',
		description: 'string',
		createdAt: 'string',
		updatedAt: 'string',
		_v: '1',
	}),
);

/** Transformation row type inferred from the latest workspace table schema version. */
export type Transformation = InferTableRow<typeof transformations>;

/**
 * Individual steps within a transformation pipeline.
 *
 * Uses a flat row schema so old prompt rows can still load while the active
 * local-only editor creates find/replace rows.
 *
 */
const transformationSteps = defineTable(
	type({
		id: 'string',
		transformationId: 'string',
		order: 'number',
		type: "'prompt_transform' | 'find_replace'",

		// Retired prompt transform fields kept only so legacy rows can deserialize.
		inferenceProvider: 'string',

		openaiModel: 'string',
		groqModel: 'string',
		anthropicModel: 'string',
		googleModel: 'string',
		openrouterModel: 'string',
		customModel: 'string',
		customBaseUrl: 'string',

		systemPromptTemplate: 'string',
		userPromptTemplate: 'string',

		// Find & replace
		findText: 'string',
		replaceText: 'string',
		useRegex: 'boolean',

		_v: '1',
	}),
);

/** Transformation step row type inferred from the latest workspace table schema version. */
export type TransformationStep = InferTableRow<typeof transformationSteps>;

/**
 * Execution records for transformation pipelines. One run per invocation.
 *
 * Uses a discriminated union on `status`—unlike `transformationSteps` (which uses
 * flat rows to preserve per-provider model memory across type switches), runs have
 * one-way state transitions (running → completed | failed) with no data to preserve
 * across states. The union ensures `output` exists only on completed runs and `error`
 * exists only on failed runs, eliminating null checks after status narrowing.
 *
 * @see {@link https://github.com/EpicenterHQ/epicenter/blob/main/specs/20260312T170000-whispering-workspace-polish-and-migration.md | Spec Decision 1}
 */
const TransformationRunBase = type({
	id: 'string',
	transformationId: 'string',
	recordingId: 'string | null',
	input: 'string',
	startedAt: 'string',
	completedAt: 'string | null',
	_v: '1',
});

const transformationRuns = defineTable(
	TransformationRunBase.merge(
		type.or(
			{ status: "'running'" },
			{ status: "'completed'", output: 'string' },
			{ status: "'failed'", error: 'string' },
		),
	),
);

/** Transformation run row type inferred from the latest workspace table schema version. */
export type TransformationRun = InferTableRow<typeof transformationRuns>;

/**
 * Per-step execution records within a transformation run.
 *
 * Same discriminated union pattern as `transformationRuns`—`output` and `error`
 * are only present on the relevant status variant.
 */
const TransformationStepRunBase = type({
	id: 'string',
	transformationRunId: 'string',
	stepId: 'string',
	order: 'number',
	input: 'string',
	startedAt: 'string',
	completedAt: 'string | null',
	_v: '1',
});

const transformationStepRuns = defineTable(
	TransformationStepRunBase.merge(
		type.or(
			{ status: "'running'" },
			{ status: "'completed'", output: 'string' },
			{ status: "'failed'", error: 'string' },
		),
	),
);

/** Transformation step run row type inferred from the latest workspace table schema version. */
export type TransformationStepRun = InferTableRow<typeof transformationStepRuns>;

/**
 * Synced settings stored as individual KV entries with last-write-wins resolution.
 *
 * Each key is independently resolved — two devices can change different settings
 * simultaneously without one overwriting the other. Dot-notation keys create a
 * natural namespace hierarchy and give per-key LWW granularity (unlike table rows
 * which are replaced atomically).
 *
 * Only preferences that roam across devices live here. Filesystem paths,
 * hardware device IDs, and global shortcuts stay in localStorage.
 */
/**
 * Sound effect toggles. Each event can independently play/mute a sound.
 * Manual = user-initiated recording. VAD = voice activity detection.
 */
const sound = {
	'sound.theme': defineKv(
		type("'ambient' | 'classic' | 'modern' | 'scifi'"),
		'ambient',
	),
	'sound.manualStart': defineKv(type('boolean'), true),
	'sound.manualStop': defineKv(type('boolean'), true),
	'sound.manualCancel': defineKv(type('boolean'), true),
	'sound.vadStart': defineKv(type('boolean'), true),
	'sound.vadCapture': defineKv(type('boolean'), true),
	'sound.vadStop': defineKv(type('boolean'), true),
	'sound.transcriptionComplete': defineKv(type('boolean'), true),
	'sound.transformationComplete': defineKv(type('boolean'), true),
} as const;

/**
 * Output behavior after transcription/transformation completes.
 * Controls clipboard, cursor paste, and simulated Enter key per pipeline stage.
 *
 * Uses `output.*` prefix to separate post-processing behavior from service
 * configuration—avoids polluting `transcription.*` and `transformation.*`
 * namespaces with unrelated concerns.
 */
const output = {
	'output.transcription.clipboard': defineKv(type('boolean'), true),
	'output.transcription.clipboardBehavior': defineKv(
		type.enumerated(...TRANSCRIPTION_CLIPBOARD_BEHAVIORS),
		'ask',
	),
	'output.transcription.cursor': defineKv(type('boolean'), true),
	'output.transcription.enter': defineKv(type('boolean'), false),
	'output.transformation.clipboard': defineKv(type('boolean'), true),
	'output.transformation.cursor': defineKv(type('boolean'), false),
	'output.transformation.enter': defineKv(type('boolean'), false),
} as const;

/** Window behavior and navigation layout preferences. */
const ui = {
	'ui.alwaysOnTop': defineKv(type.enumerated(...ALWAYS_ON_TOP_MODES), 'Never'),
	'ui.theme': defineKv(
		type("'pastel' | 'dark' | 'mynah'"),
		'pastel',
	),
} as const;

/**
 * Recording retention policy. `maxCount` is stored as an integer — the old
 * settings schema used `string.digits` for localStorage; the workspace uses
 * the semantically correct numeric type.
 */
const dataRetention = {
	'retention.strategy': defineKv(
		type("'keep-forever' | 'limit-count'"),
		'keep-forever',
	),
	'retention.maxCount': defineKv(type('number.integer >= 1'), 100),
} as const;

/** User's preferred recording mode — manual trigger vs voice activity detection. */
const recording = {
	'recording.mode': defineKv(type.enumerated(...RECORDING_MODES), 'manual'),
} as const;

/**
 * Transcription service and local engine options.
 */
const transcription = {
	'transcription.service': defineKv(
		type.enumerated(...TRANSCRIPTION_SERVICE_IDS),
		'whispercpp',
	),
	'transcription.language': defineKv(type('string'), 'auto'),
	'transcription.prompt': defineKv(type('string'), ''),
	'transcription.temperature': defineKv(type('0 <= number <= 1'), 0),
	'transcription.compressionEnabled': defineKv(type('boolean'), false),
	'transcription.compressionOptions': defineKv(
		type('string'),
		FFMPEG_DEFAULT_COMPRESSION_OPTIONS,
	),
} as const;

/**
 * Currently active local transformation pipeline.
 *
 * `selectedId`: FK to `transformations` table. `null` = no transformation selected.
 */
const transformation = {
	'transformation.selectedId': defineKv(type('string | null'), null),
} as const;

/**
 * Local intent router and writing modes.
 */
const intent = {
	'intent.mode': defineKv(
		type.enumerated('dictate', 'clean_ramble', 'list', 'prompt'),
		'dictate',
	),
	'intent.voiceOverrideEnabled': defineKv(type('boolean'), false),
} as const;


/** Device-local diagnostics preference. No off-device analytics are sent. */
const analytics = {
	'analytics.enabled': defineKv(type('boolean'), false),
} as const;

/** App-level internal state. */
const appState = {
	'app.last_version': defineKv(type('string | null'), null),
} as const;

/**
 * In-app keyboard shortcuts. System-global shortcuts are device-specific and stay
 * in localStorage — these are only the shortcuts within the Whispering window.
 * `null` = unbound.
 */
const shortcuts = {
	'shortcut.toggleManualRecording': defineKv(type('string | null'), null),
	'shortcut.startManualRecording': defineKv(type('string | null'), null),
	'shortcut.stopManualRecording': defineKv(type('string | null'), null),
	'shortcut.cancelManualRecording': defineKv(type('string | null'), 'c'),
	'shortcut.toggleVadRecording': defineKv(type('string | null'), null),
	'shortcut.startVadRecording': defineKv(type('string | null'), null),
	'shortcut.stopVadRecording': defineKv(type('string | null'), null),
	'shortcut.pushToTalk': defineKv(type('string | null'), 'p'),
	'shortcut.openTransformationPicker': defineKv(type('string | null'), null),
	'shortcut.runTransformationOnClipboard': defineKv(type('string | null'), null),
} as const;

/**
 * Whispering table schemas — 5 normalized tables for domain data.
 * Consumed by `attachTables` in `client.ts`.
 */
export const whisperingTables = {
	recordings,
	transformations,
	transformationSteps,
	transformationRuns,
	transformationStepRuns,
};

/**
 * Whispering KV schemas — ~40 entries for synced preferences.
 * Consumed by `attachKv` in `client.ts`.
 */
export const whisperingKv = {
	...sound,
	...output,
	...ui,
	...dataRetention,
	...recording,
	...transcription,
	...transformation,
	...intent,
	...analytics,
	...shortcuts,
	...appState,
};
