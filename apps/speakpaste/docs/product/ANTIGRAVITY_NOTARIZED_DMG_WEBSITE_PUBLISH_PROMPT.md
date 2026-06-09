# Antigravity Prompt: Publish Notarized Mynah DMG On Website

## Purpose

Use this prompt in Antigravity to publish the successfully signed, notarized, and stapled Mynah DMG on the Mynah website.

The release artifact has already passed Developer ID signing, Apple notarization, stapler validation, and Gatekeeper validation.

---

## Context

Product:

- Name: Mynah
- Website: `https://mynah.site`
- Bundle identifier: `com.mynah.app`
- Version: `0.1.1`
- Architecture: Apple Silicon / `aarch64`
- Pricing: one-time lifetime license, `$29` / `₹1499`
- Support: `irfan@teachmeai.in`

Notarized DMG artifact:

```text
/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
```

Website repo:

```text
/Users/irfan/projects/Mynah/website
```

Signing/notarization playbook:

```text
/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/docs/product/MYNAH_SIGNING_NOTARIZATION_PLAYBOOK.md
```

Deployment report target:

```text
/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/docs/product/ANTIGRAVITY_NOTARIZED_DMG_WEBSITE_PUBLISH_REPORT.md
```

---

## Verified Notarization Status

The successful run produced these validations:

```text
spctl --assess --type open --context context:primary-signature --verbose src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
=> accepted
=> source=Notarized Developer ID

xcrun stapler validate src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
=> The validate action worked!

spctl --assess --type execute --verbose src-tauri/target/release/bundle/macos/Mynah.app
=> accepted
=> source=Notarized Developer ID
```

Do not re-notarize unless the DMG has changed.

---

## AG Mission

Publish the notarized DMG to the website/release hosting flow and update the website metadata so users and AI agents can find the correct release artifact.

You may use:

- GitHub tooling
- Vercel MCP
- Vercel dashboard/CLI if MCP requires fallback
- terminal commands as needed

Do not modify Mynah app source code.

Only modify website files and release/report docs unless explicitly needed.

---

## Step 1: Confirm Artifact Exists

Run:

```bash
ls -lh /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
```

Expected:

- file exists
- size is around the built DMG size

---

## Step 2: Confirm Stapled Notarization

Run:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste
xcrun stapler validate src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
spctl --assess --type open --context context:primary-signature --verbose src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
```

Expected:

```text
The validate action worked!
accepted
source=Notarized Developer ID
```

If this fails, stop and report. Do not upload a failing DMG.

---

## Step 3: Generate SHA256

Run:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste
shasum -a 256 src-tauri/target/release/bundle/dmg/Mynah_0.1.1_aarch64.dmg
```

Record:

- SHA256 hash
- file name

---

## Step 4: Decide Hosting Location

Preferred options:

### Option A: GitHub Release Asset

Recommended for traceability.

Create or update a GitHub release for:

```text
v0.1.1
```

Attach:

```text
Mynah_0.1.1_aarch64.dmg
```

Use the final GitHub release asset URL in the website.

### Option B: Vercel Static/Public File

Only use if explicitly preferred.

Potential path:

```text
/downloads/Mynah_0.1.1_aarch64.dmg
```

Be careful with large binary hosting limits and caching.

### Recommendation

Use GitHub Releases for the DMG and Vercel for the website.

---

## Step 5: Update Website Files

Website repo:

```bash
cd /Users/irfan/projects/Mynah/website
```

Update:

```text
download/index.html
downloads.json
facts/index.html
llms.txt
```

Optional:

```text
index.html
```

### `downloads.json`

Replace the placeholder artifact list with the final release details:

```json
{
  "product": "Mynah",
  "version": "0.1.1",
  "release": null,
  "pricing": {
    "usd": 29,
    "inr": 1499,
    "model": "one-time lifetime license"
  },
  "artifacts": [
    {
      "arch": "aarch64",
      "label": "Apple Silicon",
      "filename": "Mynah_0.1.1_aarch64.dmg",
      "url": "<FINAL_DMG_URL>",
      "sha256": "<SHA256>",
      "notarized": true,
      "signedBy": "Developer ID Application: Khalid Irfan (99YAK7YU3M)"
    }
  ],
  "status": "Mynah 0.1.1 for Apple Silicon is signed, notarized, stapled, and ready for download."
}
```

If release/build number is known from app metadata, replace `release: null`.

### `download/index.html`

Remove placeholder language like:

- `DMG coming soon`
- `final DMG link will be published here`
- `trial/beta download until the final DMG`

Replace with:

- direct download button to `<FINAL_DMG_URL>`
- version `0.1.1`
- architecture `Apple Silicon`
- notarized status
- SHA256 checksum
- install steps

Recommended copy:

```text
Download Mynah 0.1.1 for Apple Silicon.
This DMG is signed with Developer ID, notarized by Apple, and stapled for Gatekeeper validation.
```

Button:

```text
Download Mynah for Apple Silicon
```

### `facts/index.html`

Update facts:

- current version `0.1.1`
- download status: signed and notarized
- supported architecture: Apple Silicon / `aarch64`

### `llms.txt`

Update product facts:

- Current version: `0.1.1`
- Apple Silicon DMG URL: `<FINAL_DMG_URL>`
- Notarized: yes
- Signed by: `Developer ID Application: Khalid Irfan (99YAK7YU3M)`

Do not include the app-specific notarization password or any private credential.

---

## Step 6: Validate Website Locally

Run simple static checks:

```bash
cd /Users/irfan/projects/Mynah/website
node -e "JSON.parse(require('fs').readFileSync('downloads.json','utf8')); console.log('downloads.json ok')"
grep -R "DMG coming soon\\|final DMG link will be published\\|trial/beta" -n index.html download/index.html facts/index.html llms.txt downloads.json || true
grep -R "APPLE_APP_SPECIFIC_PASSWORD\\|ypmh\\|qtmr\\|password" -n . --exclude-dir=.git || true
```

Expected:

- `downloads.json ok`
- no stale placeholder download text, unless intentionally kept for non-Apple-Silicon builds
- no private credentials

---

## Step 7: Commit Website Update

In website repo:

```bash
cd /Users/irfan/projects/Mynah/website
git status --short
git add download/index.html downloads.json facts/index.html llms.txt index.html
git commit -m "Publish notarized Mynah DMG"
```

Only stage files that changed.

Push to GitHub:

```bash
git push origin main
```

---

## Step 8: Deploy With Vercel

Use Vercel MCP / configured Vercel deployment flow to deploy the updated site.

Confirm:

- production deployment succeeded
- `https://mynah.site/download/` shows the final DMG button
- `https://mynah.site/downloads.json` has the final artifact URL and SHA256
- `https://mynah.site/llms.txt` exposes the notarized release facts

---

## Step 9: Fresh Download Test

After deployment:

1. Open `https://mynah.site/download/`.
2. Download the DMG using Chrome or Safari.
3. Open the downloaded DMG.
4. Drag Mynah to Applications.
5. Launch `/Applications/Mynah.app`.
6. Confirm there is no "damaged and can't be opened" warning.
7. Confirm macOS permission prompts are normal:
   - Microphone
   - Accessibility
8. Confirm Fn dictation works in TextEdit or Notes.

This is the true user-path validation.

---

## Step 10: Write Publish Report

Create:

```text
/Users/irfan/projects/SpeakPaste/speakpaste/apps/speakpaste/docs/product/ANTIGRAVITY_NOTARIZED_DMG_WEBSITE_PUBLISH_REPORT.md
```

Include:

```markdown
# Antigravity Notarized DMG Website Publish Report

## Summary

## Artifact

- Path:
- Filename:
- Size:
- SHA256:
- Notarized:
- Stapled:
- Gatekeeper DMG result:
- Gatekeeper app result:

## Hosting

- Release host:
- Artifact URL:

## Website Updates

- Files changed:
- Commit:
- Deployment URL:

## Live Validation

| URL | Status | Notes |
| --- | --- | --- |

## Fresh Download Test

## Issues

## Follow-Up Actions
```

Commit the report in the app repo:

```bash
cd /Users/irfan/projects/SpeakPaste/speakpaste
git add apps/speakpaste/docs/product/ANTIGRAVITY_NOTARIZED_DMG_WEBSITE_PUBLISH_REPORT.md
git commit -m "Document notarized DMG website publish"
```

Do not stage unrelated app repo files.

---

## Guardrails

- Do not upload an unnotarized DMG.
- Do not upload an unstapled DMG.
- Do not invent a DMG URL.
- Do not include Apple app-specific passwords anywhere.
- Do not publish old SpeakPaste artifacts.
- Do not claim Intel support unless an Intel/universal DMG is separately built and validated.
- Do not remove non-App-Store install guidance entirely; keep it as context, but the primary message should now say the DMG is signed and notarized.
- Do not claim App Store availability.

---

## Expected AG Response To User

Report:

1. final DMG URL
2. SHA256
3. website commit hash
4. Vercel deployment URL
5. whether `mynah.site/download/` is live
6. whether fresh download test passed
7. path to the publish report
