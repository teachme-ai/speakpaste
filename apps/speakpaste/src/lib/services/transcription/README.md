# Transcription Services

This directory contains on-device transcription implementations only.

The active engines are:

- `whispercpp` for the default local speech-to-text path.
- `parakeet` for local NVIDIA/NeMo-family experiments when available.

Do not add providers that send audio to external services from this layer. The product baseline is sovereign voice typing: audio, transcripts, settings, and usage intelligence stay on the user's Mac.

Model acquisition should be explicit and visible to the user. If a model needs to be downloaded or manually placed, surface that through local model settings and do not hide the source, format, or framework being used.
