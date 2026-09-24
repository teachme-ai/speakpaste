# Mynah Mac app: multi-agent implementation plan

Date: 2026-09-14  
Status: proposed implementation sequence based on accepted code-review findings; implementation has not started.

Revision: redesigned for coordinated multi-agent implementation on 2026-09-14. Sections 1–12 retain the full product/engineering requirements; Section 13 defines the execution schedule, ownership, and integration protocol. The numbered phases describe feature scope, not mandatory sequential execution. Dispatch work using the [agent task catalog](MULTI_AGENT_TASK_CATALOG.md), whose task IDs replace the previous batch/sub-batch IDs. The [companion analysis](CORE_TECH_UX_AND_USER_OPPORTUNITIES.md) retains research context.

Planning status: only documentation has changed. No implementation agents should treat a planned task or an interface proposal as completed work. When implementation begins, start with `BOOT`, then the three baseline tasks; do not launch the entire catalog simultaneously.

## 1. Product objective and scope

Make Mynah a dependable voice-driven writing assistant: speak an idea, revise selected text, prepare a useful prompt, and deliver the result into the application where the user is working.

Confirmed decisions:

- Develop the Mac app only. Windows is out of scope.
- The app is free to download and use. Do not introduce a mandatory paid service or subscription dependency.
- Limit work to `speakpaste/apps/speakpaste`. Do not modify the website, unrelated applications, or shared packages without a separate scope decision.
- The user accepted the source-review findings and requested this detailed plan. That authorizes planning; this document does not represent completed implementation or permission to publish a release.
- Retain Rust/Tauri, Svelte, and the Swift bridge. No whole-app UI rewrite.
- Preserve a useful local dictation experience independently of any generative model.

Prior product policy in `LOCAL_ONLY_BASELINE.md` excludes cloud processing and third-party local generative models. The latest discussion accepts evaluating those technologies. The shipping baseline in this plan stays local: optional model/provider work must explicitly reconcile that policy before adoption. Evaluation does not silently enable network processing.

Primary users: people who use speech to compose messages, documents, and instructions for LLMs, including people who use mixed languages and specialist vocabulary.

Product success means less correction and faster completion of real writing tasks. More model choices are not a success metric by themselves.

### Priority users and value proposition

Prioritize developers/frequent LLM users and multilingual professionals for the first pilot. The proposition to validate is: **Turn spoken thoughts into usable writing while preserving meaning, and make every correction easy.** Include accessibility needs throughout design rather than treating them as a later theme.

| User group | Problem hypothesis | Planned response | Measure |
| --- | --- | --- | --- |
| Developers and LLM users | Spoken requests lose constraints or technical terms | Faithful prompt shaping, scoped vocabulary, selected context | Time until prompt is ready; requirements retained |
| Multilingual professionals | Code-switching and names cause corrections or unwanted translation | Explicit language/script behavior and glossary | Entity accuracy; corrections per language span |
| Writers and independent professionals | Spoken drafts need structure but rewrites erase tone | Controlled restructuring and comparison | Time to acceptable draft; tone preservation |
| People reducing keyboard use | Holding keys and correcting errors remain difficult | Toggle controls, patient pauses, accessible review and undo | Independent task completion; effort ratings |
| Privacy-sensitive workers | Capture, storage, and network behavior are unclear | Local operation and explicit retention controls | Privacy comprehension; offline task success |
| People in shared spaces | Speaking can be disruptive or disclose content | Short voice input and typed editing instructions | Comfortable task completion in the actual setting |

These are research hypotheses, not claims about every member of a group. Styles, dictionaries, context, and basic AI cleanup already appear in competitor/OS features; test workflow quality rather than claim uniqueness from feature presence. Current references are in Section 15 and the companion. No population-wide voice-adoption growth rate was established.

## 2. Current implementation: evidence and limits

Paths below are relative to the app root.

| Finding | Source | Consequence |
| --- | --- | --- |
| Native dictation transcribes, trims, then pastes raw text | `src-tauri/src/dictation_state_machine.rs` | Existing writing modes do not participate in the primary native pipeline. |
| Four writing modes and Foundation Models calls exist | `src/lib/query/intent-router.ts`, `src-tauri/src/fm_bridge.rs`, `src-tauri/swift/MynahFM/` | Build on existing work, but relocate execution into the native pipeline. |
| Frontend native-recording processing is a no-op | `src/lib/query/actions.ts`, `src/lib/query/recording-pipeline.ts` | Old pipeline tests and event handlers need reconciliation with current behavior. |
| Stop processing is awaited inside the command loop | `src-tauri/src/dictation_state_machine.rs` | Cancellation cannot be handled promptly while that work is awaited. |
| Config contains auto-paste and rules, but the native path does not apply them | `src-tauri/src/runtime_config.rs`, `src-tauri/src/dictation_state_machine.rs` | Preferences need a single enforced runtime contract. |
| Swift uses semaphore waits around asynchronous generation with a four-second timeout | `CleanRamble.swift`, `PromptSpec.swift`, `ListShaping.swift` | Timeout does not cancel underlying generation; fallback and successful unchanged text are ambiguous. |
| Paste failure can be an `Ok` string; caller checks only `Err` | `src-tauri/src/lib.rs`, `dictation_state_machine.rs` | Completion can be reported incorrectly. |
| Paste uses text-only clipboard preservation and about 910 ms of explicit waits | `src-tauri/src/lib.rs` | Investigate clipboard fidelity and completion latency separately from first visible insertion. |
| Recorder uses an unbounded audio queue and ignores writer errors | `src-tauri/src/recorder/recorder.rs` | Storage or processing trouble needs bounded, visible failure behavior. |
| Models persist in a cache; Whisper enables Metal; Parakeet requests Core ML with CPU fallback | `transcription/model_manager.rs`, `vendor/transcribe-rs/` | Measure actual acceleration before replacing engines. |
| Packaging minimum and Swift build target differ | `tauri.conf.json`, `build.rs` | Establish and test the real minimum supported macOS version. |
| Silence trimming uses RMS 0.004, 20 ms windows, and 80 ms padding; each overlapping window recomputes its energy | `src-tauri/src/transcription/mod.rs` | Separate a linear-time scan optimization from quiet-speech/VAD behavior changes. |
| Capture callbacks allocate `data.to_vec()`; WAV encoding loops over samples using a buffered writer | `src-tauri/src/recorder/recorder.rs`, `wav_writer.rs` | Measure callback allocation and block serialization; do not confuse buffered writes with per-sample OS calls. |
| Home requests 500 x 720 sizing and 500 x 1100 when history opens | `src/routes/(app)/+page.svelte` | Preserve window geometry and constrain history to the display work area. |
| Overlay presents listening/transcribing/pasted; general settings omit the router's List mode | `_home/OverlayStatusPill.svelte`, `(config)/settings/+page.svelte` under `src/routes/(app)/` | Add actionable states and one action/mode registry. |

These are static source findings, not benchmark results. The installed release may differ from the checkout. Establish build identity in Phase 0. Some historical product documents predate implemented code; use source and verified behavior as the implementation baseline.

## 3. Target architecture

```text
Fn / shortcut / UI
        |
Rust session controller: ID, config snapshot, cancellation, deadline
        |
Capture -> Transcription -> Intent -> Transformation -> Validation -> Delivery
                              ^             ^                         |
                              |             |                         v
                     Bounded context    Swift on-device AI      Typed outcome
                     + user vocabulary  or deterministic rules  + undo record
        |
Typed events -> Svelte status, previews, settings, history
```

### Responsibilities

- **Rust:** owns session lifecycle, audio, model scheduling, cancellation, runtime preferences, delivery, and local operational metrics. Processing must not require an active webview.
- **Swift:** owns Apple framework adapters: Foundation Models first, then SpeechAnalyzer and selected-text/native integrations where appropriate. Use an asynchronous, versioned bridge.
- **Svelte:** presents settings, state, results, selection previews, and errors. Keep business rules out of components.
- **Shared app contracts:** typed requests/outcomes with schema versions. Generate bindings where feasible; otherwise use contract fixtures to detect drift.

### Core contracts

- `SessionRequest`: session ID, trigger, mode, config snapshot, context permission, optional target snapshot.
- `Transcript`: raw text, language, engine/model identity; optional segments/timestamps only when supported.
- `ContextSnapshot`: destination app identifier, selected text, focused element/range identifiers when available, capture time, length limit. Do not claim access to entire browser conversations from an app identifier.
- `TransformRequest`: operation, source text, instruction, bounded context, vocabulary/style preferences, deadline.
- `TransformOutcome`: success, unchanged, deterministic fallback, unsupported, cancelled, timeout, rejected, failed; includes provenance and duration.
- `DeliveryOutcome`: inserted-and-verified, paste-attempted-unverified, copied-only, target-changed, cancelled, failed.
- `EditRecord`: source and replacement, target fingerprint, session ID, expiry; ephemeral by default.

Treat transcripts and selected content as data. They must not acquire authority to invoke tools merely because they contain instructions. Explicit editing/action mode establishes intent.

## 4. Phase 0 — establish the baseline

**Goal:** make regression and performance decisions against evidence.

Work:

1. Record checkout/build identity and installed app version; preserve existing user changes.
2. Trace Fn, push-to-talk, toggle, UI, and VAD routes. Identify which states and events each owns.
3. Run existing focused tests and type checking; record pre-existing failures separately. Audit tests that import retired pipeline functions.
4. Reproduce raw dictation, each writing mode, cancellation, auto-paste off, text rules, permission recovery, and hidden-window operation.
5. Establish a small consented/synthetic evaluation corpus: short/long speech, silence, noise, names, dates, numbers, negation, code terms, English and intended Indic/code-switch cases.
6. Capture cold/warm latency, memory, audio conversion, inference, transformation, and delivery time on available hardware.
7. Verify supported OS/architecture claims against actual artifacts, dependencies, weak linking, and launch tests. Do not silently raise the minimum deployment target.
8. Include quiet/low-gain speech, long silence, thinking pauses, background playback, and soft word endings in the audio baseline. Include small-screen window sizing and keyboard-only recovery in the UI baseline.
9. Recruit an exploratory Mac pilot for the priority groups and establish their current tools and tasks. Follow the task-comparison protocol in Section 12; do not use a small pilot as a market-size survey.

Deliverables: baseline issue register, reproducible benchmark command/fixture manifest, hardware/OS matrix, and updated current-status document.

Acceptance: every known issue is either reproduced or clearly labeled unverified; baseline tests and build failures are attributable; performance numbers include hardware, model, audio length, and cold/warm state.

## 5. Phase 1 — one reliable native pipeline

**Goal:** every entry point honors the same settings and can cancel safely.

### 1A. Session and state ownership

- Consolidate `dictation_state_machine.rs`, `dictation_manager.rs`, and `dictation_runtime.rs` responsibilities.
- Keep command reception responsive by running processing in an owned worker task and receiving completion separately.
- Use explicit states: Idle, Recording, Transcribing, Transforming, AwaitingReview, Delivering, Completed, Cancelled, Error.
- Allow only one active delivery session. Do not accumulate unbounded shortcut requests.
- Attach session IDs to all events and results. Ignore obsolete completions.
- Propagate cancellation into inference where supported; otherwise invalidate its result and prevent delivery while the worker finishes.
- Balance App Nap prevention, recorder cleanup, and runtime reset on success, cancellation, timeout, and every error path. Remove reliance on frontend listeners for native cleanup.

### 1B. Runtime configuration and formatting integration

- Snapshot settings at session start, including selected mode, spoken override, text rules, paste preference, language, and model.
- Extend/version the on-disk runtime schema, migrate old files, and write atomically.
- Implement deterministic routing/formatting as a native service; port useful behavior with parity fixtures, correcting meaning-damaging rules.
- Use a single dispatch function for explicit mode and spoken override to remove duplicated transformation branches.
- Define processing order: raw transcript -> explicit intent extraction -> selected transformation -> explicit user text rules -> output validation -> delivery.
- Verbatim mode preserves recognized text without inferred cleanup; document whether explicitly enabled user rules are bypassed in this mode.
- Require explicit opt-in for spoken mode overrides. Ordinary words such as “list” and “prompt” must not unexpectedly consume content.
- Remove obsolete event handlers and no-op pathways only after all triggers use the consolidated controller.

### 1C. Delivery correctness

- Return typed outcomes and honor auto-paste off. Copy-only is a separate outcome from insertion.
- Capture destination before processing; revalidate before delivery. If focus changes, retain the result and offer deliberate delivery.
- Audit clipboard preservation for images, rich text, files, and empty clipboard states. Preserve supported pasteboard representations rather than only plain text.
- Use pasteboard change tracking to avoid overwriting a newer user copy. Serialize restoration and subsequent paste operations.
- Ensure simulated modifier keys are released on failure.
- Distinguish successful keystroke injection from verified text insertion.
- Retain clipboard paste as a compatibility fallback; evaluate Accessibility insertion where supported without assuming universal reliability.

Acceptance:

- All triggers obey mode, rules, and auto-paste preferences.
- Sessions cancelled or superseded before the delivery commit boundary never deliver, including when model execution cannot immediately stop. After commit begins, report the actual outcome and offer recovery rather than promise to retract an insertion already performed.
- Failure returns the controller to a usable state with no stuck microphone/activity assertion.
- Clipboard preservation and changed-focus cases pass the compatibility matrix.
- Hidden-window dictation works without frontend processing callbacks.

## 6. Phase 2 — dependable Apple intelligence and existing modes

**Goal:** ship the intelligence already designed into the app.

Work:

1. Replace semaphore-blocking Swift calls with async completion and cancellation handles. Define request ownership, string/buffer lifetime, exactly-once completion, and late-result disposal across FFI.
2. Return typed errors and fallback reasons. Unchanged text is a valid success and must not be confused with a timeout.
3. Use Foundation Models guided generation (`@Generable`) for list and prompt structures, then validate semantics in application code. Schema correctness alone does not establish factual fidelity.
4. Implement capability checks at operation time as well as in settings; handle disabled Apple Intelligence, unavailable model, language limitations, and changing readiness.
5. Prewarm when appropriate and bound sessions. Keep per-request content isolated; do not accidentally retain one app's selection in another app's prompt.
6. Support clean speech, bullets, and prompt shaping with strict instructions to retain facts, names, numbers, negation, language, and tone. Separate substantial rewriting from light cleanup.
7. Detect suspicious changes to protected tokens as a review signal. Do not pretend heuristics prove semantic equivalence.
8. Keep deterministic fallback and raw recovery. Display which mode ran and when fallback occurred.

UI: a small mode selector, capability explanation, processing/cancel state, original/result toggle, and optional review for substantial rewrites. Ordinary dictation must remain a short interaction.

Acceptance: valid structured output, no malformed output delivered, timeout/cancellation fixtures pass, supported/unsupported hardware paths behave explicitly, and semantic preservation meets Section 12's release gate.

## 7. Phase 3 — first differentiated release

### 3A. Edit selected text by voice

Flow: select text -> invoke Edit shortcut -> speak instruction -> view replacement -> apply or dismiss -> undo if needed.

Implementation:

- Add a bounded context service for focused app, selected text, and selection range when exposed by Accessibility.
- Capture context on invocation. Exclude secure fields and avoid continuous background collection.
- If selection cannot be read, offer an explicit clipboard-based workflow; do not silently read unrelated clipboard content.
- Add a transform operation taking source text and instruction separately.
- Show a compact diff or original/result comparison for substantial edits.
- Revalidate selection and destination before replacing. If changed, show the result without applying it.
- Keep one expiring undo record initially. Restore only when current target content still matches the edit; otherwise offer the original for manual recovery.

Acceptance examples: shorten while preserving dates; change tone without adding promises; translate while preserving names; cancel without touching the selection; recover safely when the user switches apps or edits manually.

### 3B. Spoken ideas to useful LLM prompts

Extend `PromptSpec` to include task, context, constraints, desired output, and unresolved questions. Retain source provenance.

- Extract only what the user supplied; omit empty fields instead of padding with boilerplate.
- Preserve technical names, paths, code identifiers, and explicit “do not” instructions.
- Support user-invoked inclusion of selected text as context.
- Provide concise and structured presentation options, using deterministic rendering.
- Surface material missing information in the preview; do not invent requirements or force a clarification for every short request.
- Deliver to the chosen destination without automatically submitting the prompt.

Acceptance: evaluate prompts by how accurately another reader can recover the original task, not by length. Test short inputs, long rambles, contradictory requirements, embedded instructions, and mixed-language material.

### 3C. Task-oriented UI and first-use success

Implementation surfaces: `src/routes/(app)/+page.svelte`, `setup/+page.svelte`, `_home/`, general settings, and app-local services/query modules. Respect the service -> query -> UI layering; native lifecycle remains Rust-owned.

- Present **Dictate**, **Edit selection**, and **Create prompt** as the main actions. Cleanup and bullets are formatting choices. Keep model names/parameters in advanced settings with an override for experienced users.
- Define one versioned action/mode registry for native configuration, capability checks, shortcuts, and UI. Migrate existing `intent.mode` values without losing saved choices. Show unavailable actions with a reason instead of quietly omitting them.
- Use clear user labels such as “Clean up speech”; internal identifiers need not change for a wording improvement.
- Guide onboarding through microphone access, one sample phrase, result inspection, insertion into a safe test field, and undo/cancel. Check actual device/model/shortcut readiness.
- Request Accessibility in the insertion/editing context and explain its purpose. Offer copy-only where possible if it is unavailable. Core dictation must not be blocked by optional AI availability.
- Make the editing instruction input accept either speech or typed text. Both routes produce the same `TransformRequest` and use the same validation/delivery path.

Acceptance: a new user can complete the guided loop without choosing an engine; a returning user can perform routine dictation without repeated review prompts; old settings map predictably into the new UI.

### 3D. Recording panel, review, and recovery

- Extend the panel states to listening, finishing speech, shaping, awaiting review, and typed delivery outcomes. Display destination/action and microphone readiness; show level/clipping feedback only when useful.
- Provide state-appropriate cancel, copy, retry, review, and recover-original actions. Keep the last result available even when delivery fails.
- Show optional stable partials; mark provisional text distinctly and avoid per-character animation. Never label a keystroke attempt as verified insertion.
- Compare original/replacement for substantive edits. Offer questionable-word alternatives only when supported by recognition evidence; do not invent confidence percentages.
- Avoid frequent success toasts. A recoverable error should explain the next useful action.
- Replace forced history expansion with a scrollable layout bounded by the active display's work area. Persist valid window geometry and recover it after display disconnects.
- Keep audio/transcript retention controls beside history, separate from dictionary and local counter storage.

Native panel spike: evaluate AppKit `NSPanel` with appropriate nonactivating behavior while keeping the Tauri main window. Test whether existing Tauri window controls already satisfy focus requirements before adding a Swift adapter. Status must not steal the destination's focus; interactive review may take focus deliberately, then must revalidate the original target. Test Spaces, full-screen apps, multiple monitors, scaling, and screen edges.

Acceptance: failed delivery is recoverable without re-recording; the panel does not unexpectedly move the text cursor; history fits a small laptop display; keyboard-only users can cancel, review, copy, and recover.

### 3E. Accessibility and interaction alternatives

- Support toggle and hold shortcuts; never require prolonged key holding for the core workflow.
- Add VoiceOver labels and controlled status announcements, visible keyboard focus, readable larger text, and non-color status cues.
- Respect Reduce Motion, Reduce Transparency, and increased contrast. Make sound cues optional and avoid speech announcements being recorded as user input.
- Provide patient pauses and typed correction as first-class options. Preserve the user's tone instead of normalizing every output into formal prose.
- Test with users who need these interaction alternatives. General-purpose ASR performance must not be advertised as support for atypical speech without relevant evaluation.

Acceptance: onboarding, dictation, selection review, and recovery can be completed using keyboard/VoiceOver; motion/contrast preferences are honored; no core action requires precise mouse targeting.

Release boundary: Phase 3 is the first major product enhancement release. Do not make additional engines or workflow automation prerequisites.

## 8. Phase 4 — personalization and conversational revision

### Destination preferences

- Store opt-in profiles by app identifier: default mode, desired brevity, tone, formatting, language, and selected vocabulary set.
- Let explicit session choices override profiles.
- Use user-defined purpose for ambiguous hosts such as browsers; browser identity alone does not identify a website or conversation.
- Defer URL/site-aware profiles until a reliable, bounded context mechanism exists.

### Vocabulary and correction learning

- Add editable local glossary entries with preferred spelling, aliases, optional pronunciation hints, language, and scope.
- Feed relevant vocabulary into recognition only where the engine supports it; otherwise apply carefully bounded correction after recognition.
- Suggest additions after an explicit correction; require an affirmative save rather than collecting every edit.
- Preserve acronyms, product names, and code terms. Avoid broad replacements that alter ordinary words.
- Build mixed-language fixtures before claiming improved English–Hindi or other language performance.
- Separate recognition language, output language, and output script. “Write Hindi in Latin letters” is transliteration; “translate to English” is translation. Preserve mixed-language material by default when the chosen engine supports it.
- Keep an explicit override when automatic language identification is unreliable, particularly on short clips. Use scoped vocabulary as a hint, not a requirement that its entries appear in the transcript.
- Provide export, delete, reset, and clear explanations of storage.

### Follow-up revisions

- Add an explicit “revise last result” shortcut/session mode.
- Resolve commands such as “change Friday to Monday” against the last applicable result and destination.
- Keep a short, bounded revision history; do not use global chat history as default context.
- Reject stale targets and distinguish replacing the prior result from appending a new dictation.
- Support restoring the previous version, including when automatic replacement is unavailable.

Acceptance: preferences are predictable, unrelated apps do not share private context, vocabulary changes are reversible, and ambiguous/stale follow-ups never overwrite unrelated text.

## 9. Phase 5 — native performance and speech quality

Run measurement work alongside earlier phases; change default engines only after comparison.

### Audio and scheduling

- Replace the unbounded writer queue with a bounded design and explicit overflow behavior. Never block a real-time audio callback on disk I/O; surface an error rather than silently dropping samples.
- Propagate sample-write and finalization errors. Test storage exhaustion, device removal, and interrupted capture.
- Inspect stream setup/reuse and cold-start cost; reuse resources only when microphone ownership and power behavior remain correct.
- Keep resampling off the callback; handle devices that cannot capture at 16 kHz. Preserve the existing conversion fallback.
- Keep audio in native buffers or use validated native file references. Avoid round-tripping large numeric arrays through JavaScript; the primary Rust path already avoids this, so prioritize any remaining active paths by measurement.
- Move blocking model loading/file work off the async control path.
- Warm only the selected engine and use memory pressure/idle policy to unload. Do not keep all models resident.
- Verify Parakeet provider placement and compare CPU versus Core ML configurations; accelerator availability alone is not evidence of speed.

### 5A. Linear silence scan and speech-preserving segmentation

Primary surface: `src-tauri/src/transcription/mod.rs`; isolate helpers into an app-local audio-processing module when useful.

1. Implement rolling squared energy: initialize a window sum, then subtract the outgoing squared sample and add the incoming one. Use a stable accumulator, clamp tiny negative rounding artifacts, and define handling for invalid/non-finite samples.
2. Preserve existing threshold/padding semantics in this first change. Compare trim boundaries with the old scan within documented floating-point tolerance. Benchmark silence-heavy clips as well as ordinary speech. Expected algorithmic work becomes O(N) rather than worst-case O(NW), for N samples and W samples/window; measured end-to-end improvement remains to be established.
3. In a separate change, compare adaptive noise estimation plus VAD against the fixed threshold. Estimate background only from likely non-speech frames; do not assume a silent opening.
4. Add hysteresis/minimum consecutive-frame rules for speech entry/exit and retain onset/offset padding. If evidence is uncertain, preserve captured audio rather than erase it.
5. Gate classifier replacement on soft-speech, low-gain, background music/fan, breathing, and word-ending tests. Test atypical speech with relevant participants before claiming support.

Acceptance: no unintended boundary change from the scan optimization; the segmentation experiment reports clipped-word rate, false speech detections, missed speech, and inference avoided. Retain the existing classifier if the new one fails quality gates.

### 5B. Endpointing and thinking pauses

- Push-to-talk ends on release; any tail is explicit, short, and bounded by the recording session.
- Toggle mode stops explicitly by default; automatic finish is an opt-in behavior.
- VAD mode combines speech probability, minimum speech duration, trailing silence, and maximum segment length. Provide short and patient pause profiles with documented effective settings.
- Keep semantic completion experimental and secondary. Plausible text is not enough evidence that the person has finished speaking.
- Give the ready-to-speak cue only once capture is active. Pre-roll is allowed only within a user-started recording session, not through continuous background capture.

Acceptance: deliberate pauses do not prematurely submit or lose words in the pause corpus; measure endpoint latency and premature-stop rate together. Explicit cancel/stop always overrides automatic decisions.

### 5C. Callback buffers, storage, and power

- Introduce a preallocated buffer pool or ring with explicit producer/consumer ownership. Avoid allocation, locks, logging, and disk I/O in the real-time callback where practical.
- Bound capacity using supported sample rate/channel count and an explicit maximum processing delay. Emit overflow errors rather than dropping samples silently; measure callback duration and queue high-water marks.
- Evaluate native in-memory PCM for short sessions, with a bounded spill/recovery strategy for long sessions. Archive audio asynchronously only under user retention settings; do not remove crash recovery by accident.
- Benchmark block serialization in `wav_writer.rs`; its existing `BufWriter` already reduces OS writes. Take the change only if meaningful CPU/allocation savings result.
- Use thermal state, power preferences, and memory pressure to suppress speculative second passes and unnecessary warming before changing recognition quality. Do not silently change language or writing behavior.
- Bound concurrent ASR/generation work so overlapping models do not cause large memory spikes. Log metadata-only scheduling decisions for local diagnosis.

Acceptance: bounded memory under slow storage, no silent audio loss, explicit writer errors, and before/after callback/energy measurements. Unsupported device formats retain a tested conversion path.

### Streaming and Apple SpeechAnalyzer

- Add an engine abstraction with capabilities for partial results, finalization, language coverage, vocabulary, cancellation, and timestamps.
- Prototype SpeechAnalyzer/SpeechTranscriber behind a capability gate on supported macOS versions.
- Compare word error, entity accuracy, code-switch behavior, first partial, finalization latency, energy, and memory against current Whisper/Parakeet.
- For batch engines, evaluate chunking/overlap separately from genuine streaming; measure repetition and boundary loss.
- Align overlapping words/timestamps and commit a stable prefix agreed across successive hypotheses; keep the changing suffix provisional. Use bounded overlap and normalization that preserves proper names and numbers. Simple concatenation is insufficient.
- Compare final chunked output against whole-utterance decoding. Record duplicate phrases, missing boundary words, partial revision rate, and peak memory.
- Show provisional text only in Mynah initially. Commit stable final output once; do not continuously rewrite another app's text field.
- If useful, transform finalized segments while capturing later speech, with bounded context and a final consistency pass. Do not add extra inference if it worsens energy or latency.

### 5D. Selective retry and output fidelity

- Use a fast first pass and retry only difficult segments when the latency/energy budget allows. Candidate signals include speech/no-speech disagreement, repeated text, abnormal output length, and decoder scores where exposed.
- Calibrate signals per engine using the evaluation corpus. Scores are not directly comparable across engines and must not be shown as unvalidated certainty percentages.
- Retry with an alternate decode strategy or a selected available local engine; avoid running two full models on every request.
- Preserve raw text and provenance for the retry. Verify that vocabulary/context has not introduced words unsupported by the audio.
- Protect names, numbers, negations, and code terms through transformations; suspicious changes request review rather than imply guaranteed semantic validation.

Acceptance: lower correction time/entity error without increased invented content or disproportionate energy. Default to the simpler path when the retry policy provides no demonstrated benefit.

### 5E. Native capture and process-boundary experiments

- Compare an AVAudioEngine voice-processing adapter against CPAL using identical devices/tasks, including speaker playback. Measure recognition quality, cold setup, route changes, and power. Keep bypass for soft speech and already processed microphones.
- Keep event-tap callbacks minimal and handle disabled-tap recovery outside the callback. Audit Core Foundation/Objective-C/Swift ownership and asynchronous callback lifetimes.
- Bound Accessibility queries and return timeout/unsupported results; avoid full-tree scraping.
- Add signposted pipeline stages for Instruments; inspect audio callback timing, allocations, hangs, and thermal behavior without logging content.
- Consider an XPC inference helper only if observed native crashes justify isolation. Require a spike covering IPC, cancellation, recovery, packaging, and memory before adoption.

Acceptance: native capture or isolation ships only with reproducible benefit and no regression in supported microphone/focus workflows. These experiments are not prerequisites for the Phase 3 release.

### Delivery and responsiveness

- Measure first visible text separately from clipboard restoration and complete-session time.
- Tune fixed paste waits by application testing. If restoration becomes asynchronous, prevent it from colliding with the next session.
- Keep recording feedback immediate and the UI responsive while models load or execute.

Acceptance: publish reproducible before/after results per supported hardware class; retain the previous engine/default when quality or reliability regresses. No universal latency claim based on a single machine.

## 10. Phase 6 — useful local actions

Build after editing and prompt workflows are stable.

- Add structured draft types: meeting brief, action list, reminder proposal, reusable note.
- Begin with preview/copy/export. Add execution for a small allowlist of clearly defined operations afterward.
- Expose suitable Mynah operations through App Intents for user-created Mac Shortcuts. Validate native target/extension packaging requirements in a spike before selecting the bridge design.
- Use narrowly scoped tool schemas, argument validation, and explicit handling of missing dates, recipients, or destinations.
- Resolve dates against user locale/timezone and show the resolved value before creating an item.
- Confirm externally visible or consequential actions in the product. Never send messages or submit content merely because dictated material contains a command.
- Make side effects idempotent and record a local result so retries do not duplicate items.

Acceptance: malformed or injected instructions cannot call arbitrary tools; draft-only flows remain useful without extra permissions; repeat execution cannot silently duplicate an action.

## 11. Optional technology evaluation tracks

These are evaluations, not mandatory additions or shipping commitments.

| Track | Purpose | Adoption gate |
| --- | --- | --- |
| MLX Swift open-weight model | Improve specific local language or rewriting tasks | Demonstrated quality advantage; model license reviewed; acceptable download/RAM/energy; no mandatory extra runtime; explicit policy update. |
| Newer Apple on-device APIs, including macOS 27 capabilities | Evaluate image context, newer model interfaces, Core AI, and native evaluation tooling | Verify exact SDK/runtime availability and fallback; preserve older supported Macs; benchmark the actual device. |
| Selected screenshot context | Let a user speak about a chosen visual | User-initiated capture only; bounded image/context; screen permission handling; practical advantage over selected text; no continuous screen monitoring. |
| Optional cloud text provider / Apple PCC | Handle work beyond local capacity | Explicit product policy change, user opt-in per configured behavior, visible data destination, cost ownership, secure credential storage, cancellation, and no silent fallback. PCC is remote processing. |

For any cloud experiment, retain local transcription by default and send only the explicitly selected text/context needed. Free app access must not imply free third-party inference. Do not add provider settings until a useful feature justifies them.

Choose one optional local runtime first if the evidence supports adoption. Avoid maintaining several model backends simply for feature parity.

## 12. Validation and release gates

### Correctness gates

- Zero pastes from sessions cancelled before the delivery commit boundary in the automated session-race suite. Cancellation after commit begins must report the actual delivery state and available recovery; it cannot promise to retract an insertion already performed.
- Zero wrong-target replacements in focus/selection-change fixtures.
- No silent paste failure reported as verified success.
- Explicit preferences honored across every trigger.
- No dropped protected names/numbers/negations in the curated must-preserve regression set. This gate applies to fixtures; it is not a guarantee for arbitrary speech.
- Unsupported intelligence paths return a clear fallback and preserve raw text.
- No transcript, audio, or selected content in ordinary operational metrics/logs.

### Quality and performance evaluation

- Start with at least 100 curated text cases and 30 audio clips covering the main workflows; expand where failures cluster. Do not rely solely on generated examples.
- Measure raw recognition separately from transformed-output quality.
- Compare acceptance without edits, factual preservation, intent fidelity, task completion time, cancellation responsiveness, and p50/p95 latency.
- Use a provisional responsiveness budget: visible recording feedback within 150 ms and cancellation acknowledgement within 200 ms on benchmark hardware. These are targets to validate, not measured capabilities or guarantees of immediate compute termination.
- Set release-specific transcription/transformation budgets after Phase 0; report cold and warm values separately.
- Compare against current Mynah and macOS built-in workflows for the actual user task.

### User-validation protocol

- Recruit an exploratory pilot of approximately 12–18 Mac users weighted toward developers/LLM users and multilingual professionals; include participants with different interaction/accessibility needs. This is a planning target, not a representative sample.
- Compare their existing workflow, current Mynah, and the prototype on matched tasks. Counterbalance task/tool order to limit learning effects.
- Tasks: short message, technical prompt containing constraints, selected paragraph revision, mixed-language names/numbers, a thinking pause, and a forced paste/focus recovery scenario.
- Measure full task time including corrections, meaningful requirements preserved, unintended edits, effort ratings, and independent completion. Word-error rate alone does not evaluate usable writing.
- Observe repeat voluntary use over roughly two weeks; ask where users chose not to speak and why. Distinguish novelty from continued usefulness.
- Check understanding of microphone activity, local processing, and retention using concrete questions; distinguish no-training claims from on-device execution.
- Use consented fixtures or user-approved material. Do not record private production text to infer acceptance or retention. Log content-free metrics locally; user research submission is explicit.
- Proceed with a differentiated feature when priority users show task-level benefit without new critical fidelity/recovery failures. Record baseline-relative go/no-go criteria before the pilot, then preserve negative results rather than changing criteria afterward.

### Additional algorithm and UI regression gates

- Rolling-energy equivalence, long-silence complexity benchmark, quiet-word preservation, patient pause behavior, streaming boundary alignment, bounded queues, and calibrated retry policy.
- Small laptop screen, remembered/rescued window geometry, multiple monitors, Spaces/full-screen, keyboard navigation, VoiceOver, reduced motion/transparency, and contrast settings.
- Typed and spoken editing instructions have equivalent validation and destination protections.
- Onboarding completion requires a successful functional test, not merely permission/model selection.

### Compatibility matrix

- Minimum supported macOS and current stable macOS; newer SDK capabilities tested separately.
- Apple silicon with Foundation Models available, disabled, and not ready; Intel only if retained in the supported release matrix.
- Browser text areas/contenteditable, native text editor, document editor, chat app, and terminal with auto-submit disabled.
- Built-in, USB, and Bluetooth microphone; disconnect/reconnect; sleep/wake; long capture; low storage; memory pressure.
- Permission denied/revoked, app replacement/reinstall, hidden windows, rapid triggers, changed focus, clipboard change during processing.

### Checks and commands

From the app root, use `bun run typecheck`, focused `bun test <test-file>` runs, and `bun run build` after confirming scripts and dependencies. From `src-tauri`, use relevant `cargo test` and formatting checks. Add Swift unit/contract tests for the bridge and guided-output handling where supported.

Do not treat mocked router tests as evidence that the native Fn path invokes the router. Add native integration coverage and installed-app manual checks. Do not automatically run `notarize` or website publishing scripts; inspect their side effects and use the established Mac release workflow only for an authorized release.

### Rollout and recovery

- Feature flags: new formatting, voice edit, follow-up revision, speech engine experiment, optional provider.
- Keep raw dictation available if enhanced processing is disabled.
- Version storage migrations and verify existing history/settings remain readable.
- Capture local diagnostics with stage durations and typed failure reasons; export only on user action.
- Run a small Mac pilot before changing defaults. Document regressions, fixes, and rollback settings.
- Verify signed/notarized installation and Accessibility recovery as an app release gate. Website publishing is excluded.

## 13. Multi-agent execution architecture

### 13A. Team structure and authority

Use one coordinator/integrator plus up to three active workers: four concurrent agents total in the current environment. Roles below are specialties that rotate into worker slots, not seven agents to run simultaneously. Do not create separate user-owned tasks merely to delegate implementation.

| Role | Responsibility | Boundary |
| --- | --- | --- |
| Coordinator / integrator | Contracts, shared wiring, dispatch, integration, task ledger, release gates | Owns shared hotspots; does not edit a worker's leased files concurrently |
| Runtime agent | Session controller, cancellation, configuration behavior, scheduling | Native lifecycle and state tests |
| Mac integration agent | Delivery, Accessibility context, pasteboard, native panel/capture experiments | Bounded adapters; no unsolicited permission resets or app replacement |
| Intelligence agent | Deterministic router, async Swift FM bridge, prompt shaping, semantic fidelity | No native lifecycle or UI ownership |
| Audio agent | Segmentation, callback buffers, streaming, inference policy | Audio/engine code; no independent changes to public contracts |
| UI agent | Setup, controls, review/recovery, history, accessibility | Uses native contracts and fixture adapters; no backend business logic |
| Validation agent | Adversarial fixtures, independent regression review, benchmark protocols, pilot materials | Reports defects; assigns fixes to owners instead of rewriting their code |

A task gets one accountable owner and one reviewer. The reviewer must not be the author; the coordinator can review, or rotate a freed worker into a read-only review. Reserve an existing slot for review rather than exceeding the concurrency limit.

### 13B. Interface-first foundation

Task `C0` establishes the minimum executable contract before dependent implementation fans out. It is deliberately earlier than AI, UI, and runtime integration. Keep it small: schemas, adapters/stubs, fixtures, and wiring seams; do not implement all features inside the contract task.

Freeze the following in a versioned app-local contract package/document and record its revision in every dispatch:

1. **Session protocol:** ID, state transition table, event ordering/sequence, exactly one terminal outcome, and which commands are accepted in each state. Define cancellation before commit versus cancellation after insertion has begun; tests must use that boundary rather than promise to retract an already performed paste.
2. **Resource ownership:** the runtime owns capture and pipeline cancellation. Adapters return results; only the delivery service performs insertion. UI and AI never paste independently. Define shutdown and stale-result disposal.
3. **Config/action registry:** action versus formatting mode, deterministic precedence, defaults, version migration, retention policy, and atomic persistence. Decide verbatim versus explicit text-rule behavior here so agents cannot choose conflicting semantics.
4. **Transformation protocol:** source/instruction/context separation, capability result, fallback reason, deadlines, provider provenance, and original/result retention. Define list/prompt structures and schema validation.
5. **Swift FFI:** start/cancel/free entry points, request handle, callback thread/executor, byte encoding, memory owner, exactly-once completion, timeout and late-callback handling. No borrowed pointer may outlive its call.
6. **Delivery/context protocol:** captured app/selection fingerprint, freshness check, bounded reads, commit boundary, typed verification outcome, clipboard ownership, and undo validity.
7. **Audio/engine protocol:** supported sample formats, buffer ownership, backpressure/error policy, batch versus partial results, timestamps, cancellation capability, and scheduling budget. Initial batch adapters must remain usable without streaming.
8. **UI/telemetry protocol:** native status events, action availability, recovery commands, metadata-only stage metrics, and accessible announcements. Fixtures must include unavailable FM, cancellation, unchanged text, and failed/unverified delivery.

Proposed seams, not pre-existing files: `src-tauri/src/contracts/`, `src/lib/contracts/`, app-local contract fixtures, and separate native delivery/context/router modules. Prefer generating bindings from one source; if that is impractical, run round-trip fixture checks across Rust/TypeScript/Swift. C0 chooses actual paths and exact field types and publishes them before workers begin.

C0 acceptance: contract fixtures pass, the app still builds on the baseline host, existing behavior is reachable through compatibility adapters, and consumers can implement against stubs without inventing fields. A stub is development scaffolding; production must not present simulated success.

### 13C. File ownership and conflict prevention

All paths below are relative to this app. At dispatch, replace directory hints with an exact write allowlist in the ledger. Read access is unrestricted within task scope. Unlisted writes need a coordinator ownership update, not another user's confirmation for routine in-scope work.

| Surface | Default single writer |
| --- | --- |
| `src-tauri/src/lib.rs`, command registration, bootstrap/state wiring | Coordinator |
| `src-tauri/src/runtime_config.rs`, `src/lib/state/runtime-config-bridge.ts`, `src/lib/workspace/definition.ts`, settings migrations | Coordinator; workers submit contract-backed patches/requests |
| `src-tauri/Cargo.toml`, lockfiles, `build.rs`, `tauri.conf.json`, Swift `Package.swift`, app package manifest | Coordinator |
| Canonical contracts, generated bindings, feature registry, event names | Coordinator; generated files never independently edited |
| State machine, dictation manager/runtime, App Nap lifecycle | Runtime task with exclusive lease |
| New native delivery/context/window modules | Mac integration task with exclusive lease |
| Native router/transform modules, FM bridge and FM Swift sources | Intelligence task with exclusive lease |
| Recorder, WAV writer, transcription modules, vendor engine changes | Audio task with exclusive lease |
| Home/setup/settings/review components and dedicated query adapters | UI task with exclusive lease |
| `src/lib/query/actions.ts`, recording pipeline listeners, shared runtime state | Coordinator until explicit lease; these connect UI and native execution |
| Fixture harness and task-specific regression tests | Author for module-local tests; validation agent for independent suites in distinct files |
| Main plan, knowledge record, canonical task ledger | Coordinator |

Initial extraction from `lib.rs`, `transcription/mod.rs`, and shared Svelte files happens in C0 or a serialized integration step. Two agents must not both refactor a monolithic file to create their own seams. Likewise, native panel and FM work may own separate Swift source directories, but package/build registration remains coordinator-owned.

Dependency changes use a short request specifying package, purpose, platform guards, and license/source considerations. The coordinator applies them sequentially and regenerates lockfiles once. Do not edit shared packages or the website to avoid an app-local integration problem.

### 13D. Workspace strategy and baseline preservation

Prefer isolated worktrees/checkouts when available. Each worker receives the same accepted base revision plus its task ID. If the user's current work is uncommitted, BOOT records it and establishes an agreed snapshot/patch for workers; never omit it silently, reset it, or commit unrelated changes as a convenience.

If worktree setup is unavailable, use the shared workspace with exclusive file leases. Git checkout/reset/clean operations are not safe coordination tools in that mode. The coordinator alone performs integration/version-control mutations and dependency installation. Workers report a scoped diff rather than committing each other's live changes.

Builds that produce generated metadata or touch shared output directories also need isolation or a build lease. Separate `CARGO_TARGET_DIR`/other output paths where feasible. All runtime benchmarks, microphone/clipboard tests, GUI automation, permission dialogs, and installed-app checks use one exclusive **Mac validation lease**. Parallel workloads must not contaminate latency or thermal measurements or fight for focus.

No task may replace the installed app, reset TCC permissions, or publish an artifact as part of a routine unit test. Use isolated test identities and approved test fixtures where possible. User-facing system changes follow the actual task authorization; do not add blanket approval pauses to routine repository edits.

### 13E. Parallel schedule and integration gates

The catalog lists hard dependencies; waves are a recommended slot allocation. `Reviewed` work is not an accepted dependency until integrated or included in the exact shared base. Never bypass a failed gate by validating a different branch.

| Stage | Coordinator's work | Up to three worker assignments | Gate/result |
| --- | --- | --- | --- |
| Baseline | `BOOT`, preserve state and allocate files | `B-NATIVE`, `B-UI`, `B-EVAL` | Known failures, host capability, fixtures, scope |
| Contracts | `C0`, schema/seam decisions | Read-only reviews of runtime, Swift, and UI contracts as needed | Versioned interfaces and passing compatibility baseline |
| Foundation fan-out | Integrate small reviewed units; handle shared wiring | `RUNTIME`, `DELIVERY`, `INTENT` | `G-CORE`: native lifecycle, settings, deterministic routing, truthful delivery |
| Enhanced fan-out | Apply shared config/package changes | `FM`, `UI-BASE`, `A-RMS` | Reviewable AI/UI/audio modules; no required ordering among these three |
| Enhanced gate | `G-ENHANCED` integration | `V-ENHANCED`; use other slots only for nonconflicting ready tasks | Real Fn-to-formatting flow plus fallbacks verified |
| Feature fan-out | Preserve contracts, connect reviewed modules | `MAC-EDIT`, `PROMPT`, `UI-EDIT` | Modules implement selection/edit/prompt against agreed interfaces |
| First feature release | `G-FEATURE` integration and release-candidate assembly | `V-FEATURE`; optional `A-BUFFER` and pilot preparation if conflict-free | Verified editing, prompt shaping, onboarding/accessibility and recovery |
| Personalization | Version contracts/storage when needed | `PERSONAL`, `UI-PERSONAL`, `A-BUFFER` or `A-POWER` | `FOLLOWUP`, then `G-PERSONAL` after review |
| Audio enhancements | Shared engine/capture wiring and serialized benchmarks | Choose up to three ready nonconflicting tasks from `A-VAD`, `A-POWER`, `A-STREAM`, `A-RETRY`, `X-SPEECH`, `X-CAPTURE` | `G-AUDIO`; keep experiments independently switchable |
| Local actions / later options | Contract updates and adoption decisions | `DRAFTS`, then ready `APP-INTENTS` / `UI-ACTIONS`, or one gated model/vision experiment | `G-ACTIONS` / per-experiment evidence; not first-release prerequisites |

Important concurrency limits:

- `A-RMS`, `A-BUFFER`, and later audio tasks are separate deliverables. The coordinator may parallelize them only when exact file leases are disjoint; otherwise serialize or extract a seam first.
- `UI-BASE`, `UI-EDIT`, and `UI-PERSONAL` usually touch overlapping screens and run serially. The UI agent may design future views against fixtures while waiting, but that does not count as integrated behavior.
- `MAC-EDIT` and `UI-EDIT` may run concurrently after C0 defines context, preview, apply, undo, and typed-instruction contracts. Their integration belongs to G-FEATURE.
- FM bridge work does not depend on a completed deterministic router. It depends on C0 and the compatible Swift build baseline. Slot scheduling may place it later, but that is not a hard technical dependency.
- Personalization data/services do not depend on prompt generation; their shipping integration does depend on the relevant reviewed UI/config consumers.
- Pilot recruitment/materials must not block core engineering. Agents prepare materials; contacting participants requires explicit messaging authorization. Hardware or participant evidence that is unavailable is recorded as unverified and may block a release claim, not unrelated code work.

### 13F. Task lifecycle, dispatch, and handoff

Coordinator creates `docs/product/agent-work/STATUS.md` at BOOT; it is not prepopulated with invented progress. Record: task ID, state, owner/reviewer, base revision, contract revision, file lease, dependencies, branch/worktree or diff identity, validation evidence, integration revision, blockers, and next action.

States: `Planned -> Ready -> Running -> Review -> Integrated -> Verified`. `Blocked` records a specific unmet dependency/resource; `Deferred` records an intentionally postponed experiment. Mark a task Ready only when dependencies and file/hardware leases permit it. A completed worker response moves to Review, not automatically to Verified.

Use this dispatch template for every worker:

```text
Task ID and role:
Objective and linked requirement sections:
Accepted base / contract revision:
Inputs and accepted dependency artifacts:
Exact files/directories you may write:
Shared files you must not write:
Required behavior and edge cases:
Validation commands/fixtures and available hardware:
Expected deliverables and completion criteria:
Out of scope:
Reviewer and coordinator contact:
Return a scoped diff, results, integration requests, and limitations.
Do not dispatch further agents unless the coordinator allocates a slot.
```

Each worker hands off a task-specific report under `docs/product/agent-work/<TASK-ID>.md`, or an equivalent returned report that the coordinator saves. Include changed files, behavior, tests with actual outcomes, unrun checks, contract deviations, migration/rollback notes, and exact shared-wiring requests. Do not duplicate the canonical ledger or edit the main plan independently.

If an interface is wrong, submit a contract change request listing producers/consumers, migration effect, and fixtures. The coordinator pauses only affected tasks, updates the contract and adapters, then gives consumers a new accepted base. Never let each agent add an incompatible workaround.

### 13G. Review, integration, and recovery protocol

1. Author runs focused module tests and reports baseline failures separately.
2. Reviewer checks the diff against requirements and contracts, including adversarial fixtures and scope boundaries. Tests that merely mirror the implementation are insufficient.
3. Coordinator integrates onto the current accepted base, resolves shared wiring, and runs the relevant cross-language contract/type/build checks. If the base changed, rerun affected checks rather than relying on a stale result.
4. Validation role tests the composed native path. In particular, mocked router/FM success is not proof that Fn dictation invokes it.
5. Mark the named gate Verified only when its exact integrated artifact meets Section 12. Record unavailable hardware/UI evidence separately; never infer it from a build.
6. On regression, disable/revert only the feature/task change that caused it while preserving unrelated user and agent work. Keep successful raw dictation available. A conflict is not permission to overwrite another owner's change.

G-CORE requires cancellation/commit-boundary races, all-trigger settings behavior, App Nap cleanup, and typed delivery outcomes. G-ENHANCED adds real FM invocation, unavailable/timeout/unchanged cases, and raw fallback. G-FEATURE adds target freshness, safe apply/undo, typed/voice instruction parity, prompt fidelity, accessible setup/recovery, and installed-app compatibility. Later gates carry the corresponding Phase 4–6 and performance acceptance criteria.

A release gate and permission to distribute are different. Verification prepares a reviewable release; signing/notarization and publication follow the requested app release scope. Website publishing remains excluded.

### 13H. First implementation dispatch

**2026-09-19 execution update:** For resumed work, follow [multi-agent execution plan revision 2](MULTI_AGENT_EXECUTION_PLAN_V2.md). It starts by revalidating the existing changes, adds mandatory observability and quality/performance evidence, and qualifies the provisional budgets in Section 13I. The original first-dispatch sequence below is historical context.

When the user requests implementation:

1. Coordinator executes BOOT and allocates three bounded baseline tasks.
2. Integrate baseline findings, then execute C0 with specialist reviews.
3. Launch RUNTIME, DELIVERY, and INTENT against C0. Their owners must not all edit `lib.rs` or `runtime_config.rs`.
4. Integrate G-CORE; fill freed slots from Ready tasks (FM/UI-BASE/A-RMS), respecting the lease rules.
5. Continue toward G-FEATURE. Do not start optional model/vision/XPC investigations merely because an agent is idle; it can review, test, or improve fixtures instead.

Calendar estimates follow the baseline and native spikes. Multi-agent work reduces independent implementation time; it does not remove sequential contract/integration decisions or physical Mac testing.

### 13I. Base-Mac performance and observability gate

The supported baseline is a base Apple Silicon MacBook Air with 8–16 GB unified memory, on battery, with ordinary background activity. The app must be evaluated against this baseline even when implementation is performed on a faster Mac. The default runtime uses an automatic Efficient/Balanced/Quality policy; Efficient is the safe fallback when memory, battery, thermal, or model-load signals exceed budget.

Every release runs a deterministic replay corpus of short recordings and records cold and warm results for model load, audio finalization, preprocessing, transcription, transformation, delivery, and total stop-to-result latency. Initial budgets are: recording feedback under 100 ms, warm 10-second transcription under 2 seconds, cold transcription under 5 seconds, delivery under 250 ms, no UI task over 100 ms, and bounded memory growth. These are release targets to measure and revise with evidence, not assumptions about chip-relative performance.

The observability packet is mandatory for all runtime work. Events carry schema version, opaque session ID, stage, trigger, engine/model, language, duration, status, stable error code, memory/thermal/power context, and dropped-frame counts where relevant. Raw audio, transcript text, clipboard contents, prompts, focused-window titles, and selection contents are excluded by default. The app keeps a bounded local aggregate and supports an explicit redacted diagnostics export. Opt-in device reports may contribute chip family, memory size, macOS version, and stage timings for cross-device validation.

When physical M4/M3 hardware is unavailable, the coordinator uses the M5 for deterministic replay and constrained Efficient-profile tests, then records the missing hardware evidence explicitly. Simulator results cannot substitute for thermal, memory-bandwidth, Neural Engine, or microphone behavior. A small volunteer or hosted-Mac sample is required before claiming cross-chip performance validation.

## 14. Deliberate exclusions

- Windows port, website changes, and unrelated repository refactors.
- Full SwiftUI rewrite or replacing Rust with a REST service for local processing.
- Mandatory cloud accounts, always-on screen capture, unrestricted computer-control agent, or automatic message sending.
- Meeting recording/diarization as a separate product, cross-device sync, billing, or updater implementation in this plan.
- Removing Whisper/Parakeet merely because a newer model exists.

## 15. References and future-session handoff

Source-review findings were accepted in the project conversation. This document is the forward implementation plan; historical docs remain historical until reconciled in Phase 0.

Official technical references checked during the preceding review; recheck API availability when implementing:

- [Apple SpeechAnalyzer](https://developer.apple.com/videos/play/wwdc2025/277/)
- [Foundation Models guided generation](https://developer.apple.com/documentation/foundationmodels/generating-swift-data-structures-with-guided-generation)
- [Foundation Models WWDC26 updates](https://developer.apple.com/videos/play/wwdc2026/241/)
- [Core AI integration](https://developer.apple.com/videos/play/wwdc2026/326/)
- [MLX Swift LM](https://github.com/ml-explore/mlx-swift-lm)
- [App Intents for Shortcuts and Spotlight](https://developer.apple.com/videos/play/wwdc2025/260/)
- [Accessibility attribute access](https://developer.apple.com/documentation/applicationservices/1462085-axuielementcopyattributevalue)
- [Apple NSPanel](https://developer.apple.com/documentation/appkit/nspanel)
- [Apple voice processing](https://developer.apple.com/documentation/avfaudio/using-voice-processing)
- [Apple thermal state](https://developer.apple.com/documentation/foundation/processinfo/thermalstate-swift.property)
- [whisper.cpp and VAD](https://github.com/ggml-org/whisper.cpp)

Product/research references supporting the opportunity analysis, checked during the preceding research turn:

- [Wispr Flow features](https://wisprflow.ai/) and [context controls](https://docs.wisprflow.ai/articles/4678293671-Context-Awareness): existing styles, dictionary, and contextual dictation capabilities.
- [Superwhisper modes](https://superwhisper.com/docs/modes/modes): existing context-aware voice processing.
- [Microsoft Fluid Dictation](https://support.microsoft.com/en-US/accessibility/windows/voice-access/fluid-dictation): OS-level cleanup as competitive context; Windows remains excluded.
- [UK speech-technology trust study](https://wp.lancs.ac.uk/factor/files/2025/10/Williams-2026-Public-perceptions-of-speech-technology-trust-in-the-United-Kingdom.pdf): trust across speech scenarios, not Mac adoption or global market size.
- [ASR/LLM dysarthric-speech research](https://arxiv.org/abs/2508.08027): motivation for inclusive evaluation, not proof of Mynah capability.

Start implementation with `BOOT` and the baseline tasks in the task catalog. Read app `AGENTS.md`, preserve current user changes, and keep the work within the app. The coordinator records the integrated revision, completed gates, unresolved failures, and next ready tasks. Completion requires integrated evidence, not an agent's isolated success report.
