# Mynah

Mynah is a 100% free, local-first voice typing utility for macOS. Hold Fn, speak, release, and your words appear at your cursor.

Current builds use local transcription engines only. Audio, transcription, history, and diagnostics are handled entirely on your Mac. No accounts, no subscriptions, and no cloud meters.

```text
Fn key -> speak -> local transcription -> paste at cursor
```

## Features

- **100% Free Software**: No license key, no trial expiration, and no subscription. Just download and use.
- **Global Fn-key dictation**: Hold Fn, speak, and release anywhere on macOS.
- **Local transcription**: Runs completely offline using `whisper.cpp` (Fast, Balanced, High Accuracy, and Large-v3-Turbo presets).
- **Multilingual & Indic Language Support**: Native support for English, Hindi, Kannada, Telugu, Tamil, Marathi, Bengali, and more.
- **Transcription & Translation Modes**: Transcribe directly in the spoken language or translate spoken foreign speech directly to English at your cursor.
- **Smart Indic Transliteration**: 1:1 Brahmic phonetic transliteration engine for Dravidian and Indic scripts.
- **Local Recording History**: Review captures and audio clips locally.
- **Zero Cloud & Telemetry**: 100% private. Raw audio and transcripts never leave your machine.
- **Universal macOS Support**: Tailored builds for Apple Silicon (M1/M2/M3/M4) and Intel Macs.

## Privacy Posture

- No cloud transcription.
- No cloud rewrite.
- No remote telemetry or analytics.
- Diagnostics are written locally as JSONL files.
- Network access is only used when the user explicitly downloads a speech model.

## Development

### Requirements

- macOS 10.15+ for the desktop app.
- Bun.
- Rust and Cargo.
- Xcode Command Line Tools.

### Install

```bash
bun install
```

### Run (Development)

```bash
cd apps/speakpaste
bun run dev
```

### Build & Package (Release)

```bash
cd apps/speakpaste
# Compile and package for Apple Silicon:
CI=true bun run tauri build --target aarch64-apple-darwin

# Compile and package for Intel:
CI=true bun run tauri build --target x86_64-apple-darwin

# Publish DMGs to website:
bun run publish:website
```

## License And Attribution

Mynah is 100% free software built on open-source components. Open-source licenses and acknowledgments are included in the app and documentation.

Mynah includes work adapted from the open-source Whispering/Epicenter ecosystem and other open-source projects. Those components remain acknowledged according to their respective licenses. Upstream copyrights remain owned by their respective authors.
