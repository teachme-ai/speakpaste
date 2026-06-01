# whisper.cpp Engine Notes

Status: technical baseline
Date: 2026-06-01

## What It Is

`whisper.cpp` is a plain C/C++ implementation for running OpenAI Whisper automatic speech recognition models locally.

It is not the original OpenAI Python/PyTorch implementation. It is an independent high-performance inference implementation designed to be embedded into local apps.

Source: https://github.com/ggml-org/whisper.cpp

## Why It Matters

For this product, `whisper.cpp` matters because it is:

- Local-first.
- Offline.
- Embeddable.
- Dependency-light.
- Cross-platform.
- Proven in many wrappers and desktop apps.
- Optimized for Mac Intel and Apple silicon.
- Compatible with GGML model files.
- Available through Rust wrappers already used by this repo.

## Why It Is A De Facto Standard

It is not an official industry standard, but it is a de facto local ASR standard because it solves the hard packaging problem:

- No Python runtime.
- No PyTorch dependency.
- No cloud API dependency.
- Supports CPU-only inference.
- Supports quantized model formats.
- Supports multiple hardware backends.
- Exposes a C-style API.

The upstream README lists optimizations and backends including ARM NEON, Accelerate, Metal, Core ML, AVX, Vulkan, CUDA, ROCm, OpenVINO, and CPU-only inference.

## Current Repo Usage

The app currently uses `transcribe-rs`, which depends on `whisper-rs`, which wraps `whisper.cpp`.

Relevant files:

- `apps/speakpaste/src-tauri/Cargo.toml`
- `apps/speakpaste/src-tauri/Cargo.lock`
- `apps/speakpaste/src-tauri/src/transcription/model_manager.rs`
- `apps/speakpaste/src-tauri/src/transcription/mod.rs`
- `apps/speakpaste/src/lib/services/transcription/local/whispercpp.ts`

Current model presets:

- `tiny.en`
- `base.en`
- `small.en`

These are GGML model files compatible with `whisper.cpp`.

## Why It Is Core To The Product

The local-only product promise needs a reliable local speech-to-text engine that works without cloud infrastructure.

`whisper.cpp` is currently the safest core engine because:

- It already works in the app.
- It supports Intel Macs better than Apple-only frameworks.
- It gives the app control over local model files.
- It aligns with the sovereign data promise.
- It can be benchmarked and profiled locally.

## Alternatives

### WhisperKit

Apple silicon-focused Swift/Core ML speech recognition stack.

Strengths:

- Mac-native direction.
- Apple silicon optimized.
- Good future premium path.

Limitations:

- Not a great Intel Mac story.
- Requires Swift integration work.
- More Apple-platform-specific than `whisper.cpp`.

### Parakeet

Already present in the app.

Strengths:

- Potentially fast local English transcription.
- Useful as a hardware profile option.

Limitations:

- Less general than Whisper.
- Needs benchmarking in the app's actual workflow.

### Moonshine

Already present in the app.

Strengths:

- Small.
- Fast.
- Useful for low-resource local mode.

Limitations:

- English-focused.
- Not a full Whisper replacement.

### Apple Speech

Potential Apple-native fallback.

Strengths:

- Native framework.
- Simple integration for some cases.

Limitations:

- Less control over model behavior.
- Availability and behavior are Apple-managed.
- Not the current core path.

## Optimization Posture

Do not fork or rewrite `whisper.cpp` in the 24-48 hour pivot.

The right near-term optimization is to improve how the app uses the engine:

- Measure local stage timings.
- Keep loaded models warm.
- Use hardware profiles.
- Pick better defaults per machine.
- Verify actual Metal/Core ML usage before making claims.
- Benchmark Parakeet and Moonshine against Whisper in the same app path.
- Improve audio conversion and sample preparation.

## Questions To Verify

- Is the current Rust wrapper build enabling Metal on Apple silicon?
- Is Core ML enabled or only available upstream?
- What are actual latencies for `tiny.en`, `base.en`, and `small.en` on target machines?
- What is the model load penalty after cold start?
- Does keeping the model loaded for five minutes feel right?
- Is audio conversion or decoding the current bottleneck?

## Product Position

`whisper.cpp` is not the moat by itself.

The moat is:

- Local engine packaging.
- Hardware-aware model selection.
- Reliable cursor delivery.
- Local intent routing.
- Local analytics.
- Mac-native context.

Keep `whisper.cpp` stable. Build the differentiated product layer around it.
