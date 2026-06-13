# Mynah

Mynah is a local-first dictation app for macOS. Hold Fn, speak, release, and your words appear at your cursor.

Current builds use local transcription engines only. Audio, transcription, history, diagnostics, and trial checks are handled on the Mac. Model downloads are explicit user actions.

```text
Fn key -> speak -> local transcription -> paste at cursor
```

## Current Capabilities

- Global Fn-key dictation for macOS.
- Local transcription with Whisper.cpp, Moonshine, or Parakeet model files.
- Push-to-talk and toggle recording modes.
- Local recording history and transcript storage.
- Local JSONL diagnostics for troubleshooting.
- Trial and Lifetime builds.
- Explicit local model downloads from the app.

## Privacy Posture

Build 178 is focused on launch hardening and local-only behavior.

- No cloud transcription.
- No cloud rewrite.
- No remote telemetry.
- No hidden network fallback for trial checks.
- Diagnostics are written locally as JSONL files.
- Network access for speech models is initiated by the user when downloading a model.

Before making stronger public website claims, validate the app with packet/no-network checks and confirm that only user-started model downloads leave the machine.

## Development

### Requirements

- macOS for the desktop app.
- Bun.
- Rust and Cargo.
- Xcode Command Line Tools.
- FFmpeg is recommended for some recording workflows.

### Install

```bash
bun install
```

### Run

```bash
cd apps/speakpaste
bun run dev
```

### Validate

```bash
cd apps/speakpaste
bun run typecheck

cd src-tauri
cargo test
```

For a production frontend build:

```bash
cd apps/speakpaste
bun run build
```

Full Trial and Lifetime DMG packaging is handled by the release build script and requires the signing/notarization environment. Trial release builds also require `MYNAH_TRIAL_HMAC_KEY`.

## Repository Notes

This repository still contains inherited workspace packages and open-source components that are scheduled for later cleanup. Build 178 intentionally does not remove the AGPL/workspace layer, replace storage, add writing modes, or add Apple Foundation Models.

## License And Attribution

Mynah is proprietary software built on open-source components. Open-source licenses and acknowledgments are included in the app and documentation.

Mynah includes work adapted from the open-source Whispering/Epicenter ecosystem and other open-source projects. Those components remain acknowledged according to their respective licenses.
