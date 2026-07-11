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

// ─── Auth options factory ──────────────────────────────────────────────────
// Better Auth requires a per-request factory because the adapter needs the
// current ctx. The http.ts route registration calls this with the HTTP ctx;
// lib/auth.ts uses authComponent.getAuthUser(ctx) which doesn't need this.
export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: process.env.CONVEX_SITE_URL,
    trustedOrigins: [siteUrl],

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
