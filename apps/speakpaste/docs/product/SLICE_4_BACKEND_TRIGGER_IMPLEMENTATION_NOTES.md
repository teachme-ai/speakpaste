# Slice 4 Backend Trigger Implementation Notes

Date: 2026-06-02

## What Was Implemented

Implemented Slice 4A: native trigger and capture handoff.

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
- JS global shortcut fallback

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

- JS global shortcut registration
- full Rust transcription pipeline
- Rust deterministic text rule application
- Rust paste delivery
- native Rust tray rebuild

## Validation Needed

Manual validation should focus on:

1. Fn press starts native background recording.
2. Fn release stops recording and emits `dictation:audio-ready`.
3. Existing Svelte pipeline transcribes and pastes from the emitted WAV.
4. Tray Start Dictation toggles native recording.
5. Existing JS global shortcut still works as fallback.

If this passes, the next slice can move global shortcut registration into Rust.
