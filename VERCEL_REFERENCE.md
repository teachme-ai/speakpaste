# Vercel Reference — CLI, Auth, MCP, and Project Conventions

> Machine-readable reference for IDEs and AI agents. Do not rediscover these paths or commands.
> Last updated: 2026-06-06

---

## Auth & CLI Location

| Item | Path / Value |
|---|---|
| Vercel CLI binary | `/Users/irfan/.nvm/versions/node/v24.15.0/bin/vercel` |
| Vercel CLI version | `54.6.1` (as of 2026-06-06) |
| Auth token file | `/Users/irfan/Library/Application Support/com.vercel.cli/auth.json` |
| Token key | `token` (field in JSON) |
| Logged-in user | `teachme-ai-7888` |
| Default team | `khalid-irfans-projects` |
| Team ID | `team_vl1yDkeBcHE3aQjj78FKuIJN` |

### Reading the token in a script

```bash
VERCEL_TOKEN=$(python3 -c "import json; d=json.load(open('/Users/irfan/Library/Application Support/com.vercel.cli/auth.json')); print(d.get('token',''))")
```

---

## Vercel MCP Status

The Vercel MCP server is **NOT loaded** in the Antigravity (AG) session.
AG's MCP directory only contains: `cloudrun`, `codex`.

```
/Users/irfan/.gemini/antigravity/mcp/
├── cloudrun/
└── codex/
```

**Workaround**: Use Vercel CLI directly from the terminal. All deployment operations that would go through MCP can be done with `vercel` CLI commands documented below.

Claude Desktop has a Vercel MCP block configured in:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

But Claude Desktop's MCP does **not** carry over to AG sessions. Do not wait for it.

---

## Project-Level Files

After running `vercel` or `vercel --yes` in a project directory, Vercel creates:

```
<project-root>/
└── .vercel/
    ├── project.json     ← projectId, orgId, projectName
    └── README.txt
```

### Example `.vercel/project.json`

```json
{
  "projectId": "prj_TLNdB1ZpsliWQjkxR9II07tCohmS",
  "orgId": "team_vl1yDkeBcHE3aQjj78FKuIJN",
  "projectName": "mynah-site"
}
```

Always add `.vercel` to `.gitignore`.

---

## Known Projects

| Project | Local Path | GitHub Repo | Vercel Project URL | Production URL | Domain |
|---|---|---|---|---|---|
| mynah-site | `/Users/irfan/projects/Mynah/website` | https://github.com/teachme-ai/mynah-site | https://vercel.com/khalid-irfans-projects/mynah-site | https://mynah-site-5nsgyqtaf-khalid-irfans-projects.vercel.app | https://mynah.site |
| speakpaste website | _(unknown)_ | _(unknown)_ | _(unknown)_ | _(unknown)_ | https://speakpaste.online |

---

## Essential CLI Commands

### Auth

```bash
vercel whoami                    # print logged-in username
vercel login                     # re-authenticate (browser OAuth)
```

### Deploy

```bash
# First deploy (interactive setup, links project)
vercel --yes

# Deploy to production
vercel --prod --yes

# Deploy with explicit name (deprecated in newer CLI, use project.json instead)
vercel --yes --name <project-name>
```

### Project Settings

```bash
vercel ls                        # list deployments for linked project
vercel inspect <deployment-url>  # inspect a specific deployment
vercel alias ls                  # list all aliases under the team
vercel alias set <deploy-url> <domain>  # manually assign domain alias
```

### Domains

```bash
vercel domains add <domain>              # add domain to current project
vercel domains inspect <domain>         # show domain info + nameserver status
vercel domains ls                       # list all domains under team
vercel dns ls <domain>                  # list DNS records for a domain
```

### Logs & Status

```bash
vercel logs <deployment-url>     # tail deployment logs
vercel inspect <deployment-url>  # show aliases, builds, status
```

---

## Vercel REST API (when CLI options are missing)

Base URL: `https://api.vercel.com`

### Patch project settings

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/<PROJECT_ID>?teamId=<TEAM_ID>" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"outputDirectory": ".", "buildCommand": "", "installCommand": "", "framework": null}'
```

### Get project info

```bash
curl -s "https://api.vercel.com/v9/projects/<PROJECT_ID>?teamId=<TEAM_ID>" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool
```

### Trigger a new production deployment

```bash
curl -X POST "https://api.vercel.com/v13/deployments?teamId=<TEAM_ID>" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "<project-name>", "gitSource": {"type": "github", "repo": "teachme-ai/<repo>", "ref": "main"}}'
```

---

## Static Site Deployment — Gotchas & Conventions

### Output directory heuristic bug

Vercel auto-detects `public/` as the output directory if that folder exists in the repo root.
For sites where `public/` contains only favicon/icon assets (not the full site), this causes 404 on all pages.

**Fix**:

```bash
# Via API (preferred — CLI has no --output-dir flag)
curl -X PATCH "https://api.vercel.com/v9/projects/<PROJECT_ID>?teamId=<TEAM_ID>" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"outputDirectory": "."}'

# Then redeploy
vercel --prod --yes
```

Or set it in `vercel.json` (but note: project-level settings override vercel.json for `outputDirectory`).

### Static site vercel.json template

```json
{
  "cleanUrls": true,
  "trailingSlash": true,
  "headers": [
    {
      "source": "/llms.txt",
      "headers": [{ "key": "Content-Type", "value": "text/plain; charset=utf-8" }]
    },
    {
      "source": "/downloads.json",
      "headers": [{ "key": "Content-Type", "value": "application/json; charset=utf-8" }]
    }
  ]
}
```

### Deployment protection (401 on preview URLs)

If a preview deployment URL returns 401, Vercel's Deployment Protection is active (Hobby/Pro team setting).
Production + custom domain aliases bypass this. Always test the custom domain, not the `.vercel.app` preview URL.

---

## Domain & DNS Setup Pattern

If domain is registered through Vercel:

- Nameservers `ns1.vercel-dns.com` / `ns2.vercel-dns.com` are already set.
- No external DNS action needed.
- Run `vercel domains inspect <domain>` to confirm `✔` next to nameservers.

If domain is registered elsewhere (Cloudflare, GoDaddy, etc.):

- Add an `A` record pointing to Vercel's IP **or** a `CNAME` to `cname.vercel-dns.com`.
- Or delegate nameservers to Vercel's NS records.
- Confirm with `vercel domains inspect <domain>`.

---

## GitHub CLI Auth (for repo creation alongside Vercel)

```bash
which gh                         # /opt/homebrew/bin/gh
gh --version                     # 2.92.0 (2026-04-28)
gh auth status                   # logged in as teachme-ai (teachme-ai account)
```

### Create and push a new GitHub repo

```bash
# Check if repo exists
gh repo view teachme-ai/<repo-name> --json url 2>/dev/null || echo "REPO_NOT_FOUND"

# Create (if not exists) — use gh repo create if needed
# Add remote and push
git remote add origin https://github.com/teachme-ai/<repo-name>.git
git push -u origin main
```

---

## Full Deployment Checklist (Static Site)

```
[ ] cd <site-directory>
[ ] git status --short          # ensure clean tree
[ ] git log --oneline -3        # confirm latest commit
[ ] git remote -v               # check if remote exists
[ ] gh repo view teachme-ai/<repo> --json url   # check GitHub repo
[ ] git remote add origin https://github.com/teachme-ai/<repo>.git
[ ] git push -u origin main
[ ] vercel whoami               # confirm auth
[ ] vercel --yes                # first deploy + link project
    → note projectId from .vercel/project.json
[ ] # If public/ exists and is NOT the full site output:
    curl -X PATCH "https://api.vercel.com/v9/projects/<ID>?teamId=team_vl1yDkeBcHE3aQjj78FKuIJN" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"outputDirectory": ".", "buildCommand": "", "installCommand": ""}'
[ ] vercel --prod --yes         # production deploy
[ ] vercel domains add <domain>
[ ] vercel domains add www.<domain>
[ ] vercel alias set <deploy-url> <domain>
[ ] vercel alias set <deploy-url> www.<domain>
[ ] # Validate
    curl -s -o /dev/null -w "%{http_code}" https://<domain>/
```
