import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../users";

// Get platform connection status for sidebar
export const getPlatformConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const platforms = ["upwork", "fiverr", "toptal", "freelancer"] as const;
    const connections = [];

    for (const platform of platforms) {
      const connection = await ctx.db
        .query("platformConnections")
        .withIndex("by_user_and_platform", (q) => 
          q.eq("userId", user._id).eq("platform", platform)
        )
        .first();

      connections.push({
        platform,
        status: connection?.status || "disconnected",
        connectedAt: connection?.connectedAt,
        lastSyncedAt: connection?.lastSyncedAt,
      });
    }

    return connections;
  },
});
