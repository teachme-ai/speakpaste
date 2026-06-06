# Antigravity Task: Mynah Performance Matrix

## Purpose

Design a performance matrix and ongoing measurement framework for Mynah so we can evaluate product quality as we continue changing the app.

This is not only about speed. It must cover the full local voice-to-cursor loop:

- trigger reliability
- recording quality
- transcription quality
- hallucination behavior
- paste correctness
- background-runtime stability
- resource usage
- hardware variation

## Product Context

Mynah is a local-only macOS voice-to-cursor app.

Current primary loop:

- Hold `Fn`
- Speak
- Release
- Local transcription
- Paste into active app

We need a matrix that remains useful across:

- Apple Silicon laptops
- Apple Silicon desktops
- older Intel Macs where applicable
- different microphones / acoustic environments
- model choices such as whisper.cpp, Parakeet, Moonshine
- future macOS-native capture/noise-processing experiments
- silence-tail and background-noise hallucination cases

## Deliverable

Write a document to:

`apps/mynah/docs/product/ANTIGRAVITY_PERFORMANCE_MATRIX.md`

## Required Sections

Use this structure:

```md
# Mynah Performance Matrix

## 1. Goals

## 2. Core User Journeys

## 3. Performance Dimensions

## 4. Metrics Table

## 5. Test Matrix

## 6. Measurement Methodology

## 7. Alert Thresholds

## 8. Release Gates

## 9. Recommended Instrumentation Additions

## 10. Suggested Weekly Benchmark Ritual
```

## What To Include

### Core user journeys

At minimum:

- manual Fn dictation in foreground
- manual Fn dictation with app window hidden
- fallback shortcut dictation
- noisy-room dictation
- low-level background-noise dictation with no intended speech tail
- short utterance dictation
- long utterance dictation
- paste into chat field
- paste into editor
- settings change while app is live
- app relaunch / restart persistence

### Performance dimensions

Include at least:

- latency
- transcription accuracy
- trailing hallucination rate
- false trigger / false paste rate
- paste success rate
- background-runtime reliability
- CPU usage
- memory usage
- battery/thermal impact
- model load overhead
- cold start vs warm start behavior
- hardware compatibility

### Metrics table

For each metric define:

- metric name
- why it matters
- exact definition
- unit
- collection method
- target
- warning threshold
- blocker threshold

### Specific metrics to propose

Include metrics like:

- time from `Fn down` to recording active
- time from `Fn up` to transcript available
- time from transcript available to paste complete
- end-to-end `Fn up -> text pasted`
- warm-model transcription latency
- cold-model transcription latency
- transcription word error / phrase error
- hallucinated trailing phrase frequency
- percentage of sessions with extra words after intended speech
- percentage of sessions where silence produces extra text
- average extra trailing tokens per affected session
- utterance-end precision: intended stop vs decoded stop
- paste failure rate by app type
- hidden-window success rate
- CPU average / peak during recording
- CPU average / peak during inference
- memory delta per session
- model load time by engine
- first-run permission friction count

### Test matrix

Break down by:

- hardware class
- macOS version
- microphone type
- environment type: quiet / normal room / noisy room
- tail condition: abrupt stop / 500ms silence / 1s silence / HVAC-noise tail / keyboard-noise tail
- utterance type: short / medium / long
- engine/model
- active target app type

### Measurement methodology

Separate:

- what we can instrument automatically
- what still needs manual QA
- what AG can benchmark
- what should become recurring regression checks

Also include a short section comparing three mitigation layers for trailing hallucinations:

- decode-parameter tuning only
- local post-processing cleanup only
- capture-path improvement (for example, future macOS-native voice processing)

For each layer, explain expected performance cost, implementation complexity, and likely quality gain.

### Release gates

Define a small release gate set, for example:

- no regression in end-to-end latency above threshold
- no regression in hidden-window success
- no increase in trailing hallucination rate beyond threshold
- no crash / stuck-runtime issue in the core loop

## Constraints

- Stay local-only.
- Do not assume cloud telemetry.
- Prefer metrics that can be collected on-device or from structured manual test runs.
- Be practical: this matrix should actually be used during development.

## Tone

Be specific and operational. The document should help engineering decisions, not read like a product essay.
