# Mynah Release Readiness Checklist

- **Branch**: `local-only-product-surface`
- **Latest Commit Reviewed**: `8366775e57217d2c93319e26c61b1271d0fe11cb`
- **Classification**: Audit + recommendations

---

## 1. Pre-Release Must-Pass Gates

Before packaging the production `.app` bundle, the release coordinator (or automated runner) must execute and pass the following checklist:

### A. Packaging & Installation Path
- [ ] **Clean App Sandbox**: Delete all local app support and cached configurations:
  ```bash
  rm -rf ~/Library/Application\ Support/com.mynah.app
  rm -rf ~/Library/Logs/com.mynah.app
  ```
- [ ] **Production Compilation**: Build the release package via Tauri bundler:
  ```bash
  bun run tauri build --bundles app
  ```
- [ ] **Install Location**: Verify the app is installed to `/Applications/Mynah.app` and that you are NOT running an older version from `/Applications` or target folders.
- [ ] **No Dev Artifacts**: Confirm there are no `.svelte-kit` folders or dev configurations bundled inside `/Applications/Mynah.app/Contents/Resources`.

### B. First-Run Permissions
- [ ] **Onboarding Trigger**: Run the newly installed app. Confirm that macOS prompt dialogs for both **Microphone** and **Accessibility** are correctly triggered on initial launch.
- [ ] **Accessibility Redirect**: Revoke accessibility permission and verify that clicking the warning redirects the user to the guide screen (`/macos-enable-accessibility`) or System Settings.
- [ ] **Accessibility Current-App Activation**: Select/check `Mynah` in System Settings and confirm the currently running app reports Accessibility ready only after Rust successfully initializes the Fn listener. If System Settings shows selected but Fn does not work, record as `RB-001`.
- [ ] **Accessibility Reinstall Recovery**: Replace `/Applications/Mynah.app` with a new build while an old Accessibility row exists. Confirm the app can refresh the stale entry or clearly instruct a quit/reopen recovery path. This is currently blocked by `RB-001`.

### C. Core Loop Verification
- [ ] **Foreground Dictation**: Focus Apple Notes, hold `Fn`, say: *"Testing Mynah release readiness."* and release. Confirm text is pasted in under 600ms.
- [ ] **Hidden-Window Background dictation**: Close the main settings window so that the app only runs in the macOS status menu bar. Focus Apple Notes and trigger the loop via `Fn` key. Verify 100% success (ensures AppNap is bypassed).
- [ ] **Fallback Hotkey Registration**: Change the fallback global shortcut in settings to `Cmd+Shift+Return`. Close settings. Focus iMessage/Slack, press hotkey, dictate, and press hotkey again. Verify paste succeeds.
- [ ] **Auto-Paste Toggle**: Turn off Auto-paste in settings. Dictate a phrase. Confirm no text is pasted, but the text is successfully copied to the system clipboard.

### D. Silence Tail & Hallucination Audits
- [ ] **Silence Gating**: Start recording, remain completely silent for 3 seconds, and release. Verify that the system chimes/logs silence, and **no text** is pasted (verifies Whisper.cpp hallucination suppression).
- [ ] **Trailing Silence Tolerance**: Say: *"Stop recording."*, wait 1 second in silence, and release. Confirm that only *"Stop recording."* is pasted without any trailing gibberish (e.g. *"Thanks for watching"*).

### E. Persistence & State Reloads
- [ ] **Restart Trigger Sync**: Change the fallback hotkey in settings. Quit the app fully from the menu bar. Relaunch the app. Confirm the reconfigured hotkey registers and triggers recording immediately without opening Settings.
- [ ] **Local Analytics Persistence**: Check that local diagnostics logs are written correctly:
  ```bash
  cat ~/Library/Logs/com.mynah.app/diagnostics/local-analytics.jsonl
  ```
  Verify the file contains JSONL events with timestamp, latency, and session stats, but **no raw transcripts or audio files**.

---

## 2. Nice-to-Have (Non-Blocking Sprints)

The following items should be checked, but failure does not block the current launch release:
- [ ] **Translocation Warning Page**: Verify that running the app from a temporary Downloads directory triggers the guided translocation warning page (`/macos-translocation-warning`) instructing users to move it to `/Applications`.
- [ ] **System Audio Chime Themes**: Verify that toggling sound cues on/off in settings changes chime behavior instantly.
- [ ] **Model Download Progress Bar**: Check that downloading pre-built models from Svelte shows a clean progress indicator rather than a frozen UI state.

---

## 3. Deferred Launch Items

The following features have been explicitly scoped out of the current launch phase and should be skipped during audits:
* **Hands-free / VAD Recording**: Voice activation gating is paused/disabled for desktop.
* **FFmpeg Audio Capture Engine**: The technical capture backend selector is removed; CPAL native audio is the only active system capture engine.
* **Auto-Updater Dialogs**: Remote server autoupdates are disabled for local-only compliance.
