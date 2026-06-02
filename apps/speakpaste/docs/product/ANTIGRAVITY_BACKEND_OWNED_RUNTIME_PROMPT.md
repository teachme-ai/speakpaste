# Antigravity Prompt: Backend-Owned Runtime Review

## Context

SpeakPaste is a local-only macOS voice-to-cursor app. The current launch-safe fix keeps the Svelte webview alive by hiding the main window instead of destroying it when the user closes the UI. This works, but it is still a bridge fix.

The product direction is: the UI is only a control surface. The app runtime, global shortcut/Fn handling, recording, transcription, and paste delivery should continue from the menu bar/background runtime even when no visible window is open.

Recent commits to review:

- `e4f6dd4 Keep app runtime alive when closing main window`
- `6c1132e Add native menu window recovery action`

## Ask

Please review the codebase and propose the smallest safe backend-owned runtime architecture for the next implementation phase.

Focus on:

1. Which dictation responsibilities currently depend on Svelte/webview lifecycle.
2. Which commands/events should move to Rust ownership first.
3. How the global shortcut/Fn path should trigger recording without depending on `window.commands`.
4. How tray/menu actions should call backend commands directly.
5. What frontend state should become a subscriber to backend runtime events instead of the owner of runtime behavior.
6. Any risks around microphone permissions, accessibility permissions, clipboard paste, model loading, and cancellation.

## Constraints

- Keep the product fully local-only.
- No cloud APIs.
- No local LLM dependency for this phase.
- No auto-updater work in this phase.
- Do not rename the product in this phase.
- Do not expand settings complexity.
- Prefer a 24-48 hour implementation path.

## Desired Output

Return a concise implementation proposal with:

- Current dependency map.
- Recommended Rust command/event design.
- File-level change list.
- Test plan.
- Risks and rollback strategy.

Do not make code changes unless explicitly asked.
