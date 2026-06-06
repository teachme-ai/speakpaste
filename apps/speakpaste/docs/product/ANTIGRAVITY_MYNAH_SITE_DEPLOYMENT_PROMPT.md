# Antigravity Prompt: Deploy Mynah Site With Vercel MCP

## Purpose

Use this prompt in Antigravity to deploy the new Mynah website to Vercel using the configured Vercel MCP / VS Code deployment flow.

The site is already built locally as a static website.

---

## Context

Product:

- Name: Mynah
- Domain: `https://mynah.site`
- Type: private voice-to-cursor app for Mac
- Pricing: one-time lifetime license, `$29` / `₹1499`
- Support email: `irfan@teachmeai.in`
- Current download state: trial/beta placeholder until final DMG URL is published

Website local path:

`/Users/irfan/projects/Mynah/website`

Source planning doc:

`/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/docs/product/MYNAH_SITE_BUILD_PLAN.md`

Deployment outcome report target:

`/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/docs/product/ANTIGRAVITY_MYNAH_SITE_DEPLOYMENT_REPORT.md`

---

## Current Website Build State

The website repo already contains:

- `index.html`
- `download/index.html`
- `privacy/index.html`
- `support/permissions/index.html`
- `credits/index.html`
- `facts/index.html`
- `compare/index.html`
- `benchmarks/index.html`
- `llms.txt`
- `robots.txt`
- `sitemap.xml`
- `downloads.json`
- `styles.css`
- `main.js`
- `vercel.json`
- `public/` favicon/icon assets

Local commit already created:

`a201fb6 Build initial Mynah marketing site`

The local repo is on branch:

`main`

At the time of Codex handoff, no Git remote was configured.

---

## AG Mission

Deploy the Mynah static website end to end.

You may use:

- GitHub tooling
- Vercel MCP
- Vercel dashboard/CLI if MCP requires a fallback
- terminal commands as needed

Do not modify app source code in:

`/Users/irfan/projects/SpeakPaste/speakpaste`

Only modify website files if deployment validation reveals a real website issue.

---

## Deployment Steps

### 1. Inspect Website Repo

Run:

```bash
cd /Users/irfan/projects/Mynah/website
git status --short
git log --oneline -5
git remote -v
```

Expected:

- clean working tree
- latest commit includes `Build initial Mynah marketing site`
- remote may be empty

If working tree is dirty, document what changed before doing anything else.

### 2. Create Or Connect GitHub Repo

Create/connect a GitHub repository for the site.

Recommended repo name:

`mynah-site`

Alternative:

`mynah-website`

If a repo already exists, use the existing repo and document its URL.

Add the remote and push:

```bash
git remote add origin <GITHUB_REPO_URL>
git push -u origin main
```

If remote already exists:

```bash
git remote -v
git push origin main
```

### 3. Create Vercel Project

Using Vercel MCP, create/import a Vercel project from the GitHub repo.

Project recommendation:

- Project name: `mynah-site`
- Framework preset: Other / Static
- Build command: none
- Output directory: `.`
- Install command: none

The site is plain static HTML/CSS/JS and does not need npm/bun install.

### 4. Configure Domain

Attach:

`mynah.site`

Also configure:

`www.mynah.site`

Recommended canonical behavior:

- `www.mynah.site` redirects to `mynah.site`
- production canonical URLs remain `https://mynah.site/...`

Use Vercel MCP to inspect required DNS records.

Document the exact DNS instructions if DNS is not already configured.

### 5. Deploy Production

Trigger/verify production deployment.

Record:

- Vercel project URL
- production deployment URL
- custom domain status
- deployment commit SHA
- deployment timestamp

### 6. Validate Live URLs

Validate the following:

```text
https://mynah.site/
https://mynah.site/download/
https://mynah.site/privacy/
https://mynah.site/support/permissions/
https://mynah.site/credits/
https://mynah.site/facts/
https://mynah.site/compare/
https://mynah.site/benchmarks/
https://mynah.site/llms.txt
https://mynah.site/robots.txt
https://mynah.site/sitemap.xml
https://mynah.site/downloads.json
```

For each URL, check:

- HTTP status is `200`
- correct content type where applicable
- page does not redirect unexpectedly
- page content references Mynah, not SpeakPaste as the current product name

Acceptable exception:

- `support/permissions/` may mention old SpeakPaste entries only as migration guidance.

### 7. Validate Agent/SEO Readiness

Confirm:

- `llms.txt` is publicly reachable as plain text
- `robots.txt` references `https://mynah.site/sitemap.xml`
- `sitemap.xml` includes all main pages
- homepage has JSON-LD `SoftwareApplication`
- homepage title is `Mynah - Private Voice-to-Cursor for Mac`
- homepage meta description mentions local-first Mac dictation
- `downloads.json` parses as valid JSON

Optional but recommended:

Use an AI assistant or Vercel preview inspection to summarize Mynah from only:

- `/`
- `/facts/`
- `/llms.txt`

Expected summary:

> Mynah is a local-first private voice-to-cursor app for Mac. It uses a hold-Fn, speak, release-to-paste workflow, does not require cloud or an account for core dictation, and is planned as a one-time lifetime license.

### 8. DMG Placeholder Check

The download page intentionally says the final DMG URL is coming soon.

Do not invent a DMG URL.

Do not link to an old SpeakPaste artifact.

Do not upload or attach app binaries unless explicitly asked later.

### 9. Create Deployment Report

Write findings to:

`/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/docs/product/ANTIGRAVITY_MYNAH_SITE_DEPLOYMENT_REPORT.md`

Include:

- GitHub repo URL
- Vercel project URL
- production URL
- domain status
- DNS status
- deployment commit SHA
- validation table for all live URLs
- any issues found
- exact follow-up actions needed

Use this structure:

```markdown
# Antigravity Mynah Site Deployment Report

## Summary

## GitHub

## Vercel

## Domain

## Live URL Validation

| URL | Status | Notes |
| --- | --- | --- |

## Agent/SEO Validation

## Issues

## Follow-Up Actions
```

### 10. Commit Report Back To App Repo

After writing the report:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste
git add apps/speakpaste/docs/product/ANTIGRAVITY_MYNAH_SITE_DEPLOYMENT_REPORT.md
git commit -m "Document Mynah site deployment"
```

If the app repo has unrelated dirty files, do not stage them.

---

## Guardrails

- Do not change Mynah app source code.
- Do not change pricing unless instructed.
- Do not claim the app is free.
- Do not claim the DMG is available until the exact artifact is provided.
- Do not mention cloud transcription as a Mynah feature.
- Do not remove the local-first / no-account / no-cloud-required positioning.
- Do not publish named competitor claims without benchmark evidence.

---

## Expected Final AG Response To User

Report back:

1. GitHub repo URL
2. Vercel production URL
3. whether `mynah.site` is live
4. whether DNS action is still required
5. validation status for `/`, `/download/`, `/llms.txt`, `/sitemap.xml`, and `/downloads.json`
6. path to the deployment report
