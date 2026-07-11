import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Landing page lead capture — replaces the Next.js /api/leads route.
 *
 * Public mutation (no auth required) so anonymous landing-page visitors
 * can request a demo. Rate-limited at the edge via Cloudflare/Vercel if
 * needed. Email is the natural unique key — upsert semantics: re-submitting
 * the same email updates the existing lead instead of creating a duplicate.
 *
 * Returns { ok, id, message } to match the original Next.js response shape
 * so the LeadForm component's success/error handling works unchanged.
 */
export const createLead = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    agency: v.optional(v.string()),
    seats: v.optional(v.number()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Basic validation — mirrors the Zod schema in the original Next.js route.
    if (!args.email || args.email.length > 160) {
      throw new Error("Valid email is required (max 160 chars).");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
      throw new Error("Enter a valid email address.");
    }
    if (args.name && args.name.length > 120) {
      throw new Error("Name is too long (max 120 chars).");
    }
    if (args.company && args.company.length > 160) {
      throw new Error("Company name is too long (max 160 chars).");
    }
    if (args.agency && args.agency.length > 80) {
      throw new Error("Agency type is too long (max 80 chars).");
    }
    if (args.seats !== undefined && args.seats !== null) {
      if (!Number.isInteger(args.seats) || args.seats < 1 || args.seats > 1000) {
        throw new Error("Team size must be a whole number between 1 and 1000.");
      }
    }
    if (args.message && args.message.length > 2000) {
      throw new Error("Message is too long (max 2000 chars).");
    }

    const now = Date.now();

    // Upsert by email — re-submitting the same email updates the existing lead.
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    let leadId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        company: args.company ?? existing.company,
        agency: args.agency ?? existing.agency,
        seats: args.seats ?? existing.seats,
        message: args.message ?? existing.message,
        updatedAt: now,
      });
      leadId = existing._id;
    } else {
      leadId = await ctx.db.insert("leads", {
        email: args.email,
        name: args.name ?? undefined,
        company: args.company ?? undefined,
        agency: args.agency ?? undefined,
        seats: args.seats ?? undefined,
        message: args.message ?? undefined,
        source: "landing",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Structured notification — logs the lead for monitoring / future email wiring.
    // To enable email: add resend/SMTP here using these fields.
    console.log("[leads] new demo request:", {
      id: leadId,
      email: args.email,
      name: args.name ?? null,
      company: args.company ?? null,
      agency: args.agency ?? null,
      seats: args.seats ?? null,
      message: args.message ? args.message.slice(0, 80) + "…" : null,
      at: new Date().toISOString(),
    });

    return {
      ok: true,
      id: leadId,
      message: "Thanks — we'll be in touch within one business day.",
    };
  },
});
