# Observability And Test Strategy

Status: implementation baseline
Date: 2026-06-01

## Purpose

The local-only pivot depends on preserving reliability while changing product surface and flow.

The app should be easy to debug without collecting private user content or sending telemetry anywhere.

## Observability Principles

- Logs and metrics are local-only.
- No remote telemetry.
- No transcript text in operational metrics.
- No audio in operational metrics.
- No selected text in operational metrics.
- Use stable session ids to connect pipeline stages.
- Keep developer logs useful for performance and failure analysis.
- User-facing analytics should feel like personal insight, not surveillance.

## Three Layers

### 1. Developer Logs

Purpose:

- Debug local performance.
- Understand failures.
- Diagnose runtime behavior.

Examples:

- Recorder setup time.
- Audio conversion time.
- Model load time.
- Decode time.
- Intent routing time.
- Paste status.
- Shortcut registration status.

### 2. Local Product Metrics

Purpose:

- Power the private dashboard.
- Help users see the value of the product.
- Help users tune their local engine/profile.

Allowed metrics:

- Dictation session count.
- Approximate words dictated.
- Recording duration.
- Transcription latency.
- Local shaping latency.
- Paste success/failure.
- Engine and local model used.
- Writing mode used.
- App category.
- Vocabulary additions.

Not allowed by default:

- Audio.
- Raw transcript.
- Selected text.
- Private app content.
- Remote telemetry events.

### 3. Diagnostic Export

Purpose:

- Let the user explicitly export diagnostics for support or self-debugging.

Rules:

- Export is user-initiated.
- Default export excludes audio and transcript.
- If future export includes sensitive content, it must be explicit and visibly labeled.

## Pipeline Stage Events

Each dictation should get a local `session_id`.

Stage names:

```text
session_started
recording_started
recording_stopped
audio_conversion_started
audio_conversion_completed
model_load_started
model_load_completed
transcription_started
transcription_completed
intent_classified
local_action_started
local_action_completed
clipboard_write_started
cursor_paste_completed
session_completed
session_failed
```

Recommended fields:

```ts
type LocalStageMetric = {
  sessionId: string;
  stage: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: "ok" | "failed" | "skipped";
  engine?: string;
  model?: string;
  mode?: string;
  appCategory?: string;
  audioDurationMs?: number;
  audioBytes?: number;
  wordCount?: number;
  errorCode?: string;
};
```

Do not include transcript text.

## Existing Test Stack

The repo already uses:

- Bun tests for TypeScript packages and app logic.
- `svelte-check` for Svelte/TypeScript type safety.
- Rust tests are available for Rust modules if added.

Do not introduce a heavy test framework during the 24-48 hour pivot unless required.

## Test Strategy By Phase

### Phase 1: Local-Only Product Surface

Test goals:

- App typechecks.
- Removed cloud settings do not leave broken imports.
- Cloud API key routes are not visible in navigation.
- Local transcription settings remain reachable.
- Existing local dictation still works.

Commands:

```sh
bun run typecheck
```

Additional checks:

- Manual app launch.
- Settings navigation smoke test.

### Phase 2: Intent Router

Use Bun unit tests.

Test cases:

- Plain transcript maps to `dictate`.
- Explicit mode overrides ambiguous text.
- "make this shorter" with selected text maps to `rewrite_selection`.
- "turn this into a prompt" maps to `make_prompt`.
- "reply warmly..." maps to `reply`.
- "make this a list" maps to `bulletize`.
- Unknown command safely falls back to `dictate`.

### Phase 3: Local Analytics

Use Bun unit tests.

Test cases:

- Metrics aggregate without storing transcript content.
- Session duration calculation works.
- Paste failure increments failure count.
- Engine/model counters increment.
- Dashboard summary reads persisted local counters.

### Phase 4: Apple Framework Bridge

Use Rust/Swift runtime checks plus manual tests.

Test cases:

- Natural Language unavailable path does not break dictation.
- Foundation Models unavailable path falls back to deterministic action.
- Foundation Models available path is bounded and returns structured output.
- Accessibility denied path still supports normal dictation.

### Phase 5: Whole Package Smoke Test

Manual checklist:

- Launch app.
- Record locally.
- Transcribe with local engine.
- Apply a writing mode.
- Paste at cursor.
- Confirm clipboard restore behavior.
- Confirm local dashboard increments.
- Quit and reopen.
- Confirm local settings and metrics persist.

## Regression Spine

Every major change must preserve:

```text
record -> local transcribe -> route intent -> paste -> local metric
```

If this spine breaks, the build is not shippable.

## Performance Milestones

Track these locally:

- Cold model load time.
- Warm model decode time.
- End-to-end record-stop-to-paste time.
- Intent router time.
- Local action time.
- Paste success rate.

Initial target:

- Intent router under 20 ms for deterministic paths.
- Local analytics write under 10 ms.
- No observable slowdown for plain Dictate mode.

## Build Gate For Each Implementation Slice

Before committing a slice:

1. Run relevant unit tests.
2. Run app typecheck.
3. Smoke test the affected path manually.
4. Check logs for transcript/audio leakage.
5. Update docs if the implementation changes the baseline.
