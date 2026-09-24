# Mynah multi-agent implementation plan — revision 2

Date: 2026-09-19
Status: planning complete; implementation paused until resumed by the user.

## 1. Authority and intended outcome

This document controls the next execution sequence and evidence requirements. It supersedes the restart instructions in main-plan Section 13H, qualifies Section 13I, and supersedes optimistic completion labels in the historical status ledger. The [main implementation plan](MAC_APP_IMPLEMENTATION_PLAN.md) retains the product requirements; the [task catalog](MULTI_AGENT_TASK_CATALOG.md) retains the broader feature backlog.

Deliver reliable local dictation with predictable responsiveness on lower-resource supported Macs, useful optional intelligence, recoverable output, and enough local diagnostic evidence to explain failures and quantify improvements. Scope is `apps/speakpaste` only. No Windows, website, publication, or mandatory cloud dependency.

The developer has an M5 and cannot test every chip. M5 measurements and constrained runs establish regression evidence on that machine; they do not establish M4/M3 performance. External device evidence is a separate gate for hardware-specific claims, not a prerequisite for all engineering work.

## 2. Team and coordination

Use one coordinator and up to three workers. Roles rotate between packets; they are not permanent separate teams.

| Role | Responsibility | Restrictions |
| --- | --- | --- |
| Coordinator | Accepted base, contracts, exact file leases, shared wiring, integration, ledger and dispatch | Does not mark work verified from worker claims alone |
| Native worker | Runtime, delivery, Swift bridge, model lifecycle | One owned subsystem at a time; no shared entrypoint edits without lease transfer |
| Audio/performance worker | Audio correctness, replay harness, resource measurement and optimizations | No performance benchmarks while other workers run heavy builds/inference |
| UI/diagnostics worker | Recovery UI, listener lifecycle, diagnostics/export and accessibility | Business logic stays in service/query layers; no direct native delivery implementation |

After author handoff, another worker reviews it. No worker counts its own review as independent validation. Reuse idle agents with follow-up assignments. If capacity is unavailable, the coordinator continues a non-conflicting packet or sequences work; capacity limits do not justify ending an authorized implementation run after one small edit.

At dispatch, freeze an exact commit plus preserved dirty-diff inventory, contract revision, file allowlist, dependencies, and reviewer. Use isolated checkouts when useful or exclusive file leases in the shared workspace. Never overwrite unrelated work to obtain a clean tree.

Coordinator owns `src-tauri/src/lib.rs`, `runtime_config.rs`, `src/lib/contracts/`, workspace settings schemas, build configuration, canonical docs, and integration registration. Workers request edits to these through a handoff; temporary exclusive lease transfer is allowed. Cargo/Swift builds and physical-device benchmarks each have a single shared-resource lease.

States: Planned → Ready → Running → Review → Integrated → Verified. Integrated means composed source; Verified requires the packet's specific tests. Use Blocked for a named unmet dependency. Historical passing `cargo check` results are compilation evidence, not linked-build or installed-app validation.

## 3. Execution sequence

### Wave 0 — Establish what actually works

Coordinator packet `R0`: snapshot checkout and installed app identities, outstanding diffs, selected SDK/compiler, available test commands and existing failures. Preserve previous work. No clean/rebuild deletion unless required and scoped. Then run these three read-only reviews in parallel:

| ID | Scope and deliverable | Acceptance |
| --- | --- | --- |
| R1 Runtime/delivery review | State machine, manager, runtime, delivery helpers, native triggers and clipboard path. Identify cancellation after modifier press, task-abort cleanup, stale completion, split runtime state, finalization-error cleanup, auto-paste-off recovery and ignored delivery status. | Each concern has source references, a reproduction/test proposal, severity and a bounded repair packet; compile success is not accepted as lifecycle proof. |
| R2 Audio review | Review new prefix-sum/threshold changes against the original behavior. Check numerical precision on long clips, final partial window, all-silence behavior, quiet speech, clipping, non-finite samples, format/channel assumptions and memory allocation. | Separate O(N) optimization from changed speech detection. Identify rollback/feature-off baseline and fixtures before adapting thresholds. |
| R3 UI/build/observability review | Listener acquisition/release including failed asynchronous setup, caller teardown, mic cancellation and last-result handling; actual log destinations/rotation and content exposure; debug fallback behavior and linked build gaps. | Inventory existing events and missing timings, stale tests, frontend/native path differences, build identity and test coverage. |

`G0`: coordinator incorporates reports, corrects status claims and orders repairs. Earlier RUNTIME/DELIVERY/UI-RECOVERY/AUDIO-ENDPOINT entries require revalidation; no automatic promotion to Verified.

### Wave 1 — Freeze measurable contracts and repair foundations

`C1` (coordinator, requires G0): extend existing contracts with session ID, event sequence, stage, terminal outcome, trigger, settings snapshot identity, capability status and delivery commit semantics. Define backward-compatible UI adapters and schema migration fixtures. Decide where original/result text lives for recovery; it must not live in logs. Define metric units, aggregation windows, errors and unsupported values before producers start.

| ID | Requires | Exclusive worker scope | Required work and proof |
| --- | --- | --- | --- |
| O1 Diagnostics core | C1 | Proposed `src-tauri/src/observability/` and module tests | Typed event API, monotonic spans, bounded aggregate/event retention, local logging adapter and snapshot schema. Verify percentiles, error denominators, capacity eviction, concurrency, redaction and missing-value behavior. Coordinator registers commands. |
| N1 Runtime/delivery repairs | C1 | State machine, manager, runtime and delivery module; shared wiring requested | Restore one authoritative session lifecycle. Handle cancellation cooperatively around commit, always release synthetic keys, finish required clipboard cleanup, reject stale results and retain copyable output when auto-paste is off. Test cancellation at every boundary, failed stop/close, channel failure, focus change and multiple triggers. |
| A1 Audio correctness and replay | C1 | Proposed app-local benchmark/fixture directories and audio helper extracted under a lease | Establish licensed/synthetic/consented corpus and old/new replay comparisons. Repair numerical/sample handling and retain a known baseline. Test silence, quiet onset/end, long clips, varied gain, sample formats/rates and partial windows. No adaptive threshold adoption without quality evidence. |

Use O1 mocks while it is being authored; C1 is the shared interface. This permits parallel work without making runtime repair depend on diagnostics implementation. Integration of all three occurs at G1.

`G1`: independent review and coordinator integration; native tests and a linked build with the real Swift bridge. A debug stub build cannot satisfy this gate. Record unsupported OS/hardware tests explicitly.

### Wave 2 — Instrument the real paths and make recovery usable

| ID | Requires | Scope | Required work and proof |
| --- | --- | --- | --- |
| O2 Native instrumentation | G1 | Runtime, model manager, transcription, recorder and delivery call sites under one native lease | Instrument actual Fn/UI/global-shortcut routes: start/stop, finalization, conversion, model queue/load/inference, delivery/cleanup and terminal outcomes. Counters collect in callbacks; emit summaries outside audio callbacks. Verify correlated traces for success, error, cancellation, skipped stages and model cold/warm behavior. |
| U1 UI recovery and diagnostics | G1 | Recording query/listener, home recovery components, proposed diagnostics service/view | Fix real listener lifecycle with deferred/rejected subscription tests. Show original/result and Copy for undelivered text; truthful attempted/failed statuses. Add local summary and explicit sanitized export with sample count/window/context. Test keyboard operation, async teardown, export redaction and no focus stealing. |
| I1 Intent/FM repairs | G1 | Intent module, Rust FM bridge and Swift package sources | Connect existing deterministic fixtures to native routing; preserve verbatim mode, opt-in spoken overrides and text-rule precedence. Replace blocking shared-result timeout bridge with owned async request/cancel/complete lifecycle. Test late callback disposal, timeout, unavailable and unchanged output separately. Coordinator owns config/schema wiring. |

O2 and I1 do not both edit the state machine: I1 hands off adapters; coordinator wires them after O2 releases its lease. Transform spans are integrated using O1 and the accepted I1 adapter. No dependency on a visible frontend window for native transformations.

`G2`: one integrated session trace across triggers, visible recovery for auto-paste off/failure, faithful transformations, bounded overhead and no transcript/clipboard/audio/selection content in diagnostics. UI listener tests must exercise the listener changes; existing intent-router tests do not substitute for them.

### Wave 3 — Optimize from measurements

Run baseline benchmarks first with exclusive machine use, then three bounded packets:

| ID | Requires | Scope | Required work and proof |
| --- | --- | --- | --- |
| P1 Model/resource policy | G2 | Model manager and proposed resource policy module | Measure cold/warm behavior and memory budget. Implement cancellable prewarm and pressure-aware residency without repeated unload/reload churn. Preserve explicit engine/model/action choices. Bound concurrency; expose actual backend where observable, otherwise unknown. Compare on/off startup, memory, latency and accuracy. |
| P2 Capture/preprocess cost | G2 | Recorder, WAV writer and audio helpers | Bounded queues, propagated disk/channel errors, dropped-frame counts, conversion only when needed. Evaluate bounded in-memory short clips with explicit spill/recovery behavior. Separate behavior-preserving scan optimization from optional VAD changes. Compare accuracy, latency, memory peak and drop rate. |
| P3 Delivery/UI latency | G2 | Delivery module and narrowly assigned UI files | Measure fixed delays and reduce them only with clipboard/focus/keyboard evidence. A successful key event does not verify insertion. Test slow target apps, changed clipboard/focus and cancel-after-commit cleanup. Measure input feedback and UI responsiveness independently of inference. |

`G3`: adopt each optimization independently when it improves a measured bottleneck without unacceptable accuracy/recovery/resource regression. Reject or disable changes that fail comparison. No compulsory generative stage for plain dictation. Efficient mode reduces speculative work first; it never silently changes an explicit user action or deletes a requested transformation.

### Wave 4 — Validate, then return to the feature backlog

| ID | Requires | Deliverable |
| --- | --- | --- |
| V1 Independent correctness | G3 | Composed all-trigger, cancellation/commit, recorder failure, FM lifetime, recovery, accessibility and migration suite on exact revision. |
| V2 Exclusive performance run | G3 | Repeatable M5 baseline/candidate report, cold/warm separation, quality scores and constrained-run label. No simultaneous heavy agent activity. |
| V3 Device evidence workflow | G2 | User-triggered local report export, reproducible volunteer protocol and report comparison tooling. Contacting users/uploading diagnostics needs explicit authorization. Actual other-device results remain pending until available. |
| G4 Coordinator release readiness | V1, V2, V3 tooling | Linked release artifact, installed smoke test, feature-off rollback checks and transparent evidence matrix. Distribution is a separate action. No M4-specific performance claim without representative M4 evidence. |

After G4, resume original catalog packets UI-BASE, MAC-EDIT, PROMPT/UI-EDIT, personalization and later native experiments according to their dependencies. Map accepted I1 work into INTENT/FM and G-CORE/G-ENHANCED requirements individually; completion of this sequence does not automatically complete those broader gates.

## 4. Logging and performance requirements for every packet

- Stable versioned events; session ID and sequence allow ordered correlation across Rust/Swift/UI. Pair wall-clock timestamps for exports with monotonic durations for performance.
- Stage outcomes distinguish completed, skipped, unavailable, failed, cancelled-before-commit and post-commit outcome. One terminal event per accepted session. Aborted spans must not masquerade as completed timings.
- Record queue wait, model load, preprocessing, inference, transformation, delivery and cleanup separately. Define stop-to-transcript and stop-to-result explicitly; full session time includes user speech and is a different metric.
- Record audio duration, real-time factor (inference duration/audio duration), input/output sizes with explicit units, frame drops, capability/backend, cold/warm state, trigger and bounded model/config identifiers.
- Context includes build identity, OS, chip/architecture, RAM, power and thermal state when available. Missing data is unknown, never zero/healthy. No full model paths or device/user names.
- Aggregate count, failure denominator, p50/p95/p99 and window. Low sample counts are displayed; tail estimates from small samples are labelled unreliable. Use bounded memory and rotating local files with configurable documented limits, clear/delete, retention and export behavior.
- Use stable error codes and severity; scrub free-form dependency errors before persistence. Do not hash transcript content for correlation; opaque IDs suffice. No raw audio, prompts, transcript, clipboard, selection, window title or secrets. Exports use an allowlist, not regex-only redaction.
- No network analytics by default. No synchronous log serialization, file writes or locks on the realtime audio callback. Rate-limit repeated failures and record suppressed counts. Measure diagnostics on/off overhead; logging failure must not break recording.
- Metrics are acceptance evidence, not automatic quality scores. WER/CER, entity preservation and omitted-word counts need reference transcripts. Task fidelity and speech retention must accompany speed measurements.

## 5. Benchmark and acceptance protocol

1. Capture artifact/model checksum, settings, backend, OS, hardware, battery/power, thermal state and diagnostics version. Compare identical audio/settings on old and new artifacts.
2. Corpus covers short commands, 5–30 second dictation, longer speech, pauses, quiet voice, noise, silence, mixed languages and names/numbers. Synthetic fixtures test mechanisms; real consented speech supports quality conclusions.
3. Define cold application/model initialization separately from filesystem-cache-cold state. Do not purge system caches to manufacture cold tests. Warm runs follow a documented warmup; interleave baseline/candidate runs to reduce drift.
4. Collect at least 30 warm repetitions per selected performance case and 5 cold launches as an initial protocol. Report raw counts and variability; do not claim reliable p99 from 30 samples. Increase sample size for tail-latency claims.
5. Initial product aspirations: recording feedback below 100 ms, warm 10-second transcription below 2 s, cold below 5 s, delivery below 250 ms. These are provisional budgets, not established support guarantees. Freeze regression tolerances and quality limits after baseline collection; document deviations rather than quietly changing targets.
6. Efficient-profile and injected memory/queue pressure tests on M5 prove behavior under those constraints only. A linked build or hosted CI run does not prove live microphone, thermal or cross-chip responsiveness.
7. Distinguish release readiness on tested hardware from broad hardware performance claims. Shipping claims must match evidence. Without volunteers, continue regression prevention and conservative defaults while documenting the unmeasured hardware matrix.

## 6. Worker assignment and handoff template

Every assignment includes:

```text
Packet ID / objective:
Accepted revision + dirty-diff inventory / contract revision:
Required inputs and dependency evidence:
Exact owned files (and coordinator-owned exclusions):
Behavior, failure cases, log events and metric definitions:
Unit/integration/manual checks and resource lease:
Independent reviewer:
Deliver: scoped diff, test results, measurement report, integration requests,
privacy review, rollback/feature-off behavior and unresolved limitations.
Do not mark verified based on compilation alone.
```

Coordinator integrates each finished packet, runs the relevant checks and dispatches the next Ready packet without waiting for another user prompt while implementation is authorized. Stop immediately on a user stop request. This planning request itself does not restart application implementation.
