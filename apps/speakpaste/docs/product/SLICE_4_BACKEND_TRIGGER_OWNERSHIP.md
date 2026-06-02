# Architectural Proposal: Slice 4 — Backend Trigger Ownership

**Date**: 2026-06-02  
**Target Version**: `0.1.2` (Background Capture Engine)  
**Status**: Proposal  

---

## 1. Context & Purpose

The transition of **SpeakPaste** to a robust macOS utility has progressed in targeted slices:
* **Slice 1**: Complete local-only cleanse (pruned cloud API components).
* **Slice 2**: Rebranded complex transformations to advanced deterministic "Text Rules."
* **Slice 3**: Created the **Runtime Settings Bridge** (commit `f2ece07`), which debounces Svelte state changes and writes mirrored values directly to `{tauri app data dir}/runtime-config.json`.

With the settings bridge fully stable, we are ready to implement **Slice 4: Backend Trigger Ownership**. 

Currently, starting a recording relies on Svelte catching events (`fn-key-down` or `tauri-plugin-global-shortcut` JS triggers) and executing callbacks. If Svelte is in the background, macOS **AppNap** can sleep the webview, causing trigger delays or silent failures.

**Slice 4** moves global hotkey registration, the `Fn` key listener hook, and CPAL audio capture stream management **natively into Rust**. This guarantees that the mic starts recording instantly, regardless of webview focus or sleep cycles.

---

## 2. Proposed Architecture (Trigger & Record Handoff)

We recommend a **hybrid native-capture / webview-coordination** architecture for Slice 4. This is the safest, most incremental 24-hour path:

```text
Global Trigger (Fn Key / Mapped Hotkey)
  ↓ (Rust FFI Event Tap / tauri-plugin-global-shortcut)
Rust DictationManager (Native Background Coordinator)
  ├─► Reads active device & sample rate from runtime-config.json
  ├─► Starts CPAL audio capture stream natively
  ├─► Emits tauri event "dictation:state-changed" -> Svelte (updates UI visualizer)
  ↓ (Stop Trigger)
Rust stops CPAL stream and writes final WAV file to output folder
  ↓
Rust emits tauri event "dictation:audio-ready" (WAV file path, duration, id)
  ↓ (Svelte Layout)
Svelte processes remaining local loop:
  ├─► Invokes transcribe_audio_whisper FFI
  ├─► Applies deterministic local find-and-replace Text Rules
  └─► Calls write_text() -> Enigo Paste FFI
```

> [!NOTE]
> **Why This Shape?**  
> Moving the **Trigger & Capture** to Rust solves the critical background latency/AppNap problem immediately. Leaving the transcription FFI call, text rules, and Enigo paste logic in Svelte is highly modular and keeps the changes scoped, ensuring zero compilation or state sync crashes.

---

## 3. Rust-Owned Command & Service Design

### A. The Rust DictationManager State
We will introduce a simple, thread-safe dictation state in Rust inside `src-tauri/src/dictation_manager.rs`:

```rust
use std::sync::Mutex;
use std::time::Instant;

pub enum DictationState {
    Idle,
    Recording {
        start_time: Instant,
        recording_id: String,
        output_path: std::path::PathBuf,
    },
}

pub struct DictationManager {
    pub state: Mutex<DictationState>,
}
```

### B. Native Global Shortcut Registration
Instead of Svelte registering global shortcuts via the JS plugin API, the Rust backend will parse `runtime-config.json` on startup and bind shortcuts natively:

```rust
pub fn register_global_shortcuts(app: &tauri::AppHandle) -> Result<(), String> {
    let config = crate::runtime_config::read_runtime_config(app.clone())?
        .ok_or("No runtime config found")?;
        
    if let Some(shortcut_str) = config.shortcuts.toggle_manual_recording {
        // Register natively using tauri-plugin-global-shortcut Rust FFI
        let shortcut = shortcut_str.parse::<tauri_plugin_global_shortcut::Shortcut>()
            .map_err(|e| e.to_string())?;
        app.global_shortcut().register(shortcut)?;
    }
    Ok(())
}
```

### C. FFI Listener Routing
In `src-tauri/src/fn_key_listener.rs`, we modify the event tap callback to execute native actions directly:

```rust
// On Key Down Transition:
let _ = dictation_manager::start_native_recording(&state.app_handle);

// On Key Up Transition:
let _ = dictation_manager::stop_native_recording(&state.app_handle);
```

---

## 4. File-Level Change List

### 🦀 Tauri Rust Backend
1. **`src-tauri/src/dictation_manager.rs` [NEW]**:
   * Own the thread-safe `DictationState` (Idle vs Recording).
   * Manage native CPAL start/stop streams and save finalized WAV files directly to the output folder parsed from `runtime-config.json`.
   * Emit `"dictation:state-changed"` (for visualizer UI) and `"dictation:audio-ready"` (when files are saved).
2. **`src-tauri/src/lib.rs` [MODIFY]**:
   * Manage the new `DictationManager` state.
   * Bind `tauri-plugin-global-shortcut` native Rust handlers to call `dictation_manager` on hotkey fire.
   * Expose a `reload_shortcuts` Tauri command so Svelte can force Rust to reload settings when hotkeys are updated in the form.
3. **`src-tauri/src/fn_key_listener.rs` [MODIFY]**:
   * Change callback targets from emitting events (`fn-key-down`) to calling `dictation_manager::toggle_recording` natively.

### ⚡ Svelte Frontend
1. **`apps/speakpaste/src/routes/(app)/_components/AppLayout.svelte` [MODIFY]**:
   * Delete Svelte global hotkey listeners and `fn-key-down` / `fn-key-up` handlers.
   * Subscribe to Tauri's native `"dictation:audio-ready"` event:
     ```ts
     import { listen } from '@tauri-apps/api/event';

     listen('dictation:audio-ready', async (event) => {
         const { recordingId, filePath, blob } = event.payload;
         // Trigger local whisper transcription, apply Text Rules, and paste!
         await processRecordingPipeline({ blob, recordingId });
     });
     ```
2. **`apps/speakpaste/src/lib/state/runtime-config-bridge.ts` [MODIFY]**:
   * Add a post-sync hook: after writing `runtime-config.json`, invoke `invoke("reload_shortcuts")` to update the native Rust registers in real-time.

---

## 5. Verification Plan

### Automated Checks
* **TypeScript & Svelte Build**: `bun run build` must compile static assets with zero routing errors.
* **Rust Compiles**: `cargo check --offline` must compile in under 1 second with no FFI link issues.

### Manual Verification
1. Launch SpeakPaste, focus Apple Notes, and tap the global trigger.
2. Verify that Rust starts CPAL audio recording immediately (observed in terminal logs and visualizer state).
3. Stop recording. Confirm that Rust writes the `.wav` file, Svelte receives `"dictation:audio-ready"`, and the transcribed text is successfully typed at the cursor.
4. Close the main window (hiding it) and verify that the background trigger still captures and pastes perfectly.
