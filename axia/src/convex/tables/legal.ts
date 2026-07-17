// convex/tables/legal.ts — Legal page acceptance audit trail.
//
// ponytail: dedicated table (not reusing consentAudits which requires a userId).
// Why: we need to record acceptance at the SIGN-UP moment, before the user doc
// exists. The email is the anchor; we patch the row with userId after signup.
//
// Per the user's preference: "Full audit trail — log who/when/IP/policy version".
// This satisfies DPDP Act 2023 §18(2)(b) (records of consent) + GDPR Art. 7(1)
// (demonstrate that the data subject consented).

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const legalTables = {
  legalConsent: defineTable({
    // Email is the anchor at sign-up time (before userId exists). After signup,
    // we patch this row with the userId.
    email: v.string(),
    userId: v.optional(v.id("users")),

    policyType: v.union(
      v.literal("privacy_policy"),
      v.literal("terms_of_service"),
      v.literal("both")
    ),

    // Semantic version of the policy they accepted (e.g. "1.0.0"). Bump when
    // the policy materially changes — users who accepted an older version will
    // be re-prompted on next sign-in.
    policyVersion: v.string(),

    // Hashed content snapshot — SHA-256 of the policy text at acceptance time.
    // This proves the EXACT text they agreed to, even if the policy is later
    // edited. (Hash, not the full text, to keep the row small.)
    policyContentHash: v.string(),

    acceptedAt: v.number(),

    // IP + UA captured server-side (cannot be spoofed by client).
    ipAddress: v.string(),
    userAgent: v.string(),

    // For pre-OAuth flows (Google/Microsoft), we may also capture the provider.
    authProvider: v.optional(
      v.union(
        v.literal("password"),
        v.literal("google"),
        v.literal("microsoft"),
        v.literal("magicLink"),
        v.literal("emailOtp")
      )
    ),
  })
    .index("by_email", ["email"])
    .index("by_user", ["userId"])
    .index("by_email_and_type", ["email", "policyType"])
    .index("by_user_and_type", ["userId", "policyType"])
    .index("by_accepted_at", ["acceptedAt"])
    .index("by_policy_version", ["policyVersion"]),
};
