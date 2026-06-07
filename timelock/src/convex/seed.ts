/**
 * Seed mutation for creating a dev user and sample data.
 *
 * This creates a complete test environment with:
 * 1. A dev user profile enrichment (after sign-up)
 * 2. Sample workspace, pipeline stages
 * 3. Sample clients, projects, deals
 *
 * Usage: Sign up with dev@axia.app, then call `seed:enrichDevUser`
 *        from the Convex dashboard or via CLI:
 *   npx convex run seed:enrichDevUser
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Dev user credentials
const DEV_USER_EMAIL = "dev@axia.app";
const DEV_USER_NAME = "Dev User";

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
 * Quick seed: Just create basic user profile enrichment.
 * Call this after signing up with any email.
 * This is auto-called by the useAuth hook on first sign-up.
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

    // Enrich any user with dev-friendly defaults
    const updates: Record<string, any> = {};

    if (!user.name) updates.name = user.email?.split("@")[0] || "User";
    if (!user.role) updates.role = "admin";
    if (!user.subscriptionTier) updates.subscriptionTier = "pro";
    if (!user.hourlyRate) updates.hourlyRate = 85;
    if (!user.onboardingComplete) {
      updates.onboardingComplete = true;
      updates.onboardingCompletedAt = Date.now();
    }
    if (!user.joinedAt) updates.joinedAt = Date.now();
    if (!user.primaryPlatform) updates.primaryPlatform = "upwork";
    if (!user.connectedPlatforms) updates.connectedPlatforms = ["upwork"];
    if (!user.protectedHours) updates.protectedHours = 171;
    if (!user.protectedValue) updates.protectedValue = 14535;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(userId, updates);
    }

    // Create personal workspace if none exists
    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();

    if (!existingWorkspace) {
      const wsId = await ctx.db.insert("workspaces", {
        name: `${updates.name || user.email}'s Workspace`,
        type: "personal",
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create default pipeline stages
      const stageNames = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
      const stageColors = ["#94a3b8", "#60a5fa", "#a78bfa", "#fb923c", "#4ade80", "#f87171"];

      for (let i = 0; i < stageNames.length; i++) {
        await ctx.db.insert("pipelineStages", {
          userId,
          workspaceId: wsId,
          name: stageNames[i],
          color: stageColors[i],
          order: i,
          isDefault: i < 5,
          createdAt: Date.now(),
        });
      }
    }

    return {
      success: true,
      message: "User profile enriched with defaults",
      updates: Object.keys(updates),
    };
  },
});
