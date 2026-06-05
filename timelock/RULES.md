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

## Critical Reminders

- **ALWAYS check this file** before deploying or configuring Convex
- **ALWAYS use the deploy key** when running `npx convex deploy`
- **NEVER deploy to local Convex** — always use the cloud deployment
- **NEVER use bold-reindeer-389** — stale deployment
- **Frontend must use Convex queries/mutations**, not mock useState data
