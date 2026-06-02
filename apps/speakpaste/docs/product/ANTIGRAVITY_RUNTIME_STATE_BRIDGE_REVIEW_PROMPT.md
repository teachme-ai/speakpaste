# Antigravity Prompt: Runtime State Bridge Review

## Context

Codex implemented Slice 2 of the backend-owned runtime migration.

Commit to review:

- `0796dad Add dictation runtime state bridge`

This is intentionally not the full native dictation pipeline. The goal was to add a Rust-owned runtime state source and frontend subscriber while preserving the currently working JS dictation pipeline.

## What Changed

- Added Rust `DictationRuntime` managed state.
- Added Tauri commands:
  - `get_dictation_runtime_state`
  - `set_dictation_runtime_state`
- Added `dictation:state-changed` event emission.
- Added Svelte `dictationRuntime` subscriber.
- Mirrored manual dictation transitions from `actions.ts`:
  - `Recording`
  - `Transcribing`
  - `Pasting`
  - `Cooldown`
  - `Idle`
  - `Error`

## Review Ask

Please review for:

1. Runtime state correctness.
2. Any event naming or payload shape issues.
3. Whether this bridge creates regressions in the existing manual dictation path.
4. Whether the frontend subscriber is safe during app boot, hidden-window state, and teardown.
5. Whether this is the right base for Slice 3.

## Slice 3 Proposal Needed

Please propose the smallest settings bridge that lets Rust read the background-critical values without depending on browser-only state:

- recording device id
- recording sample rate
- recording output folder
- transcription engine
- local model id/path
- auto-paste enabled
- active local text rule/writing mode
- shortcut preferences

Do not propose a full pipeline rewrite yet. The next implementation should only mirror critical settings into a Rust-readable local config.

## Constraints

- Local-only.
- No cloud APIs.
- No local LLM requirement.
- No auto-updater.
- No rename.
- No expansion of settings UI.
- Do not delete current JS orchestration until Rust can fully replace it.
