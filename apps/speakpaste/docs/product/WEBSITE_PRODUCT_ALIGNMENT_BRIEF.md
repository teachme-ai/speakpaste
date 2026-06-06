# Mynah Product Inventory and Website Alignment Brief

## Purpose

This document does two things:

1. captures the current, real product surface of Mynah as it exists in the app today
2. identifies what should change on `mynah.online` so the website matches the product we are actually shipping

This is the source brief to use when rewriting the website.

---

## 1. Product Truth: What Mynah Is Now

### Core product

Mynah is a **Mac-first, local-first, menu-bar voice typing app**.

The primary loop is:

`Press Fn -> speak -> release -> transcribe locally -> paste at cursor`

That is the clearest product truth.

### Primary user promise

- works from the menu bar
- runs locally on the Mac
- pastes into the active app
- keeps diagnostics local
- does not require an account
- does not require cloud services

### Current strongest differentiators

- **Fn-key-native dictation trigger**
  - the primary trigger is the Mac `Fn` key, not a generic keyboard shortcut
- **Menu-bar-first background runtime**
  - the app keeps working even when the main window is closed or hidden
- **Local-only active product surface**
  - the visible product now emphasizes on-device engines only
- **Stale Accessibility self-repair**
  - the app detects common macOS reinstall/replacement permission breakage and tries to refresh stale Accessibility state automatically
- **Local diagnostics**
  - timing and pipeline health logs are kept locally in a device-only diagnostics log
- **Hardware-aware local profiles**
  - simple profile choices now express different Mac performance needs without exposing low-level capture jargon

### Current supported local engines

The active transcription surface shows only local engines:

- `Whisper C++`
- `Parakeet`
- `Moonshine`

This is important because the website currently still tells a broader cloud story.

### Current key settings/product areas

- **Home**
  - dictation cockpit
  - state pills: ready, listening, transcribing, pasted
  - mic interaction
  - engine badge
  - recent local captures
- **Voice**
  - local performance profile
  - cursor paste / clipboard / return key behavior
- **Engine & Models**
  - local engine selection
  - local model selection and downloads
- **Trigger & Hotkeys**
  - primary `Fn` trigger
  - single optional fallback keyboard shortcut
- **Privacy & Support**
  - local diagnostics path
  - open diagnostics folder
  - clear diagnostics log
  - local technology disclosure
- **About**
  - release/build accountability
  - upstream acknowledgements
  - privacy promise
  - permission recovery note

### Current product language direction

The app has already moved toward simpler wording:

- `Trigger` instead of a broad shortcuts maze
- `Engine & Models` instead of provider setup
- `Privacy & Support` instead of analytics-style wording
- `captures` instead of `recordings` in the main settings surface
- `Text Rules` instead of `Transformations` where advanced deterministic cleanup remains

### Advanced features that still exist but are no longer the main story

- local text rules / transform clipboard flows
- advanced captures/history
- debug routes
- lower-level recording implementation details still present in code

These should not be lead website features.

---

## 2. Features We Should Explicitly Present on the Website

These are the features worth documenting and marketing now.

### A. Instant dictation loop

- hold `Fn`
- speak naturally
- release to transcribe and paste

### B. System-wide cursor output

- pastes into the current text field
- works across Mac apps
- menu-bar utility behavior

### C. Local-first transcription

- local engines only in the active product surface
- voice and transcript processing stays on the device

### D. Local diagnostics and sovereign usage data

- local diagnostics log
- no transcript text in diagnostics
- no raw audio in diagnostics
- no off-device analytics pipeline

### E. Hardware-aware performance profiles

- `Balanced`
- `Fast on Intel and basic Macs`
- `Higher accuracy on Apple Silicon`

This is an important product story because it makes the app feel intentionally shaped for different Mac families.

### F. Permission recovery

- app can detect stale Accessibility state after reinstall/replacement
- app attempts local repair and re-guides the user only if macOS still needs approval

This is a real reliability feature and unusual enough to mention.

### G. Build and release accountability

- every build now carries a visible release number
- build metadata ties the app back to Git history

This matters for trust, debugging, and support.

---

## 3. Features To Mention Carefully, Not As The Main Story

### Text Rules

Keep these framed as:

- advanced local cleanup rules
- deterministic post-processing
- optional power-user tools

Do **not** present them as the main value proposition.

### Captures/history

Keep this as a supporting feature:

- saved local captures
- quick review / deletion / local history

Do **not** make the website feel like the product is mainly an archive manager.

---

## 4. Features/Claims the Current Website Should Stop Leading With

The current live site still reflects the broader older product. These are the main mismatches.

### Remove or rewrite

#### 1. “Cloud APIs are optional”

Current site says:

- local transcription is available by default
- cloud APIs are optional
- local or cloud, your choice

This is no longer aligned with the active product surface.

The app now hides provider-key setup from the main product surface and presents **local engines only**.

Website change:

- remove cloud-provider language from hero, features, privacy, and docs
- if needed, mention older provider work only in a technical/archive note, not as a current headline feature

#### 2. “Voice-to-workflow pipelines”

Current site heavily sells:

- pipelines
- AI prompts
- workflow transforms
- rewrite/translation/prompt chains

That is no longer the main shape of the product.

Website change:

- replace this with `advanced local text rules` or remove from primary homepage entirely

#### 3. Broad multi-mode recording story

Current docs section on the site still explains:

- push to talk
- toggle recording
- voice activation
- CPAL / FFmpeg / Browser API capture methods

This is exactly the technical sprawl we have been cleaning out of the product surface.

Website change:

- lead only with the core loop: `Fn to speak`
- hide capture-engine jargon from marketing pages
- if advanced technical notes remain, move them into a support or engineering appendix

#### 4. Cloud model/provider lists

Current site references:

- OpenAI
- Groq
- Deepgram
- Mistral
- ElevenLabs
- Anthropic
- Gemini
- OpenRouter

This is stale relative to the current app direction.

Website change:

- remove from homepage and product docs unless/until those flows are brought back into the active product surface

#### 5. “Whispering foundation” as a homepage USP

Attribution should stay.
Positioning should move forward.

Website change:

- keep upstream acknowledgement in About, Credits, or a footer/legal section
- remove any homepage copy that makes Mynah sound like mainly a branded derivative

---

## 5. Live Website: What Specifically Should Change

The current homepage at `https://mynah.online` has several sections that should be changed.

### Hero

### Current issue

The hero still says:

- “Free local-first voice typing for Mac”
- “transform the result”
- “Cloud APIs are optional”

This tells too many stories at once.

### Recommended rewrite direction

Headline:

- **Press Fn. Speak. Paste.**

or

- **Private voice typing for your Mac**

Supporting line:

- **Mynah is a local-first menu-bar dictation app for macOS. Hold Fn, speak naturally, and paste text into the app you are already using.**

Support bullets:

- on-device engines
- menu-bar background runtime
- local diagnostics
- no account required

### Hero CTA

Current CTA is fine in spirit, but copy should be tied to the actual release build:

- `Download for macOS`
- `Release 103` style metadata
- if the artifact is Apple Silicon only, say that clearly
- if Intel builds exist, show them explicitly

Do not claim universality unless the release artifact really matches it.

### USP strip

### Current issue

The current USP strip still includes:

- voice-to-workflow pipelines
- Whispering foundation

### Replace with

- **Private**: on-device transcription
- **Fast**: Fn-to-cursor dictation
- **Reliable**: keeps working from the menu bar
- **Local control**: diagnostics and captures stay on your Mac

### How it works

This section is mostly strong already.

Keep:

- Press Fn
- Speak naturally
- Text appears instantly

Update:

- remove cloud choice language
- mention background menu-bar behavior

### Features grid

### Keep

- local-first transcription
- works across Mac apps
- native Mac reliability

### Rewrite

- replace `Voice-To-Workflow Pipelines` with `Advanced Text Rules` or remove it
- replace `Local Or Cloud, Your Choice` with `Local Engines Built In`
- replace `No subscription, ever` with something more durable if pricing might evolve later

Suggested replacements:

- **Fn-key dictation**
- **Local engines**
- **Menu-bar runtime**
- **Mac permission recovery**
- **Local diagnostics**
- **Hardware-aware profiles**

### Workflow examples

Current section overstates the product as a full workflow transformation engine.

Replace with real present-day use cases:

- messages and chat replies
- email drafting
- notes and journaling
- code comments and commit notes
- quick thought capture on desktop

### Privacy section

This section should get stronger, not weaker.

Recommended table:

- voice audio: on device
- transcript text: on device
- diagnostics: local only
- account: not required
- cloud dependency: none for the core product

Remove cloud-provider framing from this section.

### Foundation / comparison section

Attribution is good.
But this should not dominate the homepage.

Recommended change:

- keep a short acknowledgement section
- move the large comparison table to a separate page, footer link, or remove it entirely for now

Why:

- it spends too much homepage attention on competitors and upstream origin
- the homepage should first establish Mynah’s own product identity

### Docs section

This is the area with the biggest mismatch.

The current docs still describe an older, broader app.

It should be rewritten around:

1. install on macOS
2. grant microphone + accessibility
3. hold Fn to dictate
4. choose local engine/model
5. set paste behavior
6. inspect local diagnostics
7. manage local captures
8. use advanced text rules only if needed

Remove or heavily demote:

- cloud API key setup
- CPAL / FFmpeg / Browser API explainer language
- multiple recording modes as primary user concepts
- AI prompt pipeline explanations as a core path

### Download section

This section needs the most factual tightening.

Current site says:

- hero button: Apple Silicon only
- download block: universal binary

These need to be made consistent.

Recommended rule:

- the website should describe the exact build artifact currently available
- architecture, minimum macOS version, and file size should come from release metadata, not hardcoded copy

### Troubleshooting

Keep and strengthen:

- app translocation warning
- accessibility permission guidance
- stale accessibility repair after reinstall

This is one of the best credibility-building parts of the product now.

---

## 6. Website Structure Recommended for the Next Rewrite

### Page flow

1. Hero
2. Core loop
3. Why it feels better on a Mac
4. Privacy and local control
5. Engine and hardware support
6. Download
7. Support / permissions
8. Credits / attribution

### Recommended nav

- Product
- How it works
- Privacy
- Download
- Support

Optional:

- Credits

Avoid leading nav items like:

- Docs
- Comparison
- Pipelines

unless those become separate, intentionally maintained pages.

---

## 7. Website Messaging Priorities

If the website has to choose only five ideas, they should be:

1. **Press Fn to speak**
2. **Pastes into the app you are already using**
3. **Runs locally on your Mac**
4. **Works from the menu bar, even when the window is closed**
5. **Keeps diagnostics and product usage data on the device**

That is the clearest current story.

---

## 8. Recommended Website Copy Anchors

These are safe lines to reuse.

### Short product description

Mynah is a local-first menu-bar dictation app for macOS. Hold Fn, speak naturally, and paste text directly into the app you are already using.

### Privacy line

Voice, transcript flow, and diagnostics stay on your Mac. No account required.

### Support line

Mynah can detect common macOS permission issues after reinstall and guide recovery automatically.

### Performance line

Choose a profile tuned for your Mac, from balanced everyday use to higher-accuracy Apple Silicon dictation.

---

## 9. What the Website Should Not Imply Right Now

- that cloud services are a first-class current product path
- that AI prompt pipelines are the main experience
- that the product is primarily a workflow automation system
- that users need to understand CPAL, FFmpeg, VAD, or browser recording APIs
- that the app is just a fork or wrapper around Whispering

---

## 10. Suggested Follow-Up Artifacts

The follow-up website artifacts now exist and should be used as the working
materials for the rewrite:

1. [WEBSITE_HOMEPAGE_COPY_DECK.md](./WEBSITE_HOMEPAGE_COPY_DECK.md)
   - one-page homepage message, section copy, CTA language, and copy to avoid
2. [WEBSITE_RELEASE_DOWNLOAD_SPEC.md](./WEBSITE_RELEASE_DOWNLOAD_SPEC.md)
   - release-number display, download metadata rules, artifact labeling, and acceptance checks
3. [WEBSITE_SUPPORT_PERMISSIONS_PAGE.md](./WEBSITE_SUPPORT_PERMISSIONS_PAGE.md)
   - install, microphone, Accessibility, stale permission recovery, menu-bar behavior, and diagnostics support copy
4. [WEBSITE_CREDITS_ATTRIBUTION_PAGE.md](./WEBSITE_CREDITS_ATTRIBUTION_PAGE.md)
   - short and full upstream attribution copy for the website
5. [WEBSITE_SECTION_REWRITE_CHECKLIST.md](./WEBSITE_SECTION_REWRITE_CHECKLIST.md)
   - section-by-section rewrite checklist for the current `mynah.online` page

---

## 11. Bottom Line

The app is now much clearer than the website.

The product has already shifted toward:

- local-only active surface
- Fn-key dictation
- menu-bar runtime
- Mac reliability
- privacy-first diagnostics

The website still reflects the older, broader, more technical, more cloud-adjacent product.

The rewrite should narrow the story and make the product feel:

- more Mac-native
- more focused
- more trustworthy
- less experimental
- less inherited
