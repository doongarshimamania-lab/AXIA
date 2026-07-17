// convex/auth.ts — Better Auth instance + component client.
//
// Replaces the prior @convex-dev/auth setup (convexAuth + Password + emailOtp).
// Now uses Better Auth with:
//   - Email + password (scrypt hashing, 8-16 char policy preserved)
//   - Google OAuth (openid email profile scopes — name, email, avatar)
//   - Microsoft OAuth (openid email profile User.Read scopes — name, email, avatar)
//   - emailOTP plugin (replaces the old emailOtp.ts custom provider)
//   - magicLink plugin (passwordless sign-in via one-time email link)
//   - Resend email integration (replaces email.vly.ai)
//
// Architecture:
//   - Better Auth tables (user, session, account, verification) live INSIDE
//     the @convex-dev/better-auth Convex Component — NOT in our schema.ts.
//   - Our existing `users` table (with subscriptionTier, hourlyRate, etc.)
//     stays untouched. It is linked to Better Auth's `user` table via the
//     `betterAuthUserId` field (added in tables/users.ts).
//   - All 68 backend files that previously called `getAuthUserId` from
//     `@convex-dev/auth/server` now import it from `./lib/auth` — a
//     compatibility shim that calls `authComponent.getAuthUser(ctx)` and
//     looks up the linked users-table record.
//
// Email flow:
//   - Resend sends: verification, password reset, magic link, OTP emails.
//   - Sender: "Axia <noreply@axia.com>" by default (configurable via
//     `EMAIL_FROM` env var). To use this in production, verify axia.com
//     (or your domain) in the Resend dashboard — see README.md.
//   - Without a verified domain, Resend only allows `onboarding@resend.dev`
//     as the sender — fine for testing, fails in production.
//
// OAuth provider configuration:
//   - Google: requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env vars
//     + redirect URI set to `https://<convex-site>/api/auth/callback/google`
//   - Microsoft: requires `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET` env vars
//     + redirect URI set to `https://<convex-site>/api/auth/callback/microsoft`
//   - Scopes requested (default for both): `openid email profile`
//     → returns: email, name, profile picture URL, email verification status.
//   - For Microsoft, `User.Read` is added automatically by Better Auth to
//     fetch the user's profile from Microsoft Graph.
//   - To request additional scopes (e.g. Google Calendar), override the
//     `scopes` array on the provider config below.
//
// See:
//   - https://labs.convex.dev/better-auth/getting-started
//   - https://better-auth.com/docs/concepts/oauth
//   - https://better-auth.com/docs/plugins/email-otp
//   - https://better-auth.com/docs/plugins/magic-link

import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins/email-otp";
import { magicLink } from "better-auth/plugins/magic-link";
import {
  sendEmailVerification,
  sendMagicLink,
  sendOTPVerification,
  sendResetPassword,
} from "./email";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

// ─── Component client ───────────────────────────────────────────────────────
// Provides adapter(), getAuth(), getAuthUser(), registerRoutes() etc.
// Used by http.ts (route registration) and lib/auth.ts (getAuthUserId shim).
export const authComponent = createClient<DataModel>(components.betterAuth, {
  verbose: false,
});

// ─── Trusted-origin resolver ────────────────────────────────────────────────
// ponytail: one resolver used by both createAuthOptions and registerRoutesLazy
// in http.ts. Root-cause fix for CORS preflight failures from Vercel previews.
// Better Auth's matchesOriginPattern supports `*` wildcards natively, so we
// don't need a function — just an array with a wildcard for *.vercel.app.
// OAuth redirect URIs are still pinned at the Google/Azure console, so origin
// matching here only gates CORS + cookie SameSite — not OAuth itself.
// Upgrade path: replace the wildcard with an explicit allowlist of preview
// branches if a multi-tenant leak risk ever materializes.
export const trustedOriginsList: string[] = [
  siteUrl,
  "https://axia-bay.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://*.vercel.app",
].filter((o): o is string => typeof o === "string" && o.length > 0);

// ─── Auth options factory ──────────────────────────────────────────────────
// Better Auth requires a per-request factory because the adapter needs the
// current ctx. The http.ts route registration calls this with the HTTP ctx;
// lib/auth.ts uses authComponent.getAuthUser(ctx) which doesn't need this.
export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: process.env.CONVEX_SITE_URL,
    // appName is shown on email templates and some OAuth consent screens.
    // Google's consent screen primarily shows the redirect_uri domain
    // (veracious-zebra-519.convex.site). To fully show "Axia" there, a
    // custom domain (e.g. auth.axia.app) must be configured on the Convex
    // deployment + Google OAuth console. This appName is the best we can
    // do without a custom domain.
    appName: "Axia",
    trustedOrigins: trustedOriginsList,

    database: authComponent.adapter(ctx),

    // ─── Email + Password ──────────────────────────────────────────────────
    emailAndPassword: {
      enabled: true,
      // Preserve the 8-16 char password policy from the prior Convex Auth
      // setup (LPDOS guard — see comment block in the old auth.ts, preserved
      // here for posterity):
      //   - scrypt (N=16384, r=16, p=1, dkLen=64) costs ~25ms + 2MB RAM per hash
      //   - 16 chars at this cost is bounded; longer passwords enable DoS
      //   - 16 chars with mixed-case + digits + symbols = 95^16 ≈ 4.4 × 10^31
      //     combinations — far beyond any practical brute-force budget.
      // Better Auth enforces minPasswordLength on its own; the max is enforced
      // client-side + via the sendResetPassword/changePassword API.
      minPasswordLength: 8,
      maxPasswordLength: 16,
      requireEmailVerification: false, // set true after Resend domain verified
      sendResetPassword: async ({ user, url }) => {
        await sendResetPassword(requireActionCtx(ctx), { to: user.email, url });
      },
    },

    // ─── Email verification ────────────────────────────────────────────────
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmailVerification(requireActionCtx(ctx), { to: user.email, url });
      },
    },

    // ─── Social providers (Google + Microsoft only, per user request) ─────
    // GMail sign-in is just Google sign-in — no separate provider needed.
    // Scopes: openid (OIDC), email (email + email_verified), profile (name +
    // given_name + family_name + picture). Returns: email, name, avatar URL.
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              // Default scopes: ["openid", "email", "profile"]
              // To add Calendar/Drive/etc., override:
              //   scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar"]
            },
          }
        : {}),
      ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
        ? {
            microsoft: {
              clientId: process.env.MICROSOFT_CLIENT_ID,
              clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
              // Default scopes: ["openid", "email", "profile", "User.Read"]
              // Returns: email, displayName, givenName, surname, jobTitle,
              // department, officeLocation, businessPhones, mobilePhone.
              // To add Mail.Read/Files.Read.All/etc., override:
              //   scope: ["openid", "email", "profile", "User.Read", "Mail.Read"]
            },
          }
        : {}),
    },

    // ─── Plugins ──────────────────────────────────────────────────────────
    plugins: [
      // Passwordless: one-time 6-digit code emailed to user.
      // Replaces the old emailOtp.ts custom provider.
      emailOTP({
        otpLength: 6,
        expiresIn: 15 * 60, // 15 minutes
        async sendVerificationOTP({ email, otp }) {
          await sendOTPVerification(requireActionCtx(ctx), { to: email, code: otp });
        },
      }),

      // Passwordless: one-time magic link emailed to user.
      // Link expires in 15 minutes; click → instant sign-in.
      magicLink({
        expiresIn: 60 * 15, // 15 minutes
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLink(requireActionCtx(ctx), { to: email, url });
        },
      }),

      // Required for client-side frameworks (Vite SPA in our case).
      crossDomain({ siteUrl }),

      // Required for Convex compatibility (JWT issuance, JWKS endpoint).
      convex({ authConfig }),
    ],

    // ─── Account linking ──────────────────────────────────────────────────
    // Allow same email to link across providers (e.g. user signs up with
    // password, later signs in with Google → accounts auto-link).
    account: {
      accountLinking: {
        enabled: true,
      },
    },

    // ─── User deletion (GDPR compliance) ──────────────────────────────────
    user: {
      deleteUser: { enabled: true },
    },

    // ─── Rate limiting (defense-in-depth on top of http.ts rate limiter) ──
    rateLimit: {
      storage: "database",
    },

    // ─── Session config (v7.2 hardening) ───────────────────────────────────
    // ponytail: explicit session TTL for a financial-data app. BA defaults to
    // 7 days, which is too long for our threat model. 24h expiresIn with 1h
    // updateAge means: session JWT rotates every hour (sliding window), and
    // the session hard-expires after 24h of inactivity, forcing a re-login.
    session: {
      expiresIn: 60 * 60 * 24, // 24 hours
      updateAge: 60 * 60, // 1 hour (refresh window)
    },
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

// ─── Helper query: current user (used by use-auth.ts) ──────────────────────
// Returns the full Better Auth user record OR null. Backend mutations use the
// `getAuthUserId` shim in lib/auth.ts (which returns the linked users-table Id).
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx);
  },
});
