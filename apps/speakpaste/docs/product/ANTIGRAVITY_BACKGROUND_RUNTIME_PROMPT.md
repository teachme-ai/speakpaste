# Antigravity Background Runtime Review Prompt

Use this prompt after the user reported this blocker:

> After configuration, if the primary UI window is closed while the app remains visible in the macOS menu/status bar, the Fn/global shortcut stops responding. The app appears to still be running in the background, but no longer functions until the UI is reopened/restarted.

## AG Task

Act as a background-runtime lifecycle reviewer.

Do not edit code unless explicitly asked. Inspect the repository and any notes/logs Codex adds, then write findings to:

`apps/speakpaste/docs/product/ANTIGRAVITY_REVIEW_BACKGROUND_RUNTIME.md`

## What To Inspect

1. Tauri window lifecycle:
   - close vs hide behavior
   - tray/menu item behavior
   - whether closing the main window destroys the Svelte runtime

2. Shortcut lifecycle:
   - where global shortcuts are registered
   - whether registration happens only inside the frontend window lifecycle
   - whether closing the window unregisters listeners or drops JS state

3. Fn key listener lifecycle:
   - whether the backend emits `fn-key-down` / `fn-key-up` independently
   - whether frontend event listeners are required for the command to run
   - whether listener registration is lost when the window closes

4. Expected product behavior:
   - app remains active in menu bar/status bar
   - main UI can be opened/closed without disabling dictation
   - menu bar icon should be the default background control point

## Required Output

1. Executive verdict
2. Root-cause hypothesis
3. Code paths involved
4. Launch blocker severity
5. Recommended minimal fix
6. Recommended robust fix
7. Manual validation checklist after fix
