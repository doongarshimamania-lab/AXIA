import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "../permissions";

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
    const existingDeals = await ctx.db
      .query("deals")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .collect();
    const existingTitles = new Set(
      existingDeals.map((d) => d.title.toLowerCase())
    );

    // Get max order in stage
    const stageDeals = await ctx.db
      .query("deals")
      .withIndex("by_stage", (q) => q.eq("stageId", args.stageId))
      .collect();
    let maxOrder =
      stageDeals.length > 0
        ? Math.max(...stageDeals.map((d) => d.order))
        : -1;

    for (const deal of args.deals) {
      try {
        // Skip duplicates if enabled
        if (
          args.skipDuplicates &&
          existingTitles.has(deal.title.toLowerCase())
        ) {
          skipped++;
          continue;
        }

        if (!deal.title.trim()) {
          errors.push(
            `Row ${imported + skipped + 1}: Title is required`
          );
          continue;
        }

        maxOrder++;
        await ctx.db.insert("deals", {
          workspaceId: args.workspaceId,
          teamId: undefined,
          createdBy: userId,
          userId, // backward compat
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
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        imported++;
      } catch (err: any) {
        errors.push(
          `Row ${imported + skipped + 1}: ${err.message}`
        );
      }
    }

    return { imported, skipped, errors };
  },
});
