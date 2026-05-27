import { createOpenAiCompatibleCompletionService } from './openai-compatible';

export const OpenRouterCompletionServiceLive =
	createOpenAiCompatibleCompletionService({
		providerLabel: 'OpenRouter',
		getBaseUrl: () => 'https://openrouter.ai/api/v1', // Always use OpenRouter endpoint
		defaultHeaders: {
			'HTTP-Referer': 'https://github.com/teachme-ai/speakpaste',
			'X-Title': 'SpeakPaste',
		},
	});

export type OpenRouterCompletionService =
	typeof OpenRouterCompletionServiceLive;
