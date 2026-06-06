# Axia (TIMELock) — Project Rules & Configuration

> **READ THIS FILE FIRST** before making any changes to the project.

---

## Convex Cloud Deployment

### Development Deployment (CURRENT)
- **Deployment Name:** veracious-zebra-519
- **Dashboard URL:** https://dashboard.convex.dev/d/veracious-zebra-519
- **Cloud URL:** https://veracious-zebra-519.convex.cloud
- **Site URL:** https://veracious-zebra-519.convex.cloud
- **Deploy Key:** `dev:veracious-zebra-519|eyJ2MiI6IjAyMDQ3ZGM0ZDM2NTQwYTlhMmNhOTQ3YTdkZmM2NjNiIn0=`

### Production Deployment (FUTURE)
- **Deployment Name:** artful-civet-344
- **Cloud URL:** https://artful-civet-344.convex.cloud
- Do NOT deploy to production until explicitly told to.

### How to Deploy to Cloud Convex

Always use the deploy key when deploying. Run from the project root (`/home/z/my-project/timelock/`):

```bash
CONVEX_DEPLOY_KEY="dev:veracious-zebra-519|eyJ2MiI6IjAyMDQ3ZGM0ZDM2NTQwYTlhMmNhOTQ3YTdkZmM2NjNiIn0=" npx convex deploy
```

**NEVER deploy to a local Convex instance.** Always deploy to the cloud deployment using the deploy key above.

**NEVER use "bold-reindeer-389"** — that is an old/stale deployment. Only use veracious-zebra-519 for dev and artful-civet-344 for prod.

---

## Project Structure

- **Frontend:** React + TypeScript + Vite (`/src/`)
- **Backend:** Convex (`/src/convex/`)
- **Convex Functions Dir:** `src/convex/` (configured in `convex.json`)
- **Schema:** `src/convex/schema.ts` (imports from `src/convex/tables/`)

---

## Key Architecture Decisions

1. **Workspace Model:** Solo Freelancer (personal workspace) vs Agency/Team (team workspace)
2. **Roles:** Owner, Manager, Member
3. **Pipeline = CRM Funnel:** Lead → Qualified → Proposal → Negotiation → Won/Lost
4. **Proposals = Document Management:** Draft → Sent → Viewed → Signed/Declined/Expired
5. **Pipeline ↔ Proposals Connection:** Deal reaches "Proposal" stage → create proposal → proposal signed → deal moves to "Won"
6. **Data Storage:** All data should flow through Convex, NOT mock localStorage/useState

---

## Environment Variables (.env.local)

```env
CONVEX_DEPLOYMENT=dev:veracious-zebra-519
VITE_CONVEX_URL=https://veracious-zebra-519.convex.cloud
VITE_CONVEX_SITE_URL=https://veracious-zebra-519.convex.cloud
CONVEX_DEPLOY_KEY=dev:veracious-zebra-519|eyJ2MiI6IjAyMDQ3ZGM0ZDM2NTQwYTlhMmNhOTQ3YTdkZmM2NjNiIn0=
```

---

## Convex Tables

- `users` — User profiles (name, email, role, tier)
- `workspaces` — Personal/Team workspaces (ownerId, name, type)
- `workspaceMembers` — Team membership (workspaceId, userId, role, status)
- `workspaceInvitations` — Team invites (workspaceId, email, token, status)
- `clients` — Client records (workspaceId, contactEmail, contactName)
- `projects` — Project records (workspaceId, clientId, assignedMemberIds)
- `deals` — Pipeline deals (workspaceId, assignedMemberId, proposalId, stage)
- `pipelineStages` — Custom pipeline stages (workspaceId, name, order)
- `proposals` — Proposal documents (workspaceId, assignedMemberId, dealId, status)
- `invoices` — Billing invoices (workspaceId, projectId)
- `scopeDefinitions` — Scope management (workspaceId)
- Plus: evidence, compliance, tracking, security, features, platform, work tables

---

---

## GitHub Repository

- **Repo URL:** https://github.com/doongarshimamania-lab/AXIA
- **Remote with token:** `https://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@github.com/doongarshimamania-lab/AXIA.git`
- **Default branch:** `main`
- **PR branch:** `fix/runtime-auth-provider`

### Git Push Workflow

```bash
cd /tmp/axia-fresh-repo
# Copy updated files from /home/z/my-project/timelock/
# Then:
git add -A
git commit -m "descriptive message"
git push origin main
```

The working git repo is at `/tmp/axia-fresh-repo/` (lean 3.8MB, no large files).
The local `/home/z/my-project/` git repo is 317MB and too large to push directly.

---

## Backup Policy (MANDATORY — CRITICAL)

### Rule: EVERY BACKUP MUST BE A COMPLETE, WORKING PROJECT

- **After EVERY code change**, create a COMPLETE project backup zip
- **The backup MUST contain the ENTIRE project** — not just changed files
- **Anyone should be able to:** extract the zip → `npm install` → `npm run dev` → app runs completely
- **Naming format:** `AXIA-COMPLETE-BACKUP-YYYY-MM-DD_HH-MM-SS_IST.zip`
- **Timestamp:** Always use **IST (Asia/Kolkata)** timezone: `TZ='Asia/Kolkata' date '+%Y-%m-%d_%H-%M-%S_IST'`
- **Save to THREE locations:**
  1. `/home/z/my-project/download/`
  2. `/home/z/my-project/backups/`
  3. **GitHub Release** (with the ZIP attached as a release asset)
- **Push to GitHub** after every backup — BOTH source code AND ZIP

### What the COMPLETE Backup MUST Include

- `src/` — ALL source code (pages, components, hooks, convex, etc.)
- `public/` — Static assets
- `dist/` — Built files (so no rebuild needed)
- `package.json` + `package-lock.json` — Dependencies
- `vite.config.ts` — Vite configuration
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` — TypeScript config
- `components.json` — shadcn/ui config
- `index.html` — Entry HTML
- `convex.json` — Convex config
- `preview_server` — C binary for serving dist
- `preview_server.c` — Source for the C binary
- `start.sh` — Startup script
- `.env.local` — Environment variables (if exists)
- `RULES.md`, `README.md`, `CHANGELOG.md` — Documentation
- ALL other config files in the project root

### Backup Commands

```bash
# Get IST timestamp
IST_TIME=$(TZ='Asia/Kolkata' date '+%Y-%m-%d_%H-%M-%S_IST')
BACKUP_NAME="AXIA-COMPLETE-BACKUP-${IST_TIME}"

cd /home/z/my-project/timelock

# Create COMPLETE project backup (exclude only node_modules, .git, logs, old backups)
zip -r "/home/z/my-project/download/${BACKUP_NAME}.zip" . \
  -x "node_modules/*" \
  -x "dist/*" \
  -x ".git/*" \
  -x "backups/*" \
  -x "*.log" \
  -x ".zscripts/*" \
  -x "agent-ctx/*"

# Copy to backups directory
mkdir -p /home/z/my-project/backups/
cp "/home/z/my-project/download/${BACKUP_NAME}.zip" /home/z/my-project/backups/

# Verify backup contains key files
unzip -l "/home/z/my-project/download/${BACKUP_NAME}.zip" | grep -E "package.json|vite.config.ts|src/pages/|src/components/"
```

### GitHub Release Backup (MANDATORY)

Every backup MUST also be uploaded as a GitHub Release with the ZIP attached:

```bash
PAT="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"
REPO="doongarshimamania-lab/AXIA"
IST_TIME="<timestamp from above>"
TAG="backup-${IST_TIME}"
ZIP_PATH="/home/z/my-project/download/${BACKUP_NAME}.zip"

# 1. Create git tag
cd /home/z/my-project
git tag "$TAG" -m "Complete backup ${IST_TIME}"
git push origin "$TAG"

# 2. Create GitHub Release
RELEASE_ID=$(curl -s -X POST \
  -H "Authorization: token ${PAT}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO}/releases" \
  -d "{
    \"tag_name\": \"${TAG}\",
    \"name\": \"AXIA Complete Backup - ${IST_TIME}\",
    \"body\": \"Complete project backup. Extract, npm install, npm run dev.\",
    \"draft\": false,
    \"prerelease\": false
  }" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")

# 3. Upload ZIP as release asset
curl -s -X POST \
  -H "Authorization: token ${PAT}" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/zip" \
  "https://uploads.github.com/repos/${REPO}/releases/${RELEASE_ID}/assets?name=${BACKUP_NAME}.zip" \
  --data-binary @"${ZIP_PATH}"
```

### ⚠️ NEVER create partial backups. ALWAYS include the COMPLETE project.
### ⚠️ ALWAYS verify the backup zip contains ALL source files before considering it done.
### ⚠️ ALWAYS upload the ZIP to GitHub Releases as well — not just source code push.

---

## Preview Server

- **Server type:** Compiled C binary (`preview_server`) — most stable, does NOT crash
- **Internal port:** 3000 (preview_server serves `dist/`)
- **External proxy:** Node.js HTTP proxy on port 81 → port 3000
  - (Caddy on port 81 is root-owned and blocks access; use Node proxy instead)
- **Preview URL:** `https://preview-81.space-z.ai/`
- **Start command:**
  ```bash
  cd /home/z/my-project/timelock
  # Start preview_server on port 3000
  nohup ./preview_server -port 3000 -dir dist > /tmp/preview_server.log 2>&1 &

  # Start Node.js proxy on port 81 → 3000
  cat > /tmp/serve-proxy.cjs << 'PROXY'
  const http = require('http');
  const httpProxy = require('http-proxy');
  const proxy = httpProxy.createProxyServer({});
  const server = http.createServer((req, res) => {
    proxy.web(req, res, { target: 'http://127.0.0.1:3000', ws: true });
  });
  server.on('upgrade', (req, socket, head) => {
    proxy.ws(req, socket, head, { target: 'ws://127.0.0.1:3000' });
  });
  server.listen(81, '0.0.0.0', () => {
    console.log('Proxy running on port 81 -> 3000');
  });
  PROXY
  nohup node /tmp/serve-proxy.cjs > /tmp/proxy.log 2>&1 &
  ```
- **Rebuild + restart:**
  ```bash
  cd /home/z/my-project/timelock && npx vite build
  pkill -f preview_server; sleep 1
  nohup ./preview_server -port 3000 -dir dist > /tmp/preview_server.log 2>&1 &
  # No need to restart proxy unless it crashed
  ```
- **Source code for the preview:** Always from `/home/z/my-project/timelock/src/` and `/home/z/my-project/timelock/dist/`
- **When the user says "start the preview":**
  1. Pull latest code from GitHub: `cd /home/z/my-project && git pull origin main`
  2. If there are new source changes, rebuild: `cd /home/z/my-project/timelock && npx vite build`
  3. Kill old servers: `pkill -f preview_server; pkill -f "node.*serve-proxy"`
  4. Start preview_server: `cd /home/z/my-project/timelock && nohup ./preview_server -port 3000 -dir dist &`
  5. Start proxy: `nohup node /tmp/serve-proxy.cjs &`
  6. Verify: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:81/` should return `200`

> **ALWAYS use the C binary `preview_server`** for static file serving — it survives process reaper.
> **NEVER try to kill or reconfigure the root Caddy on port 81** — it's root-owned and managed by the platform.
> **If Caddy blocks port 81**, kill it and use the Node.js proxy approach instead.

---

## Critical: Latest Code Location

The LATEST updated code was found at `/tmp/latest-backup/timelock/src/` (from Jun 4).
This code is DIFFERENT from git HEAD in the old repo. Key differences:

- Uses `ConvexProvider` + `ConvexAuthProvider` (BOTH needed)
- Has `WorkspaceProvider` wrapping routes
- Has `TeamManagement` page at `/teams` route
- Has `WorkspaceSwitcher` component in sidebar
- Has `Building2` icon for Team nav in sidebar
- No standalone Auth/Onboarding routes (auth is handled differently)

**NEVER restore code from the old git HEAD** without checking if `/tmp/latest-backup/` has newer files first.

---

## Runtime Error Fix (CRITICAL)

The app crashes if `ConvexAuthProvider` is missing. The provider hierarchy MUST be:

```tsx
<ConvexProvider client={convex}>
  <ConvexAuthProvider client={convex}>
    <BrowserRouter>
      <WorkspaceProvider>
        {/* routes */}
      </WorkspaceProvider>
    </BrowserRouter>
  </ConvexAuthProvider>
</ConvexProvider>
```

- `ConvexProvider` — provides query/mutation context
- `ConvexAuthProvider` — provides auth context (useAuth, useAuthActions, useConvexAuth)
- `WorkspaceProvider` — provides workspace context
- **If you remove ConvexAuthProvider**, `useAuth()` crashes with "useAuthActions must be used within ConvexAuthProvider"

---

## Data Flow: Convex vs Mock

The app uses a **hybrid data source** pattern:
- When authenticated with Convex → uses Convex queries/mutations
- When unauthenticated → falls back to rich mock data from `use-app-data.tsx`

**Per-source availability check** (NOT OR logic):
- `isPipelineConvexAvailable` = Convex has pipeline data (length > 0)
- `isProposalsConvexAvailable` = Convex has proposals data (length > 0)
- Each source independently decides whether to use Convex or mock data
- **NEVER use OR logic** (`convexPipeline.isConvexAvailable || convexProposals.isConvexAvailable`) — this caused both pages to show empty data

---

## Critical Reminders

- **ALWAYS check this file** before deploying or configuring Convex
- **ALWAYS use the deploy key** when running `npx convex deploy`
- **NEVER deploy to local Convex** — always use the cloud deployment
- **NEVER use bold-reindeer-389** — stale deployment
- **Frontend must use Convex queries/mutations**, not mock useState data
- **ALWAYS create a timestamped backup after every code change**
- **ALWAYS push code changes to GitHub after committing**
- **NEVER use Node.js servers** — they get killed by the container. Use the C `preview_server`
- **NEVER restore old code from git** without checking `/tmp/latest-backup/` first
- **NEVER remove ConvexAuthProvider** — it causes runtime crashes
