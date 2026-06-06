# Mynah Benchmark Corpus And QA Runbook

This document defines a practical, repeatable benchmark corpus and manual Quality Assurance (QA) runbook for Mynah. It enables engineers to systematically verify performance, accuracy, and background stability across diverse macOS environments as changes are introduced to the codebase.

---

## 1. Purpose

The purpose of this runbook is to evaluate the end-to-end local voice-to-cursor cycle under controlled conditions. This ensures that:
* Core features function reliably on all macOS hardware configurations.
* Silence tails and noisy environments do not trigger Whisper.cpp trailing hallucinations.
* Svelte views operating in the background do not trigger AppNap delays or lose global hotkey bounds.
* Product regressions are caught prior to production builds.

---

## 2. Scope

This framework covers the local macOS Mynah application lifecycle.
* **Hardware Scope**: Basic, Pro, Max, and Ultra Apple Silicon chips, and Intel x86_64 Mac configurations.
* **Software Scope**: Standalone Tauri app bundles (`Mynah.app`) running in foreground or background status-bar modes on macOS 13 (Ventura), 14 (Sonoma), and 15 (Sequoia).
* **Operational Scope**: Latency, word/phrase transcription accuracy, trailing hallucination rates, clipboard pasting correctness, configuration persistence, and global hotkey capture.
* **Telemetry Boundary**: 100% local. No cloud services, external servers, or network calls are utilized.

---

## 3. Benchmark Corpus Design

The benchmark corpus consists of pre-defined utterances and silence scenarios designed to stress-test the capture, transcription, and paste engine. 

To balance runtime overhead and testing depth, tests are structured into three distinct sizes:

### A. Tiny Smoke Corpus (6 Samples)
* **Goal**: Immediate validation of core logic after minor changes or builds.
* **Duration**: ~1 minute.
* **Composition**: 2 short commands, 2 natural sentences (1 foreground, 1 hidden window), 2 silence-only samples.

### B. Standard Regression Corpus (15 Samples)
* **Goal**: Validate release candidates before standard branches are merged.
* **Duration**: ~5 minutes.
* **Composition**: 3 short commands, 4 sentence dictations, 2 long paragraphs, 3 silence tail variations, 3 ambient noise conditions.

### C. Deep Pre-Release Corpus (30+ Samples)
* **Goal**: Thorough testing of model engine changes, noise-reduction updates, or Tauri platform upgrades.
* **Duration**: ~15 minutes.
* **Composition**: Multi-accent speech, varying background noise mixes, diverse target apps, and rapid, successive trigger sequences.

---

## 4. Corpus Inventory Table

Below is the standard inventory table used to run benchmarks:

| Sample ID | Category | Environment | Utterance Length | Expected Reference Transcript | Trigger Path | Target App Type | Hidden-Window | Test Objective |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SP-SMOKE-01** | Short Command | Quiet Room | Short | "Copy that." | Fn key | Text Editor | No | Latency & Accuracy |
| **SP-SMOKE-02** | Natural Speech | Quiet Room | Medium | "Testing Mynah local transcription velocity." | Fn key | Text Editor | Yes | Background & Latency |
| **SP-SMOKE-03** | Silence Tail | Quiet Room | None | `[No Text Pasted]` | Fn key | Text Editor | No | Silence Hallucination |
| **SP-SMOKE-04** | Silence Tail | HVAC Hum | None | `[No Text Pasted]` | Fn key | Chat Input | Yes | Silence Hallucination |
| **SP-SMOKE-05** | Short Command | Office Noise | Short | "Approved." | Cmd+Shift+F8 | Chat Input | No | Hotkey & Accuracy |
| **SP-SMOKE-06** | Natural Speech | Office Noise | Medium | "Please send the file over as soon as possible." | Fn key | Chat Input | Yes | Noise Robustness |
| **SP-REG-01** | Short Command | Quiet Room | Short | "Cancel." | Fn key | Chat Input | Yes | Background & Latency |
| **SP-REG-02** | Natural Speech | Quiet Room | Medium | "This is a single-sentence test of the speech-to-text engine." | Fn key | Text Editor | No | Transcription Accuracy |
| **SP-REG-03** | Silence Tail | Quiet Room | Medium | "Save document." (Followed by 500ms silence tail before release) | Fn key | Text Editor | No | Utterance-End Precision |
| **SP-REG-04** | Silence Tail | Quiet Room | Medium | "Open browser." (Followed by 1000ms silence tail before release) | Fn key | Text Editor | Yes | Utterance-End Precision |
| **SP-REG-05** | Silence Tail | Keyboard Noise | Medium | "Select all." (Followed by 1000ms keyboard typing tail) | Fn key | Chat Input | No | Typing Noise Tail |
| **SP-REG-06** | Natural Speech | Cafe Noise | Medium | "Let us meet at three PM in the lobby." | Fn key | Chat Input | Yes | Ambient Cafe Noise |
| **SP-REG-07** | Paragraph | Quiet Room | Long | "Local-only speech recognition offers absolute privacy. By performing all audio recording and Whisper matrix operations entirely on device, Mynah ensures that sensitive data never leaves this Mac." | Fn key | Text Editor | No | Paragraph Accuracy |
| **SP-REG-08** | Paragraph | Office Noise | Long | "This is a longer paragraph dictation designed to stress test the local Tauri background thread, the CPAL audio buffer capacity, and the Whisper CPU peak memory utilization over thirty seconds of continuous speech." | Fn key | Text Editor | Yes | Long Utterance Stability |
| **SP-REG-09** | Configuration | Quiet Room | Medium | "Reconfigured shortcut live reload check." | Cmd+Shift+F8 (live reloaded) | Text Editor | No | Settings Live-Sync |

---

## 5. Recording Instructions

To ensure consistent input audio quality during manual tests:

1. **Microphone Setup**:
   * Use the MacBook's built-in beamforming microphone array as the primary input.
   * Maintain a distance of 18–24 inches from the screen.
   * Speak at a normal conversational volume (approx. 60 dB).
2. **Noise Calibration**:
   * Open *System Settings > Sound > Input* and check input levels. Adjust input volume so the input meter peaks between 50% and 70% during active speech.
   * For **HVAC Hum** tests: Sit near an active air conditioner or desktop cooling fan. Ambient noise floor should read around 35-40 dB.
   * For **Office Noise** tests: Simulate typing clatter on a mechanical keyboard nearby while speaking, or play ambient office chatter audio in the background.
3. **Trigger Execution Gating**:
   * **Hold Phase**: Press the trigger (`Fn` or fallback shortcut). Speak immediately after pressing.
   * **Abrupt Stop**: Release the trigger key within 100ms of finishing the last word.
   * **Silence Tail Phase**: For `SP-REG-03` and `SP-REG-04`, maintain silence for the designated duration (500ms / 1000ms) after the last word before releasing the key.

---

## 6. Manual QA Runbook

### A. Preconditions
1. **Target Build**: Build the production application bundle:
   ```bash
   cd apps/mynah
   bun run tauri build --bundles app
   ```
2. **Installation**: Drag `/Applications/Mynah.app` from the build directory to the systems `/Applications` folder. Launch it fresh.
3. **Permissions Verification**:
   * Open *System Settings > Privacy & Security > Microphone*. Verify Mynah is authorized.
   * Open *System Settings > Privacy & Security > Accessibility*. Verify Mynah is authorized.
4. **Target Apps Preparation**:
   * Open *Apple Notes* (native document text editor). Position it on the left.
   * Open a web chat input field (e.g. *Slack* or *iMessage*). Position it on the right.
5. **App Window State**:
   * **Foreground**: Settings window is fully open and active.
   * **Hidden-Window**: Settings window is closed. Only the menu bar icon is active.

---

### B. Test Flows

#### Flow 1: Foreground Fn Dictation
1. Open the Mynah main settings page.
2. Open Apple Notes and focus the cursor in the document window.
3. Press and hold the `Fn` key, speak: *"Testing Mynah foreground input."*
4. Release the `Fn` key.
5. **Pass Criterion**: Text is transcribed and pasted into Apple Notes within 600ms of release. No duplicate phrases.
6. **Fail Criterion**: Paste fails, takes $> 1500\text{ms}$, or text is truncated.

#### Flow 2: Hidden-Window Fn Dictation
1. Close all Mynah settings windows. Confirm the app is running in the menu bar.
2. Open a Chat Input field and focus the cursor.
3. Press and hold `Fn`, speak: *"Replying to the design thread now."*
4. Release the `Fn` key.
5. **Pass Criterion**: Text pastes cleanly into the chat input with zero delay.
6. **Fail Criterion**: No text is pasted, or key press is ignored (AppNap blocked Tauri background).

#### Flow 3: Fallback Shortcut Dictation
1. Open Mynah settings and navigate to *Trigger*. Configure fallback shortcut to `Cmd+Shift+F8`.
2. Close the settings window.
3. Focus Apple Notes.
4. Press `Cmd+Shift+F8` to begin recording. Speak: *"Fallback shortcut activated."*
5. Press `Cmd+Shift+F8` again to stop recording.
6. **Pass Criterion**: Text pastes into Apple Notes.
7. **Fail Criterion**: Shortcut fails to trigger audio recording or fails to stop.

#### Flow 4: Silence-Only Capture
1. Focus Apple Notes.
2. Hold `Fn` key down. Keep silent for 3 full seconds.
3. Release `Fn` key.
4. **Pass Criterion**: No text is pasted. The system chimes (or logs) that silence was ignored. The clipboard history remains untouched.
5. **Fail Criterion**: Random words (e.g. *"Thank you for watching"*, *"you"*, *"Bye"*) are pasted.

#### Flow 5: Live Shortcut Configuration Change
1. Open Settings -> Trigger.
2. Change the fallback hotkey from `Cmd+Shift+F8` to `Option+Shift+S`.
3. Do not close settings, and do not restart the app.
4. Focus Apple Notes and press `Option+Shift+S`. Speak: *"Hotkey changed live."* Press `Option+Shift+S` again.
5. **Pass Criterion**: Text is transcribed and pasted. Old hotkey `Cmd+Shift+F8` no longer triggers recording.
6. **Fail Criterion**: Old hotkey still fires, or the new hotkey is ignored until app restart.

#### Flow 6: Restart Persistence
1. Fully quit Mynah from the menu bar.
2. Relaunch Mynah from `/Applications`. Do not open its configuration settings window.
3. Focus Apple Notes, hold `Fn`, speak: *"Testing persistent trigger after boot."* Release `Fn`.
4. **Pass Criterion**: Dictation works instantly on first launch.
5. **Fail Criterion**: The trigger fails to record because settings profiles did not reload on initialization.

---

### C. Pass / Fail Verdicts & Failure Evidence
When a test flow fails:
1. Copy the raw text that was pasted (if any).
2. Take a screenshot showing where the text was pasted or showing the Svelte router screen if a UI route crashed.
3. Extract logs from the terminal or the telemetry file:
   ```bash
   cat ~/Library/Logs/com.mynah.app/telemetry.log | tail -n 50
   ```
4. Save the evidence in your result capture file under the failed scenario ID.

---

## 7. Result Capture Template

Copy and paste the markdown template below into a test run log (e.g., `ANTIGRAVITY_REVIEW_BENCHMARK_RUN_<DATE>.md`) for each evaluation:

```markdown
# Mynah Run Validation Report

* **Date**: YYYY-MM-DD
* **Branch**: `local-only-product-surface`
* **Commit**: `[Insert Commit Hash]`
* **Tester/Agent**: Antigravity / [User Name]

## Hardware & Environment Setup
* **Machine Class**: Apple Silicon (M1/M2/M3 Basic/Pro/Max) / Intel Core i5/i7/i9
* **macOS Version**: macOS 13 / 14 / 15
* **Microphone Type**: Built-in Microphone / External USB Mic
* **Acoustic Environment**: Quiet Room / Office / Cafe

## Performance Benchmark Logs

| Scenario ID | Journey / Scenario | Expected Output | Observed Output | Latency ($L_{e2e}$) | Hallucination? | Status (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SP-SMOKE-01** | Foreground Command | "Copy that." | | | Yes / No | |
| **SP-SMOKE-02** | Hidden Window Speech | "Testing Mynah local transcription velocity." | | | Yes / No | |
| **SP-SMOKE-03** | Silence-Only (Quiet) | `[No Text Pasted]` | | | Yes / No | |
| **SP-SMOKE-04** | Silence-Only (HVAC) | `[No Text Pasted]` | | | Yes / No | |
| **SP-SMOKE-05** | Fallback Command | "Approved." | | | Yes / No | |
| **SP-SMOKE-06** | Hidden Window Noise | "Please send the file over as soon as possible." | | | Yes / No | |
| **SP-REG-01** | Short Command (Hidden) | "Cancel." | | | Yes / No | |
| **SP-REG-02** | Quiet Sentence | "This is a single-sentence test..." | | | Yes / No | |
| **SP-REG-03** | 500ms Silence Tail | "Save document." | | | Yes / No | |
| **SP-REG-04** | 1000ms Silence Tail | "Open browser." | | | Yes / No | |
| **SP-REG-05** | Keyboard Noise Tail | "Select all." | | | Yes / No | |
| **SP-REG-06** | Cafe Noise Sentence | "Let us meet at three PM in the lobby." | | | Yes / No | |
| **SP-REG-07** | Paragraph (Quiet) | "Local-only speech recognition..." | | | Yes / No | |
| **SP-REG-08** | Paragraph (Office Noise)| "This is a longer paragraph..." | | | Yes / No | |
| **SP-REG-09** | Reconfigured Hotkey | "Reconfigured shortcut live reload check." | | | Yes / No | |

## Operational Notes / Diagnostics
[Insert any telemetry.log warnings, stack traces, or routing warnings here]
```

---

## 8. Regression Rules

A commit must be rejected and rolled back if it violates any of the following rules:

1. **Silence Leak**: A silence-only capture session (SP-SMOKE-03, SP-SMOKE-04) produces *any* pasted text output (violates Whisper hallucination suppression constraints).
2. **Text Appended**: A standard dictation contains trailing words that were not spoken (e.g. *"Thank you for watching"*, *"you"*, repeating punctuation) in $> 5\%$ of the test corpus.
3. **AppNap Sleep Blocking**: The hidden-window dictation (SP-SMOKE-02, SP-REG-01) fails to trigger or paste when the settings window has been closed for $> 5$ minutes.
4. **Boot Init Failure**: Triggering dictation immediately after app relaunch fails to capture audio or write files without manual configuration opening.
5. **Latency Breach**: Average end-to-end latency ($L_{e2e}$) exceeds **900ms** on Apple Silicon using the `balanced` performance profile.

---

## 9. Recommended Automation Follow-Ups

To reduce manual effort in future sprints, implement the following roadmap:

### Phase 1: Immediate Automation (No Code Changes)
* **WAV File Playback Script**: Write a command-line script in `/scratch` that bypasses physical microphone input and feeds the corpus `.wav` audio files directly to the Rust binary's whisper transcribing module. Measure Word Error Rate ($WER$) and latency programmatically.

### Phase 2: Instrumented Automation (Requires App Instrumentation)
* **FFI Metrics Dispatcher**: Add a hidden developer endpoint in Tauri that writes latency measurements to a structured JSON file (`~/Library/Logs/com.mynah.app/metrics.json`) after each run. 
* **CI Integration**: Hook the WAV injection benchmark into git pre-commit hooks to run local latency regression tests before code pushes.

### Phase 3: Long-term Manual Testing
* **OS-Level Permissions & Paste Focus**: Verifying that Accessibility modals pop up on a clean system and ensuring that cursor paste emulation aligns with modern Chromium, electron, or native SwiftUI target text boxes must remain a manual QA checklist item.
