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

## Backup Policy (MANDATORY)

- **After EVERY code change**, create a timestamped backup zip
- **Naming format:** `axia-backup-YYYYMMDD_HHMMSS.zip`
- **Save to TWO locations:**
  1. `/home/z/my-project/download/`
  2. `/home/z/my-project/backups/`
- **Push to GitHub** in `backups/` folder
- **Backup contents:** `src/`, `dist/`, `public/`, all config files, `start.sh`, `preview_server`

### Backup Commands

```bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
cd /home/z/my-project/timelock
zip -r "/home/z/my-project/download/axia-backup-${TIMESTAMP}.zip" \
  src/ dist/ public/ package.json package-lock.json bun.lock \
  vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json \
  components.json index.html .env.local convex.json \
  preview_server.c preview_server serve-dist.cjs start.sh BACKUP_README.md \
  -x "node_modules/*" -x ".git/*"
cp "/home/z/my-project/download/axia-backup-${TIMESTAMP}.zip" /home/z/my-project/backups/
```

---

## Preview Server

- **Server type:** Compiled C binary (`preview_server`) — most stable, does NOT crash
- **Port:** 3000
- **Caddy proxy:** Port 81 → Port 3000
- **Preview URL:** `https://preview-81.space-z.ai/`
- **Start command:** `cd /home/z/my-project/timelock && ./preview_server &`
- **Rebuild + restart:**
  ```bash
  cd /home/z/my-project/timelock && rm -rf dist && npx vite build
  pkill -f preview_server; sleep 1; ./preview_server &
  ```

> **NEVER use `node serve-dist.cjs`** — Node processes get killed by the container's process reaper.
> **ALWAYS use the C binary `preview_server`** — it survives.

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
