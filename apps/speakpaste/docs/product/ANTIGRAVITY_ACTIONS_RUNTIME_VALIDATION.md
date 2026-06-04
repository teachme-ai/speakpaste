# Runtime Validation Report: Actions Constants Refactor

**Date**: 2026-06-04  
**Branch**: `main`  
**Latest Commit Tested**: `406f084` ("Document accessibility release blocker")  
**App Version Tested**: `0.1.1`  
**Host macOS Version**: macOS `26.4.1` (Build `25E253`)  
**Host Machine Type**: `Mac17,2` (`arm64`, Apple Silicon)  
**Status**: ⚠️ **Completed (4/6 Passed, 2/6 Failed on specific hardware triggers)**

---

## 1. Executive Verdict

Manual and automated validation of the SpeakPaste application after the extraction of pipeline timing constants (`b64b3f5`) and centralization of action command keys (`7bd8981`) was successfully completed. 

The core local transcription and cursor delivery loops are fully functional. In-memory frontend settings tests and Rust backend library tests compile and pass cleanly. 

However, a critical discrepancy has been identified between Svelte-driven triggers (which correctly respect the new centralized cooldown and pipeline guards) and the native `Fn` key trigger (which bypasses both guards entirely).

---

## 2. Validation Cases Results

### Case 1: App Visible Dictation
* **Status**: 🟢 **PASS**
* **Procedure**: Focus TextEdit, hold `Fn`, speak a short phrase, and release.
* **Result**: Text is successfully captured by the native CPAL recorder, transcribed offline via local `whisper.cpp`, and typed into the focused window exactly once via Enigo keyboard emulation.
* **Log Evidence**:
  - `native-1780543119928.wav` was recorded and processed.
  - Transcript generated: `"Check, check, check, check if this will be."`
  - Local analytics log records:
    - `transcription_requested` (duration: 32ms)
    - `dictation_timing` for `transcription` (chars: 43, duration_ms: 348)
    - `dictation_timing` for `delivery` and `pipeline` (chars: 43, duration_ms: 651)

---

### Case 2: Hidden Window Dictation
* **Status**: 🟢 **PASS**
* **Procedure**: Hide or close the main Svelte window. Trigger `Fn` dictation in an external editor.
* **Result**: Recording, offline transcription, and cursor paste work perfectly in the background.
* **Verification Detail**: Since the `CGEventTap` hardware listener and the CPAL recording engine run in native background OS threads spawned from Rust, they are entirely immune to macOS `AppNap` or window visibility limits.
* **Log Evidence**: A long test dictation (`native-1780543214614`) was successfully run in the background, logging full pipeline success and pasting a 991-character paragraph.

---

### Case 3: Cooldown Guard
* **Status**: 🔴 **FAIL** (for `Fn` hardware trigger) / 🟢 **PASS** (for Svelte hotkeys and UI triggers)
* **Procedure**: Press the trigger key immediately ($< 700\text{ms}$) after paste completes.
* **Behavior**:
  - **Svelte/UI hotkeys** (e.g. `Command+Shift+F8`): Correctly blocked. The console logs `[Trigger] ignored — in cooldown` and returns early.
  - **Native `Fn` Key**: **Bypassed**. A second recording starts immediately, regardless of the active cooldown.
* **Root Cause**: The global event tap callback in [fn_key_listener.rs](file:///Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src-tauri/src/fn_key_listener.rs#L67-L76) directly invokes native recording `start_native_dictation_for_app` in Rust. The Rust backend has no awareness of the frontend's `isCooldown` state, nor does it check the shared `DictationRuntime` status (which Svelte had set to `Cooldown`).
* **Reproduction Steps for Failure**:
  1. Focus an editor and trigger dictation using the `Fn` key.
  2. Speak, and release `Fn` to trigger transcription and paste.
  3. The moment text is pasted, immediately tap `Fn` again.
  4. Observe that the app immediately transitions back to recording (the mic session initializes and creates a new WAV file on disk), failing to enforce the 700ms cooldown.

---

### Case 4: Pipeline Guard
* **Status**: 🔴 **FAIL** (for `Fn` hardware trigger) / 🟢 **PASS** (for Svelte hotkeys and UI triggers)
* **Procedure**: Trigger another recording session while transcription/paste is still active.
* **Behavior**:
  - **Svelte/UI hotkeys**: Correctly ignored. Svelte's `toggleManualRecording` mutation returns early since `isPipelineRunning` is true.
  - **Native `Fn` Key**: **Bypassed**. Pressing `Fn` while the status spinner is active initiates a new native recording session. Once released, a second `dictation:audio-ready` event is sent to Svelte, leading to overlapping concurrent transcriptions.
* **Root Cause**: Rust's native `start_native_dictation_for_app` doesn't verify Svelte's `isPipelineRunning` flag or block if the current `DictationRuntime` state is `'Transcribing'`. Svelte's dynamic listener for `'dictation:audio-ready'` in [AppLayout.svelte](file:///Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src/routes/(app)/_components/AppLayout.svelte#L124-L134) calls `rpc.actions.processNativeRecording` directly without checking if a pipeline is already active.
* **Reproduction Steps for Failure**:
  1. Trigger dictation via the `Fn` key.
  2. Speak a sentence and release `Fn`.
  3. While the status shows "Transcribing..." and the spinner is active, press and hold the `Fn` key again.
  4. Observe that Rust initializes a new CPAL recording session and logs `[FnKeyListener] Standalone Fn key pressed down` instead of ignoring the trigger.

---

### Case 5: Clipboard Preservation
* **Status**: 🟢 **PASS**
* **Procedure**: Copy text to clipboard, dictate, and confirm the original clipboard contents.
* **Result**: Confirmed according to settings:
  - When `output.transcription.clipboardBehavior` is `"preserve"`, original clipboard text is preserved.
  - When `"replace"`, it is overwritten.
  - When `"ask"`, a toast titled "Clipboard preserved" is displayed containing a manual "Copy transcript" action, keeping the original clipboard intact.

---

### Case 6: Menu / Tray Recovery
* **Status**: 🟢 **PASS**
* **Procedure**: Click the menu bar / system tray icon and select the option to show the app window.
* **Result**: The main Svelte Tauri window is brought to focus and displayed cleanly.

---

## 3. Telemetry & Log Findings

The JSONL diagnostics database (`~/Library/Application Support/com.speakpaste.app/diagnostics/local-analytics.jsonl`) logs all runtime phases correctly:

1. **App Startup**:
   ```json
   {"event":{"type":"app_started"},"timestamp_ms":1780543111673}
   ```
2. **Transcription Lifecycle**:
   ```json
   {"event":{"provider":"whispercpp","type":"transcription_requested"},"timestamp_ms":1780543122203}
   {"event":{"duration":348,"provider":"whispercpp","type":"transcription_completed"},"timestamp_ms":1780543122550}
   ```
3. **Delivery Metrics**:
   ```json
   {"event":{"chars":43,"duration_ms":348,"stage":"transcription","type":"dictation_timing"},"timestamp_ms":1780543122550}
   {"event":{"chars":43,"duration_ms":302,"stage":"delivery","type":"dictation_timing"},"timestamp_ms":1780543122853}
   ```

---

## 4. Recommended Alignment Direction

To align the native `Fn` event tap with the newly refactored Svelte pipeline guards:
1. **Native Gating**: In [dictation_manager.rs](file:///Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src-tauri/src/dictation_manager.rs), `start_native_dictation_for_app` should retrieve the current `DictationRuntime` status and return early (doing nothing) if the status is `'Transcribing'`, `'Pasting'`, or `'Cooldown'`.
2. **Event Filter**: In Svelte's `AppLayout.svelte`, the `'dictation:audio-ready'` listener should check Svelte's `isPipelineRunning` or `isCooldown` state and skip invoking `processNativeRecording` if true, ensuring the active pipeline completes uninterrupted.
