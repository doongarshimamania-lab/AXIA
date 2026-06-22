// @ts-nocheck
// TEMPORARY ADMIN DEBUG — list all auth accounts and users.
// DELETE THIS FILE BEFORE PRODUCTION DEPLOY.
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAllAuthAccounts = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    return accounts.map(a => ({
      _id: a._id,
      provider: a.provider,
      providerAccountId: a.providerAccountId,
      userId: a.userId,
      hasSecret: !!a.secret,
      secretLength: a.secret?.length ?? 0,
      secretPrefix: a.secret?.substring(0, 8) ?? "",
    }));
  },
});

export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(u => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      tier: u.subscriptionTier,
      onboardingComplete: u.onboardingComplete,
      isAnonymous: u.isAnonymous,
    }));
  },
});

/**
 * Reset a user's password to a known value.
 * Usage:
 *   npx convex run adminListAll:resetPassword '{ "email": "user@example.com", "newPassword": "NewPass123!" }'
 */
export const resetPassword = mutation({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    if (args.newPassword.length > 1024) {
      throw new Error("Password must be at most 1024 characters");
    }

    // Find the auth account for this email
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email)
      )
      .unique();

    if (!account) {
      return { found: false, message: "No auth account found for this email. The email may not be registered." };
    }

    // Hash the new password using the same Scrypt implementation as Convex Auth
    const { Scrypt } = await import("lucia");
    const scrypt = new Scrypt();
    const newHash = await scrypt.hash(args.newPassword);

    await ctx.db.patch(account._id, { secret: newHash });

    return {
      found: true,
      accountId: account._id,
      userId: account.userId,
      message: "Password reset successfully. You can now sign in with the new password.",
    };
  },
});
