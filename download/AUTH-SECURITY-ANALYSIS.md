# AXIA Auth Security Analysis — 2026-06-22

## Executive Summary

This document describes how the AXIA auth flow handles passwords, sessions, and
security after the 2026-06-22 fixes. It also lists residual risks and
recommendations.

---

## 1. User Creation & Sign-In — How It Actually Works

### Sign-up flow (creates a NEW user)
1. User clicks "Get Started" on the landing page → `/auth?mode=signup`.
2. Auth.tsx renders the sign-up form (driven by `?mode=signup`).
3. User enters name + email + password.
4. **Client-side validation** (Auth.tsx L101-116):
   - Password length ≥ 8 (matches Convex Auth's server-side check).
   - Password length ≤ 1024 (DoS guard — server scrypt would otherwise burn CPU).
5. Form is submitted via `signIn("password", formData)` with `flow=signUp`.
6. **Server-side** (`@convex-dev/auth/providers/Password`):
   - `validateDefaultPasswordRequirements` re-validates length ≥ 8.
   - `crypto.hashSecret(password)` calls `new Scrypt().hash(password)` from `lucia`.
   - A new `authAccounts` document is inserted with `{ id: email, secret: <hash> }`.
   - A new `users` document is inserted (name, email, role="member", tier="free").
7. User is now signed in. `ProtectedRoute` checks `user.onboardingComplete`:
   - `false` → redirect to `/onboarding-user-information`.
   - `true` → render the dashboard.

### Sign-in flow (existing user)
1. User goes to `/auth` (or clicks "Sign in" on landing).
2. Auth.tsx renders the sign-in form.
3. User enters email + password.
4. `signIn("password", formData)` with `flow=signIn`.
5. Server: `retrieveAccount(ctx, { provider, account: { id: email, secret } })`.
6. `crypto.verifySecret(password, hash)` calls `new Scrypt().verify(hash, password)`.
7. If verify returns `true` → new session JWT issued, cookie set, user is signed in.
8. If verify returns `false` → `throw new Error("Invalid password")`.

### Can we create new users?
**YES.** The Password provider supports `flow=signUp`. Each sign-up:
- Inserts a new `authAccounts` row keyed by email.
- Inserts a new `users` row (the application profile).
- Throws if the email already exists (so duplicate sign-ups are rejected).

### Can we sign in with old users?
**YES.** Existing users in the `authAccounts` table can sign in with their
original email + password. The `flow=signIn` path calls `verifySecret` which
performs a constant-time scrypt verification against the stored hash.

---

## 2. Password Storage — Hashing, Salting, Encoding

### Algorithm: scrypt (Lucia implementation)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Algorithm | scrypt | Memory-hard KDF designed by Colin Percival |
| N (CPU/memory cost) | 16384 | 2^14 — OWASP-recommended minimum |
| r (block size) | 16 | Lucia default |
| p (parallelization) | 1 | Single-thread |
| dkLen (output length) | 64 bytes | 512-bit derived key |
| Salt | 16 random bytes | `crypto.getRandomValues` — cryptographically secure |
| Salt encoding | hex (lowercase) | 32-char hex string |
| Hash encoding | hex (lowercase) | 128-char hex string |
| Storage format | `<salt_hex>:<hash_hex>` | Single string in `authAccounts.secret` |
| Password normalization | `password.normalize("NFKC")` | Unicode NFKC — prevents homoglyph attacks |

### Verification (sign-in)
- Uses `constantTimeEqual` from `@oslojs/crypto/subtle`.
- Constant-time comparison — prevents timing side-channel attacks.

### What is NOT stored
- Plaintext passwords: NEVER stored. Only the scrypt hash.
- Reversible encryption: NOT used. scrypt is a one-way KDF.

### What the database row looks like
```
authAccounts: {
  _id: <Id>,
  provider: "password",
  accountId: "user@example.com",  // the email
  secret: "a1b2c3...:d4e5f6...",  // <salt_hex>:<scrypt_hash_hex>
  userId: <Id>,
  // ...
}
```

---

## 3. Password Length Limits

| Layer | Min | Max | Enforced Where |
|-------|-----|-----|----------------|
| HTML form | 8 | — | `minLength={8}` on `<Input>` |
| Client JS (Auth.tsx) | 8 | 1024 | `handlePasswordSignUp` L101-116 |
| Server (Convex Auth) | 8 | — | `validateDefaultPasswordRequirements` |
| Server (scrypt) | — | ~1GB | `maxmem = 1024^3 + 1024` in lucia scrypt |

The 1024-char client cap is a DoS guard. Without it, an attacker could submit
a multi-megabyte password that the server would feed into scrypt, consuming
CPU. Scrypt's maxmem cap would eventually throw, but the server would still
burn CPU up to that point. The client-side cap rejects before the round-trip.

The server-side `validateDefaultPasswordRequirements` only checks min 8 — it
does NOT enforce an upper bound. This is a minor weakness: a malicious client
that bypasses the JS check could still submit a huge password. **Recommend
upgrading to a custom `validatePasswordRequirements` that also caps at 1024.**

---

## 4. Session Management

- **Session tokens**: JWTs signed with the server's `JWT_PRIVATE_KEY`
  (env var set in Convex dashboard, never exposed to client).
- **JWKS**: Public key endpoint at `/.well-known/jwks.json` for verification.
- **Cookie**: Session JWT stored in httpOnly cookie (set by Convex Auth).
- **Sign-out**: Calls `signOut()` which invalidates the session server-side
  (`invalidateSessions` in `@convex-dev/auth/server`).

---

## 5. Other Security Considerations

### What's GOOD
- ✅ Scrypt password hashing (memory-hard, OWASP-recommended).
- ✅ Per-password random salt (16 bytes from CSPRNG).
- ✅ Constant-time hash verification (no timing attack on password).
- ✅ Unicode normalization (NFKC) before hashing (prevents homoglyph bypass).
- ✅ JWT sessions signed with server-private key (not exposed to client).
- ✅ httpOnly cookies (not readable by client-side JS).
- ✅ No plaintext password storage anywhere.
- ✅ No reversible encryption — pure KDF.
- ✅ OAuth providers (Google/GitHub) are DISABLED until env vars are set
      (no half-configured OAuth surface area).
- ✅ `ProtectedRoute` enforces auth on all dashboard routes.
- ✅ Onboarding gate: new users can't access dashboard until they complete
      onboarding (no empty profile state).
- ✅ Convex Auth's `throwOnError: false` in useQuery prevents the app from
      crashing on transient backend errors.

### What's MISSING / RECOMMENDED

1. **No rate limiting on sign-in.**
   An attacker can submit unlimited password guesses. Mitigation: add a
   `rateLimit` mutation in Convex that tracks failed attempts per email/IP
   and rejects after N tries. Convex Auth doesn't ship this — it must be
   added per-app.

2. **No password complexity requirements.**
   Only length ≥ 8 is enforced. A user could use "aaaaaaaa" as their
   password. Mitigation: pass a custom `validatePasswordRequirements` to
   the Password provider that requires ≥ 1 uppercase, 1 lowercase, 1 digit.

3. **No max-length check on the server.**
   Only the client enforces ≤ 1024 chars. A direct API call could bypass
   this. Mitigation: pass a custom `validatePasswordRequirements` that
   also enforces the upper bound.

4. **No email verification on sign-up.**
   A user can sign up with any email they don't own. Mitigation: configure
   the `verify` option on the Password provider with an email OTP sender
   (the code is already imported — `emailOtp`).

5. **No password reset flow.**
   The `reset` and `reset-verification` flows exist in the Password provider
   but are not wired up in the UI. Mitigation: add a "Forgot password?" link
   that calls `signIn("password", { flow: "reset", email })`.

6. **No CSRF token on the sign-in form.**
   Convex Auth uses cookies for session management. Sign-in itself uses a
   POST body (not cookies), so CSRF isn't directly exploitable on sign-in,
   but state-changing mutations (e.g. updateProfile) should be audited.
   Convex mutations require an authenticated session, so the surface area
   is limited.

7. **No account lockout after N failed attempts.**
   Combined with #1, this means an attacker can brute-force indefinitely
   (limited only by network rate). Mitigation: implement account lockout
   in Convex with a release-after-timeout pattern.

8. **Plain error messages reveal account existence.**
   The sign-in error is "Invalid email or password" — good (doesn't leak
   whether the email exists). But sign-up error from Convex Auth may say
   "account already exists" — this DOES reveal account existence.
   Mitigation: catch the duplicate-account error and rewrite it to a
   generic message.

---

## 6. Files Touched (2026-06-22 security pass)

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Added max-1024-char password check; honored `?mode=signup`; removed non-functional Google/GitHub buttons |
| `src/convex/auth.ts` | (Unchanged) Password + emailOtp providers |
| `src/convex/auth.config.ts` | (Unchanged) Google/GitHub commented out until env vars set |
| `src/hooks/use-auth.ts` | Removed auto-seed of fake data; uses lazy `seedPersonalWorkspace` (idempotent, empty workspace only) |
| `src/components/ProtectedRoute.tsx` | Added onboarding gate — redirects `onboardingComplete=false` users to `/onboarding-user-information` |
| `src/pages/OnboardingSource.tsx` | Replaced NO-OP stub with real `users.completeOnboarding` mutation call |
| `src/pages/OnboardingUserInformation.tsx` | (Unchanged) Saves form to localStorage as intermediate step; OnboardingSource picks it up and persists to Convex |
| `src/pages/AccountSettings.tsx` | Reads profile from `users.getProfile` query; writes via `users.updateProfile` mutation; removed all hardcoded defaults ("Agency User", "user@example.com", "50", etc.) |
| `src/main.tsx` | Added routes for `/onboarding-user-information` and `/onboarding-source` (auth-guarded) |
| `src/pages/Landing.tsx` | Added Sign in / Get Started / Dashboard / Sign out buttons (auth-aware) |
| `src/components/landing/HeroSection.tsx` | Replaced waitlist form with auth-aware CTA |
| `src/components/landing/FinalCTA.tsx` | Replaced waitlist form with auth-aware CTA |
| `src/hooks/use-subscription-tier.ts` | Syncs tier from Convex user record (was localStorage-only — caused tier leak across account switches) |
| `src/hooks/use-workspace.tsx` | Removed MOCK_MEMBERS (8 fake members) and MOCK_STATS (94% protection, $47,850 revenue) hardcoded fallbacks |
| `src/convex/seed.ts` | Stripped ALL hardcoded sample data (Acme Corp, TechStart Inc, DesignFlow Agency clients, sample deals, sample projects) from `seedDevProfile` |
| `src/convex/users.ts` | `getProtectionMetrics` now returns real zeros when no data exists (was returning fake "95% protection score / 171 protected hours") |

---

## 7. Summary Answer to "Do we have a real auth system?"

**YES.** The auth system:
- ✅ Creates new users on sign-up (Password provider, `flow=signUp`).
- ✅ Signs in existing users (Password provider, `flow=signIn`).
- ✅ Stores passwords as scrypt hashes (NOT plaintext, NOT reversible).
- ✅ Matches passwords on sign-in via constant-time scrypt verification.
- ✅ Enforces min 8 chars on both client and server.
- ✅ Enforces max 1024 chars on client (DoS guard).
- ✅ Issues JWT session tokens signed with server-private key.
- ✅ Stores sessions in httpOnly cookies (not readable by client JS).
- ✅ Signs users out via `signOut()` (invalidates server-side sessions).

The auth system is NOT hardcoded — every sign-up creates a real `authAccounts`
+ `users` row in Convex. Every sign-in verifies against the real stored hash.
Every profile field the user enters (name, hourlyRate, bio, platform, etc.)
is persisted to the real `users` document via Convex mutations and shown back
on the AccountSettings page from the same Convex query.
