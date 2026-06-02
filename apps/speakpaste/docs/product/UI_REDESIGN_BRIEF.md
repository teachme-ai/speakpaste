# UI Redesign Brief

Date: 2026-06-02

## Goal

Make SpeakPaste feel less like a generic settings utility and more like a memorable Mac-native voice instrument.

The product is local, private, fast, and always available from the menu bar. The UI should express that without becoming loud, decorative, or AI-generic.

## Current Assessment

Strengths:

- simple and predictable
- compact Mac-friendly window
- working organic mic animation seed
- clear local engine badge
- settings are calmer than before

Weaknesses:

- home surface still reads like a standard SaaS control panel
- palette leans predictable blue/gray
- state changes do not yet feel distinctive enough
- local-only moat is communicated, but not emotionally felt
- history and pipeline controls feel utilitarian

## Design North Star

Working phrase:

```text
Living Local
```

The app should feel like a quiet local instrument:

- breath instead of dashboard
- signal instead of chatbot
- glass/ink/material instead of gradient spectacle
- precise controls instead of marketing UI
- confidence and privacy without paranoia

## Recommended Visual Direction

### Palette

Move away from generic blue-gray dominance.

Suggested palette family:

- ink / graphite as the grounding neutral
- warm silver or paper white for surfaces
- signal green or soft cyan as the active local accent
- amber only for warnings or permission recovery

Avoid:

- purple-blue AI gradients
- beige/tan-heavy themes
- all-slate darkness
- decorative orbs/blobs
- overly neon cyber styling

### Home Surface

The home screen should become the brand moment.

Priorities:

- larger breathing voice core
- stateful ring animation
- stronger visual distinction between Ready, Listening, Transcribing, and Pasted
- engine badge that reinforces `Local / whisper.cpp / model`
- compact recent-capture preview that feels like captured thought

State language:

- Ready: quiet, still, low-energy glow
- Listening: waveform ring / breath expansion
- Transcribing: focused scan / processing pulse
- Pasted: soft confirmation flash

### Settings

Settings should remain restrained.

Do:

- keep settings clear and utilitarian
- preserve the current section structure
- improve spacing and hierarchy gradually
- use color sparingly for status and capability

Do not:

- make settings expressive
- turn settings into a dashboard
- add marketing copy
- recreate Wispr/Whispering setup density

### Overlay / Menu Bar Experience

The overlay/status pill can become the most delightful Mac-native detail.

It should:

- be compact
- be readable over other apps
- show current state instantly
- avoid distracting animation
- feel native and polished

## Candidate Concepts

### Concept A: Quiet Instrument

Best for premium Mac users.

- mostly monochrome
- tactile glass/card surfaces
- active state is a refined signal green/cyan
- minimal copy
- soft ring animation

### Concept B: Living Signal

Best for making the product feel more alive.

- slightly stronger active color
- waveform/ring state system
- more animated mic core
- richer engine/status badge

### Concept C: Writer's Capture

Best if the app becomes more about thought capture and writing modes.

- warmer surfaces
- recent text gets more visual priority
- history feels like notes/fragments
- mic core remains central but less sci-fi

## Recommended First Implementation Slice

Implement only the home surface refresh first.

Files likely touched:

- `apps/speakpaste/src/routes/(app)/+page.svelte`
- `apps/speakpaste/src/routes/(app)/_home/MicButton.svelte`
- `apps/speakpaste/src/routes/(app)/_home/AppHeader.svelte`
- `apps/speakpaste/src/routes/(app)/_home/StatePillBar.svelte`
- `apps/speakpaste/src/routes/(app)/_home/EngineBadge.svelte`
- `apps/speakpaste/src/routes/(app)/_home/PipelineControlDeck.svelte`
- `apps/speakpaste/src/routes/(app)/_home/LastPastedCard.svelte`

Avoid package-wide token changes until the direction is validated.

## Design Acceptance Criteria

- still fits the compact desktop window
- no text overlap on small window sizes
- no card-inside-card visual clutter
- no landing-page feel
- controls remain obvious
- active dictation state is visually unmistakable
- local-only identity is clearer than before
- does not resemble Wispr/Whispering setup UI

## External Design Thread Prompt

Use this with Claude Design, Figma, AG, or another Codex chat:

```text
You are designing a Mac-native local voice typing app called SpeakPaste.

Product ethos:
- local-only
- sovereign data
- fast voice-to-cursor
- whisper.cpp on device
- no cloud AI
- menu-bar/background-first utility

Current UI problem:
The app is usable but too predictable: blue-gray, simple, and utility-like. We want it to feel more memorable and alive without becoming flashy, AI-generic, or settings-heavy.

Design task:
Create a refreshed home-screen direction, not a marketing landing page.

Focus on:
- compact Mac desktop app window
- central mic/voice core
- state changes: Ready, Listening, Transcribing, Pasted
- local engine badge
- recent capture/history preview
- calm settings entry

Avoid:
- purple/blue AI gradients
- decorative blobs/orbs
- huge hero text
- SaaS dashboard clichés
- Wispr/Whispering-like setup screens
- hiding product features

Preferred direction:
"Living Local" / "quiet local instrument".

Deliver:
1. visual direction summary
2. palette proposal
3. layout notes
4. state animation notes
5. component-by-component recommendations
6. anything that should not be changed
```
