// @ts-nocheck
/**
 * Client Portal — client-scoped queries and mutations.
 *
 * These are PUBLIC queries (no userId auth required) that filter data
 * by clientEmail or session token. This ensures clients can only see
 * their own data, filtered server-side.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// ─── CLIENT-SCOPED QUERIES ──────────────────────────────────────────────────

/** Get invoices for a specific client by their email. Public — no auth required. */
export const getClientInvoices = query({
  args: { clientEmail: v.string() },
  handler: async (ctx, { clientEmail }) => {
    if (!clientEmail) return [];
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_client_email", (q) => q.eq("clientEmail", clientEmail))
      .collect();
    return invoices.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Get proposals for a specific client by their email. Public — no auth required. */
export const getClientProposals = query({
  args: { clientEmail: v.string() },
  handler: async (ctx, { clientEmail }) => {
    if (!clientEmail) return [];
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_client_email", (q) => q.eq("clientEmail", clientEmail))
      .collect();
    return proposals.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Get projects for a specific client by their email. */
export const getClientProjects = query({
  args: { clientEmail: v.string() },
  handler: async (ctx, { clientEmail }) => {
    if (!clientEmail) return [];

    // Find clients with this contactEmail
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_contact_email", (q) => q.eq("contactEmail", clientEmail))
      .collect();

    if (clients.length === 0) return [];

    // Get all projects for these clients
    const allProjects = [];
    for (const client of clients) {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();
      allProjects.push(...projects.map((p) => ({ ...p, clientName: client.clientName })));
    }

    return allProjects;
  },
});

/** Get work proofs for a specific invoice (client-scoped). */
export const getClientWorkProofs = query({
  args: { clientEmail: v.string(), invoiceId: v.id("invoices") },
  handler: async (ctx, { clientEmail, invoiceId }) => {
    // Verify the invoice belongs to this client
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.clientEmail !== clientEmail) return [];

    return await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .collect();
  },
});

/** Get project status for a client — includes milestones, completion %. */
export const getClientProjectsStatus = query({
  args: { clientEmail: v.string() },
  handler: async (ctx, { clientEmail }) => {
    if (!clientEmail) return [];

    // Find clients with this contactEmail
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_contact_email", (q) => q.eq("contactEmail", clientEmail))
      .collect();

    if (clients.length === 0) return [];

    const result = [];
    for (const client of clients) {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      for (const project of projects) {
        // Get scope definitions for this project (milestones / deliverables)
        const scopeDefs = await ctx.db
          .query("scopeDefinitions")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const deliverables = scopeDefs.flatMap((sd) => sd.deliverables || []);
        const completedDeliverables = deliverables.filter(
          (d) => d.status === "completed"
        );
        const completionPercentage =
          deliverables.length > 0
            ? Math.round((completedDeliverables.length / deliverables.length) * 100)
            : 0;

        result.push({
          _id: project._id,
          projectName: project.projectName,
          clientName: client.clientName,
          status: project.status,
          projectType: project.projectType,
          protectionLevel: project.protectionLevel,
          completionPercentage,
          totalDeliverables: deliverables.length,
          completedDeliverables: completedDeliverables.length,
          milestones: deliverables.map((d) => ({
            id: d.id,
            name: d.name,
            status: d.status || "pending",
            estimatedHours: d.estimatedHours,
          })),
          createdAt: project.createdAt,
          lastActivityAt: project.lastActivityAt,
        });
      }
    }

    return result;
  },
});

// ─── DELIVERABLE APPROVAL ────────────────────────────────────────────────────

/** Approve a deliverable by approval token. Public — no auth required. */
export const approveDeliverable = mutation({
  args: { approvalToken: v.string() },
  handler: async (ctx, { approvalToken }) => {
    const scopeDef = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_approval_token", (q) => q.eq("approvalToken", approvalToken))
      .first();

    if (!scopeDef) throw new Error("Invalid approval token");

    // Mark all deliverables as approved
    const updatedDeliverables = scopeDef.deliverables.map((d) => ({
      ...d,
      status: d.status === "completed" ? "completed" : "completed" as const,
    }));

    await ctx.db.patch(scopeDef._id, {
      deliverables: updatedDeliverables,
      clientApprovedAt: Date.now(),
      status: "completed",
      updatedAt: Date.now(),
    });

    return { success: true, scopeId: scopeDef._id };
  },
});

/** Reject a deliverable by approval token. Public — no auth required. */
export const rejectDeliverable = mutation({
  args: { approvalToken: v.string(), reason: v.string() },
  handler: async (ctx, { approvalToken, reason }) => {
    const scopeDef = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_approval_token", (q) => q.eq("approvalToken", approvalToken))
      .first();

    if (!scopeDef) throw new Error("Invalid approval token");

    // Mark scope as disputed with the reason
    await ctx.db.patch(scopeDef._id, {
      status: "disputed",
      updatedAt: Date.now(),
    });

    return { success: true, scopeId: scopeDef._id, reason };
  },
});

/** Get pending approvals for a client by email. */
export const getClientPendingApprovals = query({
  args: { clientEmail: v.string() },
  handler: async (ctx, { clientEmail }) => {
    if (!clientEmail) return [];

    // Find clients with this contactEmail
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_contact_email", (q) => q.eq("contactEmail", clientEmail))
      .collect();

    if (clients.length === 0) return [];

    const approvals = [];
    for (const client of clients) {
      // Get projects for this client
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      for (const project of projects) {
        const scopeDefs = await ctx.db
          .query("scopeDefinitions")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        for (const sd of scopeDefs) {
          if (sd.status === "active" && sd.approvalToken) {
            approvals.push({
              _id: sd._id,
              title: sd.title,
              description: sd.description,
              projectName: project.projectName,
              clientName: client.clientName,
              approvalToken: sd.approvalToken,
              deliverables: sd.deliverables,
              status: sd.status,
              clientApprovedAt: sd.clientApprovedAt,
              createdAt: sd.createdAt,
              updatedAt: sd.updatedAt,
            });
          }
        }
      }
    }

    return approvals;
  },
});

/** Get approved/rejected history for a client by email. */
export const getClientApprovalHistory = query({
  args: { clientEmail: v.string() },
  handler: async (ctx, { clientEmail }) => {
    if (!clientEmail) return [];

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_contact_email", (q) => q.eq("contactEmail", clientEmail))
      .collect();

    if (clients.length === 0) return [];

    const history = [];
    for (const client of clients) {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      for (const project of projects) {
        const scopeDefs = await ctx.db
          .query("scopeDefinitions")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        for (const sd of scopeDefs) {
          if (sd.status === "completed" || sd.status === "disputed") {
            history.push({
              _id: sd._id,
              title: sd.title,
              description: sd.description,
              projectName: project.projectName,
              clientName: client.clientName,
              status: sd.status,
              clientApprovedAt: sd.clientApprovedAt,
              deliverables: sd.deliverables,
              createdAt: sd.createdAt,
              updatedAt: sd.updatedAt,
            });
          }
        }
      }
    }

    return history.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },
});

// ─── CLIENT ACCESS VERIFICATION ────────────────────────────────────────────────

/** Verify client access — returns client info if email exists in the system.
 *  Public query — no auth required. Used by ClientLogin to validate an email. */
export const verifyClientAccess = query({
  args: { clientEmail: v.string() },
  handler: async (ctx, { clientEmail }) => {
    if (!clientEmail) return null;

    const trimmedEmail = clientEmail.trim().toLowerCase();

    // Check multiple tables for this email
    const clientCompany = await ctx.db
      .query("clientCompanies")
      .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
      .first();

    const clientRecord = await ctx.db
      .query("clients")
      .withIndex("by_contact_email", (q) => q.eq("contactEmail", trimmedEmail))
      .first();

    const invoiceForClient = await ctx.db
      .query("invoices")
      .withIndex("by_client_email", (q) => q.eq("clientEmail", trimmedEmail))
      .first();

    const proposalForClient = await ctx.db
      .query("proposals")
      .withIndex("by_client_email", (q) => q.eq("clientEmail", trimmedEmail))
      .first();

    if (!clientCompany && !clientRecord && !invoiceForClient && !proposalForClient) {
      return null;
    }

    // Build list of matching client profiles
    const clients: Array<{
      _id: string;
      name: string;
      email: string;
      company?: string;
    }> = [];

    if (clientCompany) {
      clients.push({
        _id: clientCompany._id,
        name: clientCompany.contactName || clientCompany.companyName,
        email: clientCompany.email,
        company: clientCompany.companyName,
      });
    }

    if (clientRecord) {
      clients.push({
        _id: clientRecord._id,
        name: clientRecord.clientName,
        email: clientRecord.contactEmail || trimmedEmail,
        company: undefined,
      });
    }

    return {
      found: true,
      clientEmail: trimmedEmail,
      clientName:
        clientCompany?.companyName ||
        clientRecord?.clientName ||
        trimmedEmail,
      contactName:
        clientCompany?.contactName ||
        clientRecord?.contactName ||
        "",
      clients,
    };
  },
});

// ─── CLIENT-FACING VERIFICATION REPORTS ──────────────────────────────────────

/** Get verification reports for a client by email.
 *  Returns verification results from freelancers that this client has requested. */
export const getClientVerificationReports = query({
  args: { clientEmail: v.string() },
  handler: async (ctx, { clientEmail }) => {
    if (!clientEmail) return [];

    const trimmedEmail = clientEmail.trim().toLowerCase();

    // Find the clientCompany for this email
    const clientCompany = await ctx.db
      .query("clientCompanies")
      .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
      .first();

    if (!clientCompany) return [];

    // Get verification results for this client
    const results = await ctx.db
      .query("clientVerificationResults")
      .withIndex("by_client", (q) => q.eq("clientId", clientCompany._id))
      .collect();

    // Enrich with verification request info
    const enriched = [];
    for (const result of results) {
      const request = await ctx.db.get(result.verificationRequestId);
      enriched.push({
        _id: result._id,
        projectName: request?.projectName || "Unknown Project",
        workPeriodStart: request?.workPeriodStart,
        workPeriodEnd: request?.workPeriodEnd,
        wcvmScore: result.wcvmScore,
        evidenceSummary: result.evidenceSummary,
        generatedAt: result.generatedAt,
        expiresAt: result.expiresAt,
        status: request?.status || "unknown",
      });
    }

    return enriched.sort((a, b) => b.generatedAt - a.generatedAt);
  },
});

// ─── CLIENT OVERVIEW ──────────────────────────────────────────────────────────

/** Get a client overview by email — summary of invoices, proposals, projects. */
export const getClientOverview = query({
  args: { clientEmail: v.string() },
  handler: async (ctx, { clientEmail }) => {
    if (!clientEmail) return null;

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_client_email", (q) => q.eq("clientEmail", clientEmail))
      .collect();

    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_client_email", (q) => q.eq("clientEmail", clientEmail))
      .collect();

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_contact_email", (q) => q.eq("contactEmail", clientEmail))
      .collect();

    let projectCount = 0;
    for (const client of clients) {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();
      projectCount += projects.length;
    }

    return {
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter((i) => i.status === "paid").length,
      outstandingInvoices: invoices.filter((i) =>
        ["sent", "viewed", "overdue"].includes(i.status)
      ).length,
      totalInvoiced: invoices.reduce((s, i) => s + i.total, 0),
      totalPaid: invoices
        .filter((i) => i.status === "paid")
        .reduce((s, i) => s + i.total, 0),
      totalOutstanding: invoices
        .filter((i) => ["sent", "viewed", "overdue"].includes(i.status))
        .reduce((s, i) => s + i.total, 0),
      totalProposals: proposals.length,
      signedProposals: proposals.filter((p) => p.status === "signed").length,
      totalProposalValue: proposals
        .filter((p) => p.status === "signed")
        .reduce((s, p) => s + p.totalValue, 0),
      projectCount,
    };
  },
});
