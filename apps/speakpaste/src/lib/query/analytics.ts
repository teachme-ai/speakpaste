import { Ok, type Result } from 'wellcrafted/result';
import { defineMutation } from '$lib/query/client';
import type { Event } from '$lib/services/analytics/types';

const analyticsKeys = {
	logEvent: ['analytics', 'logEvent'] as const,
} as const;

/**
 * Analytics query layer.
 * Local-only builds do not send telemetry. This remains as a stable call site
 * until the local metrics store is implemented.
 */
export const analytics = {
	/**
	 * Accept analytics events without sending them to a remote service.
	 */
	logEvent: defineMutation({
		mutationKey: analyticsKeys.logEvent,
		mutationFn: async (_event: Event): Promise<Result<void, never>> => {
			return Ok(undefined);
		},
	}),
};
