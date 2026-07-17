// convex/legal/consent.ts — Legal page acceptance audit trail.
//
// Two mutations:
//   - recordLegalConsent: called from the sign-up form when the user ticks
//     the "I agree to Privacy Policy + Terms" checkbox. Stores email + IP +
//     UA + policy version + content hash. Pre-signup (no userId yet).
//   - linkLegalConsentToUser: called after Better Auth creates the user doc,
//     patches all unlinked rows for this email with the new userId.
//
// One query:
//   - getMyLegalConsent: returns the current user's latest acceptance record
//     (used by the app to re-prompt if the policy version has changed).

import { mutation, query, action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";
import { sha256Hex } from "../lib/pureCrypto";

// ── Policy versions (bump when the policy text materially changes) ──────────
// The frontend pages (/privacy, /terms) read these to display the version +
// last-updated date. The content hash is computed from the rendered HTML at
// acceptance time and stored in the audit row.
export const POLICY_VERSIONS = {
  privacy_policy: "1.0.0",
  terms_of_service: "1.0.0",
} as const;

// ── Record consent (called from sign-up form) ───────────────────────────────
// ponytail: this is an ACTION (not mutation) because it needs ctx.request to
// read the IP + User-Agent from the incoming HTTP request. Mutations don't
// have access to ctx.request headers.
export const recordLegalConsent = action({
  args: {
    email: v.string(),
    policyType: v.union(
      v.literal("privacy_policy"),
      v.literal("terms_of_service"),
      v.literal("both")
    ),
    policyVersion: v.string(),
    // The rendered policy HTML at acceptance time. We hash it server-side to
    // prove what the user agreed to (without storing the full text per row).
    policyContent: v.string(),
    authProvider: v.optional(
      v.union(
        v.literal("password"),
        v.literal("google"),
        v.literal("microsoft"),
        v.literal("magicLink"),
        v.literal("emailOtp")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Capture IP + UA from the incoming request.
    const request = (ctx as any).request as Request | undefined;
    const forwarded = request?.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = request?.headers.get("user-agent") ?? "unknown";

    const contentHash = sha256Hex(args.policyContent);

    const id = await ctx.runMutation(internal.legal.consent._insertConsentRow, {
      email: args.email.toLowerCase(),
      policyType: args.policyType,
      policyVersion: args.policyVersion,
      policyContentHash: contentHash,
      ipAddress: ip,
      userAgent,
      authProvider: args.authProvider,
    });

    return { success: true, consentId: id };
  },
});

// ── Internal mutation: actual DB insert ──────────────────────────────────────
export const _insertConsentRow = internalMutation({
  args: {
    email: v.string(),
    policyType: v.union(
      v.literal("privacy_policy"),
      v.literal("terms_of_service"),
      v.literal("both")
    ),
    policyVersion: v.string(),
    policyContentHash: v.string(),
    ipAddress: v.string(),
    userAgent: v.string(),
    authProvider: v.optional(
      v.union(
        v.literal("password"),
        v.literal("google"),
        v.literal("microsoft"),
        v.literal("magicLink"),
        v.literal("emailOtp")
      )
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("legalConsent", {
      email: args.email,
      policyType: args.policyType,
      policyVersion: args.policyVersion,
      policyContentHash: args.policyContentHash,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      authProvider: args.authProvider,
      acceptedAt: Date.now(),
    });
  },
});

// ── Link pre-signup consent rows to a newly-created user ────────────────────
// Called from the post-signup flow. Finds all rows with this email that have
// userId === undefined, patches them with the new userId.
export const linkLegalConsentToUser = internalMutation({
  args: {
    email: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("legalConsent")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();

    for (const row of rows) {
      await ctx.db.patch(row._id, { userId: args.userId });
    }

    return { linked: rows.length };
  },
});

// ── Query: current user's latest acceptance ─────────────────────────────────
// Used by the app to check if the user needs to re-accept after a policy bump.
export const getMyLegalConsent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const rows = await ctx.db
      .query("legalConsent")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    if (rows.length === 0) return null;

    // Find the latest acceptance per policy type.
    const latestByType: Record<string, (typeof rows)[number]> = {};
    for (const row of rows) {
      const key = row.policyType;
      if (!latestByType[key] || row.acceptedAt > latestByType[key].acceptedAt) {
        latestByType[key] = row;
      }
    }

    return {
      latestByType,
      currentVersions: POLICY_VERSIONS,
      needsReaccept: {
        privacy_policy:
          latestByType.privacy_policy?.policyVersion !== POLICY_VERSIONS.privacy_policy &&
          latestByType.both?.policyVersion !== POLICY_VERSIONS.privacy_policy,
        terms_of_service:
          latestByType.terms_of_service?.policyVersion !== POLICY_VERSIONS.terms_of_service &&
          latestByType.both?.policyVersion !== POLICY_VERSIONS.terms_of_service,
      },
    };
  },
});
