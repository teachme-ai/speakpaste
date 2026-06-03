# Antigravity Task: Benchmark Corpus + Manual QA Runbook

## Purpose

Use the current performance matrix to produce a practical benchmark corpus and repeatable manual QA runbook for SpeakPaste.

This is the next artifact after:

- `ANTIGRAVITY_PERFORMANCE_MATRIX.md`

The goal is to convert the matrix into something engineering can actually run repeatedly while we keep changing the app.

## Product Context

SpeakPaste is a local-only macOS voice-to-cursor app.

Current primary flow:

- Hold `Fn`
- Speak
- Release
- Local transcription
- Paste into active app

Current top quality risk:

- trailing hallucinations during silence tails or low-level background noise

Current runtime priority:

- keep the hidden-window background dictation loop stable while improving dictation quality

## Deliverable

Write a document to:

`apps/speakpaste/docs/product/ANTIGRAVITY_BENCHMARK_CORPUS_RUNBOOK.md`

## Required Sections

Use this structure:

```md
# SpeakPaste Benchmark Corpus And QA Runbook

## 1. Purpose

## 2. Scope

## 3. Benchmark Corpus Design

## 4. Corpus Inventory Table

## 5. Recording Instructions

## 6. Manual QA Runbook

## 7. Result Capture Template

## 8. Regression Rules

## 9. Recommended Automation Follow-Ups
```

## Must Cover

The corpus and runbook must explicitly cover:

- quiet room
- office noise
- HVAC / fan tail
- short utterance
- long utterance
- hidden-window paste

Also include:

- fallback shortcut dictation
- paste into chat field
- paste into text editor
- silence-only capture with no intended speech
- abrupt stop vs short silence tail vs longer silence tail

## Benchmark Corpus Requirements

Design a corpus that is realistic and small enough to run often.

Include:

### 1. Corpus categories

At minimum:

- short command phrases
- natural sentence dictation
- paragraph dictation
- silence-tail samples
- noisy ambient samples
- target-app paste validation set

### 2. Per-sample metadata

For every proposed sample, define:

- sample ID
- category
- environment
- utterance length
- expected reference transcript
- intended trigger path (`Fn` or fallback shortcut)
- intended target app type
- whether hidden-window mode is required
- whether the sample is meant to detect hallucination, latency, or paste correctness

### 3. Corpus sizing guidance

Recommend:

- a tiny smoke corpus
- a standard regression corpus
- a deeper pre-release corpus

### 4. Silence / noise-specific cases

Include dedicated cases for:

- no speech, quiet room
- no speech, HVAC hum
- no speech, office keyboard noise
- one short phrase followed by 500ms silence
- one short phrase followed by 1s silence
- one short phrase followed by fan noise tail

## Manual QA Runbook Requirements

The runbook should be step-by-step and easy to execute by a human tester.

Include:

### 1. Preconditions

- app build being tested
- whether `/Applications/SpeakPaste.app` or dev build is used
- accessibility permission state
- microphone permission state
- target app prepared in foreground
- whether main SpeakPaste window is visible or hidden

### 2. Test flows

Include repeatable manual procedures for:

- foreground `Fn` dictation
- hidden-window `Fn` dictation
- fallback shortcut dictation
- quiet-room short utterance
- quiet-room long utterance
- office-noise utterance
- HVAC/fan-tail utterance
- silence-only capture
- live shortcut change without restart
- restart persistence

### 3. Pass / fail criteria

For each flow, define:

- what success looks like
- what failure looks like
- what exact artifacts to capture when it fails

### 4. Evidence capture

Specify what the tester should save:

- pasted output
- observed latency estimate
- whether extra words were appended
- whether the paste target was correct
- screenshots if UI/routing is wrong
- logs if runtime failed

## Result Capture Template

Include a copy-pasteable markdown template for test runs with:

- machine
- macOS version
- model / engine
- scenario
- result
- observed output
- expected output
- hallucination present yes/no
- hidden-window yes/no
- notes

## Regression Rules

Define a small rule set for when a change should be considered a regression.

At minimum:

- silence-only capture producing text
- extra trailing words above baseline
- hidden-window paste failure
- restart persistence failure
- latency regression beyond agreed threshold

## Recommended Automation Follow-Ups

End with a small, practical follow-up section that separates:

- what can be automated now
- what needs app instrumentation first
- what should remain manual for now

## Constraints

- Stay local-only.
- Do not assume cloud telemetry.
- Do not assume the app already has perfect telemetry instrumentation.
- Distinguish clearly between:
  - tests we can run today
  - tests that need future instrumentation
- Keep it operational and engineering-focused.

## Tone

Concrete, practical, and repeatable. This should read like a working QA artifact, not product marketing.
