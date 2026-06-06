# Antigravity Mynah Site Deployment Report

## Summary

The Mynah marketing website has been successfully deployed to Vercel with custom domain `mynah.site`.
All 12 tracked URLs return HTTP 200. DNS is fully propagated via Vercel nameservers (domain registered through Vercel).
SSL certificate is active. All SEO/agent readiness checks pass.

Deployed: **2026-06-06**
Deployed by: Antigravity AG

---

## GitHub

| Field | Value |
|---|---|
| Repo | https://github.com/teachme-ai/mynah-site |
| Branch | `main` |
| Commit SHA | `a201fb6` |
| Commit message | `Build initial Mynah marketing site` |
| Remote added | Yes (added by AG during deployment) |

---

## Vercel

| Field | Value |
|---|---|
| Project name | `mynah-site` |
| Project URL | https://vercel.com/khalid-irfans-projects/mynah-site |
| Team | `khalid-irfans-projects` |
| Project ID | `prj_TLNdB1ZpsliWQjkxR9II07tCohmS` |
| Production deployment ID | `dpl_51KsHUAcK3vgk8GLjqF5idUPzPEm` |
| Production deployment URL | https://mynah-site-5nsgyqtaf-khalid-irfans-projects.vercel.app |
| Framework | None (plain static HTML/CSS/JS) |
| Build command | _(none)_ |
| Install command | _(none)_ |
| Output directory | `.` |
| Deployment timestamp | 2026-06-06T13:36 UTC |
| Deploy status | ● READY |

> **Note**: The first deployment detected `public/` as the output directory (Vercel default heuristic),
> causing 404s. Fixed by patching project settings via Vercel API to explicitly set `outputDirectory: "."`,
> then redeploying.

---

## Domain

| Domain | Status | DNS |
|---|---|---|
| `mynah.site` | ✅ Active, assigned to production | Vercel nameservers (ns1/ns2.vercel-dns.com) ✔ |
| `www.mynah.site` | ✅ Active, assigned to production | Vercel nameservers (ns1/ns2.vercel-dns.com) ✔ |

Domain is registered through Vercel (expires 2027-06-06). No external DNS action required.
SSL certificate issued by Let's Encrypt, covers `*.mynah.site` and `mynah.site`.

---

## Live URL Validation

| URL | Status | Content-Type | Notes |
|---|---|---|---|
| https://mynah.site/ | ✅ 200 | text/html; charset=utf-8 | Homepage loads correctly |
| https://mynah.site/download/ | ✅ 200 | text/html; charset=utf-8 | Download placeholder page |
| https://mynah.site/privacy/ | ✅ 200 | text/html; charset=utf-8 | Privacy policy |
| https://mynah.site/support/permissions/ | ✅ 200 | text/html; charset=utf-8 | Permissions support page |
| https://mynah.site/credits/ | ✅ 200 | text/html; charset=utf-8 | Credits page |
| https://mynah.site/facts/ | ✅ 200 | text/html; charset=utf-8 | Facts/specs page |
| https://mynah.site/compare/ | ✅ 200 | text/html; charset=utf-8 | Compare page |
| https://mynah.site/benchmarks/ | ✅ 200 | text/html; charset=utf-8 | Benchmarks page |
| https://mynah.site/llms.txt | ✅ 200 | text/plain; charset=utf-8 | AI/agent-readable summary |
| https://mynah.site/robots.txt | ✅ 200 | text/plain; charset=utf-8 | References sitemap correctly |
| https://mynah.site/sitemap.xml | ✅ 200 | application/xml | All 8 pages listed |
| https://mynah.site/downloads.json | ✅ 200 | application/json; charset=utf-8 | Valid JSON, DMG status placeholder |

---

## Agent/SEO Validation

| Check | Result |
|---|---|
| `llms.txt` publicly reachable as plain text | ✅ Yes |
| `robots.txt` references `https://mynah.site/sitemap.xml` | ✅ Yes |
| `sitemap.xml` includes all 8 main pages | ✅ Yes |
| Homepage has JSON-LD `SoftwareApplication` | ✅ Yes |
| Homepage title is `Mynah - Private Voice-to-Cursor for Mac` | ✅ Yes |
| Homepage meta description mentions local-first Mac dictation | ✅ Yes (`"local-first Mac dictation app"`) |
| `downloads.json` parses as valid JSON | ✅ Yes |
| DMG URL placeholder (not invented) | ✅ `status: "DMG download URL will be published when the release artifact is ready."` |
| Product name is Mynah (not SpeakPaste) | ✅ Yes |
| No cloud transcription claimed | ✅ Correct — positioned as local-first |

---

## Issues

| Issue | Resolution |
|---|---|
| Vercel auto-detected `public/` as output directory (causing 404) | Fixed: set `outputDirectory: "."` via Vercel API, redeployed |
| No GitHub remote configured initially | Fixed: added `https://github.com/teachme-ai/mynah-site.git` remote, pushed `main` |

---

## Follow-Up Actions

| Action | Priority | Notes |
|---|---|---|
| Upload final DMG artifact | High | Update `downloads.json` with real artifact URL once built |
| Verify `www.mynah.site` redirects to `mynah.site` | Low | Currently both point to same production deployment; canonical redirect can be added via vercel.json if needed |
| Add OG image / social preview meta tags | Low | Optional for social sharing |
| Enable Vercel Analytics | Low | Speed Insights already provisioned in project |
