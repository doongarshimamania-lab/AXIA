// src/hooks/use-auth.ts — central auth hook (Better Auth version).
//
// Replaces the prior @convex-dev/auth/react useAuthActions-based hook.
// Now wraps the Better Auth client (`authClient`) and exposes the same
// `useAuth()` API surface to existing callers:
//   { isLoading, isAuthenticated, user, signIn, signOut }
//
// `signIn` is now a multi-method dispatcher matching BA's API:
//   signIn("password", { email, password }) — sign in with email + password
//   signIn("password", { email, password, name, flow: "signUp" }) — sign up
//   signIn("google") — Google OAuth
//   signIn("microsoft") — Microsoft OAuth
//   signIn("magicLink", { email }) — passwordless magic link
//   signIn("emailOtp", { email }) — send 6-digit code
//   signIn("emailOtp", { email, otp }) — verify the 6-digit code
//
// The existing AccountSettings page does NOT call signIn directly — it uses
// the wrapped `signOut` (which clears Axia localStorage + reloads).
// Auth.tsx is the only consumer of signIn.

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, useCallback } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * useAuth — central auth hook.
 *
 * CRITICAL: hook is read-only re: workspace seeding.
 * FIX (SIGNOUT-LEAK): `signOut` wipes axia_* localStorage keys and forces a
 * full reload, so the next user starts from a clean slate.
 */
const AXIA_LS_KEYS = [
  "axia_active_workspace",
  "axia_account_mode",
  "axia_subscription_tier",
  "axia_sidebar_state",
  "axia_client_email",
  "onboardingData",
];

// Type for the multi-method signIn dispatcher.
type SignInMethod =
  | "password"
  | "google"
  | "microsoft"
  | "magicLink"
  | "emailOtp";

interface SignInArgs {
  email?: string;
  password?: string;
  name?: string;
  otp?: string;
  flow?: "signIn" | "signUp";
}

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();

  // Query the current user from Convex (linked users-table record).
  // Uses the safe-convex-react wrapper to gracefully handle backend errors.
  const user = useQuery(api.users.currentUser, {});

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthLoading]);

  // ─── signIn dispatcher ─────────────────────────────────────────────────
  // Matches the prior Convex Auth surface: signIn(method, args).
  // Throws on error; returns void on success.
  const signIn = useCallback(
    async (method: SignInMethod, args: SignInArgs = {}) => {
      switch (method) {
        case "password": {
          if (args.flow === "signUp") {
            // Sign-up: BA creates the user + session.
            const { error } = await authClient.signUp.email({
              email: args.email!,
              password: args.password!,
              name: args.name ?? "",
            });
            if (error) throw error;
          } else {
            // Sign-in: BA verifies credentials + issues session.
            const { error } = await authClient.signIn.email({
              email: args.email!,
              password: args.password!,
            });
            if (error) throw error;
          }
          return;
        }
        case "google": {
          // BA redirects to Google → callback → session issued → redirect to app.
          // callbackURL tells Better Auth where to send the user AFTER the OAuth
          // callback completes. We send ALL OAuth sign-ins directly to the first
          // onboarding step. New users land on onboarding (their first visit);
          // returning users who already completed onboarding are bounced from
          // /onboarding-user-information → /dashboard by the OnboardingUserInformation
          // page's own redirect effect. This guarantees the OAuth entry point is
          // always onboarding, never the dashboard.
          const callbackURL =
            typeof window !== "undefined"
              ? window.location.origin + "/onboarding-user-information"
              : undefined;
          await authClient.signIn.social({
            provider: "google",
            callbackURL,
          });
          return;
        }
        case "microsoft": {
          const callbackURL =
            typeof window !== "undefined"
              ? window.location.origin + "/onboarding-user-information"
              : undefined;
          await authClient.signIn.social({
            provider: "microsoft",
            callbackURL,
          });
          return;
        }
        case "magicLink": {
          // Sends a magic link email. User clicks → sign-in completed.
          const { error } = await authClient.signIn.magicLink({
            email: args.email!,
          });
          if (error) throw error;
          return;
        }
        case "emailOtp": {
          if (args.otp) {
            // Verify OTP
            const { error } = await authClient.emailOtp.verifyEmailOtp({
              email: args.email!,
              otp: args.otp,
            });
            if (error) throw error;
          } else {
            // Send OTP
            const { error } = await authClient.emailOtp.sendVerificationOtp({
              email: args.email!,
              type: "sign-in",
            });
            if (error) throw error;
          }
          return;
        }
        default:
          throw new Error(`Unknown sign-in method: ${method}`);
      }
    },
    []
  );

  // ─── signOut: wipe Axia state + reload ──────────────────────────────────
  // ponytail: wrap signOut so all axia_* localStorage keys are cleared and
  // the page is reloaded — guarantees the next user starts with no stale
  // SPA state (WorkspaceProvider's seedAttempted ref, in-memory caches, etc.)
  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } finally {
      for (const k of AXIA_LS_KEYS) {
        try {
          localStorage.removeItem(k);
        } catch {}
      }
      // Hard reload to reset every in-memory ref / provider state.
      if (typeof window !== "undefined") window.location.href = "/";
    }
  }, []);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
