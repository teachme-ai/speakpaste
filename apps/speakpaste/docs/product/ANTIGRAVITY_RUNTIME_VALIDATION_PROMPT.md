# Antigravity Runtime Validation Prompt

Use this prompt in Antigravity after the launch-surface work is complete.

Latest relevant commits:

- `125af55` - Redesign settings as local control center
- `451b9c9` - Hide advanced recording and engine controls
- `5f3be5e` - Polish launch settings navigation
- `1d556b3` - Record final launch surface review
- `938cf25` - Move dictation shortcuts toward native ownership
- `35e84d6` - Reload native shortcuts on live config changes

## AG Task

Act as the runtime-validation observer and reviewer for Mynah.

Do not edit code unless explicitly asked. Build/install/test the latest app when possible, inspect runtime logs, review any manual notes produced by Codex/user, and write findings to:

`apps/mynah/docs/product/ANTIGRAVITY_REVIEW_RUNTIME_VALIDATION.md`

## Runtime Baseline To Validate

Mynah launch flow:

1. User focuses a text field in another macOS app.
2. User triggers the hardware `Fn` key or configured global shortcut.
3. App records locally through native CPAL capture.
4. App transcribes locally through whisper.cpp.
5. App inserts text at cursor through Enigo.
6. Transcript may also be copied to clipboard.
7. Flow must work offline after the local model is already present.

## Current AG Execution Task

Please take over the heavier build/install/runtime validation loop for the latest committed code.

1. Confirm the repository is on `local-only-product-surface` and includes commit `35e84d6`.
2. Build the latest macOS app bundle:

   ```bash
   cd apps/mynah
   bun tauri build --bundles app
   ```

3. Install the latest `.app` bundle to `/Applications/Mynah.app`.
   - If an older app exists, replace it with the newly built bundle.
   - Do not require a DMG for this validation loop.
   - If DMG packaging fails, record it as distribution follow-up only; do not block `.app` validation.
4. Launch `/Applications/Mynah.app`.
5. Test live native shortcut reload:
   - Start with the current configured global trigger shortcut.
   - Confirm it records/transcribes/pastes.
   - While the app is still open, change the global trigger shortcut in settings.
   - Without restarting the app, confirm the new shortcut records/transcribes/pastes.
   - Confirm the old shortcut no longer triggers, if feasible.
6. Test background runtime:
   - Close/hide the main UI window.
   - Keep the menu bar/status item running.
   - Focus TextEdit/Notes/another text field.
   - Trigger dictation using the configured global shortcut or Fn flow.
   - Confirm recording, local transcription, and paste succeed.
7. Test restart persistence:
   - Quit and relaunch the app.
   - Confirm the latest shortcut survives restart and still triggers dictation.
8. Append results to `ANTIGRAVITY_REVIEW_RUNTIME_VALIDATION.md`.

## Current DMG Clarification

The DMG is not required for this validation pass.

Known state:

- `.app` bundling works.
- Local DMG creation has failed in the Codex sandbox because `hdiutil` returns `Device not configured`.
- A normal terminal or release pipeline may still produce a DMG; treat that as packaging/distribution follow-up.
- Runtime validation should use `/Applications/Mynah.app`.

## What AG Should Review

1. **Runtime Logs / Evidence**
   - Read any logs or notes Codex/user adds under `apps/mynah/docs/product/`.
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
