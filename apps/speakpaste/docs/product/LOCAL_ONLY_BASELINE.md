# Local-Only Baseline

Status: baseline decision
Date: 2026-06-01

## Product Thesis

Mynah is moving toward a sovereign Mac language layer:

> Speak naturally, shape locally, keep everything on your Mac.

The app should help users turn speech into useful text, prompts, replies, notes, edits, and commands without sending audio, transcript text, usage data, corrections, or private context to cloud systems.

## Non-Negotiables

- No cloud transcription.
- No cloud LLM rewrite.
- No remote agent runtime.
- No remote analytics or telemetry.
- No hidden remote fallback.
- No third-party local LLM bundle such as Ollama, LM Studio, llama.cpp, or bundled GGUF language models for text generation.
- No auto-updater work in the current phase.
- No hidden product features. If a capability is unavailable, the app explains why.
- Any technology or framework used by the app is acknowledged in the product.

## Allowed Local Capabilities

- Local speech recognition engines already present in the app, including whisper.cpp, Parakeet, and Moonshine.
- Apple Natural Language for local language detection, tokenization, entity detection, lexical tagging, and lightweight classification.
- Apple Foundation Models only when available through Apple Intelligence and only as an on-device Apple framework.
- Apple Accessibility APIs for active app, focused element, and selected text context when the user grants permission.
- Local files, local database, local app state, local diagnostics, and local analytics.

## Foundation Models Boundary

Apple Foundation Models are allowed because they are part of the Apple OS ecosystem and run on-device when Apple Intelligence is available and enabled.

Important caveat: Foundation Models are still language models. If a future product decision says "no language model of any kind," Foundation Models must also be disabled and replaced with rules, templates, Apple Natural Language, dictionaries, and deterministic classifiers.

## Supported Intelligence Tiers

### Tier 1: Universal Local

Works on Intel and Apple silicon Macs where the current local transcription path runs.

Capabilities:

- Local transcription.
- Deterministic intent routing.
- Rules and templates.
- Apple Natural Language, when available.
- Local history.
- Local analytics.
- Local vocabulary.

### Tier 2: Apple Intelligence Enhanced

Works only when Apple Foundation Models are available at runtime.

Capabilities:

- Local text refinement.
- Local summarization.
- Local entity extraction.
- Structured local output.
- Guided local writing modes.

The app must check runtime availability rather than assume support based only on chip or OS.

## Machine Coverage

Foundation Models coverage follows Apple Intelligence availability. Practically, this means:

- Apple silicon Macs with supported OS, language, region, storage, and Apple Intelligence enabled can use the enhanced tier.
- Intel Macs cannot use the Foundation Models tier.
- Apple silicon Macs with Apple Intelligence disabled or unavailable fall back to Tier 1.
- Older macOS versions fall back to Tier 1.

The app should always keep the core dictation path working independently of Foundation Models.

## Remove Or Transfer

Remove from the user-facing product surface:

- Cloud transcription providers.
- Cloud completion providers.
- API key settings for remote services.
- Remote base URL fields, except a future clearly labeled local-only developer mode for localhost.
- External analytics provider settings.
- Remote-provider pricing and model descriptions.

Transfer value into local equivalents:

- Cloud transformations become local Writing Modes or Local Actions.
- Provider selection becomes Hardware Profile and Local Engine selection.
- External analytics becomes a private local dashboard.
- Prompt fields become local vocabulary, local style, and local mode controls.

## Privacy Boundary

By default, the app must not store:

- Raw audio longer than the user's selected retention setting.
- Raw transcript analytics.
- Selected text analytics.
- Private app content.
- Remote telemetry events.

The app may store local-only operational metrics:

- Session count.
- Recording duration.
- Model load time.
- Transcription latency.
- Intent routing latency.
- Paste result.
- Local mode used.
- Approximate word count.
- App category, not private content.

## Product Language

Use phrases like:

- "Local-only"
- "On your Mac"
- "Private by design"
- "Sovereign data"
- "No cloud fallback"
- "Your words never leave your Mac"

Avoid phrases like:

- "AI-powered" without qualification.
- "Cloud rescue"
- "Secure updater"
- "Enterprise telemetry"
- "Magic automation"

## Source References

- Apple Foundation Models: https://developer.apple.com/documentation/foundationmodels/
- Apple Natural Language: https://developer.apple.com/documentation/naturallanguage
- Apple Intelligence on Mac: https://support.apple.com/guide/mac-help/intro-to-apple-intelligence-mchl46361784/mac
- whisper.cpp: https://github.com/ggml-org/whisper.cpp
- WhisperKit: https://github.com/argmaxinc/WhisperKit
