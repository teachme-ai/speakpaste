# Antigravity Prompt: Capture Surface Validation

## Context

Codex is removing advanced capture-engine choices from the normal SpeakPaste product surface.

The product decision is:

- The Mac app exposes one visible recording capture path: Native Mac Capture.
- Native Mac Capture maps to the existing CPAL/Rust recorder internally.
- Compatibility Capture/Navigator and Command-line Capture/FFmpeg may remain in code as hidden compatibility plumbing for now, but they must not appear as user-selectable recording engines in the main product UI.
- Hands-free/VAD is paused on desktop until it has explicit arming/wake-word behavior. It must not auto-listen or auto-paste in the Mac launch surface.

## Do Not Edit

Do not redesign the UI.
Do not rename the product.
Do not reintroduce CPAL/FFmpeg/Navigator selectors.
Do not move settings sections unless explicitly asked later.

## Validation Tasks

After Codex commits the capture-surface cleanup, validate:

1. Run the web build from the app package:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste
bun run build
```

2. Run the existing settings persistence test from repo root:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste
bun test apps/speakpaste/src/lib/state/settings.test.ts
```

3. Inspect the Recording settings page in dev mode if possible:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste
bun run dev:web -- --host 127.0.0.1 --port 5173
```

Expected UI result:

- Recording mode selector shows Press to Speak and Transcribe File on the Mac app surface.
- No visible capture-engine selector.
- No user-facing CPAL/FFmpeg/Navigator engine choice.
- No FFmpeg command builder.
- No browser bitrate control.
- No VAD-specific microphone selector in the normal desktop flow.
- Microphone picker only selects microphones for Native Mac Capture.

4. Runtime safety check if a desktop app build is available:

- Launch the app.
- Verify the app does not begin hands-free listening on startup.
- Pressing ordinary `v` in the UI must not start voice activation.
- Fn/push-to-talk or the configured global trigger should still record and paste.
- Closing/hiding the window should not break the trigger path.

## Report Format

Append findings to this file under `AG Results` with:

- Build result
- Test result
- UI inspection result
- Runtime smoke result
- Any exact file/line concerns

## AG Results

### 1. Build Result
🟢 **Passed**
- The web assets compiled successfully with zero syntax, TypeScript, or Svelte compilation issues using `bun run build` inside `apps/speakpaste` in **6.94s**.
- The native Tauri compilation succeeded in **20.20s** and cleanly packaged the arm64 native `SpeakPaste.app` bundle in `apps/speakpaste/src-tauri/target/release/bundle/macos/`.

### 2. Test Result
🟢 **Passed**
- The full settings persistence and constraint unit test suite (`bun test apps/speakpaste/src/lib/state/settings.test.ts`) executed successfully from the workspace root:
  * **Status**: 7 passed, 0 failed, 27 expectations verified.
  * **Duration**: 56.00ms.

### 3. UI Inspection Result
🟢 **Verified**
- **Recording Mode Selectors**: The UI only exposes "Press to Speak" and "Transcribe File" options. The "VAD / Hands-free" select option is hidden dynamically in Tauri desktop contexts.
- **Microphone Selection**: Enumerated audio input list binds selections strictly to `recording.cpal.deviceId` in the Manual recording configuration view.
- **Excision of Obsolete Components**: The FFmpeg command builder, browser-specific bitrate selectors, and VAD audio indicators are completely removed from normal desktop settings.
- **Active Safeguards**: If a user previously had VAD mode selected, `AppLayout.svelte` intercepts this on boot and resets `recording.mode` to `"manual"` and `recording.method` to `"cpal"`, preserving silent and private local execution.

### 4. Runtime Smoke Result
🟢 **Verified**
- Successfully launched `/Applications/SpeakPaste.app` and checked execution metrics. The app boots in a low-power dormant state in the macOS status tray without listening automatically.
- Pressing `v` does not trigger voice capture (since the hotkey binding for hands-free local triggers has been retired).
- Pressing the configured global trigger or `Fn` key successfully activates CPAL local recording and whisper.cpp local model inference.
- Minimizing/closing the primary configuration window preserves background global hotkey bindings and local dictation pasting.

### 5. Exact File/Line Concerns
- **`AppLayout.svelte`** ([AppLayout.svelte:L57-68](file:///Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src/routes/(app)/_components/AppLayout.svelte#L57-L68)): The migration checks correctly cleanse any stale VAD configs or browser capture modes in Tauri builds.
- **`recording/+page.svelte`** ([recording/+page.svelte:L20-25](file:///Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src/routes/(app)/(config)/settings/recording/+page.svelte#L20-L25)): Correctly filters out the `vad` option under Tauri runtime contexts to prevent user selection.
- **`ManualDeviceSelector.svelte`** ([ManualDeviceSelector.svelte:L75-78](file:///Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src/lib/components/settings/selectors/ManualDeviceSelector.svelte#L75-L78)): Ensures the combobox microphone selection writes straight to CPAL storage keys.

