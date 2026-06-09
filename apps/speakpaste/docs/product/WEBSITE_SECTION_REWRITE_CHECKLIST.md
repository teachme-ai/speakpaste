# Mynah Website Section Rewrite Checklist

## Purpose

This checklist turns the alignment brief into a practical rewrite plan for `mynah.site`.

Use it when editing the website so each section moves toward the current product truth.

---

## Global Checks

- [ ] Replace old broad platform language with Mac-first language.
- [ ] Replace cloud-first or cloud-optional claims with local-first claims.
- [ ] Remove provider lists from the homepage.
- [ ] Remove CPAL, FFmpeg, Browser API, VAD, and recording-backend jargon from user-facing marketing sections.
- [ ] Foreground `Release N` wherever version metadata appears.
- [ ] Keep `Version 0.1.1` as the product-line version, not the only visible build identity.
- [ ] Make architecture labels match the actual downloadable artifact.
- [ ] Keep upstream credits, but move them lower in the page or onto a credits page.

---

## Navigation

### Current issue

Navigation includes broad docs-style anchors.

### Rewrite target

- [ ] Use `Product`
- [ ] Use `How it works`
- [ ] Use `Privacy`
- [ ] Use `Download`
- [ ] Use `Support`
- [ ] Avoid leading with `Comparison`, `Pipelines`, or broad `Docs`.

---

## Hero

### Current issue

The hero says too many things at once, including cloud and transform language.

### Rewrite target

- [ ] H1 uses `Press Fn. Speak. Paste.` or `Private voice typing for your Mac`.
- [ ] Supporting copy explains menu-bar local dictation.
- [ ] Remove `transform the result`.
- [ ] Remove `Cloud APIs are optional`.
- [ ] Add proof points: local engines, menu-bar runtime, cursor paste, local diagnostics.
- [ ] Download CTA shows `Version {version} · Release {release}`.

---

## USP Strip

### Current issue

It still mentions workflow pipelines and Whispering foundation as top-level positioning.

### Rewrite target

- [ ] Private: on-device transcription.
- [ ] Fast: Fn-to-cursor dictation.
- [ ] Reliable: works from the menu bar.
- [ ] Local control: diagnostics and captures stay on your Mac.
- [ ] Move upstream foundation mention to credits/footer.

---

## How It Works

### Current issue

Mostly correct, but still includes cloud choices.

### Rewrite target

- [ ] Step 1: Hold Fn.
- [ ] Step 2: Speak naturally.
- [ ] Step 3: Release to paste.
- [ ] Mention the window does not need to stay open.
- [ ] Remove optional cloud provider language.

---

## Features Grid

### Current issue

Some cards still describe the older broad product.

### Rewrite target cards

- [ ] Fn-key dictation
- [ ] Local engines
- [ ] Works in any Mac app
- [ ] Menu-bar runtime
- [ ] Permission recovery
- [ ] Local diagnostics
- [ ] Hardware-aware performance profiles

### Remove or rewrite cards

- [ ] Replace `Voice-To-Workflow Pipelines`.
- [ ] Replace `Local Or Cloud, Your Choice`.
- [ ] Reconsider `No Subscription, Ever` unless this is a permanent pricing policy.

---

## Workflow / Use Cases

### Current issue

The current copy makes Mynah sound like a workflow automation product.

### Rewrite target

- [ ] Messages and chat replies.
- [ ] Email drafting.
- [ ] Notes and journaling.
- [ ] Code comments and commit notes.
- [ ] Prompt writing and personal knowledge capture.
- [ ] Mention Text Rules only as optional advanced local cleanup.

---

## Privacy Section

### Current issue

It still frames cloud providers as part of the normal story.

### Rewrite target

- [ ] Voice audio: processed on device for local dictation.
- [ ] Transcript text: stays local unless the user pastes/copies it elsewhere.
- [ ] Diagnostics: local only.
- [ ] Account: not required.
- [ ] Cloud dependency: none for the core product.
- [ ] Explicitly say diagnostics should not include transcript text or raw audio.

---

## Engine / Hardware Section

### Current issue

The current site talks about too many engines/providers.

### Rewrite target

- [ ] Show active local engines only: Whisper C++, Parakeet, Moonshine.
- [ ] Explain performance profiles in user language.
- [ ] Mention Intel/basic Mac and Apple Silicon profiles.
- [ ] Avoid implying Apple Foundation Models are currently part of transcription.

---

## Foundation / Attribution

### Current issue

The website gives too much top-level identity to the upstream foundation.

### Rewrite target

- [ ] Keep attribution.
- [ ] Move full attribution to Credits page.
- [ ] Keep a short footer line.
- [ ] Remove large homepage comparison emphasis unless a separate comparison page is intentionally maintained.

---

## Docs / Support

### Current issue

Docs still describe old surfaces: cloud setup, capture engines, broad modes, transformations.

### Rewrite target

- [ ] Install from DMG.
- [ ] Move to Applications.
- [ ] Grant Microphone.
- [ ] Grant Accessibility.
- [ ] Use Fn trigger.
- [ ] Choose local engine/model.
- [ ] Review local diagnostics.
- [ ] Troubleshoot stale Accessibility permission.
- [ ] Mention Text Rules only as advanced.

---

## Download

### Current issue

Artifact language is inconsistent.

### Rewrite target

- [ ] Download button and download card point to the same artifact.
- [ ] Architecture label is exact.
- [ ] Minimum macOS version is exact.
- [ ] Release number is visible.
- [ ] File size is accurate.
- [ ] Install steps mention Applications, Microphone, and Accessibility.

---

## Final Acceptance Checklist

- [ ] Homepage no longer reads like a cloud/transformation platform.
- [ ] Homepage no longer exposes capture-engine jargon.
- [ ] Homepage centers the Fn-to-cursor loop.
- [ ] Download metadata is consistent and traceable.
- [ ] Support page covers macOS permissions and stale Accessibility recovery.
- [ ] Credits page acknowledges upstream work clearly.
- [ ] Website language matches the current app surface.

