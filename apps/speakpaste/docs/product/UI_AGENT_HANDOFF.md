# UI Agent Handoff

Date: 2026-06-02

## Purpose

This file is the coordination point for a separate UI/design agent working on SpeakPaste.

Use it to avoid environment confusion and to avoid two agents editing the same files blindly.

## Repository Layout

Workspace root:

```text
/Users/irfan/projects/SpeakPaste/speakpaste
```

Actual app package:

```text
apps/speakpaste
```

The app is a Bun workspace package. Do not assume `npm` or repo-root `node_modules/.bin/vite` is the right execution context.

## Package Manager

Use Bun.

Expected version from root `package.json`:

```text
bun@1.3.13
```

If dependencies look broken, run from workspace root:

```bash
bun install
```

Do not switch the project to npm, pnpm, or yarn. Do not generate a new lockfile with another package manager.

## Correct Dev Commands

From workspace root, web-only Vite dev:

```bash
cd apps/speakpaste
bun run dev:web -- --host 127.0.0.1 --port 5173
```

Equivalent from workspace root without `cd`:

```bash
bun --cwd apps/speakpaste run dev:web -- --host 127.0.0.1 --port 5173
```

Tauri desktop dev:

```bash
cd apps/speakpaste
bun run dev
```

Production web build:

```bash
bun run build
```

Tauri `.app` build only:

```bash
cd apps/speakpaste
bun tauri build --bundles app
```

## Why The Previous Command Failed

The repo root `package.json` has these scripts:

```json
{
  "dev": "cd apps/speakpaste && bun run dev",
  "build": "cd apps/speakpaste && bun run build",
  "typecheck": "cd apps/speakpaste && bun run typecheck"
}
```

It does not define `dev:web` at the root.

`dev:web` exists only in:

```text
apps/speakpaste/package.json
```

Also, repo-root `node_modules/.bin` may not contain `vite`. The `vite` binary is available under:

```text
apps/speakpaste/node_modules/.bin/vite
```

So running Vite from the wrong cwd can fail even if dependencies are installed.

## Emergency Vite Fallback

Prefer Bun scripts first.

If the Bun script path is blocked by the agent environment, this direct command can be used from workspace root:

```bash
node apps/speakpaste/node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 5173 --config apps/speakpaste/vite.config.ts
```

But the preferred command remains:

```bash
bun --cwd apps/speakpaste run dev:web -- --host 127.0.0.1 --port 5173
```

## Current Design Direction

Read first:

```text
apps/speakpaste/docs/product/UI_REDESIGN_BRIEF.md
apps/speakpaste/docs/product/CURRENT_PHASE_STATUS.md
```

Current target:

```text
Living Local
```

The home screen should feel like a quiet Mac-native local voice instrument:

- compact
- private
- tactile
- stateful
- not SaaS-like
- not Wispr/Whispering-like
- not a marketing landing page

## Current Coordination Warning

Before editing, run:

```bash
git status --short
```

At the time this handoff was created, the implementation lane had uncommitted home-surface UI edits in these files:

```text
apps/speakpaste/src/routes/(app)/+page.svelte
apps/speakpaste/src/routes/(app)/_home/AppHeader.svelte
apps/speakpaste/src/routes/(app)/_home/EngineBadge.svelte
apps/speakpaste/src/routes/(app)/_home/HintText.svelte
apps/speakpaste/src/routes/(app)/_home/LastPastedCard.svelte
apps/speakpaste/src/routes/(app)/_home/MicButton.svelte
apps/speakpaste/src/routes/(app)/_home/PipelineControlDeck.svelte
apps/speakpaste/src/routes/(app)/_home/RecentHistoryList.svelte
apps/speakpaste/src/routes/(app)/_home/SettingsPopover.svelte
apps/speakpaste/src/routes/(app)/_home/StatePillBar.svelte
```

Do not overwrite those files unless the user explicitly asks you to take over the same UI slice.

Safer options:

- produce a design proposal only
- edit a separate markdown proposal
- wait until the implementation lane commits its UI slice
- work on packaging/distribution docs instead

## How Agents Should Communicate

Use files under:

```text
apps/speakpaste/docs/product
```

Recommended pattern:

1. Agent reads `CURRENT_PHASE_STATUS.md`.
2. Agent reads the task-specific brief.
3. Agent writes its result to a named markdown file.
4. Agent does not require the user to copy/paste long summaries between tools.

For UI/design work, write output to:

```text
apps/speakpaste/docs/product/UI_AGENT_REVIEW.md
```

For implementation notes, write output to:

```text
apps/speakpaste/docs/product/UI_IMPLEMENTATION_NOTES.md
```

For blockers, append a short section to this file:

```text
apps/speakpaste/docs/product/UI_AGENT_HANDOFF.md
```

## Validation Commands

Run at minimum after UI changes:

```bash
bun run build
```

From workspace root this is valid because root `build` delegates to `apps/speakpaste`.

If changing TypeScript-heavy code:

```bash
bun run typecheck
```

Known existing warnings may appear in unrelated files. Do not chase unrelated warnings unless asked.

## What Not To Do

- Do not use npm to install dependencies.
- Do not create `package-lock.json`.
- Do not change package manager.
- Do not edit Tauri/Rust runtime files for a visual-only task.
- Do not run full DMG packaging for UI validation.
- Do not make settings look like a dashboard.
- Do not add purple/blue AI gradients, decorative orbs, or marketing hero sections.
