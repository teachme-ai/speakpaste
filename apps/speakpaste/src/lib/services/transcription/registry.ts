/**
 * Local transcription service UI registry — icons, settings key mappings, and
 * platform-conditional availability. Pure data (model lists, capabilities,
 * labels) lives in `$lib/constants/transcription`.
 */

import ggmlIcon from '$lib/constants/icons/ggml.svg?raw';
import nvidiaIcon from '$lib/constants/icons/nvidia.svg?raw';
import { IS_WINDOWS } from '$lib/constants/platform';
import { type TranscriptionServiceId } from '$lib/constants/transcription';
import type { DeviceConfigKey } from '$lib/state/device-config.svelte';

// Service types

type BaseTranscriptionService = {
	id: TranscriptionServiceId;
	name: string;
	icon: string; // SVG string
	invertInDarkMode: boolean; // Whether to invert the icon in dark mode
	description?: string;
};

type LocalTranscriptionService = BaseTranscriptionService & {
	location: 'local';
	modelPathField: DeviceConfigKey;
};

// Service registry

export const TRANSCRIPTION_SERVICES = [
	// Local services first (truly offline)
	// Whisper C++ is not available on Windows due to upstream whisper-rs limitations and MSVC runtime library conflicts
	...(IS_WINDOWS
		? []
		: [
				{
					id: 'whispercpp',
					name: 'Whisper C++',
					icon: ggmlIcon,
					invertInDarkMode: true,
					description: 'Fast local transcription with no internet required',
					modelPathField: 'transcription.whispercpp.modelPath',
					location: 'local',
				} as const,
			]),
	{
		id: 'parakeet',
		name: 'Parakeet',
		icon: nvidiaIcon,
		invertInDarkMode: false,
		description: 'NVIDIA NeMo model for fast local transcription',
		modelPathField: 'transcription.parakeet.modelPath',
		location: 'local',
	},
] as const satisfies readonly LocalTranscriptionService[];

export type TranscriptionService = (typeof TRANSCRIPTION_SERVICES)[number];
