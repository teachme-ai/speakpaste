# Local Intent Router Architecture

Status: implementation design
Date: 2026-06-01

## Purpose

The local intent router turns raw local transcription into the right local action.

It is not a cloud agent and not a multi-agent framework. It is a deterministic local decision layer with optional Apple framework enhancement.

## Core Pipeline

```text
audio
-> local transcription
-> local context collection
-> command phrase detection
-> intent classification
-> local action
-> output delivery
-> local metrics
```

## Inputs

### Transcript

The text returned by the selected local speech engine.

### User Mode

Explicit mode selected by the user, such as:

- Dictate.
- Clean Ramble.
- Prompt.
- Reply.
- Bullets.
- Rewrite Selection.

### App Context

Local-only context from the Mac:

- Active app name or bundle id.
- App category.
- Whether selected text exists.
- Whether focused field is editable.
- Optional selection length.

Private app content is not stored in analytics.

### Local Preferences

- Personal vocabulary.
- Preferred style.
- Output behavior.
- Hardware profile.
- Local engine selection.

## Initial Intent Types

```ts
type LocalIntent =
  | "dictate"
  | "clean_ramble"
  | "make_prompt"
  | "reply"
  | "bulletize"
  | "rewrite_selection"
  | "summarize_short"
  | "todo"
  | "unknown";
```

## Deterministic Classification Rules

Start with simple rules. Do not require a model for the first pass.

Examples:

- Selected text exists and transcript starts with "make this" -> `rewrite_selection`.
- Transcript includes "turn this into a prompt" -> `make_prompt`.
- Transcript starts with "reply" -> `reply`.
- Transcript includes "bullet points" or "make a list" -> `bulletize`.
- Transcript includes "todo" or "action item" -> `todo`.
- User selected explicit mode -> use that mode unless unsafe.
- Fallback -> `dictate`.

## App Categories

Initial categories:

- `chat`
- `mail`
- `browser`
- `notes`
- `code`
- `document`
- `unknown`

Use app category to shape output, not to collect private content.

Examples:

- Chat: concise, conversational.
- Mail: complete sentences, polite structure.
- Code: terse, punctuation-aware, avoid fluffy prose.
- Notes: preserve detail and structure.

## Local Actions

### Rules And Templates

The first version should work without Foundation Models.

Examples:

- Remove repeated filler phrases.
- Normalize spacing.
- Convert "new paragraph" to line breaks.
- Convert "bullet point" to bullets.
- Expand prompt mode into a local prompt template.
- Apply app-specific output wrappers.

### Apple Natural Language

Use for lightweight local NLP:

- Language detection.
- Tokenization.
- Named entities.
- Lemmas.
- Script detection.
- Possible command phrase support.

### Apple Foundation Models

Use only when runtime availability says it is available.

Good first enhanced actions:

- Clean Ramble.
- Prompt.
- Rewrite Selection.

Avoid making Foundation Models required for basic dictation.

## Model-Specific Integration Strategy (Whisper vs. Parakeet & Moonshine)

To achieve feature parity across all supported local engines, the Local Intent Router handles architectural differences between models:

### 1. ASR Prompting Capabilities vs. Post-Processing
*   **Whisper C++:** Supports native ASR prompting (injecting a prompt prefix directly into the model at inference time to guide formatting or tone).
*   **Parakeet & Moonshine:** Do not support model-level prompting.
*   **Router Solution:** The Local Intent Router acts as a unified post-processing formatting layer. When the active model is Parakeet or Moonshine, the router executes deterministic regex formatters, templates, or local NLP (Apple Natural Language/Foundation Models) on the raw transcribed text. This ensures modes like "Prompt" or "List" work identically across all models.

### 2. Streaming ASR & KV Caching (Moonshine Integration)
*   **Streaming Input:** Moonshine processes variable-length inputs and supports internal state (KV) caching.
*   **Live Preview Pipeline:** During active dictation (while the shortcut/Fn key is held), the audio recorder streams chunked audio buffers to `transcribe-rs`. 
*   **Caching Optimization:** The Intent Router feeds these live buffers into Moonshine's streaming engine, updating ASR states incrementally using cached KV states to avoid re-transcribing the entire history.
*   **Instant Paste:** Reduces key-release-to-paste latency to `<100ms` and broadcasts partial transcripts to the Svelte `overlay` window for real-time word previews.

## Runtime Capability Object

Expose a single capability contract to the UI:

```ts
type LocalCapabilities = {
  localOnly: true;
  naturalLanguageAvailable: boolean;
  foundationModelsAvailable: boolean;
  accessibilityGranted: boolean;
  activeAppAvailable: boolean;
  selectedTextAvailable: boolean;
};
```

## Suggested Module Boundaries

### TypeScript/Svelte

- UI state.
- Mode selection.
- Dashboard display.
- Settings forms.
- Calling Tauri commands.

### Rust

- Intent router core.
- Local analytics aggregation.
- Feature capability command boundary.
- Session stage tracking.
- Paste/cursor delivery.

### Swift Bridge

- Apple Natural Language calls.
- Foundation Models calls.
- Accessibility context.
- Future App Intents support.

## Observability

Every route should emit local diagnostic stages:

```text
session_started
transcription_started
transcription_completed
intent_classified
local_action_completed
paste_completed
session_completed
```

No transcript text is required for these events.

## Failure Behavior

- If local shaping fails, paste raw transcript.
- If Foundation Models are unavailable, use deterministic fallback.
- If selected text cannot be read, tell the user and offer Dictate mode.
- If paste fails, leave text on clipboard and record a local paste failure metric.
- If intent is unknown, use Dictate mode.

## First Implementation Slice

1. Add intent types.
2. Add deterministic classifier.
3. Add mode presets.
4. Wire classifier after transcription and before delivery.
5. Add tests for classification.
6. Add local metrics per stage.
