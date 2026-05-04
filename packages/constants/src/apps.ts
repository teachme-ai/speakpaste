export const APPS = {
	AUDIO: { port: 1420, urls: ['https://github.com/irfan1476/speakpaste'] },
	DASHBOARD: { port: 5178, urls: ['https://github.com/irfan1476/speakpaste'] },
} as const;

export type AppId = keyof typeof APPS;
export const EPICENTER_API_URL = '';
