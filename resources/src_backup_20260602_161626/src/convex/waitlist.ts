import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateReferralCode, calculatePosition } from "./waitlistHelpers";
import { getAuthUserId } from "@convex-dev/auth/server";

export const addToWaitlist = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
    referredBy: v.optional(v.string()), // Referral code of referrer
  },
  handler: async (ctx, args) => {
    if (process.env.NODE_ENV === "development") console.log("[BACKEND] addToWaitlist called");

    try {
      // Check if email already exists
      const existing = await ctx.db
        .query("waitlistEntries")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();

      if (existing) {
        if (process.env.NODE_ENV === "development") console.log("[BACKEND] Email already exists");
        return {
          success: true,
          alreadyExists: true,
          entry: existing
        };
      }

      // Get current waitlist count for position
      const allEntries = await ctx.db
        .query("waitlistEntries")
        .collect();

      // Starting position for batch AZ is 83
      const basePosition = allEntries.length + 83;

      // Generate unique referral code for this user
      let referralCode = generateReferralCode();

      // Ensure referral code is unique
      let codeExists = await ctx.db
        .query("waitlistEntries")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
        .first();

      while (codeExists) {
        referralCode = generateReferralCode();
        codeExists = await ctx.db
          .query("waitlistEntries")
          .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
          .first();
      }

      // Add new entry
      const id = await ctx.db.insert("waitlistEntries", {
        email: args.email,
        submittedAt: Date.now(),
        source: args.source || "unknown",
        referralCode,
        referredBy: args.referredBy || undefined,
        referredCount: 0,
        position: basePosition,
      });

      if (process.env.NODE_ENV === "development") console.log("[BACKEND] Entry created");

      // If this user was referred, update the referrer's count and position
      if (args.referredBy) {
        const referrer = await ctx.db
          .query("waitlistEntries")
          .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referredBy!))
          .first();

        if (referrer) {
          const newReferredCount = (referrer.referredCount ?? 0) + 1;
          const currentPosition = referrer.position ?? allEntries.length;
          const newPosition = calculatePosition(currentPosition, newReferredCount);

          await ctx.db.patch(referrer._id, {
            referredCount: newReferredCount,
            position: newPosition,
          });

          if (process.env.NODE_ENV === "development") console.log("[BACKEND] Updated referrer, new position:", newPosition);
        }
      }

      // Get the created entry to return
      const newEntry = await ctx.db.get(id);

      return {
        success: true,
        alreadyExists: false,
        entry: newEntry
      };
    } catch (error) {
      console.error("[BACKEND] Error in addToWaitlist:", error);
      throw error;
    }
  },
});

export const getWaitlistCount = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("waitlistEntries").take(10000);
    return entries.length;
  },
});

// SECURITY: Admin-only — requires auth + admin role
export const getAllWaitlistEntries = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") return [];

    const entries = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_submitted_at")
      .order("desc")
      .take(1000);
    return entries;
  },
});

export const getEntryByReferralCode = query({
  args: {
    referralCode: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode))
      .first();

    return entry;
  },
});

// SECURITY: Requires auth — prevents email enumeration by unauthenticated users
export const getEntryByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const entry = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return entry;
  },
});

export const getReferralStats = query({
  args: {
    referralCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user's entry
    const entry = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode))
      .first();

    if (!entry) {
      return null;
    }

    // Get list of people they referred
    const referrals = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_referred_by", (q) => q.eq("referredBy", args.referralCode))
      .collect();

    return {
      entry,
      referrals,
      referralCount: entry.referredCount,
      position: entry.position,
    };
  },
});
