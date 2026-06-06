# Mynah Actions Constants Inventory

> Codex review note, 2026-06-04: this AG audit was produced against an older branch/commit snapshot. Treat line numbers and current-state claims as directional only. The first constants slice has since extracted pipeline event names and the main trigger/tray timing literals into `src/lib/constants/app`.

- **Branch**: `local-only-product-surface`
- **Latest Commit Reviewed**: `8366775e57217d2c93319e26c61b1271d0fe11cb`
- **Classification**: Audit + proposed implementation plan

---

## 1. Time Parameter Literals (Magic Numbers)

The following timing parameters are currently hardcoded directly in the execution logic. We recommend extracting these into a centralized timing module (e.g. `src/lib/constants/app/timing.ts`).

| Value | Code Reference | Purpose | Suggested Constant Name |
| :--- | :--- | :--- | :--- |
| **`700`** ms | `actions.ts:78`<br>`actions.ts:806` | Cooldown period blocking trigger restarts post-paste to prevent bouncing. | `TRIGGER_COOLDOWN_MS` |
| **`1500`** ms | `actions.ts:118` | Duration to display the "Pasted" status pill in the UI. | `PASTED_INDICATOR_MS` |
| **`100`** ms | `actions.ts:422` (implicit) | Debounce delay for scheduling configuration synchronizations. | `CONFIG_SYNC_DEBOUNCE_MS` |
| **`1500`** ms | `device-config.svelte.js` | Tray icon "PASTED" state display duration. | `TRAY_PASTED_RESET_MS` |
| **`3000`** ms | `device-config.svelte.js` | Tray icon "ERROR" state display duration. | `TRAY_ERROR_RESET_MS` |

---

## 2. Pipeline Event Names

Custom string events dispatched across window boundaries. Extract to `src/lib/constants/app/events.ts`.

| Event String | Dispatching File | Listening File | Purpose |
| :--- | :--- | :--- | :--- |
| **`"mynah:pipeline-started"`** | `actions.ts:734` | `+page.svelte:233` | Signals UI that dictation recording has stopped and transcription began. |
| **`"mynah:pipeline-complete"`** | `actions.ts:809` | `+page.svelte:219` | Signals UI that paste has completed and history logs must reload. |
| **`"mynah:pipeline-error"`** | `actions.ts:754` | `+page.svelte:229` | Signals UI that transcription failed so visual indicators reset. |
| **`"dictation:audio-ready"`** | Tauri Rust Backend | `device-config.svelte.js` | Native callback containing the captured WAV audio path. |
| **`"fn-key-down"`** | Tauri Rust Backend | `device-config.svelte.js` | Native hardware key tap signaling recording start. |
| **`"fn-key-up"`** | Tauri Rust Backend | `device-config.svelte.js` | Native hardware key release signaling recording stop. |
| **`"transform-clipboard-open-combobox"`** | `transformClipboardWindow.ts` | `transform-clipboard` popup | Triggers combobox focus inside the clipboard transformation popup. |

---

## 3. Dictation Status & Wording Constants

Mynah updates the global status of the dictation engine using the `dictationRuntime` service. These strings are repeated or tightly coupled to UI pill components. Recommend extracting to a shared enum `DictationStatus`.

* **Global Status States**:
  * `STATUS_IDLE` = `"Idle"` (with detail strings: `"Ready"`, `"Recording cancelled"`)
  * `STATUS_RECORDING` = `"Recording"` (with detail strings: `"Preparing microphone"`, `"Listening"`)
  * `STATUS_TRANSCRIBING` = `"Transcribing"` (with detail strings: `"Finalizing recording"`, `"Transcribing locally"`)
  * `STATUS_PASTING` = `"Pasting"` (with detail string: `"Writing at cursor"`)
  * `STATUS_COOLDOWN` = `"Cooldown"` (with detail string: `"Ready shortly"`)
  * `STATUS_ERROR` = `"Error"` (with dynamic system error messages)

* **Configuration Strings**:
  * **Recording Modes**: `"manual"`, `"vad"`, `"upload"`.
  * **Clipboard Behaviors**: `"ask"`, `"replace"`, `"ignore"`.

---

## 4. Mutation Command IDs (Query Keys)

Tauri TanStack mutations are referenced by specific array keys. Extract to `src/lib/constants/app/commands.ts`.

```typescript
export const COMMAND_KEYS = {
    START_MANUAL: ['commands', 'startManualRecording'] as const,
    STOP_MANUAL: ['commands', 'stopManualRecording'] as const,
    START_VAD: ['commands', 'startVadRecording'] as const,
    STOP_VAD: ['commands', 'stopVadRecording'] as const,
    PROCESS_NATIVE: ['commands', 'processNativeRecording'] as const,
    TOGGLE_MANUAL: ['commands', 'toggleManualRecording'] as const,
    CANCEL_MANUAL: ['commands', 'cancelManualRecording'] as const,
    TOGGLE_VAD: ['commands', 'toggleVadRecording'] as const,
    UPLOAD_RECORDINGS: ['recordings', 'uploadRecordings'] as const,
    OPEN_PICKER: ['commands', 'openTransformationPicker'] as const,
    RUN_TRANSFORMATION: ['commands', 'runTransformationOnClipboard'] as const,
    DELIVER_TRANSCRIPT: ['delivery', 'deliverTranscriptionResult'] as const,
    DELIVER_TRANSFORMATION: ['delivery', 'deliverTransformationResult'] as const,
};
```
