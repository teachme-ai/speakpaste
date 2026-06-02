# Antigravity Runtime Validation Prompt

Use this prompt in Antigravity after the launch-surface work is complete.

Latest relevant commits:

- `125af55` - Redesign settings as local control center
- `451b9c9` - Hide advanced recording and engine controls
- `5f3be5e` - Polish launch settings navigation
- `1d556b3` - Record final launch surface review

## AG Task

Act as the runtime-validation observer and reviewer for SpeakPaste.

Do not edit code unless explicitly asked. Inspect the repository, review any runtime logs or manual test notes produced by Codex/user, and write findings to:

`apps/speakpaste/docs/product/ANTIGRAVITY_REVIEW_RUNTIME_VALIDATION.md`

## Runtime Baseline To Validate

SpeakPaste launch flow:

1. User focuses a text field in another macOS app.
2. User triggers the hardware `Fn` key or configured global shortcut.
3. App records locally through native CPAL capture.
4. App transcribes locally through whisper.cpp.
5. App inserts text at cursor through Enigo.
6. Transcript may also be copied to clipboard.
7. Flow must work offline after the local model is already present.

## What AG Should Review

1. **Runtime Logs / Evidence**
   - Read any logs or notes Codex/user adds under `apps/speakpaste/docs/product/`.
   - Look for permission failures, model-path failures, recorder failures, transcription errors, paste failures, or unexpected network calls.

2. **Manual Test Protocol Completeness**
   - Verify the manual test covers:
     - first launch from `/Applications`
     - microphone permission
     - accessibility permission
     - Fn/global shortcut trigger
     - CPAL recording
     - whisper.cpp local transcription
     - Enigo paste into TextEdit/Notes
     - clipboard fallback
     - Wi-Fi off / offline run
     - app minimized/background shortcut trigger

3. **Local-Only Runtime Risk**
   - Confirm no startup updater checks.
   - Confirm no cloud/API/telemetry route is required for record/transcribe/paste.
   - Confirm model downloads are user-initiated only.
   - Distinguish expected manual download links from unexpected runtime networking.

4. **Launch Blockers**
   - Treat any failure in shortcut -> record -> transcribe -> paste as launch-blocking.
   - Treat permission prompts that are confusing but recoverable as polish unless they prevent success.
   - Treat missing-model UX as blocking only if the app fails without clear recovery instructions.

## Required Output Structure

Write:

1. Executive verdict
2. Evidence reviewed
3. Runtime blockers
4. Non-blocking runtime polish
5. Local-only runtime findings
6. Manual macOS validation checklist status
7. Recommended fixes for Codex
8. Recommended checks for the user

Be direct. If the app is ready for release after runtime validation, say so clearly. If it is not, list the smallest blocker-fix set.
