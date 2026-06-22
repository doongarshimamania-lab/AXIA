import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const countActiveProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const allProjects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const activeProjects = allProjects.filter(p => p.status === "active");
    const archivedProjects = allProjects.filter(p => p.status === "archived");

    return {
      total: allProjects.length,
      active: activeProjects.length,
      archived: archivedProjects.length,
      projects: allProjects.map(p => ({
        id: p._id,
        name: p.projectName,
        status: p.status,
        createdAt: p.createdAt
      }))
    };
  },
});