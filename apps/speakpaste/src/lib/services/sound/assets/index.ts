import type { WhisperingSoundNames } from '$lib/constants/sounds';
import { settings } from '$lib/state/settings.svelte';
import {
	default as captureVadSoundSrc,
	default as stopManualSoundSrc,
} from './sound_ex_machina_Button_Blip.mp3';
import startManualSoundSrc from './zapsplat_household_alarm_clock_button_press_12967.mp3';
import stopVadSoundSrc from './zapsplat_household_alarm_clock_large_snooze_button_press_001_12968.mp3';
import startVadSoundSrc from './zapsplat_household_alarm_clock_large_snooze_button_press_002_12969.mp3';
import cancelSoundSrc from './zapsplat_multimedia_click_button_short_sharp_73510.mp3';
import transformationCompleteSoundSrc from './zapsplat_multimedia_notification_alert_ping_bright_chime_001_93276.mp3';
import transcriptionCompleteSoundSrc from './zapsplat_multimedia_ui_notification_classic_bell_synth_success_107505.mp3';

type SoundTheme = 'ambient' | 'classic' | 'modern' | 'scifi';

// Cache individual Audio elements to prevent memory leaks and garbage collection delay
const classicStart = new Audio(startManualSoundSrc);
const classicStop = new Audio(stopManualSoundSrc);
const classicCancel = new Audio(cancelSoundSrc);

const modernStart = new Audio(cancelSoundSrc); // Short sharp click
const modernStop = new Audio(stopVadSoundSrc); // Snappy alarm stop
const modernCancel = new Audio(startVadSoundSrc);

const scifiStart = new Audio(transformationCompleteSoundSrc); // Bright ping chime
const scifiStop = new Audio(transcriptionCompleteSoundSrc); // Synth success bell
const scifiCancel = new Audio(cancelSoundSrc);

const ambientStart = new Audio(stopManualSoundSrc);
const ambientStop = new Audio(stopManualSoundSrc);
const ambientCancel = new Audio(cancelSoundSrc);
const ambientComplete = new Audio(stopManualSoundSrc);

const themedVolume: Record<SoundTheme, number> = {
	ambient: 0.32,
	classic: 0.46,
	modern: 0.4,
	scifi: 0.36,
};

function normalizeTheme(value: unknown): SoundTheme {
	if (
		value === 'ambient' ||
		value === 'classic' ||
		value === 'modern' ||
		value === 'scifi'
	) {
		return value;
	}
	return 'ambient';
}

function setVolume(audio: HTMLAudioElement, theme: SoundTheme) {
	audio.volume = themedVolume[theme];
}

export const playThemedSound = async (soundName: WhisperingSoundNames): Promise<void> => {
	const theme = normalizeTheme(settings.get('sound.theme'));
	let audio: HTMLAudioElement;

	if (soundName === 'manual-start' || soundName === 'vad-start') {
		audio =
			theme === 'ambient'
				? ambientStart
				: theme === 'scifi'
					? scifiStart
					: theme === 'modern'
						? modernStart
						: classicStart;
	} else if (soundName === 'manual-stop' || soundName === 'vad-stop' || soundName === 'vad-capture') {
		audio =
			theme === 'ambient'
				? ambientStop
				: theme === 'scifi'
					? scifiStop
					: theme === 'modern'
						? modernStop
						: classicStop;
	} else if (soundName === 'manual-cancel') {
		audio =
			theme === 'ambient'
				? ambientCancel
				: theme === 'scifi'
					? scifiCancel
					: theme === 'modern'
						? modernCancel
						: classicCancel;
	} else if (soundName === 'transcriptionComplete') {
		audio =
			theme === 'ambient'
				? ambientComplete
				: theme === 'scifi'
					? scifiStop
					: theme === 'modern'
						? modernStop
						: classicStop;
	} else {
		audio =
			theme === 'ambient'
				? ambientComplete
				: theme === 'scifi'
					? scifiStart
					: theme === 'modern'
						? modernStop
						: classicStop;
	}

	audio.currentTime = 0;
	setVolume(audio, theme);
	await audio.play();
};
