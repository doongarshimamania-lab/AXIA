import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const teamTables = {
  teams: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string().maxLength(100),
    color: v.string().maxLength(32),
    icon: v.optional(v.string().maxLength(1000)),
    description: v.optional(v.string().maxLength(5000)),
    isCrossTeam: v.optional(v.boolean()), // Management team -- sees all data
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"]),

  teamMemberships: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    role: v.union(v.literal("lead"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"])
    .index("by_team_and_user", ["teamId", "userId"]),
};
