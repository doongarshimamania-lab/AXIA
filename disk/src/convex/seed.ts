// @ts-nocheck — Convex backend file with schema types not yet in generated types
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
    // Find the orphaned dev user document
    const devUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", DEV_USER_EMAIL))
      .first();

    if (!devUser) {
      return { success: true, message: "No dev user found to reset." };
    }

    const userId = devUser._id;
    let deletedCount = 0;

    // Delete all related data for this user
    // 1. Pipeline stages
    const stages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of stages) { await ctx.db.delete(s._id); deletedCount++; }

    // 2. Deals
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const d of deals) { await ctx.db.delete(d._id); deletedCount++; }

    // 3. Clients
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const c of clients) { await ctx.db.delete(c._id); deletedCount++; }

    // 4. Projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const p of projects) { await ctx.db.delete(p._id); deletedCount++; }

    // 5. Workspaces
    const workspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    for (const w of workspaces) { await ctx.db.delete(w._id); deletedCount++; }

    // 6. Finally, delete the orphaned user document
    await ctx.db.delete(userId);
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
    if (!user.connectedPlatforms) updates.connectedPlatforms = ["upwork", "fiverr"];
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

    let workspaceId;
    if (!existingWorkspace) {
      workspaceId = await ctx.db.insert("workspaces", {
        name: `${updates.name || user.email}'s Workspace`,
        type: "personal",
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      workspaceId = existingWorkspace._id;
    }

    // Create default pipeline stages if none exist
    const existingStages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const stageNames = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
    const stageColors = ["#94a3b8", "#60a5fa", "#a78bfa", "#fb923c", "#4ade80", "#f87171"];
    const stageIds: any[] = [];

    if (!existingStages) {
      for (let i = 0; i < stageNames.length; i++) {
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
      }
    } else {
      // Collect existing stage IDs in order
      const allStages = await ctx.db
        .query("pipelineStages")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      allStages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      for (const stage of allStages) {
        stageIds.push(stage._id);
      }
    }

    // Create sample clients if none exist
    const existingClients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const clientIds: any[] = [];

    if (!existingClients) {
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

      for (const client of clientData) {
        const clientId = await ctx.db.insert("clients", {
          ...client,
          userId,
          workspaceId,
        });
        clientIds.push(clientId);
      }
    } else {
      // Collect existing client IDs
      const allClients = await ctx.db
        .query("clients")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const client of allClients) {
        clientIds.push(client._id);
      }
    }

    // Create sample projects if none exist
    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existingProjects && clientIds.length > 0) {
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
          clientId: clientIds.length > 1 ? clientIds[1] : clientIds[0],
          hourlyRate: 90,
          projectType: "milestone" as const,
          protectionLevel: "standard" as const,
          status: "active" as const,
          createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
          lastActivityAt: Date.now(),
        },
        {
          projectName: "Brand Identity System",
          clientId: clientIds.length > 2 ? clientIds[2] : clientIds[0],
          hourlyRate: 75,
          projectType: "fixed" as const,
          protectionLevel: "standard" as const,
          status: "archived" as const,
          createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
          lastActivityAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        },
      ];

      for (const project of projectData) {
        await ctx.db.insert("projects", {
          ...project,
          userId,
          workspaceId,
        });
      }
    }

    // Create sample pipeline deals if none exist
    const existingDeals = await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existingDeals && stageIds.length >= 5) {
      const dealData = [
        {
          title: "Mobile App Development",
          value: 15000,
          probability: 95,
          stageId: stageIds[4], // Won
          clientId: clientIds.length > 0 ? clientIds[0] : undefined,
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
          clientId: clientIds.length > 1 ? clientIds[1] : clientIds[0],
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
        await ctx.db.insert("deals", {
          ...deal,
          userId,
          workspaceId,
        });
      }
    }

    return {
      success: true,
      message: "User profile enriched with defaults, workspace, pipeline stages, sample clients, projects, and deals",
      updates: Object.keys(updates),
    };
  },
});
