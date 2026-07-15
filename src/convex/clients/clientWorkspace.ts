// @ts-nocheck
/**
 * Client Workspace — Shareable, token-based, no-login access
 *
 * A freelancer generates a workspace token for a specific client.
 * The client opens the link `/workspace/:token` and sees ONLY their
 * own projects, proposals, invoices, and the team members assigned
 * to their work. No login required; the token IS the auth.
 */
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const segments: string[] = [];
  for (let s = 0; s < 4; s++) {
    let seg = "";
    for (let i = 0; i < 8; i++) {
      seg += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(seg);
  }
  return segments.join("-");
}

// ---------------------------------------------------------------------------
// Token Management (freelancer-facing, requires auth)
// ---------------------------------------------------------------------------

/**
 * Generate a shareable workspace token for a client.
 * The freelancer must be authenticated and own the client record.
 */
export const generateClientWorkspaceToken = mutation({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, { clientId }) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject as
      | string
      | undefined;
    if (!userId) throw new Error("Not authenticated");

    // Verify the freelancer owns this client
    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) {
      throw new Error("Client not found or access denied");
    }

    // Check if a valid token already exists for this client
    const existing = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .first();

    if (existing && existing.revoked !== true) {
      // Return existing active token
      return {
        token: existing.token,
        clientId: existing.clientId,
        clientName: client.clientName,
        contactEmail: client.contactEmail,
        createdAt: existing.createdAt,
        alreadyExisted: true,
      };
    }

    // Generate a new token
    const token = generateToken();
    const now = Date.now();

    await ctx.db.insert("clientWorkspaceTokens", {
      token,
      clientId,
      clientName: client.clientName,
      contactEmail: client.contactEmail ?? undefined,
      workspaceId: client.workspaceId,
      freelancerUserId: userId,
      createdAt: now,
      lastAccessedAt: undefined,
      accessCount: 0,
      revoked: false,
    });

    return {
      token,
      clientId,
      clientName: client.clientName,
      contactEmail: client.contactEmail,
      createdAt: now,
      alreadyExisted: false,
    };
  },
});

/**
 * Revoke a client workspace token.
 */
export const revokeClientWorkspaceToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject as
      | string
      | undefined;
    if (!userId) throw new Error("Not authenticated");

    const tokenRecord = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!tokenRecord || tokenRecord.freelancerUserId !== userId) {
      throw new Error("Token not found or access denied");
    }

    await ctx.db.patch(tokenRecord._id, { revoked: true });
    return { success: true };
  },
});

/**
 * List all workspace tokens for the authenticated freelancer.
 */
export const getMyClientWorkspaceTokens = query({
  args: {},
  handler: async (ctx) => {
    await rateLimitAuthenticated(ctx, "revokeClientWorkspaceToken");
    const userId = (await ctx.auth.getUserIdentity())?.subject as
      | string
      | undefined;
    if (!userId) return [];

    const tokens = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_freelancer", (q) => q.eq("freelancerUserId", userId))
      .take(1000);

    return tokens.filter((t) => !t.revoked).map((t) => ({
      _id: t._id,
      token: t.token,
      clientId: t.clientId,
      clientName: t.clientName,
      contactEmail: t.contactEmail,
      createdAt: t.createdAt,
      lastAccessedAt: t.lastAccessedAt,
      accessCount: t.accessCount,
    }));
  },
});

// ---------------------------------------------------------------------------
// Token Validation (public, used by client workspace page)
// ---------------------------------------------------------------------------

/**
 * Validate a workspace token and return client info.
 * Public — no auth required.
 */
export const validateWorkspaceToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    const tokenRecord = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!tokenRecord || tokenRecord.revoked) {
      return { valid: false, reason: "Token not found or revoked" } as const;
    }

    const client = await ctx.db.get(tokenRecord.clientId);
    if (!client) {
      return { valid: false, reason: "Client record not found" } as const;
    }

    return {
      valid: true,
      clientId: tokenRecord.clientId,
      clientName: tokenRecord.clientName,
      contactEmail: tokenRecord.contactEmail,
      workspaceId: tokenRecord.workspaceId,
      freelancerUserId: tokenRecord.freelancerUserId,
    } as const;
  },
});

// ---------------------------------------------------------------------------
// Client Workspace Data (public, scoped by token)
// ---------------------------------------------------------------------------

/**
 * Record that a client accessed their workspace (for analytics).
 */
export const recordWorkspaceAccess = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenRecord = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!tokenRecord || tokenRecord.revoked) return;

    await ctx.db.patch(tokenRecord._id, {
      lastAccessedAt: Date.now(),
      accessCount: (tokenRecord.accessCount ?? 0) + 1,
    });
  },
});

/**
 * Get the client's projects with progress details and team members.
 * Public — scoped by token.
 */
export const getClientProjects = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenRecord = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!tokenRecord || tokenRecord.revoked) return [];

    const clientId = tokenRecord.clientId;

    // Get all projects for this client
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .take(1000);

    // Enrich each project with scope/milestone data and team info
    const enriched = await Promise.all(
      projects.map(async (project) => {
        // Get scope definitions for progress
        const scopeDefs = await ctx.db
          .query("scopeDefinitions")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .take(1000);

        // Calculate progress from scope definitions
        let totalDeliverables = 0;
        let completedDeliverables = 0;
        for (const scope of scopeDefs) {
          const deliverables = (scope as any).deliverables ?? [];
          totalDeliverables += deliverables.length;
          completedDeliverables += deliverables.filter(
            (d: any) => d.status === "completed" || d.status === "approved"
          ).length;
        }
        const completionPct =
          totalDeliverables > 0
            ? Math.round((completedDeliverables / totalDeliverables) * 100)
            : 0;

        // Get team members assigned to this project
        const teamMembers: any[] = [];
        if (project.workspaceId) {
          // Get workspace members for the project's workspace
          const members = await ctx.db
            .query("workspaceMembers")
            .withIndex("by_workspace", (q) =>
              q.eq("workspaceId", project.workspaceId!)
            )
            .take(1000);

          for (const member of members.slice(0, 5)) {
            const user = await ctx.db.get(member.userId);
            if (user && member.status === "active") {
              teamMembers.push({
                name: (user as any).name ?? (user as any).email ?? "Team Member",
                email: (user as any).email ?? "",
                role: member.role,
                title: member.title ?? "",
              });
            }
          }
        }

        // Get recent work sessions for activity indicator
        const workSessions = await ctx.db
          .query("workSessions")
          .withIndex("by_workspace", (q) =>
            q.eq("workspaceId", project.workspaceId!)
          )
          .take(1000);

        const projectSessions = workSessions.filter(
          (s) => (s as any).projectId === project._id
        );
        const lastActivity =
          projectSessions.length > 0
            ? Math.max(...projectSessions.map((s) => (s as any).startTime ?? 0))
            : project.lastActivityAt;

        return {
          _id: project._id,
          projectName: project.projectName,
          projectType: project.projectType,
          status: project.status,
          hourlyRate: project.hourlyRate,
          completionPct,
          totalDeliverables,
          completedDeliverables,
          teamMembers,
          lastActivity,
          createdAt: project.createdAt,
          milestones: scopeDefs.map((s) => ({
            name: (s as any).scopeName ?? (s as any).title ?? "Scope",
            status: (s as any).status ?? "active",
          })),
        };
      })
    );

    return enriched;
  },
});

/**
 * Get the client's proposals.
 * Public — scoped by token.
 */
export const getClientProposals = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenRecord = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!tokenRecord || tokenRecord.revoked) return [];

    const clientId = tokenRecord.clientId;

    // Get proposals linked to this client
    const allProposals = await ctx.db.query("proposals").take(1000);
    const proposals = allProposals.filter(
      (p) => {
        const pClientId = (p as any).clientId;
        return pClientId !== undefined &&
               (pClientId === clientId ||
                (tokenRecord.contactEmail && (p as any).clientEmail === tokenRecord.contactEmail));
      }
    );

    return proposals.map((p) => ({
      _id: p._id,
      title: p.title,
      status: p.status,
      totalValue: p.totalValue,
      currency: p.currency ?? "USD",
      publicToken: p.publicToken,
      createdAt: p.createdAt,
      sentAt: p.sentAt,
      viewedAt: p.viewedAt,
      signedAt: p.signedAt,
      validUntil: p.validUntil,
      sections: p.sections,
    }));
  },
});

/**
 * Get the client's invoices with work proofs.
 * Public — scoped by token.
 */
export const getClientInvoices = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenRecord = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!tokenRecord || tokenRecord.revoked) return [];

    const clientId = tokenRecord.clientId;

    // Get invoices by clientId
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .take(1000);

    // Enrich each invoice with work proofs
    const enriched = await Promise.all(
      invoices.map(async (invoice) => {
        const workLinks = await ctx.db
          .query("invoiceWorkLinks")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
          .take(1000);

        return {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          paidDate: invoice.paidDate,
          clientName: invoice.clientName,
          lineItems: invoice.lineItems,
          subtotal: invoice.subtotal,
          taxRate: invoice.taxRate,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          currency: invoice.currency ?? "USD",
          notes: invoice.notes,
          proofCount: invoice.proofCount,
          hasValidatedBilling: invoice.hasValidatedBilling,
          sentAt: invoice.sentAt,
          createdAt: invoice.createdAt,
          workProofs: workLinks.map((wl) => ({
            _id: wl._id,
            proofType: wl.proofType,
            title: wl.title,
            description: wl.description,
            hours: wl.hours,
            date: wl.date,
            value: wl.value,
            verified: wl.verified,
          })),
        };
      })
    );

    return enriched;
  },
});

/**
 * Get team members working on the client's projects.
 * Public — scoped by token.
 */
export const getClientTeamMembers = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenRecord = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!tokenRecord || tokenRecord.revoked) return [];

    const clientId = tokenRecord.clientId;

    // Get projects for this client
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .take(1000);

    // Collect team members from assignedMemberIds and workspace
    const memberMap = new Map<
      string,
      { name: string; email: string; role: string; title: string; projects: string[] }
    >();

    for (const project of projects) {
      const assignedIds = (project as any).assignedMemberIds ?? [];

      for (const memberId of assignedIds) {
        if (memberMap.has(memberId)) {
          const existing = memberMap.get(memberId)!;
          existing.projects.push(project.projectName);
          continue;
        }

        const member = await ctx.db.get(memberId);
        if (member && (member as any).status === "active") {
          const user = await ctx.db.get((member as any).userId);
          memberMap.set(memberId, {
            name: (user as any)?.name ?? (user as any)?.email ?? "Team Member",
            email: (user as any)?.email ?? "",
            role: (member as any).role ?? "member",
            title: (member as any).title ?? "",
            projects: [project.projectName],
          });
        }
      }

      // Also add workspace members
      if (project.workspaceId) {
        const workspaceMembers = await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace", (q) =>
            q.eq("workspaceId", project.workspaceId!)
          )
          .take(1000);

        for (const wm of workspaceMembers) {
          if ((wm as any).status !== "active") continue;
          const userId = (wm as any).userId;
          if (memberMap.has(userId)) {
            const existing = memberMap.get(userId)!;
            if (!existing.projects.includes(project.projectName)) {
              existing.projects.push(project.projectName);
            }
            continue;
          }
          const user = await ctx.db.get(userId);
          memberMap.set(userId, {
            name: (user as any)?.name ?? (user as any)?.email ?? "Team Member",
            email: (user as any)?.email ?? "",
            role: (wm as any).role ?? "member",
            title: (wm as any).title ?? "",
            projects: [project.projectName],
          });
        }
      }
    }

    return Array.from(memberMap.values());
  },
});

/**
 * Get a single proposal by its public token (for client viewing/signing).
 * Public — no auth required.
 */
export const getClientProposalByToken = query({
  args: { publicToken: v.string() },
  handler: async (ctx, { publicToken }) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_public_token", (q) => q.eq("publicToken", publicToken))
      .first();

    if (!proposal) return null;

    return {
      _id: proposal._id,
      title: proposal.title,
      status: proposal.status,
      totalValue: proposal.totalValue,
      currency: proposal.currency ?? "USD",
      sections: proposal.sections,
      clientName: proposal.clientName,
      validUntil: proposal.validUntil,
      sentAt: proposal.sentAt,
      viewedAt: proposal.viewedAt,
      signedAt: proposal.signedAt,
      notes: proposal.notes,
      attachments: proposal.attachments,
      createdAt: proposal.createdAt,
    };
  },
});

/**
 * Get a single invoice by its public token (for client viewing).
 * Public — no auth required.
 */
export const getClientInvoiceByToken = query({
  args: { publicToken: v.string() },
  handler: async (ctx, { publicToken }) => {
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_public_token", (q) => q.eq("publicToken", publicToken))
      .first();

    if (!invoice) return null;

    const workLinks = await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
      .take(1000);

    return {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      clientName: invoice.clientName,
      lineItems: invoice.lineItems,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      currency: invoice.currency ?? "USD",
      notes: invoice.notes,
      proofCount: invoice.proofCount,
      hasValidatedBilling: invoice.hasValidatedBilling,
      workProofs: workLinks.map((wl) => ({
        _id: wl._id,
        proofType: wl.proofType,
        title: wl.title,
        description: wl.description,
        hours: wl.hours,
        date: wl.date,
        value: wl.value,
        verified: wl.verified,
      })),
    };
  },
});

/**
 * Mark a proposal as viewed by the client.
 * Public — called when client opens their workspace.
 */
export const markProposalViewedByClient = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, { proposalId }) => {
    const proposal = await ctx.db.get(proposalId);
    if (!proposal) return;
    if (proposal.status === "sent") {
      await ctx.db.patch(proposalId, {
        status: "viewed",
        viewedAt: Date.now(),
      });
    }
  },
});

/**
 * Mark an invoice as viewed by the client.
 * Public — called when client opens their workspace.
 */
export const markInvoiceViewedByClient = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, { invoiceId }) => {
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice) return;
    if (invoice.status === "sent") {
      await ctx.db.patch(invoiceId, {
        status: "viewed",
        viewedAt: Date.now(),
      });
    }
  },
});
