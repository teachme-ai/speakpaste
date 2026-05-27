import { Ok } from 'wellcrafted/result';
import type { PlaySoundService } from '.';
import { playThemedSound } from './assets';

export function createPlaySoundServiceWeb(): PlaySoundService {
	return {
		playSound: async (soundName) => {
			if (!document.hidden) {
				try {
					await playThemedSound(soundName);
				} catch (e) {
					// Fallback or ignore audio errors on hidden/unfocused documents
				}
				return Ok(undefined);
			}
			return Ok(undefined);
		},
	};
}
