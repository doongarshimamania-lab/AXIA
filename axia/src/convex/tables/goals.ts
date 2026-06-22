import { defineTable } from "convex/server";
import { v } from "convex/values";

export const goalTables = {
  goals: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    title: v.string().maxLength(200),
    description: v.optional(v.string().maxLength(5000)),
    type: v.string(), // "revenue"|"hours"|"clients"|"protection"|"custom"
    target: v.number(),
    current: v.number(),
    unit: v.string(), // "USD"|"hours"|"clients"|"score"|"%"
    deadline: v.optional(v.number()),
    status: v.string(), // "not_started"|"in_progress"|"completed"|"abandoned"
    milestones: v.optional(
      v.array(
        v.object({
          id: v.string().maxLength(1000),
          title: v.string().maxLength(200),
          completed: v.boolean(),
          completedAt: v.optional(v.number()),
        })
      )
    ),
    streak: v.optional(v.number()),
    lastCheckIn: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"]),
};
