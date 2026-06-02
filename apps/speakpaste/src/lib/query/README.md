# Query Layer

The query layer coordinates UI state with local services. It is the place for request orchestration, cache invalidation, optimistic UI state, and error shaping.

## Local-Only Rule

Queries must keep audio, transcript text, settings, usage events, and diagnostics on the device. Route this work through local services and local persistence only.

## Responsibilities

- Coordinate local transcription actions.
- Read and mutate local app state.
- Shape local engine errors for the UI.
- Keep user-facing flows responsive while native work runs.
- Preserve existing user data during migrations from retired features.

## What Belongs Elsewhere

- Native platform calls belong behind services or Tauri commands.
- UI-only interaction state belongs in the component or route.
- Long-running local model work belongs in the engine/service layer.
- Product decisions about adding network behavior belong in product docs before code.
