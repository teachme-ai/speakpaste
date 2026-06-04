# SpeakPaste Actions Refactor Test Plan

> Codex review note, 2026-06-04: this AG test plan was produced against an older branch/commit snapshot. Keep the behavioral scenarios, but verify settings names, line numbers, and clipboard behavior labels against the current implementation before turning these into automated tests.

- **Branch**: `local-only-product-surface`
- **Latest Commit Reviewed**: `8366775e57217d2c93319e26c61b1271d0fe11cb`
- **Classification**: Audit + proposed implementation plan

---

## 1. Concurrency & Gating Test Cases

These test cases assert that the state variables (`isRecordingOperationBusy`, `isCooldown`, `isPipelineRunning`) protect SpeakPaste from concurrent command overlaps.

### Test Case 1.1: Double-Start Guard (PTT Race Prevention)
* **Objective**: Ensure that rapid successive start triggers (e.g. key bouncing or rapid clicking) do not initialize multiple recording threads.
* **Precondition**: Application is in `IDLE` state.
* **Procedure**:
  1. Call `actions.startManualRecording()` twice in rapid succession ($< 50\text{ms}$).
  2. Inspect console logs.
* **Expected Outcome**:
  * The second call returns immediately with `Ok(undefined)`.
  * Logs show *"Recording operation already in progress, ignoring start"*.
  * Only one loading toast *"🎙️ Preparing to record..."* is shown.

### Test Case 1.2: Stop While Preparing
* **Objective**: Ensure stop calls are ignored if the recorder is still in the preparation phase (`isRecordingOperationBusy === true`).
* **Precondition**: Application is `IDLE`.
* **Procedure**:
  1. Trigger `actions.startManualRecording()`.
  2. Instantly call `actions.stopManualRecording()`.
* **Expected Outcome**:
  * The stop call is ignored.
  * Logs show *"Recording operation already in progress, ignoring stop"*.
  * The start mutation completes successfully, entering the `Recording / Listening` status.

### Test Case 1.3: Cooldown Retrigger Block
* **Objective**: Prevent accidental recording activations from a held `Fn` key or rapid double-tap after paste delivery.
* **Precondition**: A dictation pipeline has just completed, and the app status shows `Cooldown`.
* **Procedure**:
  1. Within 500ms of transcription delivery completing, trigger `actions.toggleManualRecording()`.
* **Expected Outcome**:
  * The trigger is blocked.
  * Console outputs *"[Trigger] ignored — in cooldown"*.
  * The app remains in `Cooldown` status until the 700ms timer expires, transitioning cleanly to `Idle`.

### Test Case 1.4: Pipeline Running Block
* **Objective**: Ensure new recording sessions cannot start while the active pipeline is busy running local Whisper inference or text delivery.
* **Precondition**: User has spoken, released the trigger, and the status reads `Transcribing`.
* **Procedure**:
  1. While the transcription loading indicator is spinning, press the global `Fn` key or call `actions.toggleManualRecording()`.
* **Expected Outcome**:
  * The trigger is ignored.
  * Console outputs *"[Trigger] ignored — pipeline running"*.
  * The active transcription finishes transcribing and delivering without interruption.

---

## 2. Transcription & Save Outcome Test Cases

These verify how the system reacts to different transcription results and audio filesystem failures.

### Test Case 2.1: Normal Fn Dictation Loop
* **Objective**: Verify standard dictation lifecycle works.
* **Procedure**:
  1. Focus text editor.
  2. Hold `Fn` key, say: *"Release test."*, and release.
* **Expected Outcome**:
  * Status transitions: `Idle` -> `Recording` -> `Transcribing` -> `Pasting` -> `Cooldown` -> `Idle`.
  * Sound chime is played upon release (if enabled).
  * Text *"Release test."* is pasted.
  * Database state for the new recording transitions from `UNPROCESSED` -> `TRANSCRIBING` -> `DONE`.

### Test Case 2.2: Empty Transcription (Silence Gating)
* **Objective**: Confirm that silent dictation is ignored and doesn't paste blank lines or garbage text.
* **Procedure**:
  1. Hold `Fn`, keep silent for 3 seconds, and release.
* **Expected Outcome**:
  * Whisper.cpp returns empty text after local post-processing cleanup.
  * No text is written to the cursor.
  * Clipboard history remains unchanged.

### Test Case 2.3: Transcription Failure Handling
* **Objective**: Verify error recovery and UI status propagation when the local model file fails or is missing.
* **Precondition**: Move or rename the active `.bin` model file on disk so the engine cannot read it.
* **Procedure**:
  1. Hold `Fn`, speak: *"Test failure."*, and release.
* **Expected Outcome**:
  * Transcription fails.
  * App status writes `Error / Transcription failed`.
  * Toast displays error details.
  * Database recording record updates `transcriptionStatus` to `FAILED`.
  * Window event `speakpaste:pipeline-error` is dispatched.
  * `isPipelineRunning` flag resets to `false` so the user can try again once the model path is corrected.

### Test Case 2.4: Audio Save Failure
* **Objective**: Ensure dictation still pastes text even if the local file system runs out of space or fails to save the raw audio file to disk.
* **Precondition**: Mock `services.blobs.audio.save` to return an error.
* **Procedure**:
  1. Perform a normal dictation.
* **Expected Outcome**:
  * Text is transcribed and pasted successfully.
  * UI displays warning toast: *"⚠️ Audio not saved - Transcription delivered but audio blob was not saved."*
  * Recording transcript is saved in the metadata database as `DONE`.

---

## 3. Delivery & Clipboard Test Cases

These verify the options in `settings.get('output.transcription.clipboardBehavior')`.

### Test Case 3.1: Clipboard Preservation (Ask Mode - Conflict)
* **Objective**: Verify that if `clipboardBehavior === 'ask'` and the clipboard has text, it is preserved.
* **Precondition**: Set clipboard to *"Original Clipboard Text"*. Set settings behavior to `ask`.
* **Procedure**:
  1. Dictate: *"New Transcribed Text"*.
* **Expected Outcome**:
  * The transcribed text *"New Transcribed Text"* is pasted into the focused editor.
  * The clipboard remains *"Original Clipboard Text"*.
  * UI toast displays: *"Clipboard preserved - Your previous clipboard is still available. Copy the transcript only if you want to replace it."* with a manual copy button.

### Test Case 3.2: Clipboard Preservation (Ask Mode - Clean)
* **Objective**: Verify that in `ask` mode, if the clipboard is already empty, the transcript is automatically copied without asking.
* **Precondition**: Clear clipboard. Set behavior to `ask`.
* **Procedure**:
  1. Dictate: *"Empty clipboard check."*.
* **Expected Outcome**:
  * Text is pasted at cursor.
  * Text is written to clipboard automatically.
  * No warning/ask toast is shown.

### Test Case 3.3: Clipboard Replace Mode
* **Objective**: Verify clipboard is overwritten when behavior is `replace`.
* **Precondition**: Set clipboard to *"Original Clipboard Text"*. Set behavior to `replace`.
* **Procedure**:
  1. Dictate: *"New Transcribed Text"*.
* **Expected Outcome**:
  * Text is pasted at cursor.
  * Clipboard is updated to *"New Transcribed Text"*.
  * No choice/ask toast is shown.

### Test Case 3.4: Paste Failure Fallback
* **Objective**: Ensure the user can still access their text if cursor paste emulation fails due to OS security context.
* **Precondition**: Mock `rpc.text.writeToCursor` to return a `TextError`.
* **Procedure**:
  1. Dictate: *"Pasting failed test."*.
* **Expected Outcome**:
  * UI displays warning: *"Unable to write to cursor automatically"*.
  * Toast offers a fallback action: *"Copy transcript"* button.

---

## 4. Advanced Transformation Test Cases

### Test Case 4.1: Chained Text Rule Execution
* **Objective**: Verify that a selected text rule (transformation) executes automatically after dictation.
* **Precondition**: Select a text rule (e.g. "make all lowercase").
* **Procedure**:
  1. Dictate: *"HELLO WORLD"*.
* **Expected Outcome**:
  * Transcription completes.
  * The transformation runs on the transcript.
  * The lowercase output *"hello world"* is delivered at the cursor.

### Test Case 4.2: Missing Selected Text Rule
* **Objective**: Handle cases where a selected text rule ID is orphaned or deleted.
* **Precondition**: Set settings key `transformation.selectedId` to an invalid ID (e.g., `'deleted-id-999'`).
* **Procedure**:
  1. Dictate: *"Test orphan rule."*.
* **Expected Outcome**:
  * Transcription succeeds and pastes *"Test orphan rule."*.
  * UI displays warning: *"⚠️ No matching transformation found. Please select a different transformation."*.
  * Settings key `transformation.selectedId` is set to `null` automatically.
