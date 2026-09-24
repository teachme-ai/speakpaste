# Observability packet

Every dictation session must be measurable without logging audio or transcript content by default.

## Required event fields

- `event`: stable snake-case name
- `schema_version`: integer
- `session_id`: opaque per-session identifier
- `timestamp_ms` and `elapsed_ms`
- `stage`: `recording`, `preprocess`, `transcription`, `transformation`, or `delivery`
- `engine`/`provider` and model identifier when known
- `status` and `error_code` (stable category, never only a free-form message)
- `duration_ms`, input/output byte or character counts, and dropped-frame count where relevant

## Required events

`session_started`, `recording_started`, `recording_stopped`, `preprocess_completed`,
`transcription_completed`, `transformation_completed`, `delivery_attempted`,
`delivery_completed`, `session_cancelled`, and `session_failed`.

## Privacy and retention

Do not log raw audio, transcript text, clipboard contents, focused-window titles, or model prompts.
Use length, hash, and categorical metadata for correlation. Keep an in-memory rolling aggregate for
the last 100 sessions and expose an explicit diagnostics export that redacts content by construction.

## Metrics

Track p50/p95/p99 latency for recording-to-transcript, transcript-to-delivery, and full session;
transcription success/empty/error rates; cancellation stage; delivery verified/unverified/failure
rates; audio dropped frames; model load time; and Foundation Models availability/timeout/fallback.

Each metric must identify the app version, OS version, architecture, engine, model, language, and
whether the session was triggered by UI, Fn, global shortcut, or push-to-talk.

