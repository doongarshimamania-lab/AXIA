// ponytail: new file — backend actions for the AccountSettings page's
// 'Change email' and 'Change password' buttons. Previously both buttons
// only fired toast.info('Email hello@axia.com...') / toast.info('Sign out
// then click Forgot password...') — no real flow. The profile email field
// (#17) was editable but never persisted. This file wires all three to
// real Convex Auth flows.
//
// Both actions use `retrieveAccount` from @convex-dev/auth/server to
// verify the user's current password before allowing the change — so a
// stolen session cookie can't be used to take over the account.
//
// (Audit items #16, #17.)

import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId, retrieveAccount, modifyAccountCredentials, invalidateSessions } from "@convex-dev/auth/server";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "./auth";

/**
 * changePassword — verifies the current password, then sets a new one
 * via modifyAccountCredentials (the official Convex Auth API for
 * changing a password). Both old and new passwords are transmitted to
 * the server; only the new hash is stored.
 *
 * Returns { success: true } on success. Throws on any failure
 * (wrong current password, password too short/long, server error).
 */
export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Validate new password against the same policy enforced at signup
    // (see src/convex/auth.ts). This prevents a user from weakening their
    // password below the production policy at change time.
    if (args.newPassword.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`New password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (args.newPassword.length > PASSWORD_MAX_LENGTH) {
      throw new Error(`New password must be at most ${PASSWORD_MAX_LENGTH} characters (DoS protection)`);
    }
    if (args.newPassword === args.currentPassword) {
      throw new Error("New password must be different from the current password");
    }

    // Look up the user's email — needed to identify their authAccounts row.
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("Account has no email on file — cannot verify current password");
    }
    const email = user.email;

    // Verify the current password by retrieving the account. retrieveAccount
    // returns null if the account doesn't exist OR if the secret doesn't match.
    const retrieved = await retrieveAccount(ctx, {
      provider: "password",
      account: { id: email, secret: args.currentPassword },
    });
    if (!retrieved) {
      throw new Error("Current password is incorrect");
    }
    // Defensive: make sure the account belongs to the authenticated user.
    if (retrieved.user._id !== userId) {
      throw new Error("Account mismatch — refusing to change password");
    }

    // Set the new password hash. modifyAccountCredentials overwrites the
    // stored secret for the (provider, accountId) pair.
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: args.newPassword },
    });

    // Invalidate all OTHER sessions so any stolen cookies stop working.
    // The current session (this request) is kept so the user stays logged in.
    // We pass the current session ID via ctx.auth getSessionId — but
    // invalidateSessions takes `except` as session IDs to KEEP. Since we
    // don't easily have the current session ID here, we skip the except
    // and let the user re-sign-in if needed. (Trade-off: simpler + safer.)
    await invalidateSessions(ctx, { userId });

    return { success: true };
  },
});

/**
 * changeEmail — verifies the current password, checks the new email isn't
 * already in use, then updates BOTH the `users.email` field AND the
 * `authAccounts.accountId` field (so the user can sign in with the new
 * email). Invalidates all sessions afterwards — the user must re-sign-in
 * with the new email. This is the standard "email change requires
 * re-authentication" pattern.
 *
 * Returns { success: true, newEmail } on success.
 */
export const changeEmail = action({
  args: {
    newEmail: v.string(),
    currentPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Normalize the new email.
    const newEmail = args.newEmail.trim().toLowerCase();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new Error("Please enter a valid email address");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("Account has no email on file");
    }
    const oldEmail = user.email;

    if (newEmail === oldEmail.toLowerCase()) {
      throw new Error("New email is the same as the current email");
    }

    // Verify current password.
    const retrieved = await retrieveAccount(ctx, {
      provider: "password",
      account: { id: oldEmail, secret: args.currentPassword },
    });
    if (!retrieved) {
      throw new Error("Current password is incorrect");
    }
    if (retrieved.user._id !== userId) {
      throw new Error("Account mismatch — refusing to change email");
    }

    // Check the new email isn't already taken by another user. We query
    // authAccounts by (provider, providerAccountId) — if any row matches,
    // the email is in use. The authAccounts table is part of authTables
    // and the index is defined by Convex Auth as
    // .index("providerAndAccountId", ["provider", "providerAccountId"]).
    const existingAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q: any) =>
        q.eq("provider", "password").eq("providerAccountId", newEmail)
      )
      .first();
    if (existingAccount) {
      throw new Error("This email is already in use by another account");
    }

    // Update the authAccounts row: change providerAccountId from oldEmail
    // to newEmail. We can't use modifyAccountCredentials here because it
    // only changes the secret, not the providerAccountId. So we patch the
    // row directly. The row was returned by retrieveAccount as
    // `retrieved.account`.
    await ctx.db.patch(retrieved.account._id, { providerAccountId: newEmail });

    // Update the users row so the rest of the app sees the new email.
    await ctx.db.patch(userId, { email: newEmail });

    // Invalidate ALL sessions — the user must re-sign-in with the new email.
    // This is the secure default for email changes (NIST 800-63B).
    await invalidateSessions(ctx, { userId });

    return { success: true, newEmail };
  },
});

/**
 * getEmailChangePreview — returns the current email so the dialog can
 * show "Change from <old> to <new>" without the frontend needing to
 * re-fetch the profile. Kept as a query for symmetry with changeEmail.
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
