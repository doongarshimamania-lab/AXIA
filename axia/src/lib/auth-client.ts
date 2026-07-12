// src/lib/auth-client.ts — Better Auth React client.
//
// Replaces the prior @convex-dev/auth/react imports (useAuthActions).
// Exposes `authClient` with type-safe methods for:
//   - signUp.email({ email, password, name, image })
//   - signIn.email({ email, password })
//   - signIn.social({ provider: "google" | "microsoft" })
//   - signIn.magicLink({ email }) — sends magic link
//   - emailOtp.sendVerificationOtp({ email })
//   - emailOtp.verifyEmailOtp({ email, otp })
//   - requestPasswordReset({ email, redirectTo })
//   - resetPassword({ token, newPassword })
//   - signOut()
//   - useSession() — React hook for session state (nanostores-backed)
//
// baseURL: VITE_CONVEX_SITE_URL — the Convex deployment's HTTP site URL
// (different from VITE_CONVEX_URL which is the WebSocket URL). Must be set
// in .env.local. Format: https://<deployment-name>.convex.site
//
// FALLBACK: if VITE_CONVEX_SITE_URL is not set (common on Vercel — teams
// often only set VITE_CONVEX_URL), derive it from VITE_CONVEX_URL by
// replacing `.convex.cloud` with `.convex.site`. This keeps Google OAuth
// working without requiring a second env var to be configured.
//
// See:
//   - https://better-auth.com/docs/concepts/client
//   - https://labs.convex.dev/better-auth/framework-guides/react

import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { magicLinkClient, emailOTPClient } from "better-auth/client/plugins";

// ─── Resolve the Convex site URL ────────────────────────────────────────────
// ponytail: this is the fix for the production "VITE_CONVEX_SITE_URL is not
// set" → 405 on /api/auth/sign-in/social bug. Vercel builds only had
// VITE_CONVEX_URL configured; the BA client then POSTed to a relative path
// which Vercel's static file server rejected with 405. We now derive the
// site URL from the cloud URL when the explicit var is missing.
const CONVEX_CLOUD_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;
const EXPLICIT_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as
  | string
  | undefined;

function resolveSiteUrl(): string | undefined {
  if (EXPLICIT_SITE_URL) return EXPLICIT_SITE_URL;
  if (CONVEX_CLOUD_URL) {
    // https://veracious-zebra-519.convex.cloud → https://veracious-zebra-519.convex.site
    return CONVEX_CLOUD_URL.replace(/\.convex\.cloud$/, ".convex.site");
  }
  return undefined;
}

const resolvedSiteUrl = resolveSiteUrl();

if (typeof window !== "undefined" && !resolvedSiteUrl) {
  console.error(
    "[auth-client] Neither VITE_CONVEX_SITE_URL nor VITE_CONVEX_URL is set. " +
      "Auth API calls will fail. Set VITE_CONVEX_URL in your Vercel project " +
      "settings (format: https://<deployment>.convex.cloud) — the site URL " +
      "is derived automatically."
  );
}

export const authClient = createAuthClient({
  baseURL: resolvedSiteUrl,
  plugins: [
    magicLinkClient(),
    emailOTPClient(),
    crossDomainClient(),
    convexClient(),
  ],
});

// Re-export useSession for convenience (consumers can also import from
// `authClient` directly: `authClient.useSession()`).
export const useSession = authClient.useSession;
