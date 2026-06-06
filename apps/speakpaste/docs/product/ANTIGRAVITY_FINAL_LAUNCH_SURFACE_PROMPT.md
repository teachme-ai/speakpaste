# Antigravity Final Launch Surface Review Prompt

Use this prompt in Antigravity after the following commits:

- `25cc9a0` - Complete local-only product surface cleanup
- `acf9a99` - Reposition transformations as advanced text rules
- `125af55` - Redesign settings as local control center
- `451b9c9` - Hide advanced recording and engine controls
- `5f3be5e` - Polish launch settings navigation

## Prompt

Review the current Mynah launch surface as a final local-only product QA pass.

Do not edit code. Inspect the repository and write your findings to:

`apps/mynah/docs/product/ANTIGRAVITY_REVIEW_FINAL_LAUNCH_SURFACE.md`

## Product Baseline

Mynah is now intended to be a focused macOS local voice-to-cursor product:

- Press hotkey or Fn trigger.
- Record locally through native capture, primarily CPAL on macOS.
- Transcribe locally with on-device engines, primarily whisper.cpp.
- Paste text at the active cursor through local desktop automation.
- Keep audio, transcript text, diagnostics, settings, and usage intelligence on the Mac.
- Acknowledge frameworks and model sources visibly.
- Avoid cloud transcription, remote rewrite providers, remote analytics, API-key setup, and auto-updater behavior for this launch phase.

## What To Audit

1. **Launch Product Surface**
   - Does the app now feel like a focused local macOS voice typing utility?
   - Does the settings sidebar feel calm and launch-appropriate?
   - Confirm primary settings are limited to:
     - Output / Control Center
     - Voice Capture
     - Local Engine
     - Shortcuts
     - Privacy & Tech
     - Credits
   - Confirm Sound and Technology remain reachable without being top-level distractions.

2. **Advanced Settings Containment**
   - Confirm CPAL/native capture is the primary manual recording path.
   - Confirm FFmpeg/browser backend selection is hidden behind advanced controls.
   - Confirm raw FFmpeg command fields are not visible by default.
   - Confirm compression/temperature/transcription hint controls are not visible by default.
   - Confirm global shortcuts are primary and local shortcuts are demoted.

3. **Local-Only Policy**
   - Search for reachable cloud/API/provider surfaces.
   - Search for active updater behavior.
   - Search for active telemetry/off-device analytics behavior.
   - Search for prompt-transform or remote rewrite surfaces.
   - Distinguish attribution/documentation references from active product behavior.

4. **Runtime Readiness Risks**
   - List anything that could still break the real flow:
     - Fn/global shortcut
     - CPAL recording
     - whisper.cpp local inference
     - Enigo paste at cursor
     - accessibility and microphone permissions
     - model path/download/manual placement
   - Identify which risks require manual macOS testing versus code review.

5. **Launch Acceptance Checklist**
   - Provide a concise checklist for Codex to run next.
   - Separate automated checks from manual desktop checks.

## Required Output Structure

Write the review file with these sections:

1. Executive verdict
2. Remaining launch-surface issues
3. Local-only policy findings
4. Advanced settings containment findings
5. Runtime readiness risks
6. Automated checks Codex should run
7. Manual macOS checks the user must run
8. Blockers vs non-blocking polish

Be direct. If something is launch-blocking, say so clearly. If the app is ready for runtime validation, say that clearly too.
