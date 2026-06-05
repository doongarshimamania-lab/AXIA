import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── CLIENT SESSION SYSTEM ──────────────────────────────────────────────────

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 48; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

/** Verify client access by email — creates a session token for the client portal.
 *  Public — no freelancer auth required. Just looks up the email. */
export const verifyClientAccess = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    if (!email || !email.trim()) throw new Error("Email is required");

    const trimmedEmail = email.trim().toLowerCase();

    // Check if there's a clientCompany with this email
    const clientCompany = await ctx.db
      .query("clientCompanies")
      .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
      .first();

    // Also check if there's a freelancer client record with this email
    const clientRecord = await ctx.db
      .query("clients")
      .withIndex("by_contact_email", (q) => q.eq("contactEmail", trimmedEmail))
      .first();

    // Also check invoices for this email
    const invoiceForClient = await ctx.db
      .query("invoices")
      .withIndex("by_client_email", (q) => q.eq("clientEmail", trimmedEmail))
      .first();

    // If no record at all, deny access
    if (!clientCompany && !clientRecord && !invoiceForClient) {
      return {
        success: false,
        error: "No account found with this email. Please contact your freelancer.",
      };
    }

    // Clean up expired sessions for this email
    const now = Date.now();
    const existingSessions = await ctx.db
      .query("clientSessions")
      .withIndex("by_email", (q) => q.eq("clientEmail", trimmedEmail))
      .collect();
    for (const session of existingSessions) {
      if (session.expiresAt < now) {
        await ctx.db.delete(session._id);
      }
    }

    // Create new session token
    const token = generateToken();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    await ctx.db.insert("clientSessions", {
      clientEmail: trimmedEmail,
      token,
      clientCompanyId: clientCompany?._id,
      clientName: clientCompany?.companyName || clientRecord?.clientName || trimmedEmail,
      expiresAt,
      createdAt: now,
    });

    // Update lastLoginAt on clientCompany if exists
    if (clientCompany) {
      await ctx.db.patch(clientCompany._id, { lastLoginAt: now });
    }

    return {
      success: true,
      token,
      clientEmail: trimmedEmail,
      clientName: clientCompany?.companyName || clientRecord?.clientName || trimmedEmail,
      contactName: clientCompany?.contactName || clientRecord?.contactName || "",
    };
  },
});

/** Validate a client session token. Returns client info if valid. */
export const getClientSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return null;

    const session = await ctx.db
      .query("clientSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!session) return null;

    // Check if expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    // Get client company info
    let clientCompany = null;
    if (session.clientCompanyId) {
      clientCompany = await ctx.db.get(session.clientCompanyId);
    }

    return {
      clientEmail: session.clientEmail,
      clientName: session.clientName || clientCompany?.companyName || session.clientEmail,
      contactName: clientCompany?.contactName || "",
      industry: clientCompany?.industry || "",
      companySize: clientCompany?.companySize || "",
      verificationCount: clientCompany?.verificationCount || 0,
    };
  },
});

/** Logout — invalidate session token. */
export const logoutClientSession = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("clientSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// ─── EXISTING CLIENT COMPANY AUTH (requires freelancer auth) ─────────────────

// Register a new client company (requires auth)
export const registerClient = mutation({
  args: {
    email: v.string(),
    companyName: v.string(),
    contactName: v.string(),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("clientCompanies")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("Client with this email already exists");
    }

    const clientId = await ctx.db.insert("clientCompanies", {
      email: args.email,
      companyName: args.companyName,
      contactName: args.contactName,
      industry: args.industry ?? "",
      companySize: args.companySize ?? "",
      website: args.website ?? "",
      verificationCount: 0,
      createdAt: Date.now(),
      lastLoginAt: 0,
      subscriptionTier: "free",
    });

    await ctx.db.insert("clientActivityLog", {
      clientId,
      action: "client_registered",
      metadata: { companyName: args.companyName },
      timestamp: Date.now(),
    });

    return { clientId: clientId as string, success: true };
  },
});

// Get client profile (requires auth)
export const getClientProfile = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const client = await ctx.db
      .query("clientCompanies")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return client;
  },
});

// Update client profile (requires auth)
export const updateClientProfile = mutation({
  args: {
    clientId: v.id("clientCompanies"),
    companyName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { clientId, companyName, contactName, industry, companySize, website } = args;

    const updates: any = {};
    if (companyName !== undefined) updates.companyName = companyName;
    if (contactName !== undefined) updates.contactName = contactName;
    if (industry !== undefined) updates.industry = industry;
    if (companySize !== undefined) updates.companySize = companySize;
    if (website !== undefined) updates.website = website;

    await ctx.db.patch(clientId, updates);

    return { success: true };
  },
});
