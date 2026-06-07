# Antigravity Prompt: Rewrite Mynah Website Comparison Section

## Purpose

The current Mynah website comparison section is too conceptual and not contrasting enough for normal users.

Rewrite the homepage comparison and `/compare/` page so users immediately understand why they would choose Mynah over other dictation options.

The homepage should use a clear tick/cross table focused on core differentiators.

---

## Website Path

Website repo:

`/Users/irfan/projects/Mynah/website`

Primary files likely involved:

- `index.html`
- `compare/index.html`
- `styles.css`
- possibly `llms.txt`
- possibly `facts/index.html`

Do not modify Mynah app source code.

---

## Problem With Current Copy

Current wording:

> Different from cloud dictation subscriptions.

Current table:

| Dimension | Mynah | Cloud dictation subscriptions | macOS Dictation |
| --- | --- | --- | --- |
| Pricing | One-time lifetime license | Usually monthly or annual | Included with macOS |
| Core processing | Local on Mac | Often cloud/server-assisted | Apple system service |
| Account | Not required for core use | Often required | Apple/macOS context |
| Best for | Private Mac voice-to-cursor | Cross-platform AI polish/sync | Occasional built-in dictation |

This is accurate but too abstract.

Common users will not immediately understand the product advantage.

The section needs to answer:

> Why should I choose Mynah instead of Wispr Flow, Superwhisper, MacWhisper, or Apple Dictation?

---

## New Homepage Comparison Direction

### Recommended Heading

`Why Mynah instead of another dictation app?`

### Recommended Subheading

`Mynah is built for people who want a private Mac utility they own, not another cloud subscription or a file transcription workstation.`

### Homepage Table Columns

Use named products/categories:

- Mynah
- Wispr Flow
- Superwhisper
- MacWhisper
- Apple Dictation

### Homepage Table Rows

Use core differentiators, not abstract dimensions.

Recommended homepage table:

| What matters | Mynah | Wispr Flow | Superwhisper | MacWhisper | Apple Dictation |
| --- | --- | --- | --- | --- | --- |
| One-time lifetime license | ✅ | ❌ | ⚠️ higher lifetime tier | ✅ | ✅ free |
| No account for core use | ✅ | ❌ | ⚠️ varies | ✅ | ✅ |
| No cloud required for core dictation | ✅ | ❌ cloud-first | ✅ local modes | ✅ | ⚠️ Apple system |
| Built for cursor dictation | ✅ | ✅ | ✅ | ⚠️ more file/transcript oriented | ⚠️ basic built-in |
| Clipboard behavior controls | ✅ | ? | ? | ❌ | ❌ |
| Local diagnostics | ✅ | ❌ | ? | ❌ | ❌ |
| Simple Fn-to-paste workflow | ✅ | ❌ | ❌ | ❌ | ❌ |

### Symbol Legend

Add a small legend below the table:

- `✅` clear product strength
- `⚠️` partial, depends on plan/mode/use case, or not the product's primary focus
- `❌` not the product model or not a visible product strength
- `?` not clearly verified from public information

### Homepage Footnote

Add:

`Competitor features and pricing change frequently. This table is based on public product positioning and is not a performance benchmark. We will publish measured latency, memory, and accuracy results separately after repeatable tests.`

---

## Detailed `/compare/` Page Direction

The `/compare/` page should be more nuanced than the homepage.

### Recommended Heading

`Choose the dictation tool that matches your trade-off.`

### Recommended Subtitle

`Mynah is intentionally narrow: private Mac voice-to-cursor, local-first runtime, and one-time lifetime pricing. It is not trying to be every dictation product at once.`

### Product Position Cards

Add cards before the table.

#### Mynah

Title:

`Private Mac cursor dictation.`

Bullets:

- `$29 / ₹1499 one-time lifetime license`
- `Hold Fn, speak, release to paste`
- `Core dictation does not require cloud or account`
- `Local diagnostics, clipboard behavior, transparent stack`

#### Wispr Flow

Title:

`Cloud-subscription polish and cross-platform reach.`

Bullets:

- `Strong fit for users who value AI polish and sync across devices`
- `Public comparisons commonly describe it as monthly/annual subscription software`
- `Better comparison target for cloud-assisted dictation than local-only utilities`
- `Not the same product philosophy as Mynah's local Mac ownership model`

#### Superwhisper

Title:

`Power-user dictation with broader platform ambitions.`

Bullets:

- `Strong local/offline model story when configured that way`
- `Often positioned for power users who want many modes and platforms`
- `Lifetime pricing is substantially higher than Mynah's launch license`
- `Mynah is simpler: a Mac menu-bar voice-to-cursor utility`

#### MacWhisper

Title:

`Excellent local file transcription.`

Bullets:

- `Strong option for dragging in audio files and producing transcripts`
- `Local-first and one-time Pro pricing are already well understood`
- `Better fit for files, meetings, subtitles, and transcript exports`
- `Mynah is focused on live cursor insertion while you write`

#### Apple Dictation

Title:

`Free built-in occasional dictation.`

Bullets:

- `Good enough for quick built-in use`
- `Included with macOS`
- `No Mynah-style local diagnostics or clipboard behavior controls`
- `Less focused on a menu-bar voice-to-cursor product workflow`

### Detailed Comparison Table

Use this table:

| What matters | Mynah | Wispr Flow | Superwhisper | MacWhisper | Apple Dictation |
| --- | --- | --- | --- | --- | --- |
| Best fit | Daily private Mac cursor dictation | Cross-platform AI dictation polish | Power-user dictation workflows | File transcription and transcript export | Occasional built-in dictation |
| Pricing model | `$29 / ₹1499 lifetime` | Subscription-led | Free/pro/lifetime options | Free/pro one-time options | Included with macOS |
| Core loop | Hold Fn, speak, release, paste | Hotkey/app-dependent | Mode-dependent | File or mode-dependent | System dictation trigger |
| Account for core use | No | Usually yes | Varies | No for local use | No separate app account |
| Cloud required for core dictation | No | Cloud-first / server-assisted positioning | Local modes available | Local by default | Apple system behavior |
| Clipboard behavior controls | Yes | Not confirmed | Not confirmed | Not primary | Limited |
| Local diagnostics | Yes | Not product-facing | Not confirmed | Not primary | No product-level diagnostics |
| Transparent engine disclosure | Yes | Limited public detail | Yes | Yes | Apple-managed |
| Product philosophy | Own a focused local Mac utility | Subscribe to polished AI dictation | Configure a broader power tool | Transcribe files locally | Use built-in system dictation |

### Detailed Page Footnote

Add:

`Last updated: 2026-06-07. Competitor pricing and features change frequently. This comparison describes product positioning and publicly visible feature models. It is not a latency, accuracy, or memory benchmark. Mynah benchmark results will be published separately after repeatable tests on named Mac hardware.`

---

## Claim Guardrails

Be more direct, but do not overclaim.

### Allowed

- Mynah is a one-time lifetime license.
- Mynah is `$29 / ₹1499`.
- Mynah is local-first.
- Mynah does not require cloud for core dictation.
- Mynah does not require an account for core dictation.
- Mynah is focused on Mac voice-to-cursor.
- Mynah has clipboard behavior controls.
- Mynah has local diagnostics.
- Wispr Flow is a cloud/subscription-style competitor category.
- Superwhisper is a broader/power-user competitor.
- MacWhisper is strong for local file transcription.
- Apple Dictation is free and built into macOS.

### Avoid

- Do not say Mynah is faster unless benchmarked.
- Do not say Mynah is more accurate unless benchmarked.
- Do not say competitors are insecure.
- Do not say competitors always upload everything unless that is cited and current.
- Do not claim Superwhisper or MacWhisper lack local processing.
- Do not claim Apple Dictation is bad.
- Do not use aggressive or insulting competitor language.

---

## Styling Direction

The table should be visually high-contrast and scannable.

Recommendations:

- Make the Mynah column visually highlighted.
- Use `✅`, `⚠️`, `❌`, and `?` symbols.
- Add a small legend.
- Keep table rows compact.
- On mobile, allow horizontal scroll.
- Use short phrases, not long paragraphs inside the table.

Potential CSS classes:

- `.decision-table`
- `.decision-table-wrap`
- `.mynah-column`
- `.comparison-legend`
- `.competitor-card-grid`
- `.competitor-card`

---

## Files To Update

At minimum:

- `/Users/irfan/projects/Mynah/website/index.html`
- `/Users/irfan/projects/Mynah/website/compare/index.html`
- `/Users/irfan/projects/Mynah/website/styles.css`

Optional:

- `/Users/irfan/projects/Mynah/website/llms.txt`
- `/Users/irfan/projects/Mynah/website/facts/index.html`

---

## Validation

After edits:

1. Check all pages still render as static HTML.
2. Check homepage comparison is readable on desktop.
3. Check table scrolls on mobile.
4. Check no unsupported benchmark claims were introduced.
5. Check `grep -R "faster\\|more accurate\\|secure than" .` does not reveal unsupported claims.
6. Check `llms.txt` still describes Mynah accurately.

---

## Commit

Commit changes in the website repo:

```bash
cd /Users/irfan/projects/Mynah/website
git status --short
git add index.html compare/index.html styles.css llms.txt facts/index.html
git commit -m "Sharpen Mynah comparison positioning"
```

Only stage files that were actually modified.

---

## Report Back

Report:

- files changed
- commit hash
- whether named competitors were added
- whether unsupported benchmark claims were avoided
- any open concern before deployment
