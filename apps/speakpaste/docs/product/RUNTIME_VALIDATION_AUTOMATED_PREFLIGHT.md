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
bun test apps/mynah/src/lib/state/settings.test.ts
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
apps/mynah/src-tauri
```

Result:

- Passed.
- `mynah v0.1.0` compiled in dev-check mode.
- No dependency fetch required.

### Local-Only Surface Sweep

Command:

```bash
rg -n "tauri-plugin-updater|plugin-updater|checkForUpdates|UpdateDialog|api-keys|API Keys|Groq|Anthropic|OpenRouter|Mistral|Deepgram|ElevenLabs|Speaches|Aptabase" apps/mynah/src apps/mynah/src-tauri apps/mynah/package.json bun.lock
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
apps/mynah
```

Result:

- Passed.
- Static site written to `apps/mynah/build`.
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

`apps/mynah/docs/product/ANTIGRAVITY_REVIEW_RUNTIME_VALIDATION.md`

## Latest Local Install Evidence

Date: 2026-06-02

Codex built the latest desktop app with:

```bash
bun tauri build
```

Result:

- The Tauri web build and Rust release binary completed successfully.
- The `.app` bundle was produced successfully at:

```text
apps/mynah/src-tauri/target/release/bundle/macos/Mynah.app
```

- DMG bundling failed in `bundle_dmg.sh`, so the DMG was not used for runtime validation.
- Codex installed the built `.app` directly to:

```text
/Applications/Mynah.app
```

Installed app metadata:

```text
CFBundleName: Mynah
CFBundleIdentifier: com.mynah.app
CFBundleShortVersionString: 0.1.1
CFBundleExecutable: mynah
Installed size: 29M
```

Signing observations:

- The local build is ad-hoc signed.
- `spctl --assess --type execute --verbose /Applications/Mynah.app` returned an internal Code Signing subsystem error.
- This is noted for distribution/notarization follow-up, but it does not block local runtime validation from `/Applications`.
