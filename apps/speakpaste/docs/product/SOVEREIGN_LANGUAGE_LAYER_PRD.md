# Sovereign Language Layer PRD

Status: product baseline
Date: 2026-06-01

## Summary

Mynah is evolving from a local dictation utility into a sovereign language layer for Mac.

The product helps users speak naturally, then locally turns that speech into usable text for the app they are already in.

The core loop:

```text
press shortcut -> speak naturally -> local transcription -> local shaping -> paste at cursor
```

## Problem

Many people cannot easily type their thoughts, write clean prompts, reply with the right tone, or turn messy spoken intent into usable text.

Current voice and AI tools usually fail in one of three ways:

- They send sensitive text or audio to cloud systems.
- They expose too many model/provider/settings choices.
- They treat transcription as the whole product rather than helping users express intent.

## Product Promise

The app should let users say things messily and still get clear, useful, local output.

Examples:

- "Tell Priya I will send this tonight, keep it casual."
- "Make this selected paragraph warmer and shorter."
- "Turn this thought into a good prompt."
- "Make this a clear checklist."
- "Reply politely that I disagree and suggest Friday."

## Goals

- Keep all audio, text, usage, corrections, and analytics on the Mac.
- Preserve the stable local dictation path.
- Reduce inherited settings bloat.
- Replace remote provider complexity with local modes and hardware profiles.
- Build a small deterministic local intent router.
- Add a local analytics dashboard that helps the user understand their own language workflow.
- Acknowledge every local framework and engine used.

## Non-Goals

- Auto updater work.
- Cloud transcription.
- Cloud rewrite.
- Remote telemetry.
- Meeting transcription.
- Diarization.
- Cross-platform expansion.
- Bundled third-party local LLMs.
- Fully autonomous agent workflows.

## Personas

Use creative modes rather than job labels.

### Explorer

Captures raw ideas, reflections, fragments, notes, questions, and personal thoughts.

Primary value:

- Lower friction for thinking out loud.
- Preserve momentum.
- Avoid blank-page resistance.

Likely modes:

- Dictate.
- Clean Ramble.
- Notes.
- Outline.

### Maker

Turns speech into useful artifacts.

Primary value:

- Draft messages, prompts, documents, lists, and structured text.
- Shape rough speech into something usable.

Likely modes:

- Prompt.
- Bullets.
- Draft.
- Polish.

### Navigator

Uses voice to move across apps and handle interaction quickly.

Primary value:

- Reply in the current app.
- Rewrite selected text.
- Format text for the active context.
- Keep hands on the current workflow.

Likely modes:

- Reply.
- Rewrite Selection.
- Shorten.
- Make Direct.

## User Stories

- As an Explorer, I want to speak a messy thought and get a clean note without opening a separate AI chat.
- As a Maker, I want to speak a vague request and get a structured prompt I can paste into another tool.
- As a Navigator, I want the app to understand whether I am in Slack, Mail, Notes, or a code editor and shape text appropriately.
- As a privacy-conscious user, I want proof that my audio, transcript, corrections, and analytics stay on my Mac.
- As an Intel Mac user, I want the core app to still work even without Apple Foundation Models.
- As an Apple silicon user, I want enhanced local writing support when Apple Intelligence is available.

## MVP Scope

### Required

- Local-only product baseline.
- Cloud settings removed from the visible product.
- Local transcription still works.
- Local intent router with deterministic classification.
- Writing Modes or Local Actions replacing cloud transformation language.
- Basic app-aware output categories.
- Local analytics dashboard.
- Technology disclosure page.

### Optional If Time Allows

- Apple Natural Language bridge.
- Foundation Models runtime availability check.
- One Foundation Models enhanced mode, such as Clean Ramble, if the local SDK path is ready.

## Writing Modes

Initial modes:

- Dictate: paste transcript with light cleanup.
- Clean Ramble: remove filler and tighten speech.
- Prompt: convert speech into a structured prompt.
- Reply: create a concise response for chat or email.
- Bullets: convert speech into bullet points.
- Rewrite Selection: apply a command to selected text.

## Hardware Profiles

Initial profiles:

- Intel Mac: core local dictation, no Foundation Models.
- Apple silicon 8 GB: fast local mode, small context, bounded output.
- Apple silicon 16 GB or higher: balanced local mode.
- Pro/Max/Ultra: richer local mode after benchmarking.

The app should present these as transparent capability descriptions, not as marketing overclaim.

## Local Analytics

User-facing dashboard:

- Dictation sessions.
- Words dictated.
- Estimated typing time saved.
- Average transcription latency.
- Average local shaping latency.
- Paste success rate.
- Top local modes.
- Local engine/model used.

Do not store private transcript content for analytics.

## Success Criteria For 48 Hour Pivot

- User can launch the app and clearly understand it is local-only.
- User can record, transcribe locally, shape text with a local mode, and paste at cursor.
- Removed cloud settings do not leave broken routes or confusing dead ends.
- Local analytics shows useful counters without content collection.
- Existing local dictation flow remains stable.
- The app can honestly report whether Apple Intelligence enhancement is available.

## Open Questions

- Final product name.
- Exact app category taxonomy for active app detection.
- Whether remote base URLs are removed completely or retained later as localhost-only developer mode.
- Whether Foundation Models are part of the first implementation pass or a second pass.
