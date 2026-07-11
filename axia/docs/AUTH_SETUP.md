# Better Auth Migration — Setup Guide

This document describes the env vars and external service setup required after the Better Auth migration (v6.1.0).

## What was migrated

| Before (Convex Auth) | After (Better Auth) |
|---|---|
| `@convex-dev/auth` v0.0.86 | `better-auth@1.6.x` + `@convex-dev/better-auth@0.12.x` |
| `emailOtp.ts` custom provider (vly.ai) | Better Auth `emailOTP` plugin (Resend) |
| — | Better Auth `magicLink` plugin (Resend) |
| Google/GitHub commented out | Google + Microsoft OAuth wired |
| `authAccounts` table in app schema | `user`/`session`/`account`/`verification` tables inside BA component |
| `getAuthUserId` from `@convex-dev/auth/server` | `getAuthUserId` from `./lib/auth` (compatibility shim) |

## Required setup steps

### 1. Convex environment variables

Set these on your Convex deployment (replace `<deployment>` with your actual deployment name like `veracious-zebra-519`):

```bash
# Generate a 32-byte secret
npx convex env set BETTER_AUTH_SECRET $(openssl rand -base64 32)

# Your app's public URL (the deployed frontend URL)
npx convex env set SITE_URL https://your-app-domain.com

# Convex site URL (auto-managed by Convex — already set)
# CONVEX_SITE_URL is automatically https://<deployment>.convex.site
```

### 2. Frontend env vars (`.env.local`)

```bash
VITE_CONVEX_URL=https://<deployment>.convex.cloud
VITE_CONVEX_SITE_URL=https://<deployment>.convex.site
VITE_SITE_URL=http://localhost:3000   # or your prod URL
```

### 3. Google OAuth setup

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project (or use existing) → enable "Google+ API"
3. Create OAuth 2.0 Client ID → Application type: **Web application**
4. Add authorized redirect URI:
   ```
   https://<deployment>.convex.site/api/auth/callback/google
   ```
5. Copy the Client ID + Client Secret
6. Set on Convex:
   ```bash
   npx convex env set GOOGLE_CLIENT_ID <client-id>.apps.googleusercontent.com
   npx convex env set GOOGLE_CLIENT_SECRET <client-secret>
   ```

**Scopes requested (default):** `openid`, `email`, `profile`
**Data received from Google:** email, email_verified, name, given_name, family_name, picture URL, locale.

### 4. Microsoft OAuth setup

1. Go to https://portal.azure.com → Microsoft Entra ID → App registrations → New registration
2. Redirect URI: **Web** →
   ```
   https://<deployment>.convex.site/api/auth/callback/microsoft
   ```
3. Under "API permissions", ensure `openid`, `email`, `profile`, `User.Read` are delegated
4. Under "Certificates & secrets" → New client secret → copy the value
5. Copy the Application (client) ID + the secret value
6. Set on Convex:
   ```bash
   npx convex env set MICROSOFT_CLIENT_ID <client-id>
   npx convex env set MICROSOFT_CLIENT_SECRET <client-secret>
   ```

**Scopes requested (default):** `openid`, `email`, `profile`, `User.Read`
**Data received from Microsoft:** email, displayName, givenName, surname, jobTitle, department, officeLocation, businessPhones, mobilePhone.

### 5. Resend email setup

1. Sign up at https://resend.com (free tier: 3,000 emails/month, 100 emails/day)
2. Generate an API key at https://resend.com/api-keys
3. Set on Convex:
   ```bash
   npx convex env set RESEND_API_KEY re_xxx
   ```
4. **For production:** verify your sending domain (e.g. `axia.com`) in Resend dashboard
   - Add the DNS records Resend shows you (MX, SPF, DKIM) to your domain's DNS
   - Wait 5-30 minutes for propagation
   - Set the sender:
     ```bash
     npx convex env set EMAIL_FROM "Axia <noreply@axia.com>"
     ```
5. **For development:** skip domain verification, use Resend's shared sender:
   ```bash
   npx convex env set EMAIL_FROM "Axia <onboarding@resend.dev>"
   ```

## Email flow coverage

| Flow | Trigger | Email sent |
|---|---|---|
| Sign up (password) | `authClient.signUp.email()` | Verification email (24h link) |
| Sign in (password) | `authClient.signIn.email()` | None |
| Sign in (Google) | `authClient.signIn.social({provider:"google"})` | None (Google handles) |
| Sign in (Microsoft) | `authClient.signIn.social({provider:"microsoft"})` | None (Microsoft handles) |
| Sign in (magic link) | `authClient.signIn.magicLink({email})` | Magic link email (15min) |
| Sign in (email OTP) | `authClient.emailOtp.sendVerificationOtp({email})` | 6-digit code email (15min) |
| Forgot password | `authClient.requestPasswordReset({email})` | Reset link email (1h) |
| Reset password | `authClient.resetPassword({token,newPassword})` | None |
| Change password | `changePassword` mutation | None (sessions revoked) |
| Change email | `changeEmail` mutation | Verification email to new address |

## Testing the auth flows

After deploy, test each flow on the `/auth` page:

1. **Sign up with email + password** → should create account + send verification email
2. **Sign in with email + password** → should sign in
3. **Sign in with Google** → should redirect to Google → callback → signed in
4. **Sign in with Microsoft** → should redirect to Microsoft → callback → signed in
5. **Email OTP** → "More sign-in options" → Email OTP → enter email → receive 6-digit code → verify
6. **Forgot password** → click "Forgot password?" → enter email → receive reset link → set new password
7. **Sign out** → Account Settings → Sign Out → should clear session + reload
8. **Change password** → Account Settings → Security → Change Password → verify current password rejected if wrong, new password accepted
9. **Change email** → Account Settings → Profile → Change Email → verify current password, new email receives verification email

## What doesn't work yet (post-migration TODOs)

- **Admin password reset** (`adminListAll:resetPassword`) — temporarily disabled. Was using direct DB patch on `authAccounts` which no longer exists. Use the "Forgot password?" flow instead.
- **List auth accounts** (`adminListAll:listAllAuthAccounts`, `debug:listAuthAccountsForEmail`) — returns empty. The `account` table now lives in the BA component. Re-implement via BA admin API if needed.
- **Clean orphaned auth accounts** (`debug:cleanOrphanedAuthAccounts`) — no-op stub. Same reason.

These are admin/debug tools, not user-facing flows. All user-facing auth (sign-up, sign-in, password reset, OAuth, OTP, magic link, change password, change email) is fully functional.
