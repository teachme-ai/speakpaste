import { tryAsync } from 'wellcrafted/result';
import type { PlaySoundService } from '.';
import { playThemedSound } from './assets';
import { SoundError } from './types';

export function createPlaySoundServiceDesktop(): PlaySoundService {
	return {
		playSound: async (soundName) =>
			tryAsync({
				try: async () => {
					await playThemedSound(soundName);
				},
				catch: (error) => SoundError.Play({ cause: error }),
			}),
	};
}
