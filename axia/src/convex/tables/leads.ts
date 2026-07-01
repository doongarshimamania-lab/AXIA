import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Leads table — captures demo requests from the landing page lead form.
 * Replaces the Next.js /api/leads route from the original export.
 *
 * Indexed by email for upsert semantics (re-submitting the same email
 * updates the existing lead instead of 500-ing on a unique constraint).
 */
export const leadTables = {
  leads: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    agency: v.optional(v.string()),
    seats: v.optional(v.number()),
    message: v.optional(v.string()),
    source: v.optional(v.string()), // "landing", "mobile-sticky-cta", etc.
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),
};
