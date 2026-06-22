"use node";

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import crypto from "crypto";

// Server-side owner credential verification.
// The OWNER_PASSWORD is stored as a Convex environment variable.
// CRITICAL FIXES APPLIED (v5.4.0 security audit):
//   1. Constant-time password comparison (was `===` — timing attack-able).
//   2. Bounded rate-limit query (was .collect() — DoS amplification).
//   3. Password length cap to prevent LPDOS via huge-string comparison.
export const ownerAuth_verifyOwnerCredentials = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    // Cap input length — same LPDOS guard as the user auth flow.
    const candidate = args.password.slice(0, 256);

    // Rate limiting: 5 failed attempts per 15 minutes. Bounded query
    // (was .collect() — at scale this could fetch thousands of rows per
    // attempt, amplifying the DoS it was supposed to prevent).
    const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
    const recentAttempts = await ctx.db
      .query("ownerAuthAttempts")
      .withIndex("by_time", (q) => q.gte("timestamp", fifteenMinAgo))
      .take(1000);

    const failedAttempts = recentAttempts.filter((a) => !a.success);
    if (failedAttempts.length >= 5) {
      return {
        success: false,
        error: "Too many attempts. Try again in 15 minutes.",
      };
    }

    const ownerPassword = process.env.OWNER_PASSWORD;
    if (!ownerPassword) {
      console.error("OWNER_PASSWORD environment variable not set");
      return { success: false, error: "Server configuration error" };
    }

    // Constant-time comparison: only safe to call timingSafeEqual on equal-length
    // buffers, so check length first (this DOES leak length, but the owner
    // password length is fixed and not security-relevant).
    const candBuf = Buffer.from(candidate, "utf8");
    const expBuf = Buffer.from(ownerPassword, "utf8");
    let isCorrect = false;
    if (candBuf.length === expBuf.length) {
      isCorrect = crypto.timingSafeEqual(candBuf, expBuf);
    }

    // Log the attempt (without storing the password).
    await ctx.db.insert("ownerAuthAttempts", {
      timestamp: Date.now(),
      success: isCorrect,
    });

    if (!isCorrect) {
      return { success: false, error: "Invalid credentials" };
    }

    return { success: true };
  },
});
