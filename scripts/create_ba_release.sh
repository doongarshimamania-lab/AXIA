#!/usr/bin/env bash
# Create GitHub Release v6.1.0-better-auth.
set -euo pipefail

: "${GH_PAT:?GH_PAT env var must be set}"
REPO='doongarshimamania-lab/AXIA'
TAG='v6.1.0-better-auth'

API="https://api.github.com/repos/${REPO}/releases"

RELEASE_BODY='## Better Auth Migration — v6.1.0

Replaces `@convex-dev/auth` with **Better Auth** + the official `@convex-dev/better-auth` Convex component. Adds Google + Microsoft OAuth, email OTP, magic link, and Resend email integration.

### Added
- **`better-auth@1.6.x`** + **`@convex-dev/better-auth@0.12.x`** — Better Auth + Convex adapter (officially maintained by Convex team)
- **`@convex-dev/resend`** + **`resend`** — official Resend Convex component for transactional emails
- **`@react-email/components`** — type-safe React email templates
- **`convex/convex.config.ts`** — registers BA + Resend Convex components
- **`convex/auth.ts`** — Better Auth instance with email/password, Google, Microsoft OAuth, emailOTP plugin, magicLink plugin
- **`convex/email.tsx`** + **`convex/emails/`** — Resend email sender + 4 React email templates (verify, OTP, magic link, reset password)
- **`convex/lib/auth.ts`** — compatibility shim: `getAuthUserId` → BA user → linked users-table record. Preserves API for all 68 backend files.
- **`src/lib/auth-client.ts`** — Better Auth React client with `magicLinkClient`, `emailOTPClient`, `convexClient`, `crossDomainClient` plugins
- **Google + Microsoft OAuth buttons** on `/auth` page (with brand SVG icons)
- **`docs/AUTH_SETUP.md`** — complete setup guide (Resend, Google Cloud, Azure Portal, env vars)
- **`betterAuthUserId` field + index** on existing `users` table — links BA user records to app users table

### Changed
- `convex/auth.config.ts` — uses `getAuthConfigProvider()` from BA (replaces Convex Auth provider entries)
- `convex/http.ts` — `authComponent.registerRoutesLazy(http, createAuth, ...)` (replaces `auth.addHttpRoutes(http)`)
- `convex/schema.ts` — removed `authTables` spread (BA tables live inside the component)
- `convex/accountSettings.ts` — `changePassword` and `changeEmail` now call BA API (`auth.api.changePassword`, `auth.api.changeEmail`, `auth.api.revokeAllSessions`)
- `src/main.tsx` — `ConvexAuthProvider` → `ConvexBetterAuthProvider`
- `src/hooks/use-auth.ts` — `useAuthActions` → `authClient` with multi-method `signIn` dispatcher
- `src/pages/Auth.tsx` — form handlers swapped to BA client API; added Google + Microsoft OAuth buttons
- 65 backend files — `@convex-dev/auth/server` → `./lib/auth` (relative path)

### Removed
- `@convex-dev/auth` dependency (no longer used)
- `convex/auth/emailOtp.ts` (replaced by BA `emailOTP` plugin — no more `email.vly.ai/send_otp` dependency)

### Security
- **scrypt password hashing** (preserved from prior setup, N=16384 r=16 p=1 dkLen=64)
- **8-16 char password policy** (preserved — LPDOS guard, see comment in `auth.ts`)
- **HttpOnly + Secure + SameSite=Lax cookies** (BA default)
- **JWT-signed session tokens** via `BETTER_AUTH_SECRET`
- **Account enumeration prevention** — uniform error messages on sign-in/reset
- **Rate limiting** — BA built-in (storage: database) on top of `http.ts` rate limiter
- **All sessions revoked** on password change + email change (NIST 800-63B)

### OAuth scopes (what data is extracted)

| Provider | Scopes | Data returned |
|---|---|---|
| **Google** | `openid email profile` (BA default) | email, email_verified, name, given_name, family_name, picture URL, locale |
| **Microsoft** | `openid email profile User.Read` (BA default) | email, displayName, givenName, surname, jobTitle, department, officeLocation, businessPhones, mobilePhone |

To request additional scopes (e.g. Google Calendar), override `scope` array on the provider config in `convex/auth.ts`.

### Email flow coverage

| Flow | Trigger | Email sent |
|---|---|---|
| Sign up (password) | `authClient.signUp.email()` | Verification email (24h link) |
| Sign in (Google) | `authClient.signIn.social({provider:"google"})` | None (Google handles) |
| Sign in (Microsoft) | `authClient.signIn.social({provider:"microsoft"})` | None (Microsoft handles) |
| Sign in (magic link) | `authClient.signIn.magicLink({email})` | Magic link email (15min) |
| Sign in (email OTP) | `authClient.emailOtp.sendVerificationOtp({email})` | 6-digit code email (15min) |
| Forgot password | `authClient.requestPasswordReset({email})` | Reset link email (1h) |
| Change password | `changePassword` mutation | None (sessions revoked) |
| Change email | `changeEmail` mutation | Verification email to new address |

### Resend email sender domain

- **Default sender:** `Axia <noreply@axia.com>` (configurable via `EMAIL_FROM` env var)
- **Development:** use `Axia <onboarding@resend.dev>` (Resend shared sender, no domain verification, 100 emails/day)
- **Production:** verify `axia.com` (or your domain) in Resend dashboard → add MX/SPF/DKIM DNS records → set `EMAIL_FROM` to your verified address

### Pre-existing deploy issue (NOT caused by this migration)

`convex/lib/portalAuth.ts`, `portalAuditLog.ts`, `paymentProviders/stripe.ts` use Node `crypto` module in sync helpers called from `query`/`mutation` handlers. Convex V8 runtime doesn'"'"'t support `crypto`; `"use node"` directive doesn'"'"'t help because helpers can'"'"'t be Node-only (would break reactive subscriptions). Needs rewrite to **Web Crypto API** (`crypto.subtle`) — async, requires refactoring `signPortalToken`/`verifyPortalToken`/`hashToken` to be async. Tracked as follow-up.

This issue existed before the BA migration — the portal backend has never actually deployed successfully despite prior worklog claims. The BA migration is independent of this issue.

### Required user setup

See **[`docs/AUTH_SETUP.md`](docs/AUTH_SETUP.md)** for complete instructions. Summary:

```bash
# Convex env vars
npx convex env set BETTER_AUTH_SECRET $(openssl rand -base64 32)
npx convex env set SITE_URL https://your-app-domain.com
npx convex env set GOOGLE_CLIENT_ID <client-id>
npx convex env set GOOGLE_CLIENT_SECRET <client-secret>
npx convex env set MICROSOFT_CLIENT_ID <client-id>
npx convex env set MICROSOFT_CLIENT_SECRET <client-secret>
npx convex env set RESEND_API_KEY re_xxx
npx convex env set EMAIL_FROM "Axia <noreply@axia.com>"

# Frontend .env.local
VITE_CONVEX_URL=https://<deployment>.convex.cloud
VITE_CONVEX_SITE_URL=https://<deployment>.convex.site
VITE_SITE_URL=http://localhost:3000
```

### Verification

- `tsc --noEmit`: **clean** (zero errors)
- `vite build`: **passes** (only pre-existing warnings about chunk size)
- 68 backend files compile with new import path (`./lib/auth`)
- All auth flows wired (sign-up, sign-in, OAuth, OTP, magic link, forgot password, reset password, change password, change email, sign out)'

echo "---CREATE RELEASE ${TAG}---"
RESPONSE_FILE="$(mktemp)"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "${RESPONSE_FILE}" \
  -X POST \
  -H "Authorization: token ${GH_PAT}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "${API}" \
  -d "$(jq -n --arg tag "${TAG}" --arg name "${TAG} — Better Auth migration (Google + Microsoft OAuth, emailOTP, magicLink, Resend)" --arg body "${RELEASE_BODY}" \
    '{tag_name: $tag, name: $name, body: $body, draft: false, prerelease: false, target_commitish: "main"}')")

echo "HTTP ${HTTP_CODE}"
cat "${RESPONSE_FILE}" | jq '{id, tag_name, html_url}' 2>&1 | head -10
rm -f "${RESPONSE_FILE}"

if [ "${HTTP_CODE}" != "201" ]; then
  echo "Release creation failed"
  exit 1
fi

echo "---DONE---"
echo "Release: https://github.com/${REPO}/releases/tag/${TAG}"
