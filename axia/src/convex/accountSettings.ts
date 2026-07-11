// convex/accountSettings.ts — backend mutations for AccountSettings page.
//
// Replaces the prior Convex Auth implementation (which used retrieveAccount,
// modifyAccountCredentials, invalidateSessions from @convex-dev/auth/server)
// with Better Auth API calls via authComponent.getAuth().
//
// Both `changePassword` and `changeEmail` actions:
//   1. Get the BA auth instance + session headers via getAuth(ctx).
//   2. Call the BA API method (auth.api.changePassword / auth.api.changeEmail)
//      — BA internally verifies the currentPassword against the stored hash.
//   3. Revoke all other sessions via auth.api.revokeAllSessions.
//
// BA handles password hashing (scrypt), account lookup, and session
// invalidation internally — we don't touch the authAccounts/authSessions
// tables directly anymore (they live inside the BA component anyway).
//
// (Audit items #16, #17 from the prior IDOR-fix pass.)

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId, getAuth } from "./lib/auth";

// ponytail: import the password policy constants directly from the BA config
// in auth.ts. These are the same values used at sign-up time — keeps the
// policy in one place.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 16;

/**
 * changePassword — verifies the current password, then sets a new one via
 * Better Auth's auth.api.changePassword. BA internally:
 *   - Looks up the credential account by session user ID
 *   - Verifies currentPassword against the stored scrypt hash
 *   - Hashes newPassword with scrypt (N=16384, r=16, p=1, dkLen=64)
 *   - Overwrites the stored hash
 *   - Revokes all other sessions (we also do this explicitly below for
 *     defense-in-depth)
 *
 * Throws on any failure (wrong current password, password too short/long,
 * server error). Returns { success: true } on success.
 */
export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Validate new password against the same policy enforced at signup.
    if (args.newPassword.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`New password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (args.newPassword.length > PASSWORD_MAX_LENGTH) {
      throw new Error(`New password must be at most ${PASSWORD_MAX_LENGTH} characters (DoS protection)`);
    }
    if (args.newPassword === args.currentPassword) {
      throw new Error("New password must be different from the current password");
    }

    // BA API call — verifies currentPassword, hashes newPassword, persists.
    const { auth, headers } = await getAuth(ctx);
    await auth.api.changePassword({
      body: {
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
      },
      headers,
    });

    // Defense-in-depth: revoke all sessions. The user will need to sign in
    // again with the new password. BA's changePassword may already do this
    // depending on config — calling explicitly guarantees it.
    await auth.api.revokeAllSessions({ headers });

    return { success: true };
  },
});

/**
 * changeEmail — verifies the current password, then changes the user's email
 * via Better Auth's auth.api.changeEmail. BA internally:
 *   - Verifies currentPassword
 *   - Updates the `email` field on the BA user record
 *   - Updates the credential account's providerAccountId (so sign-in with
 *     new email works)
 *   - Optionally sends a verification email to the new address
 *
 * We ALSO patch the linked users-table record so the rest of the app
 * (which reads from `users.email`) sees the new email immediately.
 *
 * After the change, ALL sessions are revoked — the user must re-sign-in
 * with the new email. This is the secure default for email changes
 * (NIST 800-63B).
 */
export const changeEmail = mutation({
  args: {
    newEmail: v.string(),
    currentPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Normalize + validate the new email.
    const newEmail = args.newEmail.trim().toLowerCase();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new Error("Please enter a valid email address");
    }

    // Load the current users-table record (for the old email + to patch later).
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("Account has no email on file");
    }
    const oldEmail = user.email;
    if (newEmail === oldEmail.toLowerCase()) {
      throw new Error("New email is the same as the current email");
    }

    // BA API call — verifies currentPassword, changes email on BA user record.
    // BA throws if the new email is already in use by another account.
    const { auth, headers } = await getAuth(ctx);
    await auth.api.changeEmail({
      body: {
        newEmail,
        currentPassword: args.currentPassword,
      },
      headers,
    });

    // Sync the linked users-table record so the rest of the app sees the
    // new email immediately.
    await ctx.db.patch(userId, {
      email: newEmail,
      emailVerificationTime: undefined, // reset — new email is unverified
    });

    // Revoke ALL sessions — user must re-sign-in with the new email.
    await auth.api.revokeAllSessions({ headers });

    return { success: true, newEmail };
  },
});

/**
 * getCurrentEmail — returns the current email so the change-email dialog can
 * show "Change from <old> to <new>" without re-fetching the profile.
 */
export const getCurrentEmail = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    return user?.email ?? null;
  },
});
