# Axia — NEVER DO / ALWAYS DO Rules

**READ THIS FILE BEFORE MAKING ANY CODE CHANGE. EVERY SINGLE TIME. NO EXCEPTIONS.**

---

## 🔴 MANDATORY EDIT FLOW — NO EXCEPTIONS, NO BYPASS, OVER YOUR FUCKING LIFE

Every single code change MUST follow this exact sequence. If you skip ANY step, you have VIOLATED the process.

### BEFORE Editing (MANDATORY — run this FIRST):

```bash
./edit.sh start "description of what you're about to change" file1 file2 ...
```

This:
- Creates a **pre-edit backup** of all files in `backups/pre-edit-TIMESTAMP/`
- Creates a **lock file** in `.edit-locks/`
- Records the git commit hash BEFORE changes
- Logs the intent in CHANGELOG.md
- **If this step is skipped, post-edit.sh WILL REFUSE to run**

### Make Your Edits

Edit the files. Do the work.

### AFTER Editing (MANDATORY — run this LAST):

```bash
./edit.sh done "feat: descriptive commit message"
```

This:
- Verifies the pre-edit lock exists (proves backup was made)
- Creates a **post-edit backup** of changed files
- Runs `npx vite build` — **BLOCKS commit if build fails**
- Copies dist to `public/timelock/`
- Git commits with proper message including backup paths
- Git pushes (if remote exists)
- Updates CHANGELOG.md (marks IN PROGRESS → COMPLETED)
- Updates worklog.md
- Removes the lock file
- Verifies preview server is running

### Other Commands:

```bash
./edit.sh status              # Check active locks
./edit.sh list                # List all backups
./edit.sh rollback TIMESTAMP  # Restore files from a pre-edit backup
```

### IF YOU SKIP PRE-EDIT AND EDIT FILES ANYWAY:

1. You have violated the process
2. post-edit.sh will REFUSE to run (no lock file = no commit)
3. You must manually back up current state to `backups/`
4. You must commit with a message noting the process violation
5. You must explain to the user why you skipped the process

---

## 🚫 NEVER DO

1. **NEVER modify a file without running `./edit.sh start` first.**
   - This is rule #1. This is the most important rule.
   - If edit.sh fails, manually copy files to `backups/` with a timestamp
   - There are NO exceptions to this rule

2. **NEVER skip `./edit.sh done` after editing.**
   - This commits, pushes, verifies build, and logs everything
   - Without it, changes are uncommitted and could be lost
   - Even if it's "just a small fix" — run it

3. **NEVER assume changes from a previous session are saved.**
   - Always verify: `git status`, `git diff`, check the files on disk
   - Previous sessions lose context. Verify everything.

4. **NEVER delete or overwrite a file without checking if it has uncommitted changes.**
   - Run `git diff -- <file>` before touching it
   - If there are uncommitted changes, back them up FIRST

5. **NEVER replace a user's version of a file with an older version.**
   - Always check `find /tmp/ -name "<filename>"` for newer versions
   - Check all backup directories for the latest version
   - Compare file sizes and dates before overwriting

6. **NEVER use Convex queries that depend on backend functions that may not exist.**
   - Use mock data as default fallback
   - Use safe-convex-react.ts wrapper (useQuery returns undefined on error)
   - Never call `useQuery(api.something.something)` without a null fallback

7. **NEVER block navigation on Convex auth.**
   - Guest mode must navigate IMMEDIATELY, auth in background
   - Never await Convex auth before redirecting

8. **NEVER leave the preview server down without rebuilding and restarting.**
   - After every build, verify server is running
   - Server process dies easily — use `disown` to keep it alive

9. **NEVER make changes without updating CHANGELOG.md and worklog.md.**
   - If it's not logged, it didn't happen
   - Future you (or another session) needs to know what was done

10. **NEVER trust that "the session will remember" your changes.**
    - Sessions run out of context
    - Write everything to files, git, and logs immediately
    - Assume this is your last action before the session dies

11. **NEVER remove features or components without explicit user approval.**
    - Even if they seem broken or unnecessary
    - Ask first, then remove

12. **NEVER change the ECC repo location or delete it.**
    - ECC lives at `/home/z/my-project/.ecc/` (929 files, v2.0.0-rc.1)
    - Visible copy at `/home/z/my-project/ecc/`

13. **NEVER lose the Convex URL.**
    - `VITE_CONVEX_URL=https://artful-civet-344.convex.cloud`
    - It's in `.env` — if `.env` goes missing, recreate it IMMEDIATELY

14. **NEVER let the build fail without fixing it before moving on.**
    - A broken build = a broken app
    - Fix build errors FIRST, then continue

15. **NEVER overwrite user's manual changes with auto-generated code.**
    - Always diff the current file against what you plan to write
    - Preserve user's custom logic, styles, and structure

---

## ✅ ALWAYS DO

1. **ALWAYS read this file before starting any task.**

2. **ALWAYS run `./edit.sh start "desc" file1 file2` BEFORE editing.**

3. **ALWAYS run `./edit.sh done "commit msg"` AFTER editing.**

4. **ALWAYS verify the build succeeds.** `npx vite build`

5. **ALWAYS verify the preview server is running after build.** `ss -tlnp | grep 3000`

6. **ALWAYS check `/tmp/my-project/src_backup*` for newer file versions before overwriting.**

7. **ALWAYS use mock data as fallback when Convex queries might fail.**

8. **ALWAYS preserve user's existing changes — diff before overwriting.**

9. **ALWAYS keep ECC repo connected and Convex URL in `.env`.**

10. **ALWAYS check git status and git diff before starting work** — know what state the codebase is in.

11. **ALWAYS restart the server with `disown`** so it survives after the command finishes.

12. **ALWAYS check that SPA routes work** (/, /auth, /dashboard, /clients, /evidence-library) after deploying.

---

## 📍 KEY LOCATIONS

| What | Where |
|------|-------|
| Project root | `/home/z/my-project/timelock/` |
| Source pages | `/home/z/my-project/timelock/src/pages/` |
| Backups (PERMANENT) | `/home/z/my-project/timelock/backups/` |
| Pre-edit backups | `/home/z/my-project/timelock/backups/pre-edit-*/` |
| Post-edit backups | `/home/z/my-project/timelock/backups/post-edit-*/` |
| Edit locks | `/home/z/my-project/timelock/.edit-locks/` |
| Change log | `/home/z/my-project/timelock/CHANGELOG.md` |
| Work log | `/home/z/my-project/worklog.md` |
| THIS FILE | `/home/z/my-project/timelock/RULES.md` |
| ECC repo | `/home/z/my-project/.ecc/` |
| Convex URL | `https://artful-civet-344.convex.cloud` |
| Preview URL | `https://preview-1936221977589032.space.chatglm.site/` |
| Old backups (TEMP) | `/tmp/my-project/src_backup_20260602_161626/` |
| Safe Convex wrapper | `src/lib/safe-convex-react.ts` |
| Edit script (USE THIS) | `edit.sh` |
| Pre-edit script | `pre-edit.sh` |
| Post-edit script | `post-edit.sh` |
| Serve script | `serve-dist.cjs` |

---

## 📋 PRE-CHANGE CHECKLIST

Before touching ANY file, run through this:

- [ ] Read RULES.md (this file)
- [ ] `./edit.sh status` — check for active locks and git status
- [ ] `./edit.sh start "description" file1 file2 ...` — create backup and lock
- [ ] Make the change
- [ ] `./edit.sh done "feat: what you changed"` — build, commit, push, log

That's it. Three commands. No excuses.

---

## 🔧 GITHUB SETUP (PENDING)

No GitHub remote is currently configured. To set it up:

```bash
cd /home/z/my-project
git remote add origin git@github.com:USERNAME/REPO.git
# OR if using HTTPS with a token:
git remote add origin https://TOKEN@github.com/USERNAME/REPO.git
```

Once configured, `./edit.sh done` will auto-push after every commit.

---

**Last updated:** 2026-06-04
**Created because:** User's changes were lost TWICE due to no backups, no commits, no tracking. Never again.
**Enforcement added because:** The AI skipped the process entirely on the Scope page implementation. Never again.
