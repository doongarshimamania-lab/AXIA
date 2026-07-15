// @ts-nocheck — Convex backend file with schema types not yet in generated types
// ponytail: new file — bulk import for invoices. Mirrors the structure of
// clients/bulkImport.ts so BulkImportDialog can use the same field-mapping
// flow. Previously the Invoices page opened BulkImportDialog with
// tableName="invoices" but the dialog only wired up clients.bulkImport.*.
// It fell through to a setTimeout that fabricated {imported, skipped, errors}
// — user saw "Import complete" toast with zero new invoices in the list.
// (Audit item #5.)
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "../permissions";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";

// ─── Core field definitions for invoices ───────────────────────────────────
// These map to the actual columns in the `invoices` table (see tables/billing.ts).
// The `key` is the column name in the DB; the `label` is what the user sees.
// Required fields match the schema: invoiceNumber, issueDate, dueDate,
// subtotal, total. We default the rest sensibly so a CSV with just
// invoiceNumber + clientName + total can be imported.
export const INVOICE_CORE_FIELDS = [
  { key: "invoiceNumber", label: "Invoice Number", required: true },
  { key: "clientName", label: "Client Name" },
  { key: "clientEmail", label: "Client Email" },
  { key: "status", label: "Status", type: "select", options: ["draft", "sent", "viewed", "paid", "partial", "overdue", "cancelled"] },
  { key: "issueDate", label: "Issue Date (YYYY-MM-DD)" },
  { key: "dueDate", label: "Due Date (YYYY-MM-DD)" },
  { key: "subtotal", label: "Subtotal", type: "number" },
  { key: "taxRate", label: "Tax Rate (%)", type: "number" },
  { key: "taxAmount", label: "Tax Amount", type: "number" },
  { key: "total", label: "Total", type: "number" },
  { key: "currency", label: "Currency" },
  { key: "notes", label: "Notes" },
  { key: "terms", label: "Terms" },
] as const;

// ─── Get import field definitions (for frontend mapping UI) ────────────────

export const getInvoiceImportFields = query({
  args: {},
  handler: async (_ctx) => {
    return INVOICE_CORE_FIELDS;
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────

const VALID_STATUSES = ["draft", "sent", "viewed", "paid", "partial", "overdue", "cancelled"];

function parseDateField(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  // Accept Unix epoch numbers (ms), ISO strings, or YYYY-MM-DD strings.
  if (typeof value === "number") return value;
  const str = String(value).trim();
  // Try ISO first
  const isoTs = Date.parse(str);
  if (!isNaN(isoTs)) return isoTs;
  return undefined;
}

function generatePublicToken(): string {
  // 32-char random hex — used for the public invoice view URL.
  // Not security-critical (it's a bearer token for an invoice view, not auth).
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

function generateInvoiceNumber(workspacePrefix?: string): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.floor(Math.random() * 1000).toString(36).toUpperCase().padStart(3, "0");
  return `INV-${workspacePrefix ? workspacePrefix.slice(0, 3).toUpperCase() + "-" : ""}${stamp}-${rand}`;
}

// ─── Bulk import with field mapping ────────────────────────────────────────

export const importInvoices = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    teamId: v.optional(v.id("teams")),
    // Flexible records — each entry is a row from CSV/Excel.
    records: v.array(v.any()),
    // fieldMapping: { csvColumnName: "coreFieldKey" | "custom:fieldName" }
    fieldMapping: v.optional(v.any()),
    skipDuplicates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "importInvoices");
    const { userId } = await requireWorkspaceAccess(
      ctx,
      args.workspaceId,
      "member"
    );

    const now = Date.now();
    const coreFieldKeys = INVOICE_CORE_FIELDS.map((f) => f.key);
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    // Build duplicate check set (by invoiceNumber within the workspace)
    let existingNumbers: Set<string> | null = null;
    if (args.skipDuplicates) {
      const existing = await ctx.db
        .query("invoices")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", args.workspaceId)
        )
        .take(1000);
      existingNumbers = new Set(
        existing.map((i) => (i.invoiceNumber ?? "").toLowerCase())
      );
    }

    for (let i = 0; i < args.records.length; i++) {
      try {
        const rawRecord = args.records[i];

        // ── Apply field mapping ───────────────────────────────────────────
        const record: Record<string, any> = {};
        if (args.fieldMapping && Object.keys(args.fieldMapping).length > 0) {
          for (const [csvCol, target] of Object.entries(args.fieldMapping)) {
            const value = rawRecord[csvCol];
            if (value === undefined || value === null) continue;
            if (typeof target === "string" && target.startsWith("custom:")) {
              const customKey = target.slice("custom:".length);
              if (!record._custom) record._custom = {};
              record._custom[customKey] = value;
            } else {
              record[target] = value;
            }
          }
          for (const [key, value] of Object.entries(rawRecord)) {
            if (coreFieldKeys.includes(key) && record[key] === undefined) {
              record[key] = value;
            }
          }
        } else {
          Object.assign(record, rawRecord);
        }

        // ── Separate core fields from custom fields ───────────────────────
        const coreData: Record<string, any> = {};
        const customData: Record<string, any> = record._custom ?? {};
        for (const [key, value] of Object.entries(record)) {
          if (key === "_custom") continue;
          if (coreFieldKeys.includes(key)) {
            coreData[key] = value;
          } else {
            customData[key] = value;
          }
        }

        // ── Coerce / default core fields ──────────────────────────────────
        let invoiceNumber = String(coreData.invoiceNumber ?? "").trim();
        if (!invoiceNumber) {
          // Generate one so the row can still be imported — the user
          // can edit it later. (Matches the createInvoice behavior.)
          invoiceNumber = generateInvoiceNumber();
        }

        // ── Duplicate check ───────────────────────────────────────────────
        if (existingNumbers && existingNumbers.has(invoiceNumber.toLowerCase())) {
          results.skipped++;
          continue;
        }

        const status = VALID_STATUSES.includes(String(coreData.status ?? "").toLowerCase())
          ? (String(coreData.status).toLowerCase() as any)
          : "draft";

        const issueDate = parseDateField(coreData.issueDate) ?? now;
        const dueDate = parseDateField(coreData.dueDate) ?? (issueDate + 14 * 24 * 60 * 60 * 1000); // +14 days

        // subtotal / total — try to coerce, fall back to 0
        const subtotal = coreData.subtotal != null && !isNaN(Number(coreData.subtotal))
          ? Number(coreData.subtotal)
          : 0;
        const total = coreData.total != null && !isNaN(Number(coreData.total))
          ? Number(coreData.total)
          : subtotal;

        const taxRate = coreData.taxRate != null && !isNaN(Number(coreData.taxRate))
          ? Number(coreData.taxRate)
          : undefined;
        const taxAmount = coreData.taxAmount != null && !isNaN(Number(coreData.taxAmount))
          ? Number(coreData.taxAmount)
          : undefined;

        const currency = coreData.currency ? String(coreData.currency).trim().toUpperCase() : "USD";

        // ── Insert ────────────────────────────────────────────────────────
        await ctx.db.insert("invoices", {
          userId,
          workspaceId: args.workspaceId,
          teamId: args.teamId,
          createdBy: userId,
          invoiceNumber,
          publicToken: generatePublicToken(),
          status,
          issueDate,
          dueDate,
          clientName: coreData.clientName ? String(coreData.clientName) : undefined,
          clientEmail: coreData.clientEmail ? String(coreData.clientEmail) : undefined,
          lineItems: [], // CSV import doesn't try to reconstruct line items — user can add them in the editor
          subtotal,
          taxRate,
          taxAmount,
          total,
          currency,
          notes: coreData.notes ? String(coreData.notes) : undefined,
          terms: coreData.terms ? String(coreData.terms) : undefined,
          customFields: Object.keys(customData).length > 0 ? customData : undefined,
          createdAt: now,
          updatedAt: now,
        });

        if (existingNumbers) existingNumbers.add(invoiceNumber.toLowerCase());
        results.created++;
      } catch (err: any) {
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return results;
  },
});

// ─── Legacy bulk import (backwards-compatible shape) ───────────────────────
// Kept for any caller that wants to pass a pre-typed invoices array instead
// of the generic records + fieldMapping shape. Mirrors bulkImportClients.

export const bulkImportInvoices = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    invoices: v.array(
      v.object({
        invoiceNumber: v.optional(v.string()),
        clientName: v.optional(v.string()),
        clientEmail: v.optional(v.string()),
        status: v.optional(v.string()),
        issueDate: v.optional(v.string()),
        dueDate: v.optional(v.string()),
        subtotal: v.optional(v.number()),
        taxRate: v.optional(v.number()),
        taxAmount: v.optional(v.number()),
        total: v.optional(v.number()),
        currency: v.optional(v.string()),
        notes: v.optional(v.string()),
        terms: v.optional(v.string()),
        customFields: v.optional(v.any()),
      })
    ),
    skipDuplicates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "bulkImportInvoices");
    // Delegate to importInvoices by transforming the typed array into the
    // generic records + fieldMapping shape. This avoids duplicating the
    // insertion logic.
    const records = args.invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      clientEmail: inv.clientEmail,
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      subtotal: inv.subtotal,
      taxRate: inv.taxRate,
      taxAmount: inv.taxAmount,
      total: inv.total,
      currency: inv.currency,
      notes: inv.notes,
      terms: inv.terms,
      _custom: inv.customFields ?? {},
    }));

    // Call the importInvoices handler logic directly by delegating
    // through a thin re-implementation. (We can't call the mutation
    // from within the mutation — but we can mirror its handler.)
    const { userId } = await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    const now = Date.now();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    let existingNumbers: Set<string> | null = null;
    if (args.skipDuplicates) {
      const existing = await ctx.db
        .query("invoices")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .take(1000);
      existingNumbers = new Set(existing.map((i) => (i.invoiceNumber ?? "").toLowerCase()));
    }

    for (let i = 0; i < records.length; i++) {
      try {
        const inv: any = records[i];
        let invoiceNumber = String(inv.invoiceNumber ?? "").trim();
        if (!invoiceNumber) {
          invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${i}`;
        }
        if (existingNumbers && existingNumbers.has(invoiceNumber.toLowerCase())) {
          skipped++;
          continue;
        }

        const status = VALID_STATUSES.includes(String(inv.status ?? "").toLowerCase())
          ? String(inv.status).toLowerCase()
          : "draft";
        const issueDate = inv.issueDate ? (parseDateField(inv.issueDate) ?? now) : now;
        const dueDate = inv.dueDate
          ? (parseDateField(inv.dueDate) ?? issueDate + 14 * 24 * 60 * 60 * 1000)
          : issueDate + 14 * 24 * 60 * 60 * 1000;
        const subtotal = Number(inv.subtotal ?? 0);
        const total = Number(inv.total ?? subtotal);

        await ctx.db.insert("invoices", {
          userId,
          workspaceId: args.workspaceId,
          createdBy: userId,
          invoiceNumber,
          publicToken: generatePublicToken(),
          status: status as any,
          issueDate,
          dueDate,
          clientName: inv.clientName,
          clientEmail: inv.clientEmail,
          lineItems: [],
          subtotal,
          taxRate: inv.taxRate,
          taxAmount: inv.taxAmount,
          total,
          currency: inv.currency ?? "USD",
          notes: inv.notes,
          terms: inv.terms,
          customFields: inv._custom && Object.keys(inv._custom).length > 0 ? inv._custom : undefined,
          createdAt: now,
          updatedAt: now,
        });
        if (existingNumbers) existingNumbers.add(invoiceNumber.toLowerCase());
        imported++;
      } catch (err: any) {
        errors.push(`Row ${imported + skipped + 1}: ${err.message}`);
      }
    }

    return { imported, skipped, errors };
  },
});
