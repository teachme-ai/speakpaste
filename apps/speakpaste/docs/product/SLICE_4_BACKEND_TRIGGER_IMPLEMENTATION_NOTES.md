# Slice 4 Backend Trigger Implementation Notes

Date: 2026-06-02

## What Was Implemented

Implemented Slice 4A: native trigger and capture handoff.

Implemented Slice 4B: native ownership for the primary dictation global shortcuts.

Rust now owns:

- native Fn key start/stop routing
- native tray "Start Dictation" toggle command
- CPAL recording start/stop for those native triggers
- WAV file creation
- `dictation:audio-ready` event emission

Svelte still owns:

- transcription
- deterministic text rules
- paste delivery
- notifications
- JS global shortcut registration for non-native-owned commands and fallback

## Why This Slice

This is the safest useful step toward backend-owned runtime. It moves the latency-sensitive trigger/capture path into Rust without rewriting the already validated local transcription and paste pipeline.

## Event Flow

```text
Fn down or tray Start Dictation
  -> Rust DictationManager
  -> CPAL start
  -> dictation:state-changed Recording

Fn up or tray toggle stop
  -> Rust DictationManager
  -> CPAL stop and WAV finalize
  -> dictation:audio-ready { recordingId, filePath }
  -> Svelte reads WAV as Blob
  -> existing processRecordingPipeline()
```

## Deliberately Not Moved Yet

- JS global shortcut registration for secondary commands
- full Rust transcription pipeline
- Rust deterministic text rule application
- Rust paste delivery
- native Rust tray rebuild

## Slice 4B Native Shortcut Ownership

Rust now owns the primary global dictation triggers when registration succeeds:

- `toggleManualRecording`
- `pushToTalk`

The new `native_shortcuts.rs` module:

- reads `runtime-config.json`
- unregisters previously native-owned shortcuts
- registers the configured toggle shortcut with a Rust handler that calls `DictationManager`
- registers the configured push-to-talk shortcut with pressed/released handlers
- returns the command ids that Rust successfully owns

The Svelte startup path now:

1. writes the latest runtime config
2. asks Rust to reload native global shortcuts
3. registers remaining global shortcuts through the existing JS path
4. skips JS registration only for command ids Rust reported as native-owned

This preserves fallback behavior. If native registration fails because the accelerator is invalid or unavailable, Svelte still attempts the normal JS registration path.

## Validation Needed

Manual validation should focus on:

1. Fn press starts native background recording.
2. Fn release stops recording and emits `dictation:audio-ready`.
3. Existing Svelte pipeline transcribes and pastes from the emitted WAV.
4. Tray Start Dictation toggles native recording.
5. Existing JS global shortcut still works as fallback.

Slice 4B adds:

6. Build/install `.app` bundle.
7. Launch from `/Applications/SpeakPaste.app`.
8. Confirm the configured global toggle shortcut records and pastes.
9. Close/hide the main window and confirm the same shortcut still records and pastes.
10. Restart the app and confirm shortcut ownership survives because Rust reloads from `runtime-config.json`.

If this passes, the next slice can move more of the transcription/paste pipeline into Rust or add backend-owned observability for the native runtime path.

## AG Review Ask For Slice 4B

Please review the latest working tree/commit for:

1. Native shortcut ownership in `apps/speakpaste/src-tauri/src/native_shortcuts.rs`.
2. Whether native shortcut registration can conflict with the existing JS global shortcut manager.
3. Whether the frontend skip-list in `syncGlobalShortcutsWithSettings` preserves fallback behavior.
4. Whether shortcut changes after startup should trigger any additional JS/native resync work.
5. Manual restart/background validation risks.

AG should write findings into `apps/speakpaste/docs/product/ANTIGRAVITY_REVIEW_RUNTIME_VALIDATION.md` or append to this file if the finding is implementation-specific.
