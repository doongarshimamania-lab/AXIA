// @ts-nocheck
// v5.5.0 — TEMPORARY ADMIN DEBUG tools.
// All mutations now require admin/expert-tier auth (was: no auth — Critical).
// All queries now require admin/expert-tier auth (was: no auth — Critical).
// DELETE THIS FILE BEFORE PRODUCTION DEPLOY.
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./security/rateLimit";

export const listAllAuthAccounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // ponytail: BA migration — authAccounts table no longer exists in app
    // schema (it lives inside the @convex-dev/better-auth component now).
    // To list BA accounts, use the BA admin API. Returning empty for now.
    return [];
  },
});

export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(1000);
    return users.map(u => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      tier: u.subscriptionTier,
      onboardingComplete: u.onboardingComplete,
      isAnonymous: u.isAnonymous,
    }));
  },
});

/**
 * Reset a user's password to a known value.
 * Usage:
 *   npx convex run adminListAll:resetPassword '{ "email": "user@example.com", "newPassword": "NewPass123!" }'
 */
export const resetPassword = mutation({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // v5.5.0: Critical fix — require admin auth (was: no auth).
    await requireAdmin(ctx);
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    // v5.5.0: 16-char cap (LPDOS guard — scrypt DoS prevention at 1k-user scale)
    if (args.newPassword.length > 16) {
      throw new Error("Password must be at most 16 characters");
    }

    // ponytail: BA migration — admin password reset now uses BA admin API.
    // The old direct-patch-to-authAccounts pattern no longer works because
    // account data lives inside the @convex-dev/better-auth component.
    // TODO: re-implement via authComponent.getAuth() + auth.api.resetPassword
    // or the BA admin plugin. For now, return not-supported.
    return {
      found: false,
      message:
        "Admin password reset is temporarily disabled after the Better Auth migration. " +
        "Use the standard 'Forgot password?' flow on /auth instead.",
    };
  },
});

/**
 * Cleanup duplicate pipelineStages for every workspace.
 *
 * Root cause: prior to AUTH-FIX-3, two callers (`use-auth.ts` and
 * `use-workspace.tsx`) both fired `seedPersonalWorkspace` in parallel on
 * first login. Under OCC isolation the second mutation didn't see the
 * first's insert, so each workspace ended up with 2 copies of every
 * default stage (12 rows instead of 6). This produced the "multiple
 * pipeline kanban boards" symptom on the Pipeline page.
 *
 * This mutation dedupes by (workspaceId, name, order) — keeping the
 * oldest row (lowest _creationTime) and deleting the rest. Also cleans
 * user-scoped stages (no workspaceId) by (userId, name, order).
 *
 * Usage:
 *   npx convex run adminListAll:cleanupDuplicateStages '{}'
 */
export const cleanupDuplicateStages = mutation({
  args: {},
  handler: async (ctx) => {
    // v5.5.0: Critical fix — require admin auth (was: no auth).
    await requireAdmin(ctx);
    const allStages = await ctx.db.query("pipelineStages").take(10000);
    const keep = new Map<string, any>(); // key -> stage (oldest)
    const toDelete: any[] = [];

    for (const s of allStages) {
      const wsKey = s.workspaceId ?? "no-ws";
      const userKey = s.userId ?? "no-user";
      const key = `${wsKey}|${userKey}|${s.name}|${s.order}`;
      const existing = keep.get(key);
      if (!existing) {
        keep.set(key, s);
      } else {
        // Keep the one with the oldest _creationTime
        if (s._creationTime < existing._creationTime) {
          toDelete.push(existing);
          keep.set(key, s);
        } else {
          toDelete.push(s);
        }
      }
    }

    for (const s of toDelete) {
      // Reassign any deals pointing at the duplicate stage to the kept stage
      const keptStage = keep.get(`${s.workspaceId ?? "no-ws"}|${s.userId ?? "no-user"}|${s.name}|${s.order}`);
      if (keptStage && keptStage._id !== s._id) {
        const dealsOnDupe = await ctx.db
          .query("deals")
          .withIndex("by_stage", (q) => q.eq("stageId", s._id))
          .take(1000);
        for (const d of dealsOnDupe) {
          await ctx.db.patch(d._id, { stageId: keptStage._id });
        }
      }
      await ctx.db.delete(s._id);
    }

    return {
      totalStagesBefore: allStages.length,
      totalStagesAfter: allStages.length - toDelete.length,
      duplicatesDeleted: toDelete.length,
    };
  },
});

/**
 * Ensure every workspace owner has a `workspaceMembers` row with
 * role="owner" + status="active".
 *
 * Root cause: `seedTeamUsers.enrichAllTeamUsers` creates a team workspace
 * with ownerId = Dev (the first user with a personal workspace) but never
 * inserts Dev into the `workspaceMembers` table for that team workspace.
 * Several queries (e.g., `getTeams` BEFORE this fix, `getMembers`) require
 * a membership row, so Dev would see an empty team list even though Dev
 * owns the workspace. We've since added an `isOwner` shortcut to those
 * queries, but this mutation defensively inserts the missing owner rows
 * so all queries — even ones we missed — work correctly.
 *
 * Usage:
 *   npx convex run adminListAll:fixWorkspaceOwnerMemberships '{}'
 */
export const fixWorkspaceOwnerMemberships = mutation({
  args: {},
  handler: async (ctx) => {
    // v5.5.0: Critical fix — require admin auth (was: no auth).
    await requireAdmin(ctx);
    const workspaces = await ctx.db.query("workspaces").take(10000);
    const now = Date.now();
    let inserted = 0;
    let alreadyExisted = 0;

    for (const ws of workspaces) {
      // Check if owner already has a workspaceMembers row
      const existing = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", ws._id).eq("userId", ws.ownerId)
        )
        .first();

      if (existing) {
        // Ensure role/status are correct
        if (existing.role !== "owner" || existing.status !== "active") {
          await ctx.db.patch(existing._id, { role: "owner", status: "active" });
        }
        alreadyExisted++;
      } else {
        await ctx.db.insert("workspaceMembers", {
          workspaceId: ws._id,
          userId: ws.ownerId,
          role: "owner",
          status: "active",
          title: ws.type === "personal" ? "Freelancer" : "Founder",
          joinedAt: ws.createdAt ?? now,
          lastActiveAt: now,
        });
        inserted++;
      }
    }

    return {
      workspacesTotal: workspaces.length,
      ownerMembershipsInserted: inserted,
      ownerMembershipsAlreadyExisted: alreadyExisted,
    };
  },
});
