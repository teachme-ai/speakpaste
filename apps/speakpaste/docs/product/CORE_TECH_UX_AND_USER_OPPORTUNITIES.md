# Core technology, Mac usability, and user opportunities

Date: 2026-09-14. Companion to `MAC_APP_IMPLEMENTATION_PLAN.md`.

Status: additional source-review findings and proposals. No implementation or performance claims. Market observations describe current product capabilities, not quantified adoption or market share.

## Direction

Prioritize dependable communication: preserve intended meaning, make corrections easy, and work naturally inside a Mac user's existing applications. Basic cleanup, app-aware styles, dictionaries, and lists are already offered elsewhere. Their presence in Mynah is useful but does not alone establish differentiation.

Keep the previous plan's Mac-only, app-only boundary and phase dependencies. This document deepens the audio algorithms, native integration, UI, and user validation; it does not add a Windows or website project.

## Additional source findings

- `src-tauri/src/transcription/mod.rs`: `trim_low_energy_edges` uses a fixed RMS threshold of 0.004, a 20 ms window, and 80 ms padding. Both edge searches recompute RMS for overlapping windows at a one-sample stride. Worst-case work is proportional to samples times window length. Low-amplitude input can be classified as empty. This is a plausible quiet-speech failure mode, not a reproduced user incident.
- `src-tauri/src/recorder/recorder.rs`: audio callbacks allocate with `data.to_vec()` before sending frames. The writer queue is unbounded. Callback latency and queue growth should be measured.
- `src-tauri/src/recorder/wav_writer.rs`: samples are serialized one at a time into a `BufWriter`. These are buffered writes, not necessarily one OS write per sample. Block serialization may reduce overhead; benchmark before prioritizing it.
- `src/routes/(app)/+page.svelte`: home sizing is explicitly set to 500 x 720, and expanding history requests 500 x 1100. The effect on small displays and saved window geometry needs installed-app verification.
- `src/routes/(app)/_home/OverlayStatusPill.svelte`: visible states cover listening, transcribing, and pasted. The component has animated effects and no visible cancel/review/recovery controls; review overall app accessibility before making app-wide claims.
- `src/routes/(app)/(config)/settings/+page.svelte`: visible mode options list Dictate, Clean Ramble, and Prompt, while the router supports List as well. Reconcile feature availability and naming from one registry.

## A. Audio and algorithm work

### A1. Speech-preserving segmentation

Replace repeated RMS summation with rolling energy. For a window of W samples, update the sum by subtracting the outgoing squared sample and adding the incoming squared sample. Use a numerically stable accumulator and clamp small negative rounding artifacts before square root. This yields linear scan work for fixed window decisions.

Separate this semantics-preserving optimization from changes to speech classification:

- Estimate background energy over frames likely to be non-speech; do not assume the beginning of every utterance is silence.
- Combine an energy floor with a tested voice-activity detector. A fixed energy threshold alone cannot distinguish quiet speech from silence.
- Use hysteresis: different thresholds or consecutive-frame counts for entering and leaving speech state.
- Retain configurable onset/offset padding to preserve weak consonants and word endings.
- When evidence is uncertain, preserve captured audio rather than aggressively trimming it away.
- Calibrate with soft speech, low-gain microphones, fan noise, breathing, music, and atypical speech. Do not claim whispering or universal accessibility support without those tests.

Acceptance: rolling scan matches old decisions within documented floating-point tolerance; classification changes are evaluated separately for clipped words, false starts, and unnecessary inference. Add long-silence benchmarks to expose worst-case scan cost.

### A2. Endpointing that respects thinking pauses

Differentiate trigger semantics:

- Push-to-talk: release is the endpoint; retain only a short configured tail for already captured audio.
- Toggle mode: stop explicitly by default; optionally offer automatic finish after silence.
- VAD mode: use speech probability, minimum speech duration, trailing silence, and maximum segment length.

Offer short and patient pause profiles. Semantic completion can be an optional secondary hint, but an LLM must not decide that a user's incomplete thought is finished solely from plausible text. Tune for interruption rate as well as speed.

Pre-roll may exist only within a recording session the user already started. Do not introduce continuous background capture to solve onset loss. Give an accurate ready-to-speak cue after the microphone is active.

### A3. Stable incremental transcription

For chunked ASR, align overlapping words/timestamps and commit only a stable prefix shared by successive hypotheses. Keep the remaining suffix provisional. Use bounded overlap and normalization that preserves numbers and proper names. Do not treat simple string concatenation as streaming.

Provide explicit decoder capabilities: partials, timestamps, language support, and cancellation. Avoid pretending a batch engine provides native streaming. Never stream provisional edits directly into the destination in the first version.

Acceptance: no duplicated boundary phrases, measurable partial revision rate, bounded memory, and final text compared with whole-utterance decoding.

### A4. Quality-driven inference

Use a fast first pass; escalate only difficult segments when evidence and latency budget justify it. Signals can include speech/no-speech disagreement, repetition, abnormal output length, and engine-provided confidence or log probabilities where available. These scores are not comparable across engines without calibration.

- Try an alternate decode or user-selected engine for uncertain audio; do not run two full models for every request.
- Use vocabulary and selected text as bounded hints, never as facts that must appear in the transcript.
- Protect numbers, names, code terms, and negations through transformation. Suspicious changes trigger review, not an unsupported assertion of correctness.
- For mixed languages, retain an explicit language override and evaluate span-level/script behavior. Very short clips are poor language-identification inputs.
- Separate transliteration from translation. “Write Hindi using Latin letters” is a different operation from “translate to English.”

Acceptance: improvement in correction time and entity accuracy; no growth in invented facts or energy disproportionate to benefit.

### A5. Memory and compute

- Introduce a preallocated audio-buffer pool/ring with bounded ownership transfer. Avoid allocation, locks, logging, and disk work in the capture callback where practical.
- Use explicit overflow/error outcomes. Never silently drop speech.
- Keep short-session PCM in memory and archive audio asynchronously only under retention settings; retain a bounded disk-spill/recovery strategy for long sessions.
- Benchmark block WAV encoding; `BufWriter` already buffers system calls.
- Schedule ASR and generation to avoid simultaneous memory spikes. Warm the selected model, not every model.
- Use thermal and memory-pressure signals to reduce speculative work before changing recognition quality. Show explicit power/quality profiles rather than silently switching languages or behavior.

## B. macOS-specific implementation

### B1. Native floating status panel

Evaluate an AppKit `NSPanel` for a lightweight status surface that does not steal target focus. Keep the main Tauri settings/history window. This is a small native integration, not a SwiftUI rewrite.

Test full-screen apps, Spaces, multiple monitors, display disconnects, scaling, accessibility navigation, and panel interaction. Review UI may take focus deliberately; save and revalidate the original destination before applying. A nonactivating panel is not a guarantee that every interaction preserves keyboard focus.

### B2. Audio processing adapter

Prototype AVAudioEngine voice processing alongside CPAL, using the same evaluation clips/devices. Echo cancellation can help when the Mac plays sound; processing may also distort soft speech or interact poorly with already processed microphones. Keep a bypass and compare transcription quality, setup time, device switching, and energy before replacing capture.

### B3. More dependable native boundaries

- Prefer bounded Accessibility reads with timeout and explicit capability results; avoid scraping whole application trees.
- Use native process/app identifiers and selection fingerprints to validate delivery.
- Keep event-tap callbacks minimal; handle tap disable/re-enable and shortcut recovery outside the callback.
- Audit lifecycle ownership of CF/Objective-C/Swift resources. Typed wrappers may help, but migrate based on observed maintenance or correctness needs.
- Add signposted session stages for Instruments and profile allocations, audio callback time, UI hangs, and thermal behavior.
- Consider an XPC inference helper only if crash reports show that isolating native inference materially improves recovery. It adds IPC, packaging, cancellation, and memory complexity; it is not the first optimization.

## C. UI and usability changes

### C1. Three everyday actions

Present **Dictate**, **Edit selection**, and **Create prompt** as the main choices. Make clean text the optional dictation behavior, and bullets a formatting choice. Use one action/mode registry for UI, native config, shortcuts, and capability checks.

Keep engine names and decode parameters in advanced settings. Primary onboarding asks about preferred language, writing purpose, and shortcut comfort. Recommend a suitable local engine with an explanation and allow an advanced override.

### C2. First-use success

Build one short guided loop: microphone access -> sample phrase -> inspect result -> test insertion in a safe text field -> teach undo/cancel. Request Accessibility when demonstrating insertion or selected-text editing, with copy-only available when possible.

Explain unavailable features without blocking core dictation. Report real microphone/model/shortcut readiness rather than inferring readiness from settings being selected.

### C3. Useful in-session feedback

The compact panel should answer: Is the mic active? Which action is running? Where will text go? Can I cancel? What happened if delivery failed?

- Display active microphone and level/clipping feedback only when useful.
- Show a stable partial transcript optionally, without animation on every character.
- Distinguish listening, finishing speech, shaping text, awaiting review, and delivery outcome.
- Provide cancel, copy, retry, and recover-original actions appropriate to state.
- Use concise local-processing status backed by actual runtime behavior; avoid blanket privacy labels for optional remote operations.

### C4. Recovery and review

Keep the last result immediately accessible. Provide targeted alternatives for questionable words only when evidence supports them; never show fabricated confidence percentages. Use an original/result comparison for edits and a compact change summary for long outputs.

Support spoken and keyboard corrections. In shared spaces, let users type a short editing instruction into the same workflow. A voice product can still help when speaking is inconvenient.

### C5. Windowing and accessibility

- Replace forced tall history expansion with a scrollable layout constrained to the visible display work area. Persist reasonable user window geometry.
- Support keyboard-only navigation, VoiceOver labels/status announcements, larger text, increased contrast, reduced transparency/motion, and optional sound cues.
- Keep hold and toggle shortcuts both available; avoid requiring prolonged key holding or mouse precision for everyone.
- Use plain language: “Clean up speech” is easier to understand than “Clean Ramble”; keep internal enum names stable during UI changes.
- Avoid frequent success toasts and novelty animation. Errors should carry an action that resolves them.
- Put retention/delete controls beside history; separate retained audio, transcripts, vocabulary, and anonymous local counters.

Acceptance: installed-app usability sessions on a small laptop screen and multiple monitors; keyboard/VoiceOver completion of onboarding, dictation, edit review, cancellation, and recovery.

## D. Current market signals and their limits

1. **Dictation is being packaged as finished writing.** Wispr Flow advertises styles, dictionaries, and application context; Superwhisper documents context-aware modes. This is evidence of product direction, not evidence that most users have adopted voice. [Wispr](https://wisprflow.ai/), [Superwhisper](https://superwhisper.com/docs/modes/modes)
2. **Context and personalization are already competitive requirements.** Mynah must demonstrate better fidelity, control, or task completion, rather than merely listing those features. [Wispr context documentation](https://docs.wisprflow.ai/articles/4678293671-Context-Awareness)
3. **OS vendors are incorporating the basics and AI cleanup.** Windows Fluid Dictation is one example; this informs differentiation even though Windows remains out of scope. [Microsoft](https://support.microsoft.com/en-US/accessibility/windows/voice-access/fluid-dictation)
4. **Privacy controls are part of product positioning.** A privacy mode, no-training promise, and on-device execution are different properties; explain the actual property Mynah provides. Wispr documents separate privacy/context controls. [Wispr privacy controls](https://docs.wisprflow.ai/articles/3842996553-privacy-mode-private-cloud-sync)
5. **User trust is contextual.** A study analyzing 1,000 UK respondents examines trust across speech-technology scenarios. It is relevant background, not a Mac dictation adoption survey or evidence about Indian users. [Research paper](https://wp.lancs.ac.uk/factor/files/2025/10/Williams-2026-Public-perceptions-of-speech-technology-trust-in-the-United-Kingdom.pdf)
6. **Atypical-speech support remains an evaluation problem.** Recent research explores ASR plus generative correction for dysarthric speech. It does not prove that general-purpose Mynah engines work well for that population. [Interspeech research](https://arxiv.org/abs/2508.08027)

No reliable population-wide usage-growth estimate was established in this review. Do not use product announcements or testimonials as market-size statistics.

## E. User opportunities to validate

| User group | Potential friction | Testable Mynah value | Primary measure |
| --- | --- | --- | --- |
| Developers and frequent LLM users | Long spoken requests lose constraints or technical names | Faithful prompt construction and selected-context editing | Task fidelity and time until prompt is ready |
| Multilingual professionals | Code-switching, names, and unwanted translation | Explicit language/script behavior and scoped glossary | Corrections to names and language spans |
| Writers and independent professionals | Speech is disorganized; rewrites erase personal tone | Draft from speech with controlled restructuring | Acceptable draft time and tone preservation |
| People reducing keyboard use | Holding keys, correction burden, inaccessible recovery | Toggle controls, patient pauses, accessible review/undo | Independently completed tasks and effort ratings |
| Privacy-sensitive workers | Unclear capture, retention, or network behavior | Understandable local execution and retention controls | Correct understanding and successful offline tasks |
| People in shared/public workspaces | Speaking can be disruptive or disclose content | Short voice input plus typed revision, explicit mic control | Tasks completed comfortably in the real setting |

Prioritize developers/LLM users and multilingual professionals first because these fit the origin of the app. Include accessibility needs in design and test with relevant participants, without making unsupported clinical claims. Do not assume every member of a group has the listed friction.

## F. Proposed validation program and ordering

- Recruit a small exploratory Mac pilot across the first two target groups, with a smaller inclusive-usability cohort. This is discovery, not a representative market survey.
- Compare typing/current tools/current Mynah/prototype on matched tasks; counterbalance order to reduce learning effects.
- Include a short message, a technical prompt with constraints, a selected paragraph revision, mixed-language names/numbers, and a forced recovery scenario.
- Measure total task time including correction, meaningful details retained, effort, unintended edits, and repeat voluntary use after novelty wears off.
- Ask where users choose not to speak and why. Test privacy comprehension through concrete questions, not agreement with marketing statements.
- Collect only consented task material; use content-free local operational metrics otherwise.

Implementation order: rolling energy optimization and quiet-speech evaluation; buffer/callback reliability; responsive panel and recovery; endpointing; stable partials and selective inference; personalized language behavior. Native capture replacement and XPC isolation stay evidence-gated spikes.

Map changes to the main plan: A1–A5 extend Phase 5, B1/C extend Phases 2–3, B2/B3 extend Phase 5, and E/F extend Phase 0 and pilot release gates. Do not delay the main reliability fixes to pursue an engine experiment.

## Native reference material

- [Apple voice processing](https://developer.apple.com/documentation/avfaudio/using-voice-processing)
- [Apple NSPanel](https://developer.apple.com/documentation/appkit/nspanel)
- [Apple thermal state](https://developer.apple.com/documentation/foundation/processinfo/thermalstate-swift.property)
- [whisper.cpp and VAD](https://github.com/ggml-org/whisper.cpp)

Verified in this turn: named source paths and code behavior were read; current official product/framework pages and research were consulted. No code edits, runtime benchmarks, user tests, or visual inspection of the installed app occurred.
