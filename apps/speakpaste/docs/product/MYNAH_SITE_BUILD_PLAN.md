# Mynah Site Build Plan

## Purpose

This document is the implementation plan for creating the new Mynah website at:

`https://mynah.site`

The site must replace the old SpeakPaste positioning with the current Mynah product truth: a Mac-first, local-first, private voice-to-cursor utility.

No website copy should imply cloud transcription, account requirements, subscription credits, or broad AI workflow automation unless those capabilities are present and intentionally exposed in the current product.

---

## 1. Product Truth To Anchor The Site

### Product name

Mynah

### Domain

`mynah.site`

### One-line definition

Mynah is a private voice-to-cursor app for Mac.

### Core loop

`Hold Fn -> speak -> release -> transcribe locally -> paste at cursor`

### Primary promise

Mynah lets Mac users speak into the app they are already using without sending their voice workflow to a cloud service.

### Product posture

- Mac-first
- local-first
- menu-bar native
- no account required
- no cloud required for core dictation
- transparent about permissions and local engines
- designed around a minimal daily reflex, not a complex transcription workbench

---

## 2. Current Public Website Context

### Old SpeakPaste site

The old `speakpaste.online` site has useful structure but outdated positioning.

Useful pieces to retain:

- simple hero
- direct download call-to-action
- three-step workflow
- comparison/positioning thinking
- install and permissions guidance
- open-source attribution

Pieces to rewrite or remove:

- SpeakPaste naming
- `speakpaste.online` domain language
- cloud-provider language
- broad pipeline/AI workflow claims as primary value
- anything implying the product is mainly a transformation workbench
- old feature claims not present in the current app surface

### Competitor-style observations

Search currently surfaces a competitor-style `speakpaste.com` page more clearly than a dictation product at `speedpaste.com`.

The observed selling pattern:

- "3-5x faster than typing"
- one hotkey
- speak naturally
- text appears instantly
- AI transcription
- tone customization
- multilingual support
- privacy-first claim
- session history
- pricing/credits
- install steps and FAQ

What Mynah should borrow:

- very clear hero
- immediate download CTA
- simple three-step explanation
- permission/install clarity
- FAQ format
- outcome-focused benefits instead of implementation-heavy language

What Mynah should avoid:

- generic "AI dictation" positioning
- overclaiming perfect formatting
- credit/subscription framing
- cloud-style trust language
- leading with tone rewriting or AI refinement
- implying transcript/audio privacy without explaining the actual local architecture

---

## 3. Mynah Website Differentiators

These are the features the website should highlight because they reflect the actual app direction.

### A. Private voice-to-cursor

The primary story is not file transcription. It is speaking text directly into the active cursor.

Recommended copy angle:

> Hold Fn, speak, release. Mynah places the transcript where you were already writing.

### B. Local-first transcription

Core transcription runs locally on the Mac through local engines and local model files.

Recommended copy angle:

> Your dictation loop does not need a cloud service or account.

### C. Fn-key native workflow

The primary trigger is the Mac `Fn` key, with a fallback shortcut available.

Recommended copy angle:

> Built around a Mac gesture, not a generic hotkey maze.

### D. Menu-bar background runtime

Mynah is meant to run from the menu bar and continue working when the main window is hidden.

Recommended copy angle:

> The window is optional. The utility stays available.

### E. Clipboard-respectful paste

Mynah supports configurable clipboard behavior so the app does not blindly overwrite user clipboard content.

Recommended copy angle:

> Paste at the cursor while keeping control of what happens to your clipboard.

### F. Local diagnostics

Diagnostics are stored locally and are focused on runtime health, timings, permissions, and support.

Recommended copy angle:

> Local diagnostics help troubleshoot performance without logging your words.

### G. Hardware-aware local performance

The app exposes simple local performance profiles instead of confusing users with CPAL/FFmpeg/Navigator internals.

Recommended copy angle:

> Choose a local profile that fits your Mac: balanced, faster on basic Macs, or higher accuracy on Apple Silicon.

### H. Transparent technology and credits

Mynah should openly credit the engines, frameworks, and open-source lineage used.

Recommended copy angle:

> The local stack is disclosed because trust should not be hidden behind marketing.

---

## 4. Features To Present On The Site

### Primary homepage features

- Hold `Fn` to dictate
- Release to transcribe and paste
- Works in active Mac text fields
- Menu-bar utility behavior
- Local engines and local model files
- No account required
- No cloud required for core dictation
- Clipboard behavior controls
- Local capture history with retention controls
- Local diagnostics and support bundle
- Build/version accountability
- macOS Accessibility and Microphone guidance

### Secondary/supporting features

- fallback shortcut
- sound cues
- launch at login
- window priority / bring window forward
- output language setting
- local performance profiles
- open recordings/captures folder
- clear local history
- local technology disclosure

### Features to mention carefully

- local text rules / transformations
- advanced capture history
- experimental local engines
- future discreet/whisper mode research

These should not dominate the homepage until they are polished, tested, and part of the main product story.

---

## 5. Proposed Site Map

### `/`

Homepage and product story.

Sections:

1. hero
2. core loop
3. why Mynah feels native on Mac
4. local-first privacy
5. engines and performance
6. clipboard and cursor behavior
7. install CTA
8. FAQ preview

### `/download`

Release and installer page.

Content:

- current version
- release/build number
- architecture
- macOS requirement
- DMG download button
- checksum, if available
- GitHub releases link
- install steps
- known permission notes

### `/support/permissions`

Microphone, Accessibility, and reinstall guidance.

Content:

- why Mynah needs Microphone
- why Mynah needs Accessibility
- how to approve permissions
- what to do after renaming from SpeakPaste to Mynah
- stale permission entry guidance
- why `/Applications/Mynah.app` matters

### `/privacy`

Local-only and sovereign-data explanation.

Content:

- what never leaves the Mac
- what may be kept locally
- what diagnostics contain
- what diagnostics never contain
- capture retention explanation
- no account requirement

### `/credits`

Technology and attribution.

Content:

- Tauri
- Rust
- Svelte/Bun
- whisper.cpp
- local model engine disclosures
- upstream/open-source attribution
- license notes

### `/changelog`

Optional but recommended.

Content:

- visible release number
- app version
- notable fixes
- download links
- permission or migration notes

---

## 6. Homepage Section Plan

### Hero

Recommended H1:

> Private voice-to-cursor for Mac.

Alternative H1:

> Hold Fn. Speak. Paste.

Recommended supporting copy:

> Mynah is a local-first Mac menu-bar app that turns speech into text at your active cursor. Hold Fn, speak naturally, release, and your words appear where you were already writing.

Hero trust strip:

- Local-first
- No account
- No cloud required
- Menu-bar native
- Apple Silicon ready

Primary CTA:

> Download for macOS

Secondary CTA:

> Read setup guide

### Core Loop

Title:

> One gesture. One flow.

Cards:

1. Hold Fn
2. Speak naturally
3. Release to paste

### Mac-Native Utility

Title:

> Built around the way Mac users actually work.

Cards:

- Menu-bar runtime
- Works with the active cursor
- Background-safe operation
- One fallback shortcut
- Clear system permissions

### Local Control

Title:

> Your voice should stay on your Mac.

Table:

| Area | Mynah stance |
| --- | --- |
| Voice audio | Processed locally for core dictation |
| Transcript text | Kept local unless you paste/copy it elsewhere |
| Diagnostics | Local runtime health only |
| Account | Not required |
| Cloud | Not required for core dictation |

### Engine And Performance

Title:

> Choose a local setup that fits your Mac.

Cards:

- Whisper C++
- Moonshine
- Parakeet
- Local performance profiles

### Clipboard Respect

Title:

> Cursor typing without treating your clipboard as disposable.

Explain:

- paste at active cursor
- configurable clipboard behavior
- user remains in control when clipboard already has external content

### Install CTA

Title:

> Install Mynah in minutes.

Steps:

1. Download DMG
2. Drag Mynah to Applications
3. Grant Microphone
4. Grant Accessibility
5. Hold Fn and speak

---

## 7. Visual Direction

The site should feel aligned with the Mynah app rather than the old SpeakPaste identity.

### Brand elements

- use the Mynah icon prominently in the hero
- keep the product name visible beside the icon
- use icon as favicon and social preview mark
- include app screenshots, not generic illustrations

### Tone

- calm
- private
- Mac-native
- precise
- premium but not loud

### Avoid

- generic gradient SaaS hero
- fake AI abstraction graphics
- oversized "3x faster" claims as the only message
- dark-only palette if the app is moving to system-aware light/dark
- dense comparison tables on the first viewport

---

## 8. Technical Implementation Plan

### Recommended website stack

Use a small static website rather than a heavy application.

Recommended options:

1. Astro
2. Vite + Svelte
3. plain HTML/CSS/JS

Recommendation:

Use **Astro** if starting fresh because it is excellent for static marketing pages, clean routing, SEO, and low maintenance.

Use **plain Vite/Svelte** if we want to reuse UI thinking from the app without pulling in a full app shell.

### Suggested repository

Create a new GitHub repository:

`mynah-site`

Alternative:

`mynah-website`

### Suggested local path

`/Users/irfan/projects/Mynah/website`

### Deployment

Use Vercel.

Configuration:

- production branch: `main`
- domain: `mynah.site`
- redirect `www.mynah.site` to `mynah.site`
- keep build static
- do not require server-side runtime

### Download artifact strategy

Preferred:

- app DMGs are attached to GitHub Releases
- site download button links to the current release asset

Recommended metadata file:

`/public/downloads.json`

Fields:

```json
{
  "version": "0.1.1",
  "release": 133,
  "macosMinimum": "11.0",
  "artifacts": [
    {
      "arch": "apple-silicon",
      "label": "Apple Silicon",
      "filename": "Mynah_0.1.1_aarch64.dmg",
      "url": "https://github.com/teachme-ai/mynah/releases/download/v0.1.1/Mynah_0.1.1_aarch64.dmg",
      "sha256": ""
    }
  ]
}
```

Future:

- add Intel or universal build when validated
- add auto-update metadata only when that feature is back in scope

---

## 9. GitHub And Vercel Setup Checklist

### GitHub

- create `mynah-site`
- add initial static site code
- add `README.md`
- add `.gitignore`
- add license if needed
- push to `main`
- create first release after site is stable

### Vercel

- import GitHub repo
- set framework preset based on chosen stack
- attach `mynah.site`
- configure `www` redirect
- verify production deployment
- enable preview deployments for pull requests

### Domain/DNS

- point `mynah.site` to Vercel
- configure `www`
- verify SSL
- confirm canonical URL

### Old site migration

After Mynah site is live:

- add banner to old SpeakPaste site: "SpeakPaste is now Mynah"
- optionally redirect `speakpaste.online` to `mynah.site`
- keep one migration page for old permission/app-name guidance

---

## 10. SEO And Metadata

### Homepage title

`Mynah - Private Voice-to-Cursor for Mac`

### Homepage description

`Mynah is a local-first Mac dictation app. Hold Fn, speak naturally, and paste text into the active cursor without requiring a cloud account.`

### Keywords to naturally include

- Mac dictation app
- local dictation for macOS
- voice-to-text Mac
- offline transcription Mac
- voice-to-cursor
- private dictation app
- whisper.cpp Mac dictation

### Open Graph

- title: `Mynah - Private Voice-to-Cursor for Mac`
- description: same as above
- image: Mynah branded preview with icon and app screenshot
- url: `https://mynah.site`

---

## 11. Content Accuracy Rules

Do not publish claims that are not true in the current app.

### Allowed claims

- local-first
- no account required
- no cloud required for core dictation
- menu-bar Mac app
- Fn key dictation
- paste at active cursor
- local engines and model files
- local diagnostics
- transparent technology disclosures

### Avoid unless separately validated

- real-time streaming transcription
- whisper/discreet mode
- cloud sync
- team accounts
- auto-updater
- perfect punctuation
- all-language accuracy claims
- Intel performance guarantees
- no clipboard use at all
- App Store availability

---

## 12. First Build Sequence

1. Create the static website scaffold in `/Users/irfan/projects/Mynah/website`.
2. Add Mynah icon and favicon assets.
3. Build homepage only.
4. Add download page.
5. Add permissions/support page.
6. Add privacy and credits pages.
7. Add `downloads.json`.
8. Run local preview.
9. Push to new GitHub repository.
10. Connect to Vercel.
11. Point `mynah.site`.
12. Validate mobile, desktop, SEO metadata, and download links.

---

## 13. Open Questions Before Build

These should be answered before final publishing, but they do not block the first static build.

1. What is the final GitHub organization/user for `mynah-site`?
2. Should `mynah.site/download` link to GitHub Releases or a Vercel-hosted static file?
3. Is the first public DMG Apple Silicon only, or do we hold the Intel claim until validated?
4. Do we keep `speakpaste.online` as a redirect or a migration landing page?
5. What support email should the site show?
6. Should pricing be omitted entirely for the first release?

---

## 14. Recommended Immediate Next Step

Build the first static version of the Mynah site with:

- homepage
- download page
- permissions page
- privacy page
- credits page

Do not start with pricing, comparison tables, or complex animations.

The first version should win on clarity:

> Mynah is a private Mac utility. Hold Fn, speak, release, and your words appear at the cursor. No account. No cloud required. Built for local control.
