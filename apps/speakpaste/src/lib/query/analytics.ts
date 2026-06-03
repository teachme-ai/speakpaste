import { invoke } from '@tauri-apps/api/core';
import { Ok, type Result, tryAsync } from 'wellcrafted/result';
import { defineMutation, defineQuery } from '$lib/query/client';
import type { Event } from '$lib/services/analytics/types';

const analyticsKeys = {
	logEvent: ['analytics', 'logEvent'] as const,
	logPath: ['analytics', 'logPath'] as const,
	clearLog: ['analytics', 'clearLog'] as const,
} as const;

/**
 * Analytics query layer.
 * Events remain fully local and are appended to an on-device JSONL diagnostics log
 * when the desktop runtime is available.
 */
export const analytics = {
	getLocalAnalyticsLogPath: defineQuery({
		queryKey: analyticsKeys.logPath,
		queryFn: async (): Promise<Result<string | null, never>> => {
			if (!window.__TAURI_INTERNALS__) return Ok(null);
			const { data, error } = await tryAsync({
				try: async () => await invoke<string>('get_local_analytics_log_path'),
				catch: () => null,
			});
			if (error) return Ok(null);
			return Ok(data);
		},
	}),

	getLocalAnalyticsDirectoryPath: defineQuery({
		queryKey: ['analytics', 'directoryPath'] as const,
		queryFn: async (): Promise<Result<string | null, never>> => {
			if (!window.__TAURI_INTERNALS__) return Ok(null);
			const { data, error } = await tryAsync({
				try: async () =>
					await invoke<string>('get_local_analytics_directory_path'),
				catch: () => null,
			});
			if (error) return Ok(null);
			return Ok(data);
		},
	}),

	/**
	 * Accept analytics events and persist them locally on desktop.
	 */
	logEvent: defineMutation({
		mutationKey: analyticsKeys.logEvent,
		mutationFn: async (event: Event): Promise<Result<void, never>> => {
			if (!window.__TAURI_INTERNALS__) {
				return Ok(undefined);
			}

			const { error } = await tryAsync({
				try: async () => await invoke('log_local_analytics_event', { event }),
				catch: (cause) => cause,
			});

			if (error) {
				console.warn('[Local analytics] Failed to append event', error);
				return Ok(undefined);
			}

			return Ok(undefined);
		},
	}),

	clearLocalAnalyticsLog: defineMutation({
		mutationKey: analyticsKeys.clearLog,
		mutationFn: async (): Promise<Result<void, never>> => {
			if (!window.__TAURI_INTERNALS__) return Ok(undefined);
			const { error } = await tryAsync({
				try: async () => await invoke('clear_local_analytics_log'),
				catch: (cause) => cause,
			});
			if (error) {
				console.warn('[Local analytics] Failed to clear log', error);
			}
			return Ok(undefined);
		},
	}),
};
