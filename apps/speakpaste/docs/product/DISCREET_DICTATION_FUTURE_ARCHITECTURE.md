# Discreet Dictation Future Architecture

## Purpose

This document archives the current thinking for a future SpeakPaste feature often described as:

- discreet dictation
- whisper mode
- quiet mode
- low-volume dictation

It is intentionally **not** part of the current release candidate implementation.

---

## Product Idea

Discreet dictation would let a user speak very quietly, or almost whisper, while still getting reliable local transcription.

The product promise would be:

`Hold Fn -> speak quietly -> release -> paste accurate text`

This is attractive for:

- open offices
- coffee shops
- shared rooms
- late-night work
- developers talking to AI coding tools without speaking loudly
- users who want cognitive privacy while composing prompts, notes, or technical thoughts

---

## Important Technical Reality

Whispered speech is not just lower-volume normal speech.

When a user whispers:

- vocal-fold pitch is reduced or absent
- signal-to-noise ratio collapses
- formants shift
- background noise can sit above the useful speech signal
- standard speech-to-text models may hallucinate or miss words

That means this feature should not be implemented as a simple volume boost.

---

## Current SpeakPaste Baseline

The current app uses:

- Tauri + Rust backend
- CPAL native audio capture
- WAV file pipeline
- local transcription engines such as Whisper C++, Parakeet, and Moonshine
- Fn-key manual dictation as the primary trigger

This is strong for normal dictation, but CPAL captures raw microphone input. It does not automatically apply Apple voice-processing behavior.

---

## Recommended Future Approach

### Phase 1: Measure quiet speech

Add local-only diagnostics for:

- input RMS
- peak level
- approximate noise floor
- clipping
- silence-tail behavior
- transcription latency
- transcription character count

Use this to detect when a capture is low-energy and likely to need quiet-mode handling.

### Phase 2: macOS voice-processing capture prototype

Prototype a macOS-only recorder using Apple AVAudioEngine voice processing.

Relevant Apple API:

- `AVAudioIONode.setVoiceProcessingEnabled(_:)`

Target behavior:

- keep current CPAL path as fallback
- add an internal `MacVoiceProcessingRecorder`
- write WAV output in the same shape as the existing pipeline
- avoid exposing backend jargon to the user

This should be tested against CPAL before becoming default.

### Phase 3: Adaptive default behavior

If the Apple voice-processing path improves quiet speech without hurting latency, make it an internal adaptive default:

- normal speech still feels instant
- quiet speech gets the better capture path
- the user does not need to understand modes

Possible user-facing language:

- `Adaptive capture`
- `Quiet speech support`
- `Discreet dictation`

Avoid making users choose between CPAL, FFmpeg, Browser API, or AVAudioEngine.

### Phase 4: Local enhancement experiment

If Apple voice processing is not enough, evaluate local speech enhancement.

Candidate:

- DeepFilterNet

Why it is interesting:

- supports macOS
- has Rust components
- has real-time speech-enhancement work
- is permissively licensed under MIT/Apache

Risks:

- may add latency
- may increase binary size
- may require 48 kHz handling
- improves noisy speech but does not necessarily reconstruct whispered speech

### Phase 5: Do not use LLMs for audio recovery

Apple Foundation Models, Apple Natural Language, or local LLMs should not be the first solution for this feature.

This is primarily:

- audio capture
- audio enhancement
- ASR robustness

Text cleanup may help after transcription, but it cannot recover speech that was never captured clearly.

---

## Recommendation

Do not ship this as a last-minute release feature.

Keep it as a future measured product slice:

1. benchmark quiet speech with the current CPAL path
2. prototype Apple voice-processing capture
3. compare latency and accuracy
4. only then consider DeepFilterNet or other local enhancement models

The first release should stay focused on reliable normal dictation and clipboard-safe paste behavior.

