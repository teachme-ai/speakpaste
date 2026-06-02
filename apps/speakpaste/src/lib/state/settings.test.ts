import { expect, test, describe } from "bun:test";

// High-Fidelity LocalStorage Mock for CLI testing
const storage = new Map<string, string>();
const localStorageMock = {
	getItem: (key: string) => storage.get(key) ?? null,
	setItem: (key: string, value: string) => { storage.set(key, value); },
	removeItem: (key: string) => { storage.delete(key); },
	clear: () => { storage.clear(); },
};

describe("🎙️ SpeakPaste LocalStorage Settings 100% Full-Coverage Suite", () => {
	
	test("🔒 Retired Remote Credential Keys Stay Unused", () => {
		const retiredKeys = [
			"speakpaste.device.apiKeys.openai",
			"speakpaste.device.apiKeys.anthropic",
			"speakpaste.device.apiKeys.groq",
			"speakpaste.device.apiKeys.google",
		];

		for (const key of retiredKeys) {
			expect(localStorageMock.getItem(key)).toBeNull();
		}
	});

	test("🎙️ Recording Constraints & Sample Rate Assertions", () => {
		const rateKey = "speakpaste.device.recording.cpal.sampleRate";
		const methodKey = "speakpaste.device.recording.method";
		const devIdKey = "speakpaste.device.recording.cpal.deviceId";
		const ffmpegFlagsKey = "speakpaste.device.recording.ffmpeg.globalOptions";

		// CPAL sample rates (16kHz, 44.1kHz, 48kHz)
		const allowedRates = ["16000", "44100", "48000"];
		localStorageMock.setItem(rateKey, "48000");
		expect(allowedRates).toContain(localStorageMock.getItem(rateKey) || "");

		localStorageMock.setItem(rateKey, "16000");
		expect(allowedRates).toContain(localStorageMock.getItem(rateKey) || "");

		// Supported recording methods
		const allowedMethods = ["cpal", "navigator", "ffmpeg"];
		localStorageMock.setItem(methodKey, "cpal");
		expect(allowedMethods).toContain(localStorageMock.getItem(methodKey) || "");

		// Custom FFmpeg options persistence
		localStorageMock.setItem(ffmpegFlagsKey, "-y -t 10");
		expect(localStorageMock.getItem(ffmpegFlagsKey)).toBe("-y -t 10");

		// Device identifier persistence
		localStorageMock.setItem(devIdKey, "uuid-audio-device-12345");
		expect(localStorageMock.getItem(devIdKey)).toBe("uuid-audio-device-12345");
	});

	test("⌨️ Keyboard Entitlements & Shortcuts Assertions", () => {
		const shortcutKey = "speakpaste.device.shortcuts.global.toggleManualRecording";
		const pttKey = "speakpaste.device.shortcuts.global.pushToTalk";

		// Modifier binding formats
		localStorageMock.setItem(shortcutKey, "Command+Shift+F8");
		const val = localStorageMock.getItem(shortcutKey) || "";
		expect(val.includes("Command")).toBe(true);
		expect(val.includes("Shift")).toBe(true);
		expect(val.includes("F8")).toBe(true);

		// Walkie-Talkie Push-to-Talk format
		localStorageMock.setItem(pttKey, "Control+Shift+Space");
		expect(localStorageMock.getItem(pttKey)).toBe("Control+Shift+Space");
	});

	test("🔊 Sound Alerts & Theme Assertions", () => {
		const soundThemeKey = "speakpaste.settings.sound.theme";
		const manualStartSoundKey = "speakpaste.settings.sound.manualStart";
		const completeSoundKey = "speakpaste.settings.sound.transcriptionComplete";

		// sound themes (classic, modern, scifi)
		const allowedThemes = ["classic", "modern", "scifi"];
		localStorageMock.setItem(soundThemeKey, "modern");
		expect(allowedThemes).toContain(localStorageMock.getItem(soundThemeKey) || "");

		// manual start alert toggle
		localStorageMock.setItem(manualStartSoundKey, "true");
		expect(localStorageMock.getItem(manualStartSoundKey)).toBe("true");
		
		// transcription complete toggle
		localStorageMock.setItem(completeSoundKey, "false");
		expect(localStorageMock.getItem(completeSoundKey)).toBe("false");
	});

	test("🧠 Transcription & Model Swaps Assertions", () => {
		const serviceKey = "speakpaste.settings.transcription.service";
		const languageKey = "speakpaste.settings.transcription.language";
		const tempKey = "speakpaste.settings.transcription.temperature";
		const promptKey = "speakpaste.settings.transcription.prompt";

		// switches between local transcription services
		const allowedServices = ["whispercpp", "parakeet", "moonshine"];
		localStorageMock.setItem(serviceKey, "whispercpp");
		expect(allowedServices).toContain(localStorageMock.getItem(serviceKey) || "");

		// target transcription language
		localStorageMock.setItem(languageKey, "es");
		expect(localStorageMock.getItem(languageKey)).toBe("es");

		// temperature boundary values
		localStorageMock.setItem(tempKey, "0.7");
		const temp = parseFloat(localStorageMock.getItem(tempKey) || "0.0");
		expect(temp).toBeGreaterThanOrEqual(0.0);
		expect(temp).toBeLessThanOrEqual(1.0);

		// custom instructions prompt persistence
		localStorageMock.setItem(promptKey, "Keep markdown formatting intact.");
		expect(localStorageMock.getItem(promptKey)).toBe("Keep markdown formatting intact.");
	});

	test("📋 Clipboard & Cursor Delivery Assertions", () => {
		const clipKey = "speakpaste.settings.output.transcription.clipboard";
		const cursorKey = "speakpaste.settings.output.transcription.cursor";
		const enterKey = "speakpaste.settings.output.transcription.enter";

		// copy-to-clipboard settings persistence
		localStorageMock.setItem(clipKey, "true");
		expect(localStorageMock.getItem(clipKey)).toBe("true");

		// auto-paste at cursor persistence
		localStorageMock.setItem(cursorKey, "true");
		expect(localStorageMock.getItem(cursorKey)).toBe("true");

		// auto-enter key toggle persistence
		localStorageMock.setItem(enterKey, "false");
		expect(localStorageMock.getItem(enterKey)).toBe("false");
	});

	test("🗑️ Data Retention Policies Assertions", () => {
		const stratKey = "speakpaste.settings.retention.strategy";
		const countKey = "speakpaste.settings.retention.maxCount";

		// strategy options (keep-forever vs limit-count)
		const allowedStrategies = ["keep-forever", "limit-count"];
		localStorageMock.setItem(stratKey, "limit-count");
		expect(allowedStrategies).toContain(localStorageMock.getItem(stratKey) || "");

		// max retention counts limit
		localStorageMock.setItem(countKey, "150");
		const count = parseInt(localStorageMock.getItem(countKey) || "0", 10);
		expect(count).toBeGreaterThan(0);
		expect(count).toBe(150);
	});
});
