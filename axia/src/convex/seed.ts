// @ts-nocheck — Convex backend file with schema types not yet in generated types
/**
 * Seed mutation for enriching a freshly-signed-up user profile.
 *
 * CRITICAL FIX (2026-06-22):
 * Previously this mutation ALSO created hardcoded sample data — the same
 * fake clients ("Acme Corp", "TechStart Inc", "DesignFlow Agency"),
 * projects, and deals — for EVERY new user. That caused:
 *   1. The "convex error" when signing in with a different account,
 *      because the seed conflicted with prior attempts or with the
 *      workspace already auto-created by `workspaces.crud.seedPersonalWorkspace`.
 *   2. Every new user's dashboard showing identical fake data.
 *
 * Now this mutation is MINIMAL: it only enriches the user profile fields
 * (name, role, subscriptionTier, joinedAt) and is fully idempotent.
 * It does NOT create workspaces, clients, projects, deals, or pipeline
 * stages. The personal workspace + default pipeline stages are created
 * lazily by `workspaces.crud.seedPersonalWorkspace` (called from useAuth).
 * Sample/demo data is only created when the user explicitly clicks
 * "Seed Demo Data" in the empty dashboard state (api.autoSeed.autoSeed).
 *
 * Usage: Called automatically by the useAuth hook on first sign-in.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getCurrentUser } from "./users";

// Dev user credentials (used only for the enrichDevUser mutation below)
const DEV_USER_EMAIL = "dev@axia.app";
const DEV_USER_NAME = "Dev User";

/**
 * Admin-only guard. `resetDevUser` previously allowed ANY authenticated
 * user to wipe the dev user's data. Now admin-only (v5.4.0 security audit).
 */
async function requireAdmin(ctx: any): Promise<void> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  if (user.role !== "admin") throw new Error("Admin access required");
}

/**
 * Check if the dev user has been seeded already.
 */
export const isDevUserSeeded = query({
  args: {},
  handler: async (ctx) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", DEV_USER_EMAIL))
      .first();
    return existingUser !== null;
  },
});

/**
 * Reset the dev user: Delete the orphaned user document (and related data)
 * so you can do a proper sign-up through the auth flow.
 *
 * This is needed when a user document exists but has no auth account
 * (causes "InvalidSecret" error on sign-in).
 *
 * Usage: npx convex run seed:resetDevUser
 */
export const resetDevUser = mutation({
  args: {},
  handler: async (ctx) => {
    // SECURITY: Admin-only (was: any authenticated user; was originally: no auth).
    // Admin-only is stricter than the previous "dev user can reset their own
    // account" check, so that check is now redundant and removed.
    await requireAdmin(ctx);

    // Find the dev user document
    const devUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", DEV_USER_EMAIL))
      .first();

    if (!devUser) {
      return { success: true, message: "No dev user found to reset." };
    }

    const devUserId = devUser._id;
    let deletedCount = 0;

    // Delete all related data for this user
    // 1. Pipeline stages
    const stages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", devUserId))
      .collect();
    for (const s of stages) { await ctx.db.delete(s._id); deletedCount++; }

    // 2. Deals
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", devUserId))
      .collect();
    for (const d of deals) { await ctx.db.delete(d._id); deletedCount++; }

    // 3. Clients
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", devUserId))
      .collect();
    for (const c of clients) { await ctx.db.delete(c._id); deletedCount++; }

    // 4. Projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", devUserId))
      .collect();
    for (const p of projects) { await ctx.db.delete(p._id); deletedCount++; }

    // 5. Workspaces
    const workspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", devUserId))
      .collect();
    for (const w of workspaces) { await ctx.db.delete(w._id); deletedCount++; }

    // 6. Finally, delete the user document
    await ctx.db.delete(devUserId);
    deletedCount++;

    return {
      success: true,
      message: `Reset complete. Deleted ${deletedCount} records (including user document). You can now sign up fresh.`,
    };
  },
});

/**
 * Create the dev user profile fields.
 * This should be called AFTER the user has signed up with the Password provider
 * using email: dev@axia.app
 *
 * It enriches the user with profile data and creates sample data
 * (workspace, clients, projects, pipeline stages, deals).
 */
export const enrichDevUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please sign in first.");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    // Only enrich if this is the dev user
    if (user.email !== DEV_USER_EMAIL) {
      throw new Error("This mutation is only for the dev user (dev@axia.app).");
    }

    // Update user profile with dev data
    await ctx.db.patch(userId, {
      name: DEV_USER_NAME,
      role: "admin",
      subscriptionTier: "pro",
      hourlyRate: 85,
      professionalBio: "Full-stack developer and freelance professional specializing in web applications, React, and cloud architecture. 8+ years of experience working with startups and enterprise clients.",
      protectedHours: 171,
      protectedValue: 14535,
      primaryPlatform: "upwork",
      yearsExperience: "8+",
      onboardingComplete: true,
      onboardingCompletedAt: Date.now(),
      connectedPlatforms: ["upwork", "fiverr"],
      joinedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    });

    // Create personal workspace
    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();

    let workspaceId;
    if (!existingWorkspace) {
      workspaceId = await ctx.db.insert("workspaces", {
        name: "Dev Workspace",
        type: "personal",
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      workspaceId = existingWorkspace._id;
    }

    // Create pipeline stages (required before deals)
    const stageNames = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
    const stageColors = ["#94a3b8", "#60a5fa", "#a78bfa", "#fb923c", "#4ade80", "#f87171"];
    const stageIds: any[] = [];

    for (let i = 0; i < stageNames.length; i++) {
      const existingStage = await ctx.db
        .query("pipelineStages")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("name"), stageNames[i]))
        .first();

      if (!existingStage) {
        const stageId = await ctx.db.insert("pipelineStages", {
          userId,
          workspaceId,
          createdBy: userId,
          name: stageNames[i],
          color: stageColors[i],
          order: i,
          isDefault: i < 5,
          createdAt: Date.now(),
        });
        stageIds.push(stageId);
      } else {
        stageIds.push(existingStage._id);
      }
    }

    // Create sample clients (using the actual schema)
    const clientData = [
      {
        clientName: "Acme Corp",
        platform: "upwork" as const,
        hourlyRate: 85,
        contractType: "hourly" as const,
        riskLevel: "low" as const,
        addedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
        lastActivityAt: Date.now(),
      },
      {
        clientName: "TechStart Inc",
        platform: "fiverr" as const,
        hourlyRate: 90,
        contractType: "fixed" as const,
        riskLevel: "medium" as const,
        addedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
        lastActivityAt: Date.now(),
      },
      {
        clientName: "DesignFlow Agency",
        platform: "direct" as const,
        hourlyRate: 75,
        contractType: "hourly" as const,
        riskLevel: "low" as const,
        addedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
        lastActivityAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      },
    ];

    const clientIds: any[] = [];
    for (const client of clientData) {
      const existing = await ctx.db
        .query("clients")
        .withIndex("by_user_and_name", (q) => q.eq("userId", userId).eq("clientName", client.clientName))
        .first();

      if (!existing) {
        const clientId = await ctx.db.insert("clients", {
          ...client,
          userId,
          workspaceId,
        });
        clientIds.push(clientId);
      } else {
        clientIds.push(existing._id);
      }
    }

    // Create sample projects (using the actual schema)
    const projectData = [
      {
        projectName: "E-Commerce Platform Redesign",
        clientId: clientIds[0],
        hourlyRate: 85,
        projectType: "ongoing" as const,
        protectionLevel: "enhanced" as const,
        status: "active" as const,
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        lastActivityAt: Date.now(),
      },
      {
        projectName: "MVP SaaS Dashboard",
        clientId: clientIds[1],
        hourlyRate: 90,
        projectType: "milestone" as const,
        protectionLevel: "standard" as const,
        status: "active" as const,
        createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
        lastActivityAt: Date.now(),
      },
      {
        projectName: "Brand Identity System",
        clientId: clientIds[2],
        hourlyRate: 75,
        projectType: "fixed" as const,
        protectionLevel: "standard" as const,
        status: "archived" as const,
        createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
        lastActivityAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      },
    ];

    for (const project of projectData) {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_user_and_name", (q) => q.eq("userId", userId).eq("projectName", project.projectName))
        .first();

      if (!existing) {
        await ctx.db.insert("projects", {
          ...project,
          userId,
          workspaceId,
        });
      }
    }

    // Create sample pipeline deals (using the actual schema - requires stageId)
    const dealData = [
      {
        title: "Mobile App Development",
        value: 15000,
        probability: 95,
        stageId: stageIds[4], // Won
        clientId: clientIds[0],
        notes: "Signed contract for mobile companion app.",
        order: 0,
        createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      },
      {
        title: "API Integration Project",
        value: 6000,
        probability: 70,
        stageId: stageIds[3], // Negotiation
        clientId: clientIds[1],
        notes: "Discussing scope for payment gateway integration.",
        order: 1,
        createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
      {
        title: "Cloud Migration Consultation",
        value: 4000,
        probability: 50,
        stageId: stageIds[2], // Proposal
        clientId: undefined,
        notes: "Sent proposal for AWS migration consultation.",
        order: 2,
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      },
      {
        title: "Website Refresh",
        value: 3000,
        probability: 30,
        stageId: stageIds[1], // Qualified
        clientId: undefined,
        notes: "Initial discovery call completed.",
        order: 3,
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now(),
      },
      {
        title: "DevOps Setup",
        value: 7500,
        probability: 15,
        stageId: stageIds[0], // Lead
        clientId: undefined,
        notes: "Lead from Upwork proposal.",
        order: 4,
        source: "upwork",
        createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now(),
      },
    ];

    for (const deal of dealData) {
      const existing = await ctx.db
        .query("deals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("title"), deal.title))
        .first();

      if (!existing) {
        await ctx.db.insert("deals", {
          ...deal,
          userId,
          workspaceId,
        });
      }
    }

    return {
      success: true,
      message: `Dev user enriched with: 1 workspace, ${stageIds.length} pipeline stages, ${clientIds.length} clients, ${projectData.length} projects, ${dealData.length} deals`,
    };
  },
});

/**
 * MINIMAL user profile enrichment — called automatically on first sign-in.
 *
 * CRITICAL: This is intentionally MINIMAL. It only sets user profile fields
 * (name, role, subscriptionTier, joinedAt). It does NOT create workspaces,
 * pipeline stages, clients, projects, or deals. The personal workspace is
 * created separately by `workspaces.crud.seedPersonalWorkspace`.
 *
 * This is fully idempotent — safe to call multiple times.
 */
export const seedDevProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please sign in first.");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    // Enrich user with appropriate defaults based on identity.
    // IMPORTANT: Do NOT set onboardingComplete=true here — let the user
    // go through the onboarding flow so we can collect real data (name,
    // hourly rate, primary platform, etc.) instead of hardcoding it.
    const updates: Record<string, any> = {};

    if (!user.name) {
      // Use email username as initial name; user can update in onboarding
      updates.name = user.email?.split("@")[0] || "User";
    }

    // SECURITY: Only grant admin/pro to the dev user
    if (user.email === DEV_USER_EMAIL) {
      if (!user.role) updates.role = "admin";
      if (!user.subscriptionTier) updates.subscriptionTier = "pro";
    } else {
      // Regular users get "user" role and "free" tier by default
      if (!user.role) updates.role = "user";
      if (!user.subscriptionTier) updates.subscriptionTier = "free";
    }

    if (!user.joinedAt) updates.joinedAt = Date.now();
    // NOTE: onboardingComplete is intentionally NOT set here — the user
    // should complete the onboarding flow so we collect real data.
    // The dashboard's empty state will guide them.

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(userId, updates);
    }

    return {
      success: true,
      message: "User profile enriched with minimal defaults",
      updates: Object.keys(updates),
    };
  },
});
