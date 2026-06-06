# Runtime Settings Bridge Notes

Date: 2026-06-02

## Purpose

Slice 3 creates a Rust-readable configuration bridge for background-critical settings.

This does not move dictation ownership to Rust yet. It prepares for that move by ensuring Rust can read the values it will need without depending on browser-only state or `window.commands`.

## Config Location

The bridge writes:

```text
{tauri app data dir}/runtime-config.json
```

Rust owns the write/read commands, so the future backend runtime will use the same path.

## Mirrored Values

- recording method
- active recording device id
- CPAL sample rate
- CPAL output folder
- transcription engine
- local Whisper/Parakeet/Moonshine model paths
- transcription cursor paste setting
- selected local text rule id
- deterministic find/replace steps for the selected text rule
- core global shortcuts for manual recording and push-to-talk

## Deliberately Excluded

- transcripts
- raw audio
- selected text
- clipboard content
- transformation run history
- local analytics counters
- cloud/API provider settings

## Why This Shape

The config is intentionally small. It mirrors only the values needed for future Rust-owned background dictation:

```text
trigger -> record -> transcribe locally -> optional deterministic text rules -> paste
```

The current Svelte pipeline remains active and validated. Rust trigger ownership should start only after this config bridge is stable.

## Validation

- `cargo check --offline`
- `bun test apps/mynah/src/lib/state/settings.test.ts`
- `bun run build`

Manual follow-up:

1. Launch Mynah.
2. Open settings and change a local model, shortcut, auto-paste toggle, or selected text rule.
3. Confirm `runtime-config.json` updates under the app data directory.
4. Confirm dictation still records, transcribes, and pastes normally.
