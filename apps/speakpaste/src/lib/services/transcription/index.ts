// Local transcription services
import { MoonshineTranscriptionServiceLive } from './local/moonshine';
import { ParakeetTranscriptionServiceLive } from './local/parakeet';
import { WhisperCppTranscriptionServiceLive } from './local/whispercpp';

export {
	MoonshineTranscriptionServiceLive as moonshine,
	ParakeetTranscriptionServiceLive as parakeet,
	WhisperCppTranscriptionServiceLive as whispercpp,
};
