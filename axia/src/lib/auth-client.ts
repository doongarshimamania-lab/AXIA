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
// ponytail: bulletproof resolver — handles ALL three misconfiguration modes:
//   1. VITE_CONVEX_SITE_URL missing  → derive from VITE_CONVEX_URL
//   2. VITE_CONVEX_SITE_URL set to .convex.cloud (WRONG — that's the WS URL)
//      → rewrite to .convex.site
//   3. VITE_CONVEX_SITE_URL set correctly to .convex.site → use as-is
// Without this, Vercel builds where the user set VITE_CONVEX_SITE_URL to the
// cloud URL by mistake produced: POST /api/auth/get-session → 404 on the
// WebSocket host. Better Auth's HTTP routes ONLY exist on .convex.site.
const CONVEX_CLOUD_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;
const EXPLICIT_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as
  | string
  | undefined;

function toSiteUrl(url: string): string {
  // Convert any .convex.cloud host to .convex.site. Also strips any trailing
  // slash so baseURL doesn't end up double-slashed when BA appends /api/auth.
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.replace(/\.convex\.cloud(\/|$)/, ".convex.site$1");
}

function resolveSiteUrl(): string | undefined {
  // Prefer the explicit site URL, but normalize it (user may have entered the
  // cloud URL by mistake — extremely common confusion).
  if (EXPLICIT_SITE_URL) return toSiteUrl(EXPLICIT_SITE_URL);
  // Fallback: derive from the cloud URL.
  if (CONVEX_CLOUD_URL) return toSiteUrl(CONVEX_CLOUD_URL);
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
} else if (
  typeof window !== "undefined" &&
  EXPLICIT_SITE_URL &&
  EXPLICIT_SITE_URL !== resolvedSiteUrl
) {
  // ponytail: surface the auto-correction so the user knows their env var was
  // misconfigured (helps them fix it on Vercel rather than relying on the
  // silent rewrite).
  console.warn(
    `[auth-client] VITE_CONVEX_SITE_URL was set to "${EXPLICIT_SITE_URL}" ` +
      `but auto-corrected to "${resolvedSiteUrl}" — Better Auth HTTP routes ` +
      `only exist on .convex.site, not .convex.cloud. ` +
      `Update the env var on Vercel to remove this warning.`
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
