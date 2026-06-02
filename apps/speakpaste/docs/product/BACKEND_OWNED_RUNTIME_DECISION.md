# Backend-Owned Runtime Decision

Date: 2026-06-02

## Decision

Adopt Antigravity's backend-owned runtime direction as the long-term architecture, but do not implement it as a single 24-48 hour rewrite.

The current launch-safe behavior is:

- Main window close hides the webview instead of destroying it.
- Fn/global shortcuts continue to work because the Svelte runtime remains alive.
- Native Window menu can restore the hidden UI through `Window -> Show Application Window`.

This is acceptable for launch validation, but it is not the final architecture.

## Why Not Full Rewrite Immediately

Antigravity's proposal correctly identifies the desired end state: Rust owns dictation and Svelte subscribes to state.

However, moving the full pipeline immediately has hidden migration costs:

- Active settings currently live in frontend/browser-managed state.
- Shortcut registration currently passes frontend command callbacks into the Tauri global shortcut plugin.
- Recording orchestration, notifications, analytics, sound feedback, transcription selection, writing rules, and paste completion all currently flow through `actions.ts`.
- A full Rust dictation manager must know microphone selection, recording folder, model path, transcription engine, auto-paste setting, text rules, and local metrics without relying on `window.commands`.

Deleting the current tray/frontend runtime before those dependencies are transferred would risk breaking the stable dictation path.

## Approved Migration Path

### Slice 1: Launch-Safe Background App

Status: done.

- Hide main window on close.
- Keep menu-bar runtime alive.
- Add native menu recovery action.
- Keep existing JS pipeline untouched.

### Slice 2: Backend Runtime State Skeleton

Status: done in `0796dad Add dictation runtime state bridge`.

- Add a Rust `DictationRuntime` managed state.
- Define runtime states: `Idle`, `Recording`, `Transcribing`, `Pasting`, `Cooldown`, `Error`.
- Add commands:
  - `get_dictation_runtime_state`
  - `set_dictation_runtime_state`
- Emit `dictation:state-changed` events to the frontend.
- Frontend listens and mirrors runtime state, but does not lose current JS behavior yet.

Review verdict:

- Antigravity's backend-owned architecture is correct as the north star.
- Its proposed immediate deletion of `tray.ts` and removal of Svelte shortcut orchestration is too early.
- The implemented state bridge is the right low-risk intermediate step because it creates a native source of truth without destabilizing the validated dictation path.

### Slice 3: Settings Bridge

Move only the settings needed for background dictation into a Rust-readable local configuration file:

- recording device id
- recording sample rate
- recording output folder
- transcription engine
- local model path/model id
- auto-paste enabled
- active local text rule/writing mode
- shortcut preferences

The frontend remains the settings UI, but every background-critical value must be mirrored into this shared config.

### Slice 4: Backend Trigger Ownership

Move trigger handling to Rust:

- Fn key listener calls the runtime directly.
- Native tray actions call the runtime directly.
- Native app menu actions call the runtime directly.
- Existing JS global shortcut registration remains as fallback until Rust global shortcut registration is implemented.

At the end of this slice, starting/stopping dictation should not require `window.commands`.

### Slice 5: Backend Pipeline Ownership

Move the actual pipeline to Rust:

- start CPAL recording
- stop and finalize WAV
- transcribe through local whisper.cpp/transcribe-rs
- apply deterministic local text rules
- paste through Enigo clipboard sandwich
- emit runtime events for UI and local analytics

Only after this slice should the JS tray service and JS dictation actions be retired.

## Non-Goals For This Phase

- No cloud APIs.
- No local LLM requirement.
- No auto-updater work.
- No product rename.
- No settings expansion.
- No deletion of working frontend orchestration until Rust fully owns an equivalent path.

## Immediate Next Task

Implement Slice 3: mirror background-critical settings into a Rust-readable local config. This must happen before Rust can own Fn/global/tray dictation triggers safely.
