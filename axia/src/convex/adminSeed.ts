/**
 * One-time admin seed script — v5.5.0: now requires admin auth
 * (was: hardcoded ADMIN_KEY string — Critical).
 * This enriches the dev user and adds missing data (work sessions, channels, messages).
 *
 * After running, DELETE this file or revert the changes.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./security/rateLimit";

export const adminSeed = mutation({
  args: {},
  handler: async (ctx) => {
    // v5.5.0: Critical fix — replace hardcoded ADMIN_KEY with real admin auth.
    await requireAdmin(ctx);

    const DEV_EMAIL = "dev@axia.app";
    const devUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", DEV_EMAIL))
      .first();

    if (!devUser) {
      throw new Error("Dev user not found. Sign up first.");
    }

    const userId = devUser._id;

    // 1. Enrich user profile
    const userUpdates: Record<string, any> = {};
    if (!devUser.name) userUpdates.name = "Dev User";
    if (!devUser.role) userUpdates.role = "admin";
    if (!"expert") "expert" = "pro";
    if (!devUser.hourlyRate) userUpdates.hourlyRate = 85;
    if (!devUser.onboardingComplete) {
      userUpdates.onboardingComplete = true;
      userUpdates.onboardingCompletedAt = Date.now();
    }
    if (!devUser.joinedAt) userUpdates.joinedAt = Date.now() - 90 * 24 * 60 * 60 * 1000;
    if (!devUser.primaryPlatform) userUpdates.primaryPlatform = "upwork";
    if (!devUser.connectedPlatforms) userUpdates.connectedPlatforms = ["upwork", "fiverr", "toptal"];
    if (!devUser.protectedHours) userUpdates.protectedHours = 342;
    if (!devUser.protectedValue) userUpdates.protectedValue = 29070;
    if (!devUser.professionalBio) {
      userUpdates.professionalBio = "Senior full-stack developer and freelance professional specializing in React, Node.js, and cloud architecture. 8+ years of experience working with startups and enterprise clients. Expert in scope creep prevention and evidence-based billing.";
    }
    if (!devUser.yearsExperience) userUpdates.yearsExperience = "8+";

    if (Object.keys(userUpdates).length > 0) {
      await ctx.db.patch(userId, userUpdates);
    }

    // 2. Get or create workspace
    let workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();

    let workspaceId;
    if (!workspace) {
      workspaceId = await ctx.db.insert("workspaces", {
        name: "Dev Workspace",
        type: "personal",
        ownerId: userId,
        description: "Personal workspace for solo freelancing",
        createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now(),
      });
    } else {
      workspaceId = workspace._id;
      // Update workspace name
      if (workspace.name === "dev's Workspace") {
        await ctx.db.patch(workspaceId, { name: "Dev Workspace" });
      }
    }

    // 3. Create workspace membership for dev user
    const existingMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", workspaceId).eq("userId", userId)
      )
      .first();

    if (!existingMembership) {
      await ctx.db.insert("workspaceMembers", {
        workspaceId,
        userId,
        role: "owner",
        status: "active",
        joinedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
      });
    }

    // 4. Create work sessions (time tracking data)
    const existingSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existingSessions) {
      const now = Date.now();
      const HOUR = 60 * 60 * 1000;
      const DAY = 24 * HOUR;

      const sessions = [
        { clientName: "TechCorp Solutions", projectName: "E-commerce Platform Redesign", startTime: now - 7 * DAY + 9 * HOUR, endTime: now - 7 * DAY + 12.5 * HOUR, hourlyRate: 85, notes: "Implemented product catalog API endpoints", invoiced: false, complianceStatus: "active" as const },
        { clientName: "TechCorp Solutions", projectName: "E-commerce Platform Redesign", startTime: now - 6 * DAY + 10 * HOUR, endTime: now - 6 * DAY + 14 * HOUR, hourlyRate: 85, notes: "Built shopping cart state management", invoiced: false, complianceStatus: "active" as const },
        { clientName: "StartupHub Inc", projectName: "Mobile App Development", startTime: now - 5 * DAY + 9 * HOUR, endTime: now - 5 * DAY + 13 * HOUR, hourlyRate: 65, notes: "Created onboarding flow screens", invoiced: false, complianceStatus: "active" as const },
        { clientName: "TechCorp Solutions", projectName: "E-commerce Platform Redesign", startTime: now - 4 * DAY + 10 * HOUR, endTime: now - 4 * DAY + 15 * HOUR, hourlyRate: 85, notes: "Payment integration with Stripe", invoiced: false, complianceStatus: "active" as const },
        { clientName: "StartupHub Inc", projectName: "Mobile App Development", startTime: now - 3 * DAY + 9 * HOUR, endTime: now - 3 * DAY + 12 * HOUR, hourlyRate: 65, notes: "Push notification implementation", invoiced: false, complianceStatus: "active" as const },
        { clientName: "Enterprise Digital", projectName: "Enterprise Dashboard System", startTime: now - 2 * DAY + 10 * HOUR, endTime: now - 2 * DAY + 16 * HOUR, hourlyRate: 120, notes: "Real-time analytics dashboard with WebSockets", invoiced: false, complianceStatus: "active" as const },
        { clientName: "TechCorp Solutions", projectName: "E-commerce Platform Redesign", startTime: now - 1 * DAY + 9 * HOUR, endTime: now - 1 * DAY + 13.5 * HOUR, hourlyRate: 85, notes: "Checkout flow optimization and testing", invoiced: false, complianceStatus: "active" as const },
        { clientName: "Enterprise Digital", projectName: "Enterprise Dashboard System", startTime: now - 0.5 * DAY + 10 * HOUR, endTime: now - 0.5 * DAY + 14 * HOUR, hourlyRate: 120, notes: "Data export and CSV generation", invoiced: false, complianceStatus: "active" as const },
      ];

      for (const session of sessions) {
        await ctx.db.insert("workSessions", {
          userId,
          workspaceId,
          startTime: session.startTime,
          endTime: session.endTime,
          hourlyRate: session.hourlyRate,
          projectName: session.projectName,
          clientName: session.clientName,
          complianceStatus: session.complianceStatus,
          notes: session.notes,
          invoiced: session.invoiced,
        });
      }
    }

    // 5. Create messaging channels and messages
    const existingChannels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .first();

    if (!existingChannels) {
      const now = Date.now();

      // Create channels
      const generalChannelId = await ctx.db.insert("channels", {
        workspaceId,
        name: "general",
        type: "channel",
        isPrivate: false,
        description: "General discussions",
        createdBy: userId,
        isArchived: false,
      });

      const projectChannelId = await ctx.db.insert("channels", {
        workspaceId,
        name: "e-commerce-redesign",
        type: "channel",
        isPrivate: false,
        description: "E-commerce Platform Redesign project channel",
        createdBy: userId,
        isArchived: false,
      });

      const billingChannelId = await ctx.db.insert("channels", {
        workspaceId,
        name: "billing-invoices",
        type: "channel",
        isPrivate: true,
        description: "Billing and invoice discussions",
        createdBy: userId,
        isArchived: false,
      });

      // Add dev user as channel member
      const channelId = [generalChannelId, projectChannelId, billingChannelId];
      for (const chId of channelId) {
        await ctx.db.insert("channelMembers", {
          channelId: chId,
          userId,
          workspaceId,
          role: "admin",
          isMuted: false,
          joinedAt: now - 30 * 24 * 60 * 60 * 1000,
        });
      }

      // Add messages to general channel
      const generalMessages = [
        { content: "Welcome to the general channel! This is where we discuss everything related to our projects." },
        { content: "Just pushed the latest updates to the e-commerce platform. Catalog API is now live." },
      ];

      for (const msg of generalMessages) {
        await ctx.db.insert("messages", {
          channelId: generalChannelId,
          workspaceId,
          authorId: userId,
          content: msg.content,
          isEdited: false,
          isPinned: false,
          isDeleted: false,
        });
      }

      // Add messages to project channel
      const projectMessages = [
        { content: "Project kickoff: E-commerce Platform Redesign. Timeline: 6 weeks. Budget: $12,000." },
        { content: "Sprint 1 complete: Product catalog, search, and filtering all working. Moving to cart next." },
        { content: "Stripe integration is live in staging. Need to test webhook handlers before production deploy." },
        { content: "Client requested additional scope: loyalty points system. Need to discuss change order." },
        { content: "Change order approved! Loyalty system added to Sprint 4. Budget adjusted to $14,500." },
      ];

      for (const msg of projectMessages) {
        await ctx.db.insert("messages", {
          channelId: projectChannelId,
          workspaceId,
          authorId: userId,
          content: msg.content,
          isEdited: false,
          isPinned: false,
          isDeleted: false,
        });
      }

      // Add messages to billing channel
      const billingMessages = [
        { content: "INV-001 has been paid by Acme Corp. $8,800 received." },
        { content: "INV-002 sent to TechStart Inc. Due in 15 days." },
        { content: "Reminder: INV-003 for GlobalMedia is overdue. Following up." },
      ];

      for (const msg of billingMessages) {
        await ctx.db.insert("messages", {
          channelId: billingChannelId,
          workspaceId,
          authorId: userId,
          content: msg.content,
          isEdited: false,
          isPinned: false,
          isDeleted: false,
        });
      }
    }

    // 6. Create evidence sessions (linked to work sessions)
    const existingEvidence = await ctx.db
      .query("evidenceSessions")
      .withIndex("by_user_and_status", (q) => q.eq("userId", userId))
      .first();

    if (!existingEvidence) {
      // Get work sessions we just created
      const workSessions = await ctx.db
        .query("workSessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(10000);

      // Create evidence sessions for each work session
      for (const ws of workSessions) {
        const platform = ws.platform || "upwork";
        await ctx.db.insert("evidenceSessions", {
          userId,
          workspaceId,
          sessionId: ws._id,
          platform: platform as "upwork" | "fiverr" | "toptal" | "freelancer" | "client",
          startTime: ws.startTime,
          endTime: ws.endTime,
          status: "finalized",
        });
      }
    }

    // 7. Create scope definitions
    const existingScope = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existingScope) {
      const clients = await ctx.db
        .query("clients")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(10000);

      const projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(10000);

      if (projects.length > 0) {
        const project = projects[0];
        await ctx.db.insert("scopeDefinitions", {
          userId,
          workspaceId,
          projectId: project._id,
          title: `Scope: ${project.projectName}`,
          description: "Initial project scope definition",
          deliverables: [
            { id: "d1", name: "Product Catalog API", description: "RESTful API for product management", status: "completed" as const },
            { id: "d2", name: "Shopping Cart System", description: "Session-based cart with persistence", status: "completed" as const },
            { id: "d3", name: "Payment Integration", description: "Stripe payment processing", status: "in_progress" as const },
            { id: "d4", name: "Loyalty Points System", description: "Customer rewards and points tracking", status: "pending" as const },
          ],
          revisionCount: 0,
          revisionLimit: 3,
          status: "active",
          createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now(),
        });
      }
    }

    // 8. Create tags
    const existingTags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existingTags) {
      const tags = [
        { name: "frontend", color: "#3b82f6" },
        { name: "backend", color: "#10b981" },
        { name: "urgent", color: "#ef4444" },
        { name: "design", color: "#8b5cf6" },
        { name: "api", color: "#f59e0b" },
        { name: "mobile", color: "#06b6d4" },
        { name: "devops", color: "#6366f1" },
        { name: "scope-creep", color: "#dc2626" },
      ];

      for (const tag of tags) {
        await ctx.db.insert("tags", {
          userId,
          workspaceId,
          name: tag.name,
          color: tag.color,
          usageCount: 0,
          createdAt: Date.now(),
        });
      }
    }

    // 9. Create goals
    const existingGoals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existingGoals) {
      const goals = [
        { title: "Reach $5,000 MRR", description: "Achieve $5,000 in monthly recurring revenue from freelance clients", target: 5000, current: 3200, unit: "USD", type: "revenue", deadline: Date.now() + 90 * 24 * 60 * 60 * 1000, status: "in_progress" },
        { title: "Zero scope creep incidents", description: "Go 3 months without any unapproved scope changes", target: 0, current: 1, unit: "incidents", type: "quality", deadline: Date.now() + 60 * 24 * 60 * 60 * 1000, status: "in_progress" },
        { title: "100% evidence coverage", description: "Ensure all billable hours have evidence sessions recorded", target: 100, current: 78, unit: "%", type: "compliance", deadline: Date.now() + 30 * 24 * 60 * 60 * 1000, status: "in_progress" },
      ];

      for (const goal of goals) {
        await ctx.db.insert("goals", {
          userId,
          workspaceId,
          title: goal.title,
          description: goal.description,
          target: goal.target,
          current: goal.current,
          unit: goal.unit,
          type: goal.type,
          deadline: goal.deadline,
          status: goal.status,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    return {
      success: true,
      message: "Admin seed complete! Dev user enriched with profile, work sessions, channels, messages, evidence sessions, scope definitions, tags, and goals.",
    };
  },
});
