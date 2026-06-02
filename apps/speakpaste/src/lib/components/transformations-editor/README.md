# Transformations Editor

The transformations editor now supports deterministic local text operations.

Prompt-based transformation steps are retired at runtime because they require a completion engine. Legacy prompt steps may still appear in existing user data; the editor should show them clearly as retired instead of pretending they are active.

## Active Direction

- Keep local find/replace and other deterministic text operations.
- Preserve old user data safely.
- Make unsupported legacy steps obvious and non-destructive.
- Do not add local or remote LLM completion behavior through this editor unless the product baseline changes.
