import { Ok } from 'wellcrafted/result';

export type { AnalyticsError, AnalyticsService, Event } from './types';

export const AnalyticsServiceLive = {
	async logEvent() {
		return Ok(undefined);
	},
};
