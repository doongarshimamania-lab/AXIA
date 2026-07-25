# Axia — System Architecture

> Last updated: 2026-07-25
>
> This document describes the production architecture of Axia (the "Agency OS")
> as deployed at **https://axia-bay.vercel.app**.

## 1. High-Level Overview

Axia is a single-tenant SaaS for digital-marketing, growth, web-dev, SEO/SEM,
and creative agencies. The product is anchored by a **Truth Layer** that
event-sources work artifacts (screenshots, memos, URL logs, time blocks) so
disputes can be resolved from objective evidence rather than he-said/she-said
testimony.

```
┌─────────────────────────┐       ┌──────────────────────────┐       ┌──────────────────────┐
│   Browser SPA (Vite)    │──────▶│   Convex Backend (V8)    │──────▶│  External Services   │
│  React 19 + TypeScript  │ WSS   │  Queries / Mutations /   │ HTTP  │  Resend (email)      │
│  Deployed on Vercel     │──────▶│  HTTP Actions            │──────▶│  OpenAI (AI predict) │
└─────────────────────────┘       │  Deploy: veracious-      │       │  Creem / Paddle (pay)│
                                  │  zebra-519.convex.cloud  │       │  Google/Microsoft SSO│
┌─────────────────────────┐       └──────────────────────────┘       └──────────────────────┘
│   Browser Extension     │──────▶ HTTPS POST /api/extension/*
│  (Chrome MV3, evidence  │       (token-auth, body-size capped, rate-limited)
│   recorder)             │
└─────────────────────────┘
```

## 2. Frontend

| Layer              | Tech                                   | Notes |
|--------------------|----------------------------------------|-------|
| Framework          | React 19                               | Concurrent features, `useTransition` for non-blocking UI updates |
| Build              | Vite 6                                 | Bundled output deployed as static assets to Vercel |
| Routing            | react-router 7                         | SPA with `BrowserRouter`; routes defined in `src/main.tsx` |
| Styling            | Tailwind CSS 4                         | Theme tokens via CSS variables; dark mode via `next-themes`-like `ThemeProvider` |
| Components         | Radix UI + shadcn/ui                   | Copy-in components under `src/components/ui/` (customizable, not a dep) |
| State              | Convex React (queries/mutations)       | Single source of truth is the Convex database |
| Animations         | framer-motion 12                       | Used sparingly for landing-page reveals + tier-card transitions |
| Forms              | react-hook-form + zod                  | Auth forms, onboarding forms, lead capture |

The frontend makes **zero direct database calls** — every read goes through
Convex `query` subscriptions (live-updating WebSocket) and every write goes
through a Convex `mutation`. This is what enables the real-time collaborative
feel (team members see each other's edits live).

## 3. Backend

Convex is our backend-as-a-service. Everything lives in `src/convex/`:

### 3.1 Convex Components (registered in `convex.config.ts`)

- **`@convex-dev/better-auth`** — Full authentication system (email/password,
  Google/Microsoft OAuth, email OTP, magic links). Replaces `@convex-dev/auth`.
  The user table lives INSIDE the component, not in our schema — our
  `users` table mirrors it via `betterAuthUserId`.
- **`@convex-dev/resend`** — Transactional email (welcome, password reset,
  payment reminders).

### 3.2 Database Schema (`src/convex/schema.ts`)

Tables are grouped by domain into files under `src/convex/tables/`. Domains
include: users, workspaces, teams, projects, pipeline, proposals, billing,
scope, evidence, time-tracking, compliance, clients, portal, messaging,
notifications, manual-sends, leads, custom-fields, tags, goals, tracking,
**legal consent audit logs**, **ownerDashboard (Paddle subscriptions /
events / dashboard cache)**.

### 3.3 HTTP Routes (`src/convex/http.ts`)

Public-facing HTTP endpoints exposed by Convex:

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/auth/*` | GET/POST | Better Auth | All Better Auth routes (sign in/up/out, OAuth callbacks, OTP) |
| `/api/extension/start` | POST | Extension token | Begin an evidence recording session |
| `/api/extension/record` | POST | Extension token | Submit a batch of evidence events |
| `/api/extension/finalize` | POST | Extension token | End an evidence session |
| `/api/extension/validate` | POST | Extension token | Validate a token (used by extension on install) |
| `/api/ai/predict` | POST | Extension token or Bearer | AI dispute-success prediction (rate-limited) |
| `/api/payments/webhook` | POST | Stripe-Signature HMAC | Stripe webhook (legacy, used by mock provider) |
| `/api/paddle/webhook` | POST | Paddle-Signature HMAC (ts=;h1=) | Paddle webhook — subscription_created/updated/cancelled |
| `/api/payments/creem-webhook` | POST | creem-signature HMAC | Creem webhook — checkout.session.completed, subscription.* |

All HTTP routes apply: CORS allowlist, strict CSP, HSTS, X-Frame-Options DENY,
X-Content-Type-Options nosniff, body-size cap, sanitized error responses.

### 3.4 Auth (`src/convex/lib/auth.ts` + `src/convex/auth.ts`)

- **Better Auth** (`better-auth` npm + `@convex-dev/better-auth` Convex Component)
- Password: scrypt hash, 8–16 char limit (LPDOS defense)
- OAuth: Google + Microsoft (configured via env vars on Convex dashboard)
- Email OTP: 6-digit code via Resend
- Session: HTTP-only, Secure, SameSite=Lax cookie, 30-day rolling expiry
- Rate limiting: `rateLimitAuthenticated` on every authenticated mutation
- **Legal consent audit** (v7.2): every signup records which policy version
  the user agreed to (GDPR / DPDP Act compliance)

### 3.5 Payments (`src/convex/lib/paymentProvider.ts`)

Provider-agnostic interface with FIVE implementations:

| Provider | Status | When to use |
|----------|--------|-------------|
| `mock` | ✅ Default | Dev / staging / when no processor configured. Instant "completed" return. |
| `paddle` | ✅ Production | Activated by `PAYMENT_PROVIDER=paddle`. **Currently the primary Axia SaaS subscription provider** (see `convex/ownerDashboard/lib/paddle.ts`). |
| `creem` | ✅ Production-ready | Activated by `PAYMENT_PROVIDER=creem`. **Recommended alternative — Merchant of Record that handles global tax.** |
| `stripe` | ⚠️ Stub | Activated by `PAYMENT_PROVIDER=stripe` + `STRIPE_SECRET_KEY`. Requires `stripe` npm install. |
| `razorpay` | ❌ Not yet implemented | Returns mock fallback. |

The portal payment flow (clients paying invoices) uses this provider. The
subscription payment flow (agencies paying for Axia) uses either Paddle or
Creem via their dedicated webhooks.

### 3.6 Tier Gating

| File | Role |
|------|------|
| `src/lib/tiers.ts` | Frontend tier definitions (Solo/Agency/Scale), gate→min-tier map, `hasTierGate()` |
| `src/convex/lib/tiers.ts` | Backend mirror (same gates, used by mutations) |
| `src/hooks/use-subscription-tier.ts` | React hook returning current tier + `useTierGate()` convenience hook |
| `src/convex/users.ts` → `setMyTier` | Self-serve mutation (accepts both legacy + new tier names) |
| `src/convex/users.ts` → `setTierFromCreem` | Webhook-driven mutation (called by Creem webhook handler) |
| `src/convex/ownerDashboard/` | Paddle-specific subscription management (queries, mutations, dashboard) |

**Tier migration map (legacy → new):**
- `free` / `starter` → `solo`
- `pro` → `agency`
- `expert` → `scale`

The migration map lives in `src/hooks/use-subscription-tier.ts:LEGACY_TIER_MAP`.
Existing user data is preserved — the hook normalizes legacy values to new
ones on read.

### 3.7 Security

- **CSP**: `default-src 'self'; script-src 'self'; frame-ancestors 'none'` — applied on every HTTP route
- **Rate limiting**: per-user-per-window on every authenticated mutation; per-token on AI predict (10/hr)
- **Body size caps**: 10 KB for extension/validate, 1 MB for extension/record, 64 KB for webhooks, 10 KB for AI predict
- **Token validation**: extension tokens are 64-char hex, validated against DB on every call
- **Open-redirect defense**: `?redirect=` is whitelisted to same-origin relative paths
- **LPDOS defense**: password max 16 chars (caps scrypt cost)
- **Sanitized errors**: every HTTP handler wraps in `sanitizeError(e, "public message")` to prevent info leakage
- **Webhook signature verification**: both Paddle (ts=;h1= HMAC-SHA256) and Creem (creem-signature HMAC-SHA256) verified in constant time
- **Replay protection**: Paddle webhook rejects events older than 5 minutes

## 4. Browser Extension

A separate Chrome MV3 extension (`/extension` — not in this repo) records
evidence during active work sessions. It authenticates via a per-user token
(generated from Account Settings → Extension Tokens) and POSTs to
`/api/extension/*` endpoints.

**Privacy guarantee**: recording only happens when the user explicitly starts
a session. The extension does not run in the background, does not collect
data outside of active sessions, and the user can pause/uninstall at any time.

## 5. External Integrations

| Service | Purpose | Env vars |
|---------|---------|----------|
| Resend | Transactional email | `RESEND_API_KEY` |
| OpenAI | AI dispute-success prediction (gpt-4o-mini) | `OPENAI_API_KEY` |
| Google OAuth | SSO | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Microsoft OAuth | SSO | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| Paddle | Subscription billing (Merchant of Record) — current | `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRODUCT_ID_*`, `PAYMENT_PROVIDER=paddle` |
| Creem | Subscription billing (Merchant of Record) — alternative | `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_PRODUCT_ID_SOLO/AGENCY/SCALE`, `PAYMENT_PROVIDER=creem` |
| Stripe (optional) | One-off invoice payments (alternative to Paddle/Creem) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_PROVIDER=stripe` |
| GitHub / Figma / Slack / Stripe | Platform integrations (read-only tokens stored per user) | Per-user OAuth in Account Settings |

## 6. Deployment

### 6.1 Frontend (Vercel)

- Repo: `doongarshimamania-lab/AXIA` on GitHub
- Production URL: `https://axia-bay.vercel.app`
- Auto-deploy on push to `main` branch
- Build command: `vite build`
- Output: `dist/` (static assets)
- Env vars: `VITE_CONVEX_URL` (optional — falls back to hardcoded prod URL)

### 6.2 Backend (Convex)

- Deployment: `veracious-zebra-519.convex.cloud`
- Deploy command: `CONVEX_DEPLOY_KEY="dev:..." npx convex deploy --typecheck=disable`
- **CRITICAL**: Convex must be deployed as a separate explicit step. The
  frontend can ship to Vercel calling functions that don't exist on Convex,
  which causes a production crash. Always run the Convex deploy before
  expecting new functions to work.
- Env vars: set on the Convex dashboard (or via `npx convex env set`)

### 6.3 DNS

- `axia-bay.vercel.app` is the Vercel-assigned domain (no custom domain yet)
- When a custom domain is registered, update `SITE_CONFIG.PRODUCTION_URL`
  in `src/lib/site-config.ts` (or the equivalent in `src/lib/app-config.ts`)

## 7. Caching Strategy

### 7.1 What's Cached Now

| Layer | What | TTL | Invalidation |
|-------|------|-----|--------------|
| Browser localStorage | `axia_subscription_tier` | Until sign-out | Sign-out clears all `axia_*` keys |
| Browser localStorage | `axia_active_workspace` | Until sign-out | Workspace switcher updates |
| Browser localStorage | `axia_sidebar_state` | 1 year | User collapses/expands sidebar |
| Browser localStorage | `axia_theme` | 1 year | User toggles theme |
| Browser localStorage | `axia_cookie_consent` | 12 months | User changes cookie preference |
| Convex client | Query subscriptions | Live (WebSocket) | Automatic — server pushes changes |
| Convex client | Auth session | 30 days rolling | Sign-out or expiry |
| HTTP `Cache-Control` | Static assets (Vite-built) | 1 year (immutable hash) | Build-time hash in filename |
| Convex function-level | `getPaymentProvider()` cached provider instance | Process lifetime | Process restart |
| Owner dashboard | `dashboardCache` table (server-side, time-boxed) | Configurable per cache key | TTL expires or manual invalidate |

### 7.2 What Should Be Added

- **CDN-level caching**: Vercel Edge Network already caches static assets globally. No action needed.
- **Stale-while-revalidate for read-heavy Convex queries**: not applicable — Convex is already real-time.
- **Service Worker for offline support**: out of scope for v1; the app requires a live Convex connection.
- **HTTP `ETag` on legal pages**: not needed — they're static React components, cached at the asset level.

### 7.3 Sign-Out Flow Verification

The sign-out flow (`src/hooks/use-auth.ts:signOut`) is verified to work
correctly:

1. Calls `authClient.signOut()` — clears the Better Auth session cookie
2. Wipes all `axia_*` localStorage keys (5 keys total)
3. Forces a hard `window.location.href = "/"` reload — this resets every
   in-memory React ref, every provider state, every Convex subscription

The hard reload is critical — without it, the WorkspaceProvider's
`seedAttempted` ref would persist in memory and re-seed the previous user's
data on the next sign-in. Verified working as of 2026-07-25.

## 8. API Endpoint Inventory (active vs inactive)

See `src/convex/http.ts` for the canonical list. Active endpoints:

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/auth/*` | ✅ Active | Better Auth routes |
| `/api/extension/start` | ✅ Active | Used by browser extension |
| `/api/extension/record` | ✅ Active | Used by browser extension |
| `/api/extension/finalize` | ✅ Active | Used by browser extension |
| `/api/extension/validate` | ✅ Active | Used by browser extension |
| `/api/ai/predict` | ⚠️ Active but rate-limited | Requires `OPENAI_API_KEY` on Convex |
| `/api/payments/webhook` | ✅ Active | Stripe/mock provider |
| `/api/paddle/webhook` | ✅ Active | Paddle provider (current Axia subscription billing) |
| `/api/payments/creem-webhook` | ✅ Active | Creem provider (alternative Axia subscription billing) |

Inactive / not yet implemented:
- Razorpay provider — stub returns "not implemented"
- PayPal provider — not started
- Creem subscription lifecycle (Creem `subscription.active` → tier sync via `setTierFromCreem`) — scaffolded but TODO

## 9. Known Limitations & Technical Debt

- **Tier gating not yet enforced server-side** — `setMyTier` allows any signed-in
  user to set their own tier. The Paddle webhook flow currently handles tier
  updates on subscription_created/cancelled events. The Creem equivalent
  (`setTierFromCreem`) is scaffolded but pending.
- **`creemCustomerId` field not yet on users table** — the `setTierFromCreem`
  mutation is scaffolded but cannot look up users by Creem customer ID yet.
  Adding this requires a schema migration + index.
- **Old tier names (`free`/`starter`/`pro`/`expert`) still referenced in ~50 files** —
  the migration map in `useSubscriptionTier` normalizes them on read, but a
  full refactor to use only Solo/Agency/Scale is pending.
- **No custom domain yet** — production is on `axia-bay.vercel.app`. When a
  custom domain is registered, update `SITE_CONFIG.PRODUCTION_URL` (or
  `app-config.ts`).
- **No CDN for user-uploaded evidence screenshots** — currently stored as
  Convex file blobs. For scale, migrate to S3/Cloudflare R2 with signed URLs.

## 10. Disaster Recovery

- **Database backups**: Convex maintains point-in-time recovery (PITR) for
  the last 30 days. Manual exports via `npx convex export`.
- **Code backups**: GitHub is the source of truth; every push creates a
  commit. Releases are tagged.
- **Secret backups**: Convex env vars are stored in the Convex dashboard;
  rotation is manual via `npx convex env set`.
- **RTO/RPO**: Target RTO 4 hours, RPO 1 hour. Achieved via Convex PITR +
  Vercel instant rollback.

## 11. Compliance

- **GDPR**: Privacy Policy at `/privacy` covers all 6 lawful bases. DSAR
  requests go to `legal@axia.software`.
- **CCPA**: Same Privacy Policy covers California residents' rights.
- **DPDP Act 2023 (India)**: Cross-border data transfer framework addressed
  in Privacy Policy §6.
- **PCI DSS**: Not applicable — Paddle/Creem are MoR and handle all card
  data. Axia never sees full card numbers.
- **IT Act 2000 (India)**: ToS §12 (arbitration) + §14 (governing law)
  establish Mumbai jurisdiction.
