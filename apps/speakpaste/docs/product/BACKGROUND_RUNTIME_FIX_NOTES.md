# Background Runtime Fix Notes

Date: 2026-06-02

## User-Reported Issue

After setup/configuration, closing the primary SpeakPaste UI while leaving the app visible in the macOS menu/status bar caused the Fn/global shortcut to stop responding. The app appeared to remain running in the background, but dictation no longer worked.

## Root Cause

The app's current shortcut and Fn handling are frontend-runtime dependent:

- `AppLayout.svelte` registers global shortcuts and listens for backend `fn-key-down` / `fn-key-up` events.
- Those events call `window.commands`, which is created inside the Svelte frontend runtime.
- Tray actions also depend on `window.commands`.

If closing the main window destroys the webview/frontend runtime, the backend process and tray icon can remain alive while the JS listeners/command callbacks are gone.

That made the UI window an accidental runtime dependency.

## Minimal Fix Implemented

The Tauri main-window close event is now intercepted:

- Closing the main window prevents the default close.
- The window is hidden instead.
- The frontend runtime remains alive.
- Existing global shortcut and Fn listeners continue functioning while the app lives in the menu/status bar.

Tray "Start Dictation" no longer forces the window visible before invoking `window.commands`. If commands are unavailable, it falls back to showing/focusing the window.

## Files Changed

- `apps/speakpaste/src-tauri/src/lib.rs`
- `apps/speakpaste/src/lib/services/desktop/tray.ts`

## Follow-Up Robust Fix

The long-term fix is to move shortcut/Fn command execution into the Rust backend or a persistent background command layer, so dictation does not depend on any frontend webview lifecycle at all.

For this launch phase, close-to-hide is the safest targeted correction because it preserves the current working Svelte command pipeline while matching expected menu-bar app behavior.

## Validation Needed

After reinstalling the rebuilt app:

1. Launch SpeakPaste.
2. Confirm dictation works.
3. Close the primary UI window with the red close button.
4. Confirm the tray/menu-bar icon remains.
5. Focus TextEdit/Notes.
6. Press Fn/global shortcut.
7. Confirm recording/transcription/paste still works.
8. Open the UI from the tray/menu-bar icon and confirm settings remain accessible.
