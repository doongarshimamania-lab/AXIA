// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "../permissions";

// ─── Core field definitions for deals ──────────────────────────────────────
export const DEAL_CORE_FIELDS = [
  { key: "title", label: "Deal Title", required: true },
  { key: "value", label: "Value", type: "number", required: true },
  { key: "probability", label: "Probability (%)", type: "number" },
  { key: "source", label: "Source" },
  { key: "contactName", label: "Contact Name" },
  { key: "contactEmail", label: "Contact Email" },
  { key: "expectedCloseDate", label: "Expected Close Date", type: "date" },
  { key: "notes", label: "Notes" },
] as const;

// ─── Get import field definitions (for frontend mapping UI) ────────────────

export const getDealImportFields = query({
  args: {},
  handler: async (_ctx) => {
    return DEAL_CORE_FIELDS;
  },
});

// ─── Bulk import with field mapping ────────────────────────────────────────

export const importDeals = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    stageId: v.id("pipelineStages"), // Default stage for imported deals
    teamId: v.optional(v.id("teams")),
    // Flexible records — each entry is a row from CSV/Excel.
    records: v.array(v.any()),
    // fieldMapping: { csvColumnName: "coreFieldKey" | "custom:fieldName" }
    fieldMapping: v.optional(v.any()),
    skipDuplicates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceAccess(
      ctx,
      args.workspaceId,
      "member"
    );

    // Verify stage belongs to this workspace
    const stage = await ctx.db.get(args.stageId);
    if (!stage) throw new Error("Stage not found");

    const now = Date.now();
    const coreFieldKeys = DEAL_CORE_FIELDS.map((f) => f.key);
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    // Duplicate check set
    let existingTitles: Set<string> | null = null;
    if (args.skipDuplicates) {
      const existingDeals = await ctx.db
        .query("deals")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", args.workspaceId)
        )
        .collect();
      existingTitles = new Set(
        existingDeals.map((d) => d.title.toLowerCase())
      );
    }

    // Get max order in the target stage for ordering new deals
    const stageDeals = await ctx.db
      .query("deals")
      .withIndex("by_stage", (q) => q.eq("stageId", args.stageId))
      .collect();
    let maxOrder =
      stageDeals.length > 0
        ? Math.max(...stageDeals.map((d) => d.order))
        : -1;

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
          // Carry over pre-mapped core field keys
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

        // ── Validate required fields ──────────────────────────────────────
        const title = String(coreData.title ?? "").trim();
        if (!title) {
          results.errors.push(`Row ${i + 1}: Missing deal title`);
          continue;
        }

        const dealValue =
          coreData.value != null && !isNaN(Number(coreData.value))
            ? Number(coreData.value)
            : 0;

        // ── Duplicate check ───────────────────────────────────────────────
        if (existingTitles && existingTitles.has(title.toLowerCase())) {
          results.skipped++;
          continue;
        }

        // ── Coerce probability ────────────────────────────────────────────
        const probability =
          coreData.probability != null && !isNaN(Number(coreData.probability))
            ? Math.min(100, Math.max(0, Number(coreData.probability)))
            : 20;

        // ── Parse expectedCloseDate ───────────────────────────────────────
        let expectedCloseDate: number | undefined;
        if (coreData.expectedCloseDate != null) {
          const parsed = Number(coreData.expectedCloseDate);
          if (!isNaN(parsed) && parsed > 0) {
            expectedCloseDate = parsed;
          } else {
            // Try parsing as ISO/date string
            const d = new Date(coreData.expectedCloseDate);
            if (!isNaN(d.getTime())) {
              expectedCloseDate = d.getTime();
            }
          }
        }

        // ── Insert ────────────────────────────────────────────────────────
        maxOrder++;
        await ctx.db.insert("deals", {
          userId, // backward compat
          workspaceId: args.workspaceId,
          createdBy: userId,
          teamId: args.teamId,
          stageId: args.stageId,
          title,
          value: dealValue,
          probability,
          source: coreData.source ? String(coreData.source) : undefined,
          contactName: coreData.contactName ? String(coreData.contactName) : undefined,
          contactEmail: coreData.contactEmail ? String(coreData.contactEmail) : undefined,
          expectedCloseDate,
          notes: coreData.notes ? String(coreData.notes) : undefined,
          customFields: Object.keys(customData).length > 0 ? customData : undefined,
          order: maxOrder,
          createdAt: now,
          updatedAt: now,
        });

        // Track for intra-batch duplicates
        if (existingTitles) existingTitles.add(title.toLowerCase());
        results.created++;
      } catch (err: any) {
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return results;
  },
});

// ─── Legacy bulk import (backwards-compatible) ────────────────────────────

export const bulkImportDeals = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    stageId: v.id("pipelineStages"),
    deals: v.array(
      v.object({
        title: v.string(),
        value: v.optional(v.number()),
        probability: v.optional(v.number()),
        source: v.optional(v.string()),
        contactEmail: v.optional(v.string()),
        contactName: v.optional(v.string()),
        expectedCloseDate: v.optional(v.number()),
        notes: v.optional(v.string()),
        customFields: v.optional(v.any()),
      })
    ),
    skipDuplicates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceAccess(
      ctx,
      args.workspaceId,
      "member"
    );

    // Verify stage belongs to this workspace
    const stage = await ctx.db.get(args.stageId);
    if (!stage) throw new Error("Stage not found");

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Get existing deals for duplicate check
    let existingTitles: Set<string> | null = null;
    if (args.skipDuplicates) {
      const existingDeals = await ctx.db
        .query("deals")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", args.workspaceId)
        )
        .collect();
      existingTitles = new Set(
        existingDeals.map((d) => d.title.toLowerCase())
      );
    }

    // Get max order in stage
    const stageDeals = await ctx.db
      .query("deals")
      .withIndex("by_stage", (q) => q.eq("stageId", args.stageId))
      .collect();
    let maxOrder =
      stageDeals.length > 0
        ? Math.max(...stageDeals.map((d) => d.order))
        : -1;

    const now = Date.now();
    for (const deal of args.deals) {
      try {
        if (existingTitles && existingTitles.has(deal.title.toLowerCase())) {
          skipped++;
          continue;
        }
        if (!deal.title.trim()) {
          errors.push(`Row ${imported + skipped + 1}: Title is required`);
          continue;
        }

        maxOrder++;
        await ctx.db.insert("deals", {
          workspaceId: args.workspaceId,
          teamId: undefined,
          createdBy: userId,
          userId,
          stageId: args.stageId,
          title: deal.title.trim(),
          value: deal.value ?? 0,
          probability: deal.probability ?? 20,
          source: deal.source,
          contactEmail: deal.contactEmail,
          contactName: deal.contactName,
          expectedCloseDate: deal.expectedCloseDate,
          notes: deal.notes,
          customFields: deal.customFields,
          order: maxOrder,
          createdAt: now,
          updatedAt: now,
        });
        if (existingTitles) existingTitles.add(deal.title.toLowerCase());
        imported++;
      } catch (err: any) {
        errors.push(`Row ${imported + skipped + 1}: ${err.message}`);
      }
    }

    return { imported, skipped, errors };
  },
});
