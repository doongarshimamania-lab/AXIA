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
// See:
//   - https://better-auth.com/docs/concepts/client
//   - https://labs.convex.dev/better-auth/framework-guides/react

import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { magicLinkClient, emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL as string,
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

// ponytail: self-check — fail loudly at module load if the site URL is missing.
// Without this, Better Auth client calls will silently 404 against the
// WebSocket URL instead of the HTTP site URL, producing confusing errors.
if (typeof window !== "undefined" && !import.meta.env.VITE_CONVEX_SITE_URL) {
  console.error(
    "[auth-client] VITE_CONVEX_SITE_URL is not set. Auth API calls will fail. " +
      "Set it in .env.local to your Convex site URL (format: https://<deployment>.convex.site)."
  );
}
