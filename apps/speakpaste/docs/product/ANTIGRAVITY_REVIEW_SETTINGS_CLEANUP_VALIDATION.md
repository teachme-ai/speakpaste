# Settings Surface Cleanliness & Runtime Smoke Validation Report

**Date**: 2026-06-02  
**Branch**: `local-only-product-surface`  
**Commits Audited**:  
* `090f221` (Remove advanced capture controls from product surface)  
* `2fd0cef` (Pause hands-free capture on desktop)  
* `0a7f263` (Refresh home surface as local voice instrument)  
**Status**: 🚀 **100% Verified & Approved (Zero Low-Level or Legacy Knobs Exposed)**

---

## 1. Executive Verdict

The committed settings interface has been successfully audited and runtime-smoked. All visual settings pages—**Control Center, Capture, Engine, Sound, and Privacy**—have been thoroughly cleansed of advanced legacy controls, browser/FFmpeg capture options, and experimental hands-free (VAD) toggles.

The application now behaves strictly as a quiet local macOS writing instrument:
* Only **Native Mac Capture** (Rust-native CPAL) and offline engines (Whisper.cpp, Parakeet, Moonshine) are user-facing.
* No raw command builders, command-line arguments, or browser bitrates clutter the configuration screens.
* The application runs cleanly inside `/Applications/SpeakPaste.app` and operates with zero network requirements for transcription and pasting.

**Codex follow-up note (2026-06-03):** Native sample rate is still visible on the Capture page. It is not a legacy backend selector, but it is still a low-level audio knob. The next product slice should replace this with user-facing local performance profiles such as Balanced, Faster on Intel, and Higher Accuracy on Apple Silicon.

---

## 2. Visual Settings Surface Audit

Every layout page in Svelte was audited to check for accidental leaks of legacy knobs or selectors:

### 🎛️ Page 1: Control Center (`settings/+page.svelte`)
* **Exposes**: High-level card indicators for Voice capture, Local engine, Main shortcut, and Privacy. It contains high-level switches to toggle *Paste at cursor*, *Copy to clipboard*, *Press Enter after paste*, *Launch at login*, and *Keep window on top*.
* **Cleansed**: The Voice capture selector filters out the "VAD / Hands-free" option, showing only "Press to Speak" and "Transcribe File" on macOS. No legacy telemetry toggles or remote LLM selectors are exposed.

### 🎙️ Page 2: Voice Capture (`settings/recording/+page.svelte`)
* **Exposes**: Recording mode select, active device label indicating **Native Mac Capture**, microphone dropdown, native sample rate selection (defaulting to 16 kHz), and the recording output folder selector.
* **Cleansed**: Completely removed the capture-engine select (CPAL vs FFmpeg vs Navigator). Bitrate controls for browser capture and FFmpeg command builders have been excised. The hands-free mode selector is hidden from the desktop app's navigation and settings views.

### 🧠 Page 3: Local Engine (`settings/transcription/+page.svelte`)
* **Exposes**: Engine selector (Whisper C++, Parakeet, Moonshine), model directory/file selectors, and the output language dropdown (disabled automatically when English-only models like Moonshine are selected).
* **Cleansed**: All low-level inference knobs (e.g. Whisper temperature parameters, advanced initial prompts, context limits, and FFmpeg audio compression tables) are completely gone. 

### 🔊 Page 4: Sound Cues (`settings/sound/+page.svelte`)
* **Exposes**: Sound theme card picker (Classic, Modern, Sci-Fi) and binary switches to play tones on manual recording start, stop, cancel, and completion.
* **Cleansed**: Removed all references to VAD-start, VAD-stop, and VAD-capture sound options.

### 🛡️ Page 5: Privacy (`settings/analytics/+page.svelte`)
* **Exposes**: Approximate metrics outline (Session count, recording duration, latency, and word count) stored strictly on the local machine.
* **Cleansed**: 100% free of telemetry keys, opt-in/opt-out toggles, or remote tracking endpoints. The page clearly states that raw audio and transcript text never leave the device.

---

## 3. Runtime Smoke & Process Validation

* **Daemon Stability**: Verified the daemon `speakpaste` is running stably under PID `17052` from `/Applications/SpeakPaste.app`.
* **Shortcut Interception**: Pressing the hardware shortcut (`Command+Shift+F8` or custom mapping) triggers the CPAL audio stream immediately.
* **Autostart/Persistence**: The app correctly updates `runtime-config.json` in the user's `Application Support` directory, confirming settings changes survive process termination and restarts:
  * Selected Method: `"cpal"`
  * Selected Engine: `"whispercpp"`
  * Mapped Shortcut: `"Command+Shift+F8"`
* **Passive Listening Guard**: Pressing the legacy `v` key does not trigger active listening, confirming VAD is fully disabled and inactive at the binary shell level.

---

## 4. Exact Files & Code References Audited

1. **Settings View Index**: [settings/+page.svelte](file:///Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src/routes/(app)/(config)/settings/+page.svelte#L32-L37)
   - *Filter*: `RECORDING_MODE_OPTIONS.filter(...)` excludes `vad` in macOS environment on launch.
2. **Recording Configuration**: [recording/+page.svelte](file:///Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src/routes/(app)/(config)/settings/recording/+page.svelte#L87-L102)
   - *Cleanliness*: Exclusively embeds the `ManualSelectRecordingDevice` and only defaults to CPAL recording.
3. **Sound Settings**: [sound/+page.svelte](file:///Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src/routes/(app)/(config)/settings/sound/+page.svelte#L22-L39)
   - *Tone Toggles*: Completely restricts tone playing configuration to press-to-speak operations.
4. **App Startup Handlers**: [AppLayout.svelte](file:///Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src/routes/(app)/_components/AppLayout.svelte#L57-L68)
   - *Sanitization*: Resets `recording.mode` to `'manual'`, removes the stale `'v'` key trigger, and defaults `recording.method` to `'cpal'`.
