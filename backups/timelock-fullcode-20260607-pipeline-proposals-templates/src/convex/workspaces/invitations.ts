// @ts-nocheck — Convex backend file; workspaces tables not yet in generated types
/**
 * Workspace Invitation CRUD — queries and mutations for managing invitations.
 *
 * Flow: Owner/Manager invites by email → email with token → 
 *       recipient accepts → WorkspaceMember created.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Get all invitations for a workspace. */
export const getInvitations = query({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.optional(v.union(v.literal("pending"), v.literal("accepted"), v.literal("cancelled"), v.literal("expired"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify caller is a member of this workspace
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return [];

    const isOwner = workspace.ownerId === userId;
    const membership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", args.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!membership || membership.status !== "active")) return [];

    let invitations;
    if (args.status) {
      invitations = await ctx.db
        .query("workspaceInvitations")
        .withIndex("by_workspace_and_status", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("status", args.status!)
        )
        .collect();
    } else {
      invitations = await ctx.db
        .query("workspaceInvitations")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();
    }

    // Enrich with inviter name
    return await Promise.all(
      invitations.map(async (inv) => {
        const inviter = await ctx.db.get(inv.invitedBy);
        return {
          ...inv,
          inviterName: inviter?.name || "Unknown",
          inviterEmail: inviter?.email || "",
        };
      })
    );
  },
});

/** Get invitation by token (for the accept flow). */
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) return null;

    const workspace = await ctx.db.get(invitation.workspaceId);
    const inviter = await ctx.db.get(invitation.invitedBy);

    return {
      ...invitation,
      workspaceName: workspace?.name || "Unknown",
      inviterName: inviter?.name || "Unknown",
      isExpired: invitation.expiresAt < Date.now(),
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Invite someone to a workspace by email. */
export const createInvitation = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("manager"), v.literal("member")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    // Only owners and managers can invite
    const isOwner = workspace.ownerId === userId;
    const membership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", args.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!membership || membership.role === "member")) {
      throw new Error("Only owners and managers can invite members");
    }

    // Check if there's already a pending invitation for this email
    const existing = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace_and_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "pending")
      )
      .collect();

    const alreadyInvited = existing.find((inv) => inv.email === args.email);
    if (alreadyInvited) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Check if this user is already a member
    const allMembers = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Try to find user by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      const alreadyMember = allMembers.find(
        (m) => m.userId === existingUser._id && m.status === "active"
      );
      if (alreadyMember) {
        throw new Error("This user is already a member of this workspace");
      }
    }

    // Generate a unique token
    const token = crypto.randomUUID().replace(/-/g, "") + Date.now().toString(36);

    const now = Date.now();
    const invitationId = await ctx.db.insert("workspaceInvitations", {
      workspaceId: args.workspaceId,
      email: args.email,
      role: args.role,
      token,
      invitedBy: userId,
      status: "pending",
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { invitationId, token };
  },
});

/** Accept an invitation (called by the invited user). */
export const acceptInvitation = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) throw new Error("Invitation not found");
    if (invitation.status !== "pending") throw new Error("Invitation is no longer pending");
    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    // Check if user's email matches the invitation email
    const user = await ctx.db.get(userId);
    if (user?.email !== invitation.email) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", invitation.workspaceId).eq("userId", userId)
      )
      .first();

    if (existingMembership) {
      if (existingMembership.status === "active") {
        throw new Error("You are already a member of this workspace");
      }
      // Reactivate removed member
      await ctx.db.patch(existingMembership._id, {
        status: "active",
        role: invitation.role,
        joinedAt: Date.now(),
      });
    } else {
      // Create new membership
      await ctx.db.insert("workspaceMembers", {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
        status: "active",
        joinedAt: Date.now(),
        invitedBy: invitation.invitedBy,
        lastActiveAt: Date.now(),
      });
    }

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, { status: "accepted" });

    return { success: true, workspaceId: invitation.workspaceId };
  },
});

/** Cancel a pending invitation. */
export const cancelInvitation = mutation({
  args: { invitationId: v.id("workspaceInvitations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.status !== "pending") throw new Error("Can only cancel pending invitations");

    // Verify the caller has permission
    const workspace = await ctx.db.get(invitation.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const isOwner = workspace.ownerId === userId;
    const membership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", invitation.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!membership || membership.role === "member")) {
      throw new Error("Only owners and managers can cancel invitations");
    }

    await ctx.db.patch(args.invitationId, { status: "cancelled" });
    return { success: true };
  },
});

/** Expire old pending invitations (can be called by a cron job). */
export const expireOldInvitations = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_status_and_expires", (q) =>
        q.eq("status", "pending")
      )
      .collect();

    const expired = pending.filter((inv) => inv.expiresAt < now);

    for (const inv of expired) {
      await ctx.db.patch(inv._id, { status: "expired" });
    }

    return { expired: expired.length };
  },
});
