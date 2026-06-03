/**
 * User-facing local performance profiles.
 *
 * Profiles intentionally hide low-level audio settings while preserving the
 * existing native recorder configuration underneath.
 */

export const LOCAL_PERFORMANCE_PROFILES = [
	'balanced',
	'intel-fast',
	'apple-silicon-accuracy',
] as const;

export type LocalPerformanceProfile =
	(typeof LOCAL_PERFORMANCE_PROFILES)[number];

export const LOCAL_PERFORMANCE_PROFILE_OPTIONS = [
	{
		value: 'balanced',
		label: 'Balanced',
		description: 'Recommended default for most Macs.',
		sampleRate: '16000',
	},
	{
		value: 'intel-fast',
		label: 'Fast on Intel and basic Macs',
		description: 'Prioritizes low latency and lighter local processing.',
		sampleRate: '16000',
	},
	{
		value: 'apple-silicon-accuracy',
		label: 'Higher accuracy on Apple Silicon',
		description: 'For M-series Mac mini, MacBook Pro, and Mac Studio workflows.',
		sampleRate: '48000',
	},
] as const satisfies {
	value: LocalPerformanceProfile;
	label: string;
	description: string;
	sampleRate: '16000' | '44100' | '48000';
}[];
