import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Server-side owner credential verification
// The OWNER_PASSWORD is stored as a Convex environment variable
export const ownerAuth_verifyOwnerCredentials = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    // Rate limiting: check recent failed attempts
    const recentAttempts = await ctx.db
      .query("ownerAuthAttempts")
      .withIndex("by_time", (q) => q.gte("timestamp", Date.now() - 15 * 60 * 1000))
      .collect();

    const failedAttempts = recentAttempts.filter(a => !a.success);
    if (failedAttempts.length >= 5) {
      return { success: false, error: "Too many attempts. Try again in 15 minutes." };
    }

    const ownerPassword = process.env.OWNER_PASSWORD;
    if (!ownerPassword) {
      console.error("OWNER_PASSWORD environment variable not set");
      return { success: false, error: "Server configuration error" };
    }

    const isCorrect = args.password === ownerPassword;

    // Log the attempt (without storing the password)
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
