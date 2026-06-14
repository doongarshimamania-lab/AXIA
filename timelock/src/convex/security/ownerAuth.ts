// @ts-nocheck — Convex backend file with schema types not yet in generated types
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

    // SECURITY: Use timing-safe comparison to prevent timing attacks
    // Instead of direct === comparison, compare buffers in constant time
    const passwordBuf = Buffer.from(args.password, 'utf8');
    const expectedBuf = Buffer.from(ownerPassword, 'utf8');
    
    // If lengths differ, create a dummy comparison that still takes constant time
    let isCorrect: boolean;
    if (passwordBuf.length !== expectedBuf.length) {
      // Compare against itself to maintain constant time, then negate
      const dummyBuf = Buffer.alloc(passwordBuf.length);
      passwordBuf.copy(dummyBuf);
      const _timingSafeResult = timingSafeCompare(passwordBuf, dummyBuf);
      isCorrect = false;
    } else {
      isCorrect = timingSafeCompare(passwordBuf, expectedBuf);
    }

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

/**
 * Timing-safe buffer comparison to prevent timing attacks.
 * Compares two buffers byte-by-byte, always checking all bytes
 * regardless of where the first difference occurs.
 */
function timingSafeCompare(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}
