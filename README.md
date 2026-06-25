# AXIA — Repository

Freelance payment protection SaaS. React 19 + TypeScript + Vite 6 + Convex.

This repo is organized into exactly **two top-level folders**:

```
AXIA/
├── axia/        ← Production-ready code. All new commits go here.
└── resources/   ← Everything else (backups, snapshots, research, screenshots, scripts, docs).
```

## `axia/` — Production Code

Self-contained, runnable project. Anyone can download just this folder and run AXIA locally.

```bash
cd axia/
cp .env.example .env       # fill in your Convex URL + deploy key
npm install                # or: pnpm install / bun install
npm run dev                # vite dev server on :3000
npm run build              # production build -> axia/dist/
```

**What's inside:**
- `src/` — React frontend + `src/convex/` backend functions
- `public/` — static assets
- `package.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `convex.json`
- `.env.example` — environment variable template (Convex URL, Sentry DSN, PostHog key, etc.)
- `README.md` — original project README (architecture, scripts, deployment)
- `Caddyfile`, `Procfile` — deployment configs

**Backend:** Convex Cloud (dev deployment: `veracious-zebra-519`). See `axia/README.md` and the project `RULES.md` (in `resources/timelock/RULES.md`) for deploy keys and full architecture.

## `resources/` — Archive & Support Material

Everything that is NOT part of the runnable app. Organized by category:

| Subfolder | Contents |
|---|---|
| `timelock/` | Canonical snapshot of the project (parallel copy with `RULES.md`, `CHANGELOG.md`, `DEPLOY_KEYS.md`, etc.) |
| `timelock-messy-backup/` | Older messy backup |
| `src_backup_20260602_*/` | Old src snapshots from Jun 2 |
| `backups/` | tar.gz / zip backups (also pushed to GitHub Releases) |
| `download/` | User-facing deliverables (PDFs, docs, screenshots) |
| `disk/` | Mirror of built `dist/` (served by preview server) |
| `research/` | Competitor / feature research JSON + MD files |
| `screenshots/` | PNG screenshots |
| `scripts/` | Dev / preview server scripts (NOT part of the app) |
| `docs/` | Misc docs (`PR_DESCRIPTION.md`, etc.) |
| `worklog/` | Multi-agent worklog |
| `archive/` | Old/bak files (`vite.config.ts.bak`, `httpd`, `httpd.c`, `generate_pdf.py`) |
| `python-env/` | Python tooling (`pyproject.toml`, `uv.lock`) |
| `agent-ctx/` | Agent context docs (delegation briefs) |
| `tool-results/` | Transient agent tool results |
| `ecc/` | Z.ai ECC reference repo (skills/hooks/agents rules) |
| `skills/` | Z.ai skill library (gitignored — too large) |
| `examples/`, `mini-services/` | Small standalone experiments |
| `prisma/` | Unused Prisma schema (backend is Convex) |
| `chrome-extension/` | Companion browser extension (separate product) |
| `.next/`, `.zscripts/` | Build cache and dev-server config |
| `upload/` | IM gateway upload staging |

## Conventions

- **All new code commits go in `axia/`.** Treat `resources/` as read-only archive.
- **Backup policy** (from `resources/timelock/RULES.md`): after every code change, create a complete project ZIP and save to (1) `resources/download/`, (2) `resources/backups/`, (3) a GitHub Release.
- **Convex deploy:** always use the dev deploy key from `resources/timelock/RULES.md`. Never deploy to a local Convex instance.
