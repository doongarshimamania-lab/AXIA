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
- **Save to TWO locations:**
  1. `/home/z/my-project/download/`
  2. `/home/z/my-project/backups/`
- **Push to GitHub** after every backup

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
  -x "*.log"

# Copy to backups directory
cp "/home/z/my-project/download/${BACKUP_NAME}.zip" /home/z/my-project/backups/

# Verify backup contains key files
unzip -l "/home/z/my-project/download/${BACKUP_NAME}.zip" | grep -E "package.json|vite.config.ts|src/pages/|src/components/"
```

### ⚠️ NEVER create partial backups. ALWAYS include the COMPLETE project.
### ⚠️ ALWAYS verify the backup zip contains ALL source files before considering it done.

---

## Preview Server

- **Server type:** Compiled C binary (`preview_server`) — most stable, does NOT crash
- **Port:** 3000
- **Caddy proxy:** Port 81 → Port 3000 (platform-managed Caddy on port 81, PID 2, root-owned)
- **Preview URL:** `https://preview-81.space-z.ai/`
- **Start command:** `cd /home/z/my-project/timelock && ./preview_server &`
- **Rebuild + restart:**
  ```bash
  cd /home/z/my-project/timelock && rm -rf dist && npx vite build
  pkill -f preview_server; sleep 1; ./preview_server &
  ```
- **The Caddy on port 81 is managed by the platform (PID 2, root). It proxies to localhost:3000.**
- **The preview_server C binary serves the `dist/` folder as static files.**
- **Source code for the preview:** Always from `/home/z/my-project/timelock/src/` and `/home/z/my-project/timelock/dist/`
- **When the user says "start the preview":**
  1. Pull latest code from GitHub: `cd /home/z/my-project/timelock && git pull origin main`
  2. If there are new source changes, rebuild: `rm -rf dist && npx vite build`
  3. Start the preview_server: `pkill -f preview_server; sleep 1; ./preview_server &`
  4. Verify: `curl -s http://localhost:3000/ | head -3` should show the Axia HTML

> **NEVER use `node serve-dist.cjs`** — Node processes get killed by the container's process reaper.
> **ALWAYS use the C binary `preview_server`** — it survives.
> **NEVER try to kill or reconfigure the Caddy on port 81** — it's root-owned and managed by the platform.

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
