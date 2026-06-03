# SpeakPaste Homepage Copy Deck

## Purpose

This is the one-page copy deck for the next `speakpaste.online` homepage rewrite. It should be used with `WEBSITE_PRODUCT_ALIGNMENT_BRIEF.md`.

The homepage should make SpeakPaste feel like a focused Mac utility, not a broad transcription platform.

---

## Homepage Message

### One-line product definition

SpeakPaste is a local-first menu-bar dictation app for macOS.

### Primary promise

Hold Fn, speak naturally, and paste text directly into the app you are already using.

### Product posture

- Mac-first
- local-first
- menu-bar native
- no account required
- no cloud required for the core product

---

## Hero

### Recommended H1

Press Fn. Speak. Paste.

### Supporting copy

SpeakPaste turns your Mac into a private voice-to-cursor tool. Hold the Fn key, speak naturally, release, and your words appear where you are already typing.

### Hero proof points

- Local engines run on your Mac
- Works from the menu bar
- Pastes into the active app
- Local diagnostics, no transcript tracking

### Primary CTA

Download for macOS

### CTA metadata

Use release metadata instead of hardcoded copy:

`Version 0.1.1 · Release {release_number} · macOS {minimum_version}+ · {architecture_label}`

### Hero note

No account required. No cloud required. Built for private Mac dictation.

---

## Section: How It Works

### Section label

Core loop

### Section title

One gesture. One flow.

### Section intro

SpeakPaste is designed around the simplest dictation reflex on a Mac.

### Step 1

**Hold Fn**

Start dictation with the native Mac Fn key. No mode switching, no setup page open, no visible window required.

### Step 2

**Speak naturally**

Say the thing you want to write. SpeakPaste captures the audio locally and prepares it for on-device transcription.

### Step 3

**Release to paste**

The transcript is generated locally and placed at the active cursor in the app you were already using.

---

## Section: Why It Feels Mac-Native

### Section label

Mac utility

### Section title

Built around the way Mac users already work.

### Feature cards

**Menu-bar runtime**

SpeakPaste stays available from the menu bar and keeps working when the main window is hidden.

**System-wide cursor output**

Use it in Notes, Mail, Slack, VS Code, browsers, and other text fields.

**Fn-key dictation**

The primary trigger is the Mac Fn key, with one optional fallback shortcut if you prefer.

**Permission recovery**

If macOS keeps a stale Accessibility entry after reinstalling or replacing the app, SpeakPaste attempts a local repair and guides approval when needed.

---

## Section: Local Control

### Section label

Privacy

### Section title

Your voice should stay on your Mac.

### Supporting copy

SpeakPaste is shaped around local transcription and local diagnostics. The app does not need an account or cloud service for the core dictation loop.

### Privacy table

| Area | Product stance |
| --- | --- |
| Voice audio | Processed on device for local dictation |
| Transcript text | Kept local unless you copy or paste it elsewhere |
| Diagnostics | Stored locally for troubleshooting and performance checks |
| Account | Not required |
| Cloud dependency | Not required for the core product |

---

## Section: Engines And Performance

### Section label

Local engine

### Section title

Choose a local setup that fits your Mac.

### Supporting copy

SpeakPaste supports local transcription engines and simple performance profiles so the app can feel responsive across different Mac hardware.

### Cards

**Whisper C++**

The recommended local engine path for private offline dictation.

**Parakeet**

A local model option for users who want to experiment with alternative on-device transcription.

**Moonshine**

A lightweight local option for fast English dictation workflows.

**Performance profiles**

Choose balanced everyday use, faster behavior on Intel and basic Macs, or higher accuracy on Apple Silicon.

---

## Section: Use Cases

### Section label

Everyday writing

### Section title

Use your voice where typing slows you down.

### Use-case cards

**Messages and chat**

Reply faster without leaving the conversation.

**Email drafting**

Speak a rough thought and get it into the message field quickly.

**Notes and journaling**

Capture ideas while they are still alive.

**Code comments and commit notes**

Dictate explanations, summaries, and implementation notes into your editor.

**Personal knowledge work**

Turn friction into flow when writing prompts, outlines, and notes.

---

## Section: Advanced Tools

### Section label

Advanced

### Section title

Text rules when you want more control.

### Supporting copy

For advanced users, SpeakPaste can apply local text rules for deterministic cleanup. This is optional and should not get in the way of the core Fn-to-cursor flow.

---

## Download Section

### Title

Download SpeakPaste for macOS

### Supporting copy

Install the latest release, move it to Applications, grant macOS permissions, and start dictating from the menu bar.

### CTA

Download for macOS

### Metadata line

`Version 0.1.1 · Release {release_number} · {architecture_label} · macOS {minimum_version}+`

### Install notes

- Drag SpeakPaste to Applications
- Allow Microphone and Accessibility permissions
- Hold Fn to dictate

---

## Footer / Credits

### Footer tagline

Private voice typing for macOS.

### Credits line

SpeakPaste uses open-source technologies including whisper.cpp, Tauri, Svelte, CPAL, and Enigo. It is adapted from Whispering by Braden Wong and the Epicenter contributors.

---

## Copy To Avoid

Do not use these as primary homepage claims:

- local or cloud, your choice
- AI prompt pipelines
- voice-to-workflow automation
- CPAL, FFmpeg, or Browser API capture
- cloud providers such as OpenAI, Groq, Deepgram, Mistral, ElevenLabs, Anthropic, Gemini, or OpenRouter
- no subscription ever, unless pricing is locked as a permanent policy

