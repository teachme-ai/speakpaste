import { Menu, MenuItem } from '@tauri-apps/api/menu';
import { invoke } from '@tauri-apps/api/core';
import { resolveResource } from '@tauri-apps/api/path';
import { TrayIcon } from '@tauri-apps/api/tray';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';
import {
	defineErrors,
	extractErrorMessage,
	type InferErrors,
} from 'wellcrafted/error';
import { tryAsync } from 'wellcrafted/result';
import { goto } from '$app/navigation';
import { logDiagnostic } from '$lib/diagnostics/runtime-diagnostics';

/**
 * Mynah tray states — drives icon and menu status line.
 *
 * IDLE        → gray mic     — ready for input
 * RECORDING   → green        — actively capturing audio
 * TRANSCRIBING → orange      — whisper.cpp processing
 * PASTED      → blue         — delivery complete (brief, then returns to IDLE)
 * ERROR       → red          — something went wrong
 */
export type MynahTrayState =
	| 'IDLE'
	| 'RECORDING'
	| 'TRANSCRIBING'
	| 'PASTED'
	| 'ERROR';

const TRAY_ID = 'mynah-tray';

const ICON_PATHS: Record<MynahTrayState, string> = {
	IDLE:         'recorder-state-icons/mynah_tray.png',
	RECORDING:    'recorder-state-icons/green_circle.png',
	TRANSCRIBING: 'recorder-state-icons/orange_circle.png',
	PASTED:       'recorder-state-icons/blue_circle.png',
	ERROR:        'recorder-state-icons/red_large_square.png',
};

const STATE_LABELS: Record<MynahTrayState, string> = {
	IDLE:         '⚪ Ready',
	RECORDING:    '🟢 Listening',
	TRANSCRIBING: '🟠 Transcribing',
	PASTED:       '🔵 Pasted',
	ERROR:        '🔴 Error',
};

const TrayError = defineErrors({
	SetIcon: ({ cause }: { cause: unknown }) => ({
		message: `Failed to set tray icon: ${extractErrorMessage(cause)}`,
		cause,
	}),
	UpdateMenu: ({ cause }: { cause: unknown }) => ({
		message: `Failed to update tray menu: ${extractErrorMessage(cause)}`,
		cause,
	}),
});
export type TrayError = InferErrors<typeof TrayError>;

// Singleton tray promise
let trayPromise: ReturnType<typeof initTray> | null = null;
function getTray() {
	if (!trayPromise) trayPromise = initTray();
	return trayPromise;
}

// Track current state for menu display
let currentState: MynahTrayState = 'IDLE';
let currentShortcut = 'Fn key';
let currentModel = 'tiny.en';
let autoPasteEnabled = true;

export const TrayIconServiceLive = {
	/**
	 * Update tray icon and menu status line to reflect new app state.
	 */
	setTrayState: (state: MynahTrayState) =>
		tryAsync({
			try: async () => {
				currentState = state;
				logDiagnostic('tray', 'set_state_started', {
					state,
					iconResource: ICON_PATHS[state],
				});
				const iconPath = await resolveResource(ICON_PATHS[state]);
				logDiagnostic('tray', 'icon_resolved', {
					state,
					iconPath,
				});
				const tray = await getTray();
				await tray.setIcon(iconPath);
				await tray.setTooltip(`Mynah — ${STATE_LABELS[state]}`);
				console.info(`[Tray] state → ${state} (${STATE_LABELS[state]})`);
				logDiagnostic('tray', 'set_state_completed', {
					state,
					label: STATE_LABELS[state],
				});
			},
			catch: (error) => {
				logDiagnostic(
					'tray',
					'set_state_failed',
					{
						state,
						iconResource: ICON_PATHS[state],
						error: extractErrorMessage(error),
					},
					'error',
				);
				return TrayError.SetIcon({ cause: error });
			},
		}),

	/**
	 * Update context shown in tray menu (shortcut, model, auto-paste).
	 * Call this when settings change.
	 */
	updateContext: (opts: {
		shortcut?: string;
		model?: string;
		autoPaste?: boolean;
	}) => {
		if (opts.shortcut !== undefined) currentShortcut = opts.shortcut;
		if (opts.model !== undefined) currentModel = opts.model;
		if (opts.autoPaste !== undefined) autoPasteEnabled = opts.autoPaste;
	},

	// Legacy compat — maps WhisperingRecordingState to MynahTrayState
	setTrayIcon: (recorderState: 'IDLE' | 'RECORDING') =>
		TrayIconServiceLive.setTrayState(recorderState),
};

export type TrayIconService = typeof TrayIconServiceLive;

async function buildMenu() {
	return await Menu.new({
		items: [
			// App title (disabled, just a label)
			await MenuItem.new({
				id: 'title',
				text: 'Mynah',
				enabled: false,
				action: () => {},
			}),

			// Current state
			await MenuItem.new({
				id: 'state',
				text: `State: ${STATE_LABELS[currentState]}`,
				enabled: false,
				action: () => {},
			}),

			// Trigger shortcut
			await MenuItem.new({
				id: 'shortcut',
				text: `Trigger: ${currentShortcut}`,
				enabled: false,
				action: () => {},
			}),

			// Model
			await MenuItem.new({
				id: 'model',
				text: `Model: ${currentModel}`,
				enabled: false,
				action: () => {},
			}),

			// Auto-paste
			await MenuItem.new({
				id: 'autopaste',
				text: `Auto-paste: ${autoPasteEnabled ? 'On' : 'Off'}`,
				enabled: false,
				action: () => {},
			}),

			// Separator via disabled item
			await MenuItem.new({
				id: 'sep1',
				text: '─────────────',
				enabled: false,
				action: () => {},
			}),

			// Open window
			await MenuItem.new({
				id: 'open',
				text: 'Open Mynah',
				action: () => {
					void getCurrentWindow().show();
					void getCurrentWindow().setFocus();
				},
			}),

			// Start dictation
			await MenuItem.new({
				id: 'dictate',
				text: 'Start Dictation',
				action: () => {
					void invoke('toggle_native_dictation').catch(() => {
						void getCurrentWindow().show();
						void getCurrentWindow().setFocus();
						if (typeof window !== 'undefined' && (window as any).commands) {
							(window as any).commands.toggleManualRecording();
						}
					});
				},
			}),

			// Separator
			await MenuItem.new({
				id: 'sep2',
				text: '─────────────',
				enabled: false,
				action: () => {},
			}),

			// Quit
			await MenuItem.new({
				id: 'quit',
				text: 'Quit Mynah',
				action: () => void exit(0),
			}),
		],
	});
}

async function initTray() {
	logDiagnostic('tray', 'init_started', { trayId: TRAY_ID });

	// Prefer retrieving the tray icon that Tauri created natively from tauri.conf.json.
	// This tray exists before JS loads, so it's always available.
	const existingTray = await TrayIcon.getById(TRAY_ID);
	if (existingTray) {
		logDiagnostic('tray', 'existing_tray_reused', { trayId: TRAY_ID });

		// Attach menu and click handler to the config-declared tray
		const trayMenu = await buildMenu();
		await existingTray.setMenu(trayMenu);
		await existingTray.setMenuOnLeftClick(false);

		// Set the proper bird icon (the config uses icons/32x32.png, but we want the 22px version)
		const iconPath = await resolveResource(ICON_PATHS['IDLE']);
		await existingTray.setIcon(iconPath);

		existingTray.setAction((e) => {
			if (
				e.type === 'Click' &&
				e.button === 'Left' &&
				e.buttonState === 'Down'
			) {
				void getCurrentWindow().show();
				void getCurrentWindow().setFocus();
			}
		});

		logDiagnostic('tray', 'init_completed_from_config', {
			trayId: TRAY_ID,
			iconPath,
		});
		return existingTray;
	}

	// Fallback: create tray from JS if config-declared tray is not found
	logDiagnostic('tray', 'config_tray_not_found_creating_from_js', { trayId: TRAY_ID });
	const trayMenu = await buildMenu();
	const iconPath = await resolveResource(ICON_PATHS['IDLE']);
	logDiagnostic('tray', 'idle_icon_resolved_for_init', {
		trayId: TRAY_ID,
		iconPath,
		iconResource: ICON_PATHS['IDLE'],
	});

	const tray = await TrayIcon.new({
		id: TRAY_ID,
		icon: iconPath,
		menu: trayMenu,
		tooltip: 'Mynah — Ready',
		menuOnLeftClick: false,
		action: (e) => {
			// Left click → show window
			if (
				e.type === 'Click' &&
				e.button === 'Left' &&
				e.buttonState === 'Down'
			) {
				void getCurrentWindow().show();
				void getCurrentWindow().setFocus();
			}
		},
	});

	logDiagnostic('tray', 'init_completed', {
		trayId: TRAY_ID,
		iconPath,
	});
	return tray;
}
