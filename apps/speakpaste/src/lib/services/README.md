# Services Layer

Services wrap platform and runtime capabilities behind small, testable interfaces. UI and query code should depend on these service boundaries instead of directly reaching into Tauri APIs, browser APIs, filesystem details, or native commands.

## Current Product Baseline

SpeakPaste is local-only. Service code must not send audio, transcripts, analytics, prompts, usage events, or configuration to external providers.

Allowed service work includes:

- Audio capture and local recording preparation.
- On-device transcription engine orchestration.
- Local filesystem/model path helpers.
- macOS-focused input, paste, shortcut, and window behavior.
- Local usage diagnostics and performance logs.

Removed service families should stay removed:

- Hosted transcription providers.
- Self-hosted API transcription adapters.
- Completion provider clients.
- Remote analytics clients.

## Design Rules

- Keep side effects explicit and easy to test.
- Prefer narrow service interfaces over broad utility bags.
- Surface local technology attribution honestly in the UI.
- Treat network use as a product decision, not an implementation detail.
