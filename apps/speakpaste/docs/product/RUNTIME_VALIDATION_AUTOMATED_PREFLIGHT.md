# Runtime Validation Automated Preflight

Date: 2026-06-02

This file records the automated checks completed before manual macOS runtime validation.

## Commit Baseline

Latest coordination commit:

- `676debb` - Add Antigravity runtime validation prompt

## Automated Checks Run By Codex

### Settings State Tests

Command:

```bash
bun test apps/speakpaste/src/lib/state/settings.test.ts
```

Result:

- Passed.
- 7 tests passed.
- 0 tests failed.
- 27 assertions passed.

Coverage focus:

- Retired remote credential keys stay unused.
- Recording constraints and sample-rate persistence.
- Keyboard entitlement and shortcut settings.
- Sound settings.
- Local transcription service selection.
- Clipboard/cursor delivery preferences.
- Retention policies.

### Rust Backend Compile Check

Command:

```bash
cargo check --offline
```

Directory:

```text
apps/speakpaste/src-tauri
```

Result:

- Passed.
- `speakpaste v0.1.0` compiled in dev-check mode.
- No dependency fetch required.

### Local-Only Surface Sweep

Command:

```bash
rg -n "tauri-plugin-updater|plugin-updater|checkForUpdates|UpdateDialog|api-keys|API Keys|Groq|Anthropic|OpenRouter|Mistral|Deepgram|ElevenLabs|Speaches|Aptabase" apps/speakpaste/src apps/speakpaste/src-tauri apps/speakpaste/package.json bun.lock
```

Result:

- Passed.
- No matches.

Meaning:

- No active updater integration found.
- No reachable API-key settings route/components found by this sweep.
- No removed cloud provider SDK/surface names found by this sweep.
- No Aptabase references found by this sweep.

### Production Web Build

Command:

```bash
bun run build
```

Directory:

```text
apps/speakpaste
```

Result:

- Passed.
- Static site written to `apps/speakpaste/build`.
- Build completed with existing Svelte/Vite warnings but no build failure.

Warnings observed:

- Existing Svelte `state_referenced_locally` warnings in accessibility, shortcut recorder, and recording modal components.
- Existing self-closing non-void tag warning in `TextPreviewDialog.svelte`.
- Existing `onnxruntime-web` eval warning from dependency bundle.
- Existing chunk-size warning.

No warning was treated as a launch blocker for runtime validation.

## Manual Runtime Validation Still Required

Automated checks do not prove the native macOS loop. The user must still test:

1. Launch from `/Applications`.
2. Grant microphone permission.
3. Grant accessibility permission.
4. Trigger Fn/global shortcut from another focused app.
5. Record through CPAL.
6. Transcribe through local whisper.cpp with a configured model path.
7. Paste through Enigo into TextEdit/Notes/Slack.
8. Confirm clipboard fallback.
9. Repeat with Wi-Fi off after the local model is already present.

## AG Follow-Up

Antigravity should use this file as evidence when writing:

`apps/speakpaste/docs/product/ANTIGRAVITY_REVIEW_RUNTIME_VALIDATION.md`
