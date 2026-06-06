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
- one-time lifetime license
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

### Pricing context

The public dictation category is moving in two directions:

1. cloud-first products that charge subscriptions because inference, sync, and cross-platform services create recurring vendor costs
2. local-first Mac utilities that can justify one-time pricing because the user supplies the hardware and the core runtime is on-device

Mynah belongs in the second category.

The website should not apologize for charging. It should explain the bargain clearly:

> Pay once for a private Mac utility. Use it for life on your Mac. Mynah's core dictation work runs locally on hardware you already own.

Do not position the lifetime license as "cheap." Position it as **ownership**, **clarity**, and **no recurring rent for a local utility**.

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

### I. One-time lifetime license

Mynah should have a dedicated pricing message because the model is part of the product philosophy.

Recommended copy angle:

> One payment. Lifetime use. No subscription meter for a local Mac utility.

Supporting points:

- the core runtime uses local compute on the user's Mac
- the app does not need per-minute cloud transcription costs for core dictation
- the user gets ongoing compatibility updates for major macOS releases where practical
- the license should fund careful Mac engineering, permissions reliability, release packaging, diagnostics, and support
- future optional paid major upgrades can remain a business decision, but the current public promise should be precise

Recommended wording:

> Mynah is sold as a one-time lifetime license for the current Mac app. The goal is simple: no monthly subscription for a local dictation utility that runs on your own Mac.

Avoid:

- "free forever"
- "all future major versions forever" unless legally and operationally intended
- "lifetime updates" if the intended promise is lifetime use plus compatibility maintenance
- attacking subscription competitors directly

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
- One-time lifetime license

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

- one-time lifetime license statement
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

### `/pricing`

Optional for the first launch, recommended once the purchase flow is ready.

Content:

- one-time lifetime license
- what is included
- what is local
- what does not require a subscription
- upgrade/support policy
- refund policy
- supported macOS range

If pricing is simple, this can be a section on `/download` instead of a standalone page.

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
- One-time license

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

### Lifetime License Section

Title:

> Pay once for the Mac utility.

Supporting copy:

> Mynah is built as a local app, not a cloud transcription meter. Buy a lifetime license once and keep using the Mac app without a monthly subscription.

Suggested bullets:

- one-time lifetime use license
- no account required for the core local dictation loop
- no recurring cloud transcription fee for core use
- maintained for major macOS releases where practical
- transparent release and build numbers

CTA:

> Buy Mynah

Secondary link:

> Download and try setup

### Comparison Section

Title:

> Different from cloud dictation subscriptions.

The comparison table should be compact and factual. Do not use a large adversarial table in the first viewport.

Recommended columns:

| Dimension | Mynah | Cloud dictation subscriptions | Built-in macOS Dictation |
| --- | --- | --- | --- |
| Pricing | One-time lifetime license | Usually monthly or annual | Included with macOS |
| Core processing | Local on Mac | Often cloud/server-assisted | Apple system service |
| Account | Not required for core use | Often required | Apple/macOS account context |
| Trigger | Hold Fn, release to paste | Hotkey/app dependent | System dictation trigger |
| Cursor output | Yes | Yes | Yes |
| Clipboard controls | Configurable | Varies | Limited |
| Local diagnostics | Yes | Varies | No product-level diagnostics |
| Technology disclosure | Explicit local stack | Varies | Apple system implementation |
| Best for | Private Mac voice-to-cursor | Cross-platform AI polish/sync | Built-in occasional dictation |

Add footnote:

> Competitor features and pricing change frequently. This table focuses on product architecture and purchase model, not temporary promotions.

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
- aggressive anti-competitor copy

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

### License and purchase strategy

The site should support a one-time lifetime license model.

Recommended public promise:

> One-time lifetime license for Mynah's Mac app.

Recommended detail:

- lifetime use of the purchased Mac app
- compatibility updates for major macOS releases where practical
- no recurring subscription for the core local dictation loop
- license applies to personal use on the user's Macs, subject to final license terms
- future major paid editions should not be promised away unless this is an intentional business decision

Recommended website placement:

- hero trust strip: "One-time license"
- homepage pricing section
- `/download` purchase panel
- FAQ answer: "Is Mynah a subscription?"

Suggested FAQ:

**Is Mynah a subscription?**

No. Mynah is planned as a one-time lifetime license for the Mac app. The core dictation loop runs locally on your Mac, so the product is not priced like a cloud transcription meter.

**Will I get updates?**

The license should include ongoing maintenance and compatibility updates for major macOS releases where practical. Be precise in the final legal terms before publishing.

**Why charge for a local app?**

Mynah is paid software because the value is in the Mac engineering: native background runtime, permissions reliability, local model support, diagnostics, packaging, testing, and release maintenance.

---

## 9. Runtime Competitor Benchmark Plan

Mynah should be benchmarked against competitors in a repeatable, evidence-based way. The goal is not to claim "we are better" broadly. The goal is to understand exactly where Mynah wins, where it is comparable, and where cloud-first tools have advantages.

### Primary comparison target

Use Wispr Flow-style competitors as the reference class:

- polished commercial dictation
- subscription pricing
- cloud/server-assisted AI features
- cross-platform or sync-oriented value proposition

### Benchmark principles

- test on the same Mac
- test the same utterances
- test the same target apps
- test warm and cold states
- test foreground and hidden-window behavior where applicable
- record numbers, not impressions
- separate privacy/security architecture from speed/accuracy results

### Measured dimensions

| Dimension | What to measure | Mynah method | Competitor method |
| --- | --- | --- | --- |
| Idle memory | RAM while app is open but not recording | Activity Monitor / `ps` / Instruments | same |
| Recording CPU | CPU while actively listening | Activity Monitor / `powermetrics` | same |
| Transcription CPU | CPU spike after release | Activity Monitor / Instruments | same |
| End-to-end latency | release key to final text visible | screen recording timestamps | same |
| Cold start | launch to first usable dictation | stopwatch/screen recording | same |
| Hidden-window reliability | trigger and paste with UI hidden | manual runbook | equivalent supported mode |
| Paste success | text appears in target field | manual corpus | same |
| Accuracy | WER on fixed corpus | benchmark corpus | same |
| Hallucination rate | extra trailing words after silence | benchmark corpus | same |
| Network activity | whether dictation requires network | Little Snitch / LuLu / tcpdump | same |
| Disk footprint | installed app size and local model size | Finder / `du` | same |
| Permission surface | required macOS permissions | System Settings | same |
| Data handling clarity | what leaves device | product docs + network observation | product docs + network observation |
| Pricing over 3 years | total user cost | license price | subscription/lifetime public price |

### Recommended tools

- Activity Monitor for quick RAM and CPU checks
- Xcode Instruments / `xcrun xctrace` for CPU and memory traces
- `powermetrics` for energy/thermal checks
- `sample` or `spindump` for runtime stalls
- `du -sh /Applications/Mynah.app` for bundle size
- `ps -axo pid,comm,rss,%cpu` for repeatable process snapshots
- Little Snitch, LuLu, or `tcpdump` for network activity observation
- screen recording for latency timing
- the existing Mynah benchmark corpus for utterance consistency

### Suggested manual benchmark set

Run each app through the same six scenarios:

1. quiet room, short phrase
2. quiet room, long paragraph
3. office noise, medium phrase
4. HVAC/fan tail, short phrase
5. hidden-window paste into Notes
6. paste into browser text field or chat input

For each scenario record:

- transcript result
- pasted successfully: yes/no
- latency estimate
- memory before/after
- peak CPU
- whether any network connection occurred
- extra trailing words
- user-visible friction

### Public-use rule

Only publish benchmark claims that are:

- repeatable
- dated
- tied to a named hardware profile
- tied to a named app version
- careful about competitor version changes

Recommended public wording:

> We benchmark Mynah against leading dictation apps on latency, memory, local processing, paste reliability, and permission friction. Results are published only when they are repeatable on named Mac hardware.

Do not publish:

- vague "faster than Wispr" claims
- screenshots of competitor internals
- security accusations based only on rumor
- network claims without measurement

---

## 10. Revised Public Comparison Strategy

The old comparison table from `speakpaste.online` should be replaced.

### New comparison purpose

The table should help users understand purchase model, local architecture, and product fit.

It should not try to prove that Mynah has every feature competitors have.

### Recommended comparison categories

Compare Mynah against:

1. cloud-first dictation subscriptions
2. local power-user dictation apps
3. built-in macOS Dictation
4. file transcription tools

### Recommended dimensions

- one-time license vs subscription
- local core transcription
- no account required
- Mac menu-bar utility
- active cursor paste
- Fn-key workflow
- local diagnostics
- clipboard behavior controls
- local model choice
- cross-platform sync
- AI rewriting/tone automation
- enterprise/team controls

### Honest positioning

Mynah should openly say:

- it is not trying to be a cross-platform dictation suite
- it is not primarily a cloud AI rewriting product
- it is not a file transcription workbench
- it is a focused Mac utility for private voice-to-cursor use

This honesty is a moat. Users tired of bloated subscription tools will understand the trade-off quickly.

---

## 11. GitHub And Vercel Setup Checklist

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

## 12. SEO And Metadata

### Homepage title

`Mynah - Private Voice-to-Cursor for Mac`

### Homepage description

`Mynah is a local-first Mac dictation app. Hold Fn, speak naturally, and paste text into the active cursor without requiring a cloud account or monthly subscription.`

### Keywords to naturally include

- Mac dictation app
- local dictation for macOS
- voice-to-text Mac
- offline transcription Mac
- voice-to-cursor
- private dictation app
- whisper.cpp Mac dictation
- one-time Mac dictation app
- lifetime dictation app for Mac

### Open Graph

- title: `Mynah - Private Voice-to-Cursor for Mac`
- description: same as above
- image: Mynah branded preview with icon and app screenshot
- url: `https://mynah.site`

---

## 13. Content Accuracy Rules

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
- one-time lifetime license, once purchase terms are final

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
- all future major upgrades included forever

---

## 14. First Build Sequence

1. Create the static website scaffold in `/Users/irfan/projects/Mynah/website`.
2. Add Mynah icon and favicon assets.
3. Build homepage only.
4. Add download page.
5. Add permissions/support page.
6. Add privacy and credits pages.
7. Add pricing/lifetime license section or page.
8. Add `downloads.json`.
9. Run local preview.
10. Push to new GitHub repository.
11. Connect to Vercel.
12. Point `mynah.site`.
13. Validate mobile, desktop, SEO metadata, and download links.

---

## 15. Open Questions Before Build

These should be answered before final publishing, but they do not block the first static build.

1. What is the final GitHub organization/user for `mynah-site`?
2. Should `mynah.site/download` link to GitHub Releases or a Vercel-hosted static file?
3. Is the first public DMG Apple Silicon only, or do we hold the Intel claim until validated?
4. Do we keep `speakpaste.online` as a redirect or a migration landing page?
5. What support email should the site show?
6. What is the exact one-time lifetime license price?
7. Does the license cover one user across multiple personal Macs?
8. What is the exact upgrade promise for future major versions?
9. What payment provider will be used?
10. Should the first public comparison mention named competitors or use category labels only?

---

## 16. Recommended Immediate Next Step

Build the first static version of the Mynah site with:

- homepage
- download page
- permissions page
- privacy page
- credits page
- pricing/lifetime license section

Do not start with pricing, comparison tables, or complex animations.

The first version should win on clarity:

> Mynah is a private Mac utility. Hold Fn, speak, release, and your words appear at the cursor. No account. No cloud required. One-time license. Built for local control.
