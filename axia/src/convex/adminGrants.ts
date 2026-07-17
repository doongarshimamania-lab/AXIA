// @ts-nocheck
/**
 * Admin grant helpers — one-off mutations to:
 *   1. Rename the "Engineering" team to "Dev Team" in the AXIA Team workspace.
 *   2. Upgrade a specific user (default: priya@axia.dev) to the "expert" tier.
 *   3. Grant a tier to ANY user by email (admin escape hatch).
 *
 * Usage (run from project root, signed in as an owner):
 *   npx convex run adminGrants:renameEngineeringToDevTeam '{}'
 *   npx convex run adminGrants:upgradeSelfToExpert '{"email":"priya@axia.dev"}'
 *   npx convex run adminGrants:grantTier '{"email":"marcus@axia.dev","tier":"pro"}'
 *
 * SECURITY: Every mutation calls `requireOwner(ctx)` as its first line — only
 * users with role === "owner" can invoke these. The prior "private deployment"
 * assumption was broken once the Convex deployment went live (frontend is
 * public; any signed-in user could call these via api.* references).
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireOwner } from "./ownerDashboard/lib/guard";

const VALID_TIERS = ["free", "starter", "pro", "expert", "client"] as const;
type Tier = (typeof VALID_TIERS)[number];

/**
 * 1. Rename "Engineering" → "Dev Team" in the AXIA Team workspace.
 *    Idempotent: if "Dev Team" already exists, no-op.
 *    If "Engineering" doesn't exist but "Dev Team" does, also no-op.
 */
export const renameEngineeringToDevTeam = mutation({
  args: {
    workspaceName: v.optional(v.string()), // default: "AXIA Team"
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const workspaces = await ctx.db.query("workspaces").collect();
    const ws = workspaces.find(
      (w) => w.type === "team" && (args.workspaceName ? w.name === args.workspaceName : true)
    );
    if (!ws) {
      return { ok: false, error: "No team workspace found", workspaces: workspaces.map((w) => w.name) };
    }

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", ws._id))
      .collect();

    const engineering = teams.find((t) => t.name === "Engineering");
    const devTeam = teams.find((t) => t.name === "Dev Team");

    if (devTeam) {
      return { ok: true, message: "Dev Team already exists", teamId: devTeam._id };
    }
    if (!engineering) {
      return {
        ok: false,
        error: "No 'Engineering' team found to rename",
        teams: teams.map((t) => ({ id: t._id, name: t.name })),
      };
    }

    await ctx.db.patch(engineering._id, {
      name: "Dev Team",
      color: "#10b981", // emerald — distinct from Engineering blue
      description: engineering.description ?? "Core product development team",
      updatedAt: Date.now(),
    });

    return {
      ok: true,
      message: "Renamed 'Engineering' → 'Dev Team'",
      teamId: engineering._id,
      workspaceId: ws._id,
    };
  },
});

/**
 * 2. Upgrade the calling user (or a specific email) to "expert" tier.
 *    If `email` is omitted, requires an authenticated session and upgrades self.
 */
export const upgradeSelfToExpert = mutation({
  args: {
    email: v.optional(v.string()), // if omitted, uses the authenticated user
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    let userId;
    let userEmail;

    if (args.email) {
      const userRow = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email))
        .first();
      if (!userRow) {
        return { ok: false, error: `No user found with email ${args.email}` };
      }
      userId = userRow._id;
      userEmail = userRow.email;
    } else {
      userId = await getAuthUserId(ctx);
      if (!userId) {
        return { ok: false, error: "Not authenticated — pass `email` arg instead." };
      }
      const userRow = await ctx.db.get(userId);
      userEmail = userRow?.email;
    }

    const existing = await ctx.db.get(userId);
    const previousTier = existing?.subscriptionTier ?? "free";

    await ctx.db.patch(userId, {
      subscriptionTier: "expert",
      tierUpgradedAt: Date.now(),
    });

    return {
      ok: true,
      message: `Upgraded ${userEmail} from '${previousTier}' → 'expert'`,
      userId,
      email: userEmail,
      previousTier,
      newTier: "expert",
    };
  },
});

/**
 * 3. Grant ANY tier to ANY user by email.
 *    Admin escape hatch — use sparingly.
 *
 *    npx convex run adminGrants:grantTier '{"email":"marcus@axia.dev","tier":"pro"}'
 */
export const grantTier = mutation({
  args: {
    email: v.string(),
    tier: v.union(...VALID_TIERS.map((t) => v.literal(t))),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const userRow = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (!userRow) {
      return { ok: false, error: `No user found with email ${args.email}` };
    }

    const previousTier = userRow.subscriptionTier ?? "free";
    await ctx.db.patch(userRow._id, {
      subscriptionTier: args.tier,
      tierUpgradedAt: Date.now(),
    });

    return {
      ok: true,
      message: `Granted '${args.tier}' tier to ${args.email} (was '${previousTier}')`,
      userId: userRow._id,
      email: args.email,
      previousTier,
      newTier: args.tier,
    };
  },
});

/**
 * 4. Grant a workspace role to a user (owner / manager / member).
 *    Requires the user to already exist; creates a workspaceMembers row if
 *    none exists, otherwise patches the existing one.
 *
 *    npx convex run adminGrants:grantWorkspaceRole '{
 *      "email":"marcus@axia.dev",
 *      "workspaceName":"AXIA Team",
 *      "role":"manager"
 *    }'
 */
export const grantWorkspaceRole = mutation({
  args: {
    email: v.string(),
    workspaceName: v.optional(v.string()),
    role: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("member")
    ),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const userRow = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (!userRow) {
      return { ok: false, error: `No user found with email ${args.email}` };
    }

    const workspaces = await ctx.db.query("workspaces").collect();
    const ws = workspaces.find(
      (w) => w.type === "team" && (args.workspaceName ? w.name === args.workspaceName : true)
    );
    if (!ws) {
      return { ok: false, error: "No team workspace found" };
    }

    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", ws._id).eq("userId", userRow._id)
      )
      .first();

    if (existing) {
      const prevRole = existing.role;
      await ctx.db.patch(existing._id, { role: args.role, status: "active" });
      return {
        ok: true,
        message: `Updated ${args.email} role: '${prevRole}' → '${args.role}' in ${ws.name}`,
        workspaceMemberId: existing._id,
      };
    }

    const now = Date.now();
    const memberId = await ctx.db.insert("workspaceMembers", {
      workspaceId: ws._id,
      userId: userRow._id,
      role: args.role,
      status: "active",
      title: args.role === "owner" ? "Founder" : args.role === "manager" ? "Lead" : "Member",
      joinedAt: now,
      lastActiveAt: now,
    });

    return {
      ok: true,
      message: `Added ${args.email} to ${ws.name} as '${args.role}'`,
      workspaceMemberId: memberId,
    };
  },
});

/**
 * 5. Add a user to a specific team (e.g., "Dev Team") as a lead or member.
 *
 *    npx convex run adminGrants:addToTeam '{
 *      "email":"marcus@axia.dev",
 *      "teamName":"Dev Team",
 *      "role":"member"
 *    }'
 */
export const addToTeam = mutation({
  args: {
    email: v.string(),
    teamName: v.string(),
    role: v.optional(v.union(v.literal("lead"), v.literal("member"))),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const userRow = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (!userRow) {
      return { ok: false, error: `No user found with email ${args.email}` };
    }

    // Find the team by name across all workspaces
    const allTeams = await ctx.db.query("teams").collect();
    const team = allTeams.find((t) => t.name === args.teamName);
    if (!team) {
      return {
        ok: false,
        error: `No team named '${args.teamName}' found`,
        availableTeams: allTeams.map((t) => t.name),
      };
    }

    // Check existing membership
    const existing = await ctx.db
      .query("teamMemberships")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", team._id).eq("userId", userRow._id)
      )
      .first();
    if (existing) {
      const prevRole = existing.role;
      if (args.role && args.role !== prevRole) {
        await ctx.db.patch(existing._id, { role: args.role });
        return {
          ok: true,
          message: `Updated ${args.email} in '${args.teamName}': '${prevRole}' → '${args.role}'`,
        };
      }
      return { ok: true, message: `${args.email} already in '${args.teamName}' as '${prevRole}'` };
    }

    await ctx.db.insert("teamMemberships", {
      teamId: team._id,
      userId: userRow._id,
      workspaceId: team.workspaceId,
      role: args.role ?? "member",
      joinedAt: Date.now(),
    });

    return {
      ok: true,
      message: `Added ${args.email} to '${args.teamName}' as '${args.role ?? "member"}'`,
    };
  },
});
