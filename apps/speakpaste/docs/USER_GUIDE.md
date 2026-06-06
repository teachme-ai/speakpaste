# Mynah User Guide

Mynah is local voice typing for macOS: press a hotkey, speak, transcribe on your Mac, and paste the result at the active cursor.

The current product baseline is local-only. Audio, transcripts, settings, diagnostics, and personal usage intelligence are designed to stay on the user's Mac.

## Core Flow

1. Choose a recording hotkey.
2. Select a local transcription engine and model.
3. Press the hotkey in any text field.
4. Speak naturally.
5. Release or stop recording.
6. Mynah inserts the transcript at the cursor.

## Local Engines

Mynah currently focuses on local engines:

- `whispercpp`: default local transcription engine.
- `parakeet`: local experimental engine for compatible model setups.
- `moonshine`: lightweight local experimental engine.

Model files may require a visible download or manual path selection. The app should acknowledge the technology and framework being used rather than hiding it.

## Settings

The settings surface should stay focused:

- Recording input and hotkeys.
- Local transcription engine and model paths.
- Output behavior such as paste-at-cursor.
- Local technology attribution.
- Local diagnostics and usage insight.

API-key pages, hosted transcription providers, hosted completion providers, and remote analytics are not part of the current user-facing baseline.

## Transformations

Deterministic local text transformations may be used for simple cleanup. Prompt-based transformation steps are retired because the app is not using a local or hosted language model for completions.

Existing legacy transformation data should remain visible and safe, but unsupported steps should be marked as retired.

## Local Intelligence

Future personal language intelligence should be built from local data only. Useful examples include:

- Recording duration and transcription latency.
- Local engine reliability.
- Personal correction patterns.
- Vocabulary or phrase suggestions derived on-device.
- Lightweight persona-style summaries that help the user understand how they use voice typing.

This information should be presented as private, sovereign usage insight, not remote analytics.

## Troubleshooting

If transcription fails:

- Confirm microphone permissions in macOS System Settings.
- Confirm the selected model file exists.
- Try a smaller local model on older hardware.
- Check whether the selected hotkey conflicts with another app.
- Review local diagnostics for recording and engine timing.

If paste-at-cursor does not work:

- Confirm Accessibility permissions for the app.
- Try pasting into a plain text editor first.
- Restart the app after changing macOS permissions.
