// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "../permissions";

// ─── Core field definitions for clients ────────────────────────────────────
// These map to the actual columns in the `clients` table.
// The `key` is the column name in the DB; the `label` is what the user sees.
export const CLIENT_CORE_FIELDS = [
  { key: "clientName", label: "Client Name", required: true },
  { key: "platform", label: "Platform", type: "select", options: ["upwork", "fiverr", "toptal", "freelancer", "direct"] },
  { key: "hourlyRate", label: "Hourly Rate", type: "number" },
  { key: "contractType", label: "Contract Type", type: "select", options: ["hourly", "fixed"] },
  { key: "riskLevel", label: "Risk Level", type: "select", options: ["low", "medium", "high"] },
  { key: "contactEmail", label: "Contact Email" },
  { key: "contactName", label: "Contact Name" },
  { key: "notes", label: "Notes" },
] as const;

// ─── Get import field definitions (for frontend mapping UI) ────────────────

export const getClientImportFields = query({
  args: {},
  handler: async (_ctx) => {
    return CLIENT_CORE_FIELDS;
  },
});

// ─── Bulk import with field mapping ────────────────────────────────────────

export const importClients = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    teamId: v.optional(v.id("teams")),
    // Flexible records — each entry is a row from CSV/Excel.
    // Keys can be raw CSV column names; they will be resolved via fieldMapping.
    records: v.array(v.any()),
    // fieldMapping: { csvColumnName: "coreFieldKey" | "custom:fieldName" }
    // If omitted, record keys are assumed to already match core field keys.
    fieldMapping: v.optional(v.any()),
    skipDuplicates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceAccess(
      ctx,
      args.workspaceId,
      "member"
    );

    const now = Date.now();
    const coreFieldKeys = CLIENT_CORE_FIELDS.map((f) => f.key);
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    // Build duplicate check set
    let existingNames: Set<string> | null = null;
    if (args.skipDuplicates) {
      const existingClients = await ctx.db
        .query("clients")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", args.workspaceId)
        )
        .collect();
      existingNames = new Set(
        existingClients.map((c) => c.clientName.toLowerCase())
      );
    }

    for (let i = 0; i < args.records.length; i++) {
      try {
        const rawRecord = args.records[i];

        // ── Apply field mapping ───────────────────────────────────────────
        // If a fieldMapping is provided, translate CSV column names to our
        // internal field keys. Unmapped columns that start with "custom:"
        // in the mapping value are treated as custom field names.
        const record: Record<string, any> = {};
        if (args.fieldMapping && Object.keys(args.fieldMapping).length > 0) {
          for (const [csvCol, target] of Object.entries(args.fieldMapping)) {
            const value = rawRecord[csvCol];
            if (value === undefined || value === null) continue;
            if (typeof target === "string" && target.startsWith("custom:")) {
              // e.g. "custom:referralSource" → customFields.referralSource
              const customKey = target.slice("custom:".length);
              if (!record._custom) record._custom = {};
              record._custom[customKey] = value;
            } else {
              record[target] = value;
            }
          }
          // Also carry over any keys that already match core fields (in case
          // the caller pre-mapped them).
          for (const [key, value] of Object.entries(rawRecord)) {
            if (coreFieldKeys.includes(key) && record[key] === undefined) {
              record[key] = value;
            }
          }
        } else {
          // No mapping — use record as-is
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
            // Unrecognized column → custom field
            customData[key] = value;
          }
        }

        // ── Validate required field ───────────────────────────────────────
        const clientName = String(coreData.clientName ?? "").trim();
        if (!clientName) {
          results.errors.push(`Row ${i + 1}: Missing client name`);
          continue;
        }

        // ── Duplicate check ───────────────────────────────────────────────
        if (existingNames && existingNames.has(clientName.toLowerCase())) {
          results.skipped++;
          continue;
        }

        // ── Coerce / default core fields ──────────────────────────────────
        const validPlatforms = ["upwork", "fiverr", "toptal", "freelancer", "direct"];
        const rawPlatform = String(coreData.platform ?? "direct").toLowerCase();
        const platform = validPlatforms.includes(rawPlatform) ? rawPlatform : "direct";

        const validContractTypes = ["hourly", "fixed"];
        const rawContractType = String(coreData.contractType ?? "hourly").toLowerCase();
        const contractType = validContractTypes.includes(rawContractType) ? rawContractType : "hourly";

        const validRiskLevels = ["low", "medium", "high"];
        const rawRiskLevel = String(coreData.riskLevel ?? "medium").toLowerCase();
        const riskLevel = validRiskLevels.includes(rawRiskLevel) ? rawRiskLevel : "medium";

        const hourlyRate = coreData.hourlyRate != null && !isNaN(Number(coreData.hourlyRate))
          ? Number(coreData.hourlyRate)
          : 0;

        // ── Insert ────────────────────────────────────────────────────────
        await ctx.db.insert("clients", {
          userId, // backward compat
          workspaceId: args.workspaceId,
          createdBy: userId,
          teamId: args.teamId,
          clientName,
          platform,
          hourlyRate,
          contractType,
          riskLevel,
          contactEmail: coreData.contactEmail ? String(coreData.contactEmail) : undefined,
          contactName: coreData.contactName ? String(coreData.contactName) : undefined,
          notes: coreData.notes ? String(coreData.notes) : undefined,
          customFields: Object.keys(customData).length > 0 ? customData : undefined,
          addedAt: now,
          lastActivityAt: now,
        });

        // Track inserted name for intra-batch duplicate detection
        if (existingNames) existingNames.add(clientName.toLowerCase());
        results.created++;
      } catch (err: any) {
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return results;
  },
});

// ─── Legacy bulk import (backwards-compatible) ────────────────────────────
// Kept for any existing callers that use the `clients` arg format.

export const bulkImportClients = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    clients: v.array(
      v.object({
        clientName: v.string(),
        platform: v.optional(
          v.union(
            v.literal("upwork"),
            v.literal("fiverr"),
            v.literal("toptal"),
            v.literal("freelancer"),
            v.literal("direct")
          )
        ),
        hourlyRate: v.optional(v.number()),
        contractType: v.optional(v.union(v.literal("hourly"), v.literal("fixed"))),
        riskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
        contactEmail: v.optional(v.string()),
        contactName: v.optional(v.string()),
        notes: v.optional(v.string()),
        customFields: v.optional(v.any()),
      })
    ),
    skipDuplicates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Delegate to the new importClients by transforming args
    const records = args.clients.map((c) => ({
      clientName: c.clientName,
      platform: c.platform ?? "direct",
      hourlyRate: c.hourlyRate ?? 0,
      contractType: c.contractType ?? "hourly",
      riskLevel: c.riskLevel ?? "medium",
      contactEmail: c.contactEmail,
      contactName: c.contactName,
      notes: c.notes,
      _custom: c.customFields ?? {},
    }));

    // Directly insert to avoid re-validating through importClients
    const { userId } = await requireWorkspaceAccess(ctx, args.workspaceId, "member");

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    let existingNames: Set<string> | null = null;
    if (args.skipDuplicates) {
      const existingClients = await ctx.db
        .query("clients")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();
      existingNames = new Set(existingClients.map((c) => c.clientName.toLowerCase()));
    }

    const now = Date.now();
    for (const client of args.clients) {
      try {
        if (existingNames && existingNames.has(client.clientName.toLowerCase())) {
          skipped++;
          continue;
        }
        if (!client.clientName.trim()) {
          errors.push(`Row ${imported + skipped + 1}: Client name is required`);
          continue;
        }
        await ctx.db.insert("clients", {
          workspaceId: args.workspaceId,
          teamId: undefined,
          createdBy: userId,
          userId,
          clientName: client.clientName.trim(),
          platform: client.platform ?? "direct",
          hourlyRate: client.hourlyRate ?? 0,
          contractType: client.contractType ?? "hourly",
          riskLevel: client.riskLevel ?? "medium",
          contactEmail: client.contactEmail,
          contactName: client.contactName,
          notes: client.notes,
          customFields: client.customFields,
          addedAt: now,
          lastActivityAt: now,
        });
        if (existingNames) existingNames.add(client.clientName.toLowerCase());
        imported++;
      } catch (err: any) {
        errors.push(`Row ${imported + skipped + 1}: ${err.message}`);
      }
    }

    return { imported, skipped, errors };
  },
});
