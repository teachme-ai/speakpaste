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

Pending.
