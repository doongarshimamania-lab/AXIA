import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const seedTestProjects = mutation({
  args: {},
  handler: async (ctx) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      userId = null;
    }
    
    // If no authenticated user, create or get a guest user
    if (!userId) {
      const guestUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), "guest@axia.demo"))
        .first();
      
      if (guestUser) {
        userId = guestUser._id;
      } else {
        userId = await ctx.db.insert("users", {
          email: "guest@axia.demo",
          name: "Guest User",
          subscriptionTier: "free",
          onboardingComplete: true,
        });
      }
    }

    // Check if user already has projects
    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingProjects.length > 0) {
      return { 
        success: true,
        message: "Projects already exist", 
        count: existingProjects.length, 
        userId 
      };
    }

    // Create test clients first
    const client1Id = await ctx.db.insert("clients", {
      userId,
      clientName: "TechCorp Solutions",
      platform: "upwork",
      hourlyRate: 85,
      contractType: "hourly",
      riskLevel: "low",
      addedAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    const client2Id = await ctx.db.insert("clients", {
      userId,
      clientName: "StartupHub Inc",
      platform: "fiverr",
      hourlyRate: 65,
      contractType: "hourly",
      riskLevel: "medium",
      addedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      lastActivityAt: Date.now(),
    });

    const client3Id = await ctx.db.insert("clients", {
      userId,
      clientName: "Enterprise Digital",
      platform: "toptal",
      hourlyRate: 120,
      contractType: "hourly",
      riskLevel: "low",
      addedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      lastActivityAt: Date.now(),
    });

    // Create realistic test projects
    const projects = [
      {
        clientId: client1Id,
        projectName: "E-commerce Platform Redesign",
        hourlyRate: 85,
        projectType: "ongoing" as const,
        protectionLevel: "enhanced" as const,
      },
      {
        clientId: client2Id,
        projectName: "Mobile App Development",
        hourlyRate: 65,
        projectType: "milestone" as const,
        protectionLevel: "maximum" as const,
      },
      {
        clientId: client3Id,
        projectName: "Enterprise Dashboard System",
        hourlyRate: 120,
        projectType: "ongoing" as const,
        protectionLevel: "maximum" as const,
      },
    ];

    const projectIds = [];
    for (const project of projects) {
      const projectId = await ctx.db.insert("projects", {
        userId,
        ...project,
        status: "active",
        createdAt: Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
        lastActivityAt: Date.now(),
      });
      projectIds.push(projectId);
    }

    return { 
      success: true,
      message: "Test projects created successfully", 
      count: projects.length,
      projectIds,
      userId,
    };
  },
});