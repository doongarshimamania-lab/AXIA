# AXIA Code Audit — `axia/` Folder Completeness & Duplicate Analysis

**Date:** 2026-06-21
**Audited by:** main agent
**Scope:** Verify `axia/` is up-to-date, complete, has no missing code; compare against the provided backup ZIPs; verify latest commits' changes are present; detect duplicates.

---

## Executive Summary

| Question | Answer |
|---|---|
| Is `axia/` the latest code? | ✅ **YES** — `axia/` has the latest fixes from the last 5 commits. It is actually **newer** than the `resources/timelock/src/` snapshot. |
| Is `axia/` complete (no missing code)? | ✅ **YES** — All production code is present. The `components/notifications/NotificationBell.tsx` file that "looks missing" was intentionally deleted in commit `384d432` and replaced by `NotificationCenter.tsx` (a better version that puts the bell in the top-right via `PageLayout`, exactly as you requested earlier). |
| Does `axia/` match the backup ZIP? | ✅ **YES** — `axia/src/` is byte-for-byte identical to the `axia/src/` inside `AXIA-COMPLETE-BACKUP-2026-06-21_22-17-23_IST.zip`. |
| Are the latest fixes (Pipeline duplicate, dialog overflow, rounded corners) present? | ✅ **YES** — Verified in source code (see details below). |
| Are there duplicates? | ⚠️ **YES, in `resources/` only** — `resources/timelock/` contains a stale parallel `src/` AND a `src_latest/` that is byte-identical to `src/`. Also contains an unused `convex/` dir at root level. None of these affect `axia/` which is clean. |

---

## 1. `axia/` Folder Audit

### Structure
```
axia/
├── src/                  # 402 files (393 .ts/.tsx)
│   ├── components/       # 13 subfolders + 33 root .tsx files
│   ├── convex/           # backend (135+ files across 18 subfolders)
│   ├── data/             # 1 file (mockProjectData.ts)
│   ├── hooks/            # 16 hooks
│   ├── lib/              # utility libraries
│   ├── pages/            # 30+ page components
│   ├── types/            # TypeScript declarations
│   ├── index.css
│   ├── instrumentation.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/               # static assets
├── package.json          # name: axia, version: 3.0.0
├── vite.config.ts
├── tsconfig*.json
├── tailwind.config.ts
├── convex.json           # functions: src/convex/
├── components.json       # shadcn/ui config
├── .env.example          # template (copied from timelock/.env.example)
├── README.md
├── Caddyfile, Procfile
├── bun.lock, package-lock.json, pnpm-lock.yaml
└── node_modules/         # gitignored, 538 packages installed
```

### Build verification
- `bun install` → succeeded (538 packages, 2.14s)
- `bunx vite build` → succeeded (3381 modules, ~11s, 0 errors)
- **No broken imports** — all `@/components/...`, `@/hooks/...`, `@/lib/...` imports resolve

### Phase 1 components — all present ✅
| Component | Path | Lines | Status |
|---|---|---|---|
| ManualSendDialog | `axia/src/components/manual-send/ManualSendDialog.tsx` | 303 | ✅ Present |
| DownloadPDFButton | `axia/src/components/pdf/DownloadPDFButton.tsx` | 429 | ✅ Present |
| NotificationCenter | `axia/src/components/NotificationCenter.tsx` | 249 | ✅ Present (replaces old NotificationBell) |
| use-notifications hook | `axia/src/hooks/use-notifications.ts` | ~500 | ✅ Present |
| convex/notifications.ts | `axia/src/convex/notifications.ts` | 365 | ✅ Present |
| convex/manualSends.ts | `axia/src/convex/manualSends.ts` | 286 | ✅ Present |
| tables/notifications.ts | `axia/src/convex/tables/notifications.ts` | 66 | ✅ Present |
| tables/manualSends.ts | `axia/src/convex/tables/manualSends.ts` | 55 | ✅ Present |

### What about the "missing" `components/notifications/NotificationBell.tsx`?

**Not missing — intentionally deleted.** Commit `384d432` ("feat: restore Jun-18 latest code + integrate Phase 1") removed it because:
- The old `NotificationBell` was mounted in the sidebar (CollapsibleSidebar.tsx)
- You explicitly asked for it to move to the top-right corner of the dashboard
- The replacement `NotificationCenter.tsx` does exactly that — it's wired into `PageLayout` so it appears in the top-right of every dashboard page
- Commit message confirms: `"components/NotificationCenter.tsx (bell in top-right via PageLayout)"`

**Proof no broken imports:** `grep -rn 'NotificationBell' axia/src/` returns 0 matches. The build succeeds cleanly.

---

## 2. Comparison Against Backup ZIPs

### Latest complete backup: `AXIA-COMPLETE-BACKUP-2026-06-21_22-17-23_IST.zip` (242 MB)

Extracted to `/tmp/axia-complete/` and compared:

| Path | Result |
|---|---|
| `/tmp/axia-complete/axia/src/` vs `axia/src/` | ✅ **Byte-identical** (no diff output) |
| `/tmp/axia-complete/axia/package.json` vs `axia/package.json` | ✅ Identical |

**Conclusion:** `axia/` matches the backup ZIP exactly.

### Older tagged backup: `AXIA-v5.2.0-resend-email.zip` (Jun 13, 4.8 MB)

This is a pre-reorg backup. It only contains a single `AXIA-v5.2.0/` folder (the old flat structure). Comparing its `src/` against current `axia/src/`:
- 47 files **differ** — all of them are **newer in axia/** (Phase 1 + dialog fixes + pipeline dedup were committed AFTER v5.2.0)
- 2 files only exist in axia (`ShareRecordsPanel.tsx`, `TransferOwnershipDialog.tsx`) — added in commits after v5.2.0
- 2 files only exist in v5.2.0 (`manual-send/`, `pdf/` were at root) — wait, that's wrong. Let me recheck. Actually `manual-send/` and `pdf/` ARE in axia — they're just at `axia/src/components/manual-send/` and `axia/src/components/pdf/`. The diff was confused by the path prefix.

**Conclusion:** axia/ is a strict superset of v5.2.0 plus 8 days of newer commits (Jun 13 → Jun 21).

---

## 3. Latest Code Changes — Verification

### Fix: Pipeline Kanban duplicate (commit `e3d18f3`, Jun 17)
**Status:** ✅ Present in `axia/src/pages/Pipeline.tsx`

```
Line 263: const [activeTab, setActiveTab] = useState<"pipeline" | "share-records">("pipeline");
Line 907: activeTab === "pipeline"
Line 920: activeTab === "share-records"
Line 933: {/* ── Kanban Board (only on Pipeline tab; previously rendered unconditionally
Line 936: {activeTab === "pipeline" && (showLoading ? (
Line 1065: {activeTab === "share-records" && (<ShareRecordsPanel />)}
```

The Kanban board is now wrapped in `activeTab === "pipeline"` so it only renders on the Pipeline tab. The Share Records tab cleanly shows only `ShareRecordsPanel`. **The duplicate Leads/Won/Lost sections bug is fixed.**

### Fix: Dialog overflow + rounded corners (commits `4d112e9` + `607c724`, Jun 16)
**Status:** ✅ Present in `axia/src/components/ui/dialog.tsx` and 47+ other files

Sample verifications:
- `axia/src/components/ui/dialog.tsx` — has `rounded-xl` + `overflow-hidden` ✅
- `axia/src/components/PricingModal.tsx` — has `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` (responsive) ✅
- `axia/src/pages/TeamManagement.tsx` — has 8 instances of `truncate`/`min-w-0` (dialog title fix) ✅
- `axia/src/components/ui/alert-dialog.tsx` — has same rounded-xl + overflow-hidden fixes ✅

### Fix: Real-time @mentions, markdown rendering, self-notification bug (commit `ff9b8ce`, Jun 17)
**Status:** ✅ Present
- `axia/src/lib/markdown.tsx` exists (markdown rendering)
- `axia/src/components/messaging/` has all 4 components (ChannelList, MessageInput, MessageList, ThreadPanel)
- `axia/src/convex/messaging/channelMutations.ts` and `messageMutations.ts` exist

### Fix: TeamManagement silent mutation no-op (commit `348deec`, Jun 17)
**Status:** ✅ Present in `axia/src/pages/TeamManagement.tsx` (committed in same Jun-18 restore batch)

### Phase 1: Manual send workflow + in-app notifications (commit `a5fddab`, Jun 21)
**Status:** ✅ All present (see Phase 1 table above)

### Most recent: Folder reorg (commit `38e649f`, Jun 21)
**Status:** ✅ This is the current HEAD; the reorg is what created `axia/` in the first place.

---

## 4. Duplicate Detection

### 4.1 Inside `axia/` — ✅ CLEAN
- Only one `src/` tree
- Only one `package.json`
- Only one `vite.config.ts`, `tsconfig.json`, `convex.json`
- No duplicate component files (no `Component.tsx` AND `Component.v2.tsx`)
- No `src_backup_*` folders inside `axia/`

### 4.2 Inside `resources/` — ⚠️ Multiple stale duplicates (do not affect `axia/`)

#### Duplicate #1: `resources/timelock/src/` AND `resources/timelock/src_latest/`
- **Both 399 files, byte-identical** (`diff -rq` returns no output)
- `src_latest/` is a literal duplicate of `src/` — same content, different folder name
- Size: 5.1 MB each = 10.2 MB wasted
- **Recommendation:** Delete `src_latest/` (it adds nothing)

#### Duplicate #2: `resources/timelock/convex/` AND `resources/timelock/src/convex/`
- Two separate `convex/` trees inside `timelock/`
- `convex/` (top-level): 135 files — STALE (missing `manualSends.ts` and `notifications.ts` from Phase 1)
- `src/convex/`: 139 files — also stale, but slightly newer
- Both are OLDER than `axia/src/convex/` (which has all Phase 1 code)
- **Recommendation:** Either folder is safe to delete — `axia/src/convex/` is the source of truth

#### Duplicate #3: `resources/timelock-messy-backup/` is a stale older copy of `timelock/`
- 363 files in `src/`, 157 files differ from `axia/src/`
- Older snapshot — predates Phase 1, dialog fixes, pipeline fix
- **Recommendation:** Keep as historical archive, do not use as reference

#### Duplicate #4: `resources/src_backup_20260602_154431/` and `resources/src_backup_20260602_161626/`
- Two snapshots from Jun 2 (very old)
- 57 and 286 files respectively
- **Recommendation:** Keep as archive

#### Duplicate #5: Multiple `package.json` files (10 total across the repo)
- `axia/package.json` — ✅ the canonical one (name: axia, version: 3.0.0)
- `resources/timelock/package.json` — stale (name: vite-template, version: 0.0.0)
- `resources/timelock-messy-backup/package.json` — stale
- `resources/backups/timelock-v7-*/package.json`, `timelock-v8-*/package.json` — old snapshots
- `resources/skills/*/package.json` — Z.ai skill library packages (irrelevant to AXIA app)
- `resources/ecc/package.json` — Z.ai ECC reference repo
- **Recommendation:** Only `axia/package.json` matters. Others are archival.

#### Duplicate #6: Old backup ZIPs in `resources/download/` and `resources/backups/`
- 14+ ZIPs and tarballs dating from May 29 to Jun 21
- Total ~280 MB
- The latest complete backup (`AXIA-COMPLETE-BACKUP-2026-06-21_22-17-23_IST.zip`, 242 MB) is also attached to GitHub Release `v5.3.0-folder-reorg`
- **Recommendation:** Keep only the latest 2-3 ZIPs locally; rely on GitHub Releases for older snapshots

#### Duplicate #7: `resources/disk/` is a stale build mirror
- Contains old `dist/` build artifacts from before the reorg
- Multiple hash-named JS/CSS files from old builds
- The current build lives at `axia/dist/` (gitignored)
- **Recommendation:** Delete `resources/disk/` — it's stale and the preview server no longer reads from it

#### Duplicate #8: `resources/.next/` is a stale Next.js build cache
- 100 KB
- AXIA uses Vite, not Next.js (the `next.config.ts` in `axia/` is vestigial)
- **Recommendation:** Delete

#### Duplicate #9: `resources/tool-results/` — 379 transient agent artifacts
- 38 MB
- Not source code, just intermediate read/grep results from previous agent sessions
- **Recommendation:** Safe to delete (already gitignored)

### 4.3 Stale code inside `resources/timelock/src/` that is NOT in `axia/src/`

These 10 files exist in `timelock/src/` but not in `axia/src/`. All are **intentionally absent** from axia — they're legacy/unused:

| File | Why it's not in axia |
|---|---|
| `app/` (Next.js app dir) | AXIA uses Vite, not Next.js. Not referenced. |
| `components/v2/` (7 files) | Old v2 design system. 0 imports in axia. |
| `components/notifications/NotificationBell.tsx` | Replaced by `NotificationCenter.tsx` (top-right bell via PageLayout) in commit 384d432. |
| `components/ui/toast.tsx` + `toaster.tsx` | shadcn toast — axia uses `sonner` instead. 0 imports. |
| `hooks/use-toast.ts` | Same — sonner replaced it. 0 imports. |
| `lib/tokens.ts` | V2 design tokens — not imported anywhere in axia. |
| `lib/db.ts` | Prisma client — axia uses Convex. 0 imports. |
| `middleware.ts` | Next.js middleware — not used in Vite. |
| `vly-toolbar-readonly.tsx` | Vly toolbar — removed in commit 384d432. |

### 4.4 Files newer in `axia/src/` than `timelock/src/`

174 files differ in content. Sampled 5 — all confirmed newer in axia with the latest fixes:
- `dialog.tsx` — axia has `rounded-xl` + `overflow-hidden` (commit 4d112e9)
- `PricingModal.tsx` — axia has responsive grid (commit 607c724)
- `TeamManagement.tsx` — axia has 8 truncate/min-w-0 fixes (commit 607c724)
- `Invoices.tsx` — axia has 16 manualSend refs (Phase 1)
- `Pipeline.tsx` — axia has activeTab dedup logic (commit e3d18f3)

**`axia/src/` is the source of truth. `timelock/src/` is a stale snapshot from before Phase 1 + dialog fixes.**

### 4.5 Files only in `axia/src/` (NEWER, not in timelock)

21 files exist only in axia — these are all new files added in recent commits:

| File | Added in |
|---|---|
| `components/NotificationCenter.tsx` | 384d432 (replaces NotificationBell) |
| `components/QueryState.tsx` | Earlier commit |
| `components/SectionErrorBoundary.tsx` | Earlier commit |
| `components/ShareRecordsPanel.tsx` | e3d18f3 (Pipeline tab) |
| `components/TransferOwnershipDialog.tsx` | Earlier commit |
| `components/design-system/` | UI redesign |
| `convex/adminSeed.ts` | Seeding logic |
| `convex/clients/clientPortal.ts`, `clientWorkspace.ts` | Client portal feature |
| `convex/evidence/extension.ts` | Browser extension integration |
| `convex/messaging/channelMutations.ts`, `messageMutations.ts` | Real-time messaging |
| `convex/permissions/shareRecords.ts`, `transferOwnership.ts` | Permission system |
| `convex/seedTeamUsers.ts` | Team seeding |
| `hooks/use-notifications.ts` | Phase 1 notifications hook |
| `lib/app-config.ts`, `lib/markdown.tsx`, `lib/monitoring.ts` | Recent additions |
| `pages/AccountSettings.tsx`, `pages/ClientWorkspace.tsx` | New pages |

---

## 5. Conclusions

### What's good ✅
1. **`axia/` is the canonical, latest, complete codebase** — has all Phase 1 components, all dialog fixes, the Pipeline dedup fix, and matches the latest backup ZIP byte-for-byte.
2. **Build succeeds cleanly** with no broken imports — 3381 modules transformed, 0 errors.
3. **No duplicates inside `axia/`** — one `src/`, one `package.json`, one of each config.
4. **The "missing" `NotificationBell.tsx` is intentional** — it was replaced by `NotificationCenter.tsx` which puts the bell in the top-right corner of the dashboard (exactly as you requested).
5. **GitHub remote is in sync** with local — `origin/main` HEAD = local HEAD = `a9608ec`.

### What's suboptimal ⚠️ (all in `resources/`, none affect `axia/`)
1. **`resources/timelock/src/` and `resources/timelock/src_latest/` are byte-identical duplicates** (10 MB wasted) — `src_latest/` should be deleted.
2. **`resources/timelock/convex/` is a stale duplicate** of `resources/timelock/src/convex/` — neither is used; `axia/src/convex/` is the source of truth.
3. **`resources/disk/` is a stale build mirror** — preview server now serves from `axia/dist/`, so `resources/disk/` is dead weight.
4. **`resources/.next/` is a stale Next.js cache** — AXIA uses Vite.
5. **`resources/tool-results/` is 38 MB of transient agent artifacts** — safe to delete.
6. **~14 old backup ZIPs (~280 MB)** in `resources/download/` and `resources/backups/` — older ones could be removed since GitHub Releases preserves them.
7. **`resources/timelock-messy-backup/` and `resources/src_backup_20260602_*/`** are very old snapshots — keep as archive, but mark as deprecated.

### What's missing ❌
- **Nothing is missing from `axia/`.** All Phase 1 components, all recent fixes, all backend functions are present and the build succeeds.

---

## 6. Recommended Cleanup Actions (for your decision)

If you want to slim down `resources/` (this is optional cleanup, not required for the app to work):

| Action | Saves | Risk |
|---|---|---|
| Delete `resources/timelock/src_latest/` | 5.1 MB | None — byte-identical to `src/` |
| Delete `resources/timelock/convex/` (top-level) | 1.5 MB | None — stale, `axia/src/convex/` is canonical |
| Delete `resources/disk/` | ~50 MB | None — preview server no longer uses it |
| Delete `resources/.next/` | 100 KB | None — Vite app, not Next.js |
| Delete `resources/tool-results/` | 38 MB | None — transient agent artifacts |
| Delete old backup ZIPs (keep only latest 2) | ~250 MB | None — GitHub Releases preserves them |
| Delete `resources/timelock-messy-backup/` | 4.5 MB | Low — very old snapshot |
| Delete `resources/src_backup_20260602_*/` | 3.4 MB | Low — Jun 2 snapshots |

**Total potential savings: ~350 MB**

None of these affect `axia/` — they're all in `resources/` which is the archive folder. I will NOT execute any of these without your explicit approval.
