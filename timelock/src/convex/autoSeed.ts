// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return Math.abs(h).toString(16);
}

/**
 * Comprehensive auto-seed: Called automatically after first auth.
 * Seeds ALL tables with every entity type, every status, and every possible variation.
 * Idempotent — skips each section if data already exists for the user.
 *
 * IMPORTANT: Field names must match the actual Convex table schemas exactly.
 * See src/convex/tables/*.ts for schema definitions.
 */
export const autoSeed = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { seeded: false, reason: "not_authenticated" };

    const now = Date.now();
    const day = 86400000;
    const results: string[] = [];

    // ─── 1. Ensure user profile fields ─────────────────────────────────────
    const user = await ctx.db.get(userId);
    if (user) {
      const patches: Record<string, any> = {};
      if (!user.subscriptionTier) patches.subscriptionTier = "pro";
      if (!user.hourlyRate) patches.hourlyRate = 85;
      if (!user.joinedAt) patches.joinedAt = now;
      if (!user.onboardingComplete) patches.onboardingComplete = true;
      if (!user.onboardingCompletedAt) patches.onboardingCompletedAt = now;
      if (!user.professionalBio) patches.professionalBio = "Experienced freelancer specializing in full-stack development and design with 8+ years of delivering high-impact digital solutions.";
      if (user.protectedHours === undefined) patches.protectedHours = 120;
      if (user.protectedValue === undefined) patches.protectedValue = 10200;
      if (!user.role) patches.role = "admin";
      if (user.vulnerabilityScore === undefined) patches.vulnerabilityScore = 22;
      if (!user.lastVulnerabilityCheck) patches.lastVulnerabilityCheck = now - 2 * day;
      if (!user.totalRejectedHours) patches.totalRejectedHours = 3.5;
      if (!user.totalLostIncome) patches.totalLostIncome = 297.5;
      if (!user.primaryPlatform) patches.primaryPlatform = "upwork";
      if (!user.yearsExperience) patches.yearsExperience = "8+";
      if (!user.acquisitionSource) patches.acquisitionSource = "organic";
      if (!user.connectedPlatforms) patches.connectedPlatforms = ["upwork", "fiverr"];
      if (!user.platformSyncStatus) patches.platformSyncStatus = { upwork: "synced", fiverr: "synced", toptal: "disconnected" };
      if (!user.tierUpgradedAt) patches.tierUpgradedAt = now - 15 * day;
      if (Object.keys(patches).length > 0) {
        await ctx.db.patch(userId, patches);
        results.push("user_profile");
      }
    }

    // ─── 2. Seed Personal Workspace ────────────────────────────────────────
    let personalWorkspaceId: any;
    const existingPersonalWs = await ctx.db
      .query("workspaces")
      .withIndex("by_owner_and_type", (q: any) => q.eq("ownerId", userId).eq("type", "personal"))
      .first();

    if (existingPersonalWs) {
      personalWorkspaceId = existingPersonalWs._id;
    } else {
      personalWorkspaceId = await ctx.db.insert("workspaces", {
        ownerId: userId,
        name: "My Workspace",
        type: "personal",
        description: "Your personal freelancer workspace",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("workspaceMembers", {
        workspaceId: personalWorkspaceId,
        userId,
        role: "owner",
        status: "active",
        title: "Freelancer",
        joinedAt: now,
        lastActiveAt: now,
      });
      results.push("personal_workspace");
    }

    // ─── 3. Seed Team Workspace ────────────────────────────────────────────
    let teamWorkspaceId: any;
    const existingTeamWs = await ctx.db
      .query("workspaces")
      .withIndex("by_owner_and_type", (q: any) => q.eq("ownerId", userId).eq("type", "team"))
      .first();

    if (existingTeamWs) {
      teamWorkspaceId = existingTeamWs._id;
    } else {
      teamWorkspaceId = await ctx.db.insert("workspaces", {
        ownerId: userId,
        name: "Axia Agency",
        type: "team",
        description: "Full-service digital agency workspace — design, development, and strategy",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("workspaceMembers", {
        workspaceId: teamWorkspaceId,
        userId,
        role: "owner",
        status: "active",
        title: "Founder & Creative Director",
        joinedAt: now,
        lastActiveAt: now,
      });
      results.push("team_workspace");
    }

    // ─── 4. Seed Workspace Invitations ─────────────────────────────────────
    const existingInvitations = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", teamWorkspaceId))
      .collect();

    if (existingInvitations.length === 0) {
      const invitations = [
        { email: "sarah@designstudio.co", role: "manager" as const, status: "pending" as const, expiresAt: now + 7 * day },
        { email: "alex@devpartners.io", role: "member" as const, status: "accepted" as const, expiresAt: now + 7 * day },
        { email: "jordan@motionlab.com", role: "member" as const, status: "expired" as const, expiresAt: now - 2 * day },
        { email: "priya@clouddevs.net", role: "member" as const, status: "cancelled" as const, expiresAt: now + 7 * day },
      ];
      for (const inv of invitations) {
        await ctx.db.insert("workspaceInvitations", {
          workspaceId: teamWorkspaceId,
          email: inv.email,
          role: inv.role,
          token: generateToken(),
          invitedBy: userId,
          status: inv.status,
          createdAt: now - Math.floor(Math.random() * 10) * day,
          expiresAt: inv.expiresAt,
        });
      }
      results.push("workspace_invitations");
    }

    // ─── 5. Seed Teams ─────────────────────────────────────────────────────
    let teamIds: any[] = [];
    const existingTeams = await ctx.db
      .query("teams")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", teamWorkspaceId))
      .collect();

    if (existingTeams.length === 0) {
      const teams = [
        { name: "Frontend Development", color: "#3b82f6", icon: "💻", description: "React, Next.js, and UI/UX development team" },
        { name: "Backend & API", color: "#10b981", icon: "⚙️", description: "Server-side architecture, APIs, and database" },
        { name: "Design & Branding", color: "#ec4899", icon: "🎨", description: "Visual design, brand identity, and motion graphics" },
        { name: "Strategy & Growth", color: "#f59e0b", icon: "📈", description: "Business development, client strategy, and growth" },
        { name: "Cross-Team", color: "#8b5cf6", icon: "🔗", description: "Cross-functional coordination team", isCrossTeam: true },
      ];
      for (const t of teams) {
        const teamId = await ctx.db.insert("teams", {
          workspaceId: teamWorkspaceId,
          name: t.name,
          color: t.color,
          icon: t.icon,
          description: t.description,
          isCrossTeam: t.isCrossTeam ?? false,
          createdAt: now,
          updatedAt: now,
        });
        // Add user as lead
        await ctx.db.insert("teamMemberships", {
          teamId,
          userId,
          workspaceId: teamWorkspaceId,
          role: "lead",
          joinedAt: now,
        });
        teamIds.push(teamId);
      }
      results.push("teams");
    } else {
      teamIds = existingTeams.map(t => t._id);
    }

    // ─── 6. Seed Pipeline Stages ───────────────────────────────────────────
    let stageIds: string[] = [];
    const existingStages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingStages.length === 0) {
      const defaults = [
        { name: "Lead", color: "#6366f1" },
        { name: "Qualified", color: "#8b5cf6" },
        { name: "Proposal", color: "#a855f7" },
        { name: "Negotiation", color: "#c084fc" },
        { name: "Won", color: "#22c55e" },
        { name: "Lost", color: "#ef4444" },
      ];
      for (let i = 0; i < defaults.length; i++) {
        const id = await ctx.db.insert("pipelineStages", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          name: defaults[i].name,
          color: defaults[i].color,
          order: i,
          isDefault: true,
          createdAt: now,
        });
        stageIds.push(id);
      }
      results.push("pipeline_stages");
    } else {
      stageIds = existingStages.sort((a, b) => a.order - b.order).map(s => s._id);
    }

    // ─── 7. Seed Clients ───────────────────────────────────────────────────
    let clientIds: string[] = [];
    const existingClients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingClients.length === 0) {
      const mockClients = [
        { clientName: "TechCorp Solutions", platform: "upwork" as const, hourlyRate: 85, contractType: "hourly" as const, riskLevel: "low" as const },
        { clientName: "StartupHub Inc", platform: "fiverr" as const, hourlyRate: 65, contractType: "hourly" as const, riskLevel: "medium" as const },
        { clientName: "Global Enterprises", platform: "toptal" as const, hourlyRate: 120, contractType: "hourly" as const, riskLevel: "high" as const },
        { clientName: "Digital Marketing Co", platform: "freelancer" as const, hourlyRate: 45, contractType: "fixed" as const, riskLevel: "low" as const },
        { clientName: "Creative Studios", platform: "direct" as const, hourlyRate: 95, contractType: "fixed" as const, riskLevel: "medium" as const },
        { clientName: "FinServe Analytics", platform: "upwork" as const, hourlyRate: 110, contractType: "hourly" as const, riskLevel: "low" as const },
        { clientName: "MediTech Health", platform: "upwork" as const, hourlyRate: 130, contractType: "hourly" as const, riskLevel: "low" as const },
        { clientName: "NovaTech AI", platform: "toptal" as const, hourlyRate: 150, contractType: "hourly" as const, riskLevel: "medium" as const },
        { clientName: "RetailMax Commerce", platform: "fiverr" as const, hourlyRate: 55, contractType: "fixed" as const, riskLevel: "high" as const },
        { clientName: "EduLearn Platform", platform: "direct" as const, hourlyRate: 75, contractType: "milestone" as const, riskLevel: "low" as const },
      ];

      for (const client of mockClients) {
        const id = await ctx.db.insert("clients", {
          userId,
          workspaceId: teamWorkspaceId,
          ...client,
          addedAt: now - Math.floor(Math.random() * 60) * day,
          lastActivityAt: now,
        });
        clientIds.push(id);
      }
      results.push("clients");
    } else {
      clientIds = existingClients.map(c => c._id);
    }

    // ─── 8. Seed Projects ──────────────────────────────────────────────────
    let projectIds: string[] = [];
    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingProjects.length === 0 && clientIds.length >= 6) {
      const mockProjects = [
        { clientId: clientIds[0] as any, projectName: "TechCorp Website Redesign", hourlyRate: 85, projectType: "ongoing" as const, protectionLevel: "enhanced" as const, status: "active" as const },
        { clientId: clientIds[1] as any, projectName: "StartupHub Mobile App MVP", hourlyRate: 65, projectType: "milestone" as const, protectionLevel: "enhanced" as const, status: "active" as const },
        { clientId: clientIds[2] as any, projectName: "GlobalEnt Data Dashboard", hourlyRate: 120, projectType: "ongoing" as const, protectionLevel: "maximum" as const, status: "active" as const },
        { clientId: clientIds[3] as any, projectName: "DigiMark Brand Identity", hourlyRate: 45, projectType: "fixed" as const, protectionLevel: "standard" as const, status: "active" as const },
        { clientId: clientIds[4] as any, projectName: "Creative Studios Motion Reel", hourlyRate: 95, projectType: "fixed" as const, protectionLevel: "enhanced" as const, status: "active" as const },
        { clientId: clientIds[5] as any, projectName: "FinServe Analytics Platform", hourlyRate: 110, projectType: "ongoing" as const, protectionLevel: "maximum" as const, status: "active" as const },
        { clientId: clientIds[0] as any, projectName: "TechCorp API Integration", hourlyRate: 85, projectType: "fixed" as const, protectionLevel: "enhanced" as const, status: "archived" as const },
        { clientId: clientIds[1] as any, projectName: "StartupHub Landing Pages", hourlyRate: 65, projectType: "fixed" as const, protectionLevel: "standard" as const, status: "active" as const },
        { clientId: clientIds[6] as any, projectName: "MediTech Patient Portal", hourlyRate: 130, projectType: "ongoing" as const, protectionLevel: "maximum" as const, status: "active" as const },
        { clientId: clientIds[7] as any, projectName: "NovaTech AI Dashboard", hourlyRate: 150, projectType: "milestone" as const, protectionLevel: "maximum" as const, status: "active" as const },
        { clientId: clientIds[8] as any, projectName: "RetailMax E-Commerce Build", hourlyRate: 55, projectType: "fixed" as const, protectionLevel: "enhanced" as const, status: "archived" as const },
      ];

      for (const project of mockProjects) {
        const id = await ctx.db.insert("projects", {
          userId,
          workspaceId: teamWorkspaceId,
          ...project,
          createdAt: now - Math.floor(Math.random() * 60) * day,
          lastActivityAt: now,
          evidenceCount: Math.floor(Math.random() * 30) + 5,
          evidenceWithClientKeywords: Math.floor(Math.random() * 15),
          clientKeywords: ["development", "frontend", "api"],
          workSpecificity: Math.round((Math.random() * 0.4 + 0.6) * 100) / 100,
          activityDensity: Math.round((Math.random() * 0.3 + 0.7) * 100) / 100,
          memoQuality: Math.round((Math.random() * 0.4 + 0.5) * 100) / 100,
          hasClientSpecificRequirements: true,
          upworkCompliance: Math.round((Math.random() * 20 + 80)),
          fiverrCompliance: Math.round((Math.random() * 20 + 75)),
          toptalCompliance: Math.round((Math.random() * 20 + 85)),
          pattern7Vulnerability: Math.round(Math.random() * 30),
          weeklyIncome: Math.round(Math.random() * 2000 + 500),
          avgProjectValue: Math.round(Math.random() * 5000 + 2000),
        });
        projectIds.push(id);
      }
      results.push("projects");
    } else {
      projectIds = existingProjects.map(p => p._id);
    }

    // ─── 9. Seed Client Policies ───────────────────────────────────────────
    const existingPolicies = await ctx.db
      .query("clientPolicies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingPolicies.length === 0) {
      const policies = [
        {
          clientName: "TechCorp Solutions",
          platform: "upwork" as const,
          requirements: [
            { type: "activity" as const, description: "Mouse/keyboard activity every 10 minutes", requirement: "minimum_activity", evidenceType: "screenshot" },
            { type: "screenshots" as const, description: "Random screenshots every 10 minutes", requirement: "random_screenshots", evidenceType: "screenshot" },
            { type: "memos" as const, description: "Work diary memos for each session", requirement: "work_memos", evidenceType: "memo" },
          ],
          documentUrl: "https://upwork.com/legal/client-terms",
          createdAt: now - 30 * day,
          lastUpdated: now,
        },
        {
          clientName: "StartupHub Inc",
          platform: "fiverr" as const,
          requirements: [
            { type: "activity" as const, description: "Active work tracking required", requirement: "activity_tracking", evidenceType: "activity_log" },
            { type: "timer" as const, description: "Timer must be running during work", requirement: "timer_active", evidenceType: "timer_log" },
          ],
          documentUrl: "https://fiverr.com/terms-of-service",
          createdAt: now - 20 * day,
          lastUpdated: now,
        },
        {
          clientName: "Global Enterprises",
          platform: "toptal" as const,
          requirements: [
            { type: "screenshots" as const, description: "Screenshots every 5 minutes during active sessions", requirement: "frequent_screenshots", evidenceType: "screenshot" },
            { type: "activity" as const, description: "Minimum 80% activity rate", requirement: "high_activity", evidenceType: "activity_log" },
            { type: "memos" as const, description: "Daily standup memos", requirement: "daily_memos", evidenceType: "memo" },
          ],
          documentUrl: "https://toptal.com/policies",
          createdAt: now - 15 * day,
          lastUpdated: now,
        },
      ];
      for (const p of policies) {
        await ctx.db.insert("clientPolicies", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          ...p,
        });
      }
      results.push("client_policies");
    }

    // ─── 10. Seed Pipeline Deals ───────────────────────────────────────────
    const existingDeals = await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingDeals.length === 0 && stageIds.length >= 6) {
      const mockDeals = [
        { title: "E-Commerce Platform Build", value: 12000, probability: 10, source: "upwork", contactName: "Tom Bradley", contactEmail: "tom@creativestudios.art", expectedCloseDate: now + 60 * day, stageIdx: 0 },
        { title: "AI Chatbot Integration", value: 6000, probability: 10, source: "fiverr", contactName: "Nina Patel", contactEmail: "nina@smartassist.ai", expectedCloseDate: now + 75 * day, stageIdx: 0 },
        { title: "Real Estate Listing Portal", value: 18000, probability: 15, source: "linkedin", contactName: "Marcus Rivera", contactEmail: "marcus@primeproperty.com", expectedCloseDate: now + 90 * day, stageIdx: 0 },
        { title: "SaaS Dashboard Redesign", value: 8500, probability: 25, source: "linkedin", contactName: "Jennifer Wu", contactEmail: "jen@cloudmetrics.io", expectedCloseDate: now + 45 * day, stageIdx: 1 },
        { title: "Digital Marketing Landing Pages", value: 4500, probability: 25, source: "upwork", contactName: "Lisa Park", contactEmail: "lisa@digitalmarketingco.com", expectedCloseDate: now + 30 * day, stageIdx: 1 },
        { title: "Supply Chain Management System", value: 32000, probability: 30, source: "direct", contactName: "Robert Chang", contactEmail: "rchang@logisync.com", expectedCloseDate: now + 60 * day, stageIdx: 1 },
        { title: "Mobile Banking App", value: 25000, probability: 50, source: "referral", contactName: "Michael Torres", contactEmail: "cto@finserve.io", expectedCloseDate: now + 30 * day, stageIdx: 2 },
        { title: "Creative Studios Motion Design", value: 7500, probability: 50, source: "direct", contactName: "Tom Bradley", contactEmail: "tom@creativestudios.art", expectedCloseDate: now + 21 * day, stageIdx: 2 },
        { title: "Healthcare Patient Portal", value: 35000, probability: 45, source: "direct", contactName: "Dr. Robert Singh", contactEmail: "robert@medportal.health", expectedCloseDate: now + 28 * day, stageIdx: 2 },
        { title: "Brand Identity for NovaTech", value: 8500, probability: 55, source: "fiverr", contactName: "Aisha Khan", contactEmail: "aisha@novatech.io", expectedCloseDate: now + 14 * day, stageIdx: 2 },
        { title: "Full-Stack SaaS Platform", value: 45000, probability: 70, source: "referral", contactName: "Rachel Green", contactEmail: "rachel@scaleup.io", expectedCloseDate: now + 7 * day, stageIdx: 3 },
        { title: "StartupHub Mobile App Phase 2", value: 9500, probability: 70, source: "fiverr", contactName: "Sarah Mitchell", contactEmail: "sarah@startuphub.co", expectedCloseDate: now + 10 * day, stageIdx: 3 },
        { title: "Insurance Claims Platform", value: 28000, probability: 65, source: "linkedin", contactName: "Vikram Mehta", contactEmail: "vikram@insureflow.com", expectedCloseDate: now + 14 * day, stageIdx: 3 },
        { title: "TechCorp Website Redesign", value: 12000, probability: 100, source: "direct", contactName: "David Chen", contactEmail: "david@techcorp.io", expectedCloseDate: now - 5 * day, stageIdx: 4 },
        { title: "FinServe Analytics Platform", value: 22000, probability: 100, source: "upwork", contactName: "Michael Torres", contactEmail: "cto@finserve.io", expectedCloseDate: now - 10 * day, stageIdx: 4 },
        { title: "Social Media App (Lost)", value: 30000, probability: 0, source: "linkedin", contactName: "Kevin Park", contactEmail: "kevin@socialnext.com", expectedCloseDate: now - 20 * day, stageIdx: 5 },
        { title: "Legacy Migration (Lost)", value: 15000, probability: 0, source: "upwork", contactName: "George White", contactEmail: "george@legacyco.com", expectedCloseDate: now - 35 * day, stageIdx: 5 },
      ];

      for (let i = 0; i < mockDeals.length; i++) {
        const deal = mockDeals[i];
        const stageId = stageIds[deal.stageIdx] as any;
        if (!stageId) continue;
        await ctx.db.insert("deals", {
          userId,
          workspaceId: teamWorkspaceId,
          stageId,
          clientId: clientIds[i % clientIds.length] as any,
          title: deal.title,
          value: deal.value,
          probability: deal.probability,
          source: deal.source,
          contactName: deal.contactName,
          contactEmail: deal.contactEmail,
          expectedCloseDate: deal.expectedCloseDate,
          currency: "USD",
          description: `Deal for ${deal.title}`,
          notes: "",
          order: i,
          createdBy: userId,
          createdAt: now - Math.floor(Math.random() * 30) * day,
          updatedAt: now,
        });
      }
      results.push("deals");
    }

    // ─── 11. Seed Proposals ────────────────────────────────────────────────
    let proposalIds: string[] = [];
    const existingProposals = await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingProposals.length === 0) {
      // Seed templates
      const existingTemplates = await ctx.db
        .query("proposalTemplates")
        .withIndex("by_system", (q) => q.eq("isSystem", true))
        .collect();

      if (existingTemplates.length === 0) {
        const templates = [
          {
            name: "Web Development Proposal", industry: "Technology", description: "Professional proposal for web dev projects",
            sections: [
              { id: "1", type: "heading" as const, content: "Project Overview" },
              { id: "2", type: "text" as const, content: "We will build a modern, responsive web application." },
              { id: "3", type: "pricing" as const, content: "Development Package", metadata: { items: [{ name: "Frontend", price: 5000 }, { name: "Backend", price: 7000 }] } },
              { id: "4", type: "terms" as const, content: "30% upfront, 40% at MVP, 30% on delivery." },
            ],
            isSystem: true, usageCount: 0, createdAt: now,
          },
          {
            name: "Design & Branding Proposal", industry: "Creative", description: "Template for design services",
            sections: [
              { id: "1", type: "heading" as const, content: "Creative Brief" },
              { id: "2", type: "text" as const, content: "We'll craft a cohesive brand identity." },
              { id: "3", type: "pricing" as const, content: "Design Package", metadata: { items: [{ name: "Logo", price: 3000 }, { name: "Guidelines", price: 2000 }] } },
              { id: "4", type: "terms" as const, content: "Includes 3 revision rounds." },
            ],
            isSystem: true, usageCount: 0, createdAt: now,
          },
        ];
        for (const t of templates) {
          await ctx.db.insert("proposalTemplates", { workspaceId: teamWorkspaceId, createdBy: userId, ...t });
        }
        results.push("proposal_templates");
      }

      const mockProposals = [
        { title: "E-commerce Platform Redesign", status: "signed" as const, clientName: "TechCorp Solutions", clientEmail: "david.chen@techcorp.io", totalValue: 28000, sections: [{ id: "1", type: "heading" as const, content: "Project Overview" }, { id: "2", type: "text" as const, content: "Complete redesign of the e-commerce platform with modern UX." }, { id: "3", type: "pricing" as const, content: "Full Package", metadata: { items: [{ name: "Design", price: 8000 }, { name: "Development", price: 15000 }, { name: "QA", price: 5000 }] } }, { id: "4", type: "terms" as const, content: "30% upfront, 40% at MVP, 30% on delivery." }], sentAt: now - 20 * day, viewedAt: now - 18 * day, signedAt: now - 10 * day },
        { title: "Mobile Banking App", status: "sent" as const, clientName: "FinServe Analytics", clientEmail: "cto@finserve.io", totalValue: 45000, sections: [{ id: "1", type: "heading" as const, content: "Mobile Banking Solution" }, { id: "2", type: "text" as const, content: "Secure, scalable mobile banking application." }, { id: "3", type: "pricing" as const, content: "Enterprise Package", metadata: { items: [{ name: "iOS App", price: 18000 }, { name: "Android App", price: 18000 }, { name: "Backend API", price: 9000 }] } }], sentAt: now - 5 * day, viewedAt: now - 3 * day },
        { title: "Brand Identity for HealthTech", status: "viewed" as const, clientName: "MediTech Inc", clientEmail: "marketing@meditech.org", totalValue: 12000, sections: [{ id: "1", type: "heading" as const, content: "Brand Identity Package" }, { id: "2", type: "text" as const, content: "Complete brand identity for healthcare startup." }, { id: "3", type: "pricing" as const, content: "Branding Package", metadata: { items: [{ name: "Logo Design", price: 4000 }, { name: "Brand Guidelines", price: 3000 }, { name: "Marketing Kit", price: 5000 }] } }], sentAt: now - 7 * day, viewedAt: now - 5 * day },
        { title: "Data Analytics Dashboard", status: "draft" as const, clientName: "DataViz Co", clientEmail: "ops@dataviz.co", totalValue: 20000, sections: [{ id: "1", type: "heading" as const, content: "Analytics Dashboard" }, { id: "2", type: "text" as const, content: "Real-time data visualization platform." }, { id: "3", type: "pricing" as const, content: "Dashboard Package", metadata: { items: [{ name: "Frontend", price: 8000 }, { name: "Data Pipeline", price: 7000 }, { name: "Visualization Engine", price: 5000 }] } }] },
        { title: "Social Platform MVP", status: "declined" as const, clientName: "SocialNext", clientEmail: "founders@socialnext.com", totalValue: 35000, sections: [{ id: "1", type: "heading" as const, content: "Social Platform MVP" }, { id: "2", type: "text" as const, content: "Complete social networking MVP." }, { id: "3", type: "pricing" as const, content: "MVP Package", metadata: { items: [{ name: "Core Features", price: 20000 }, { name: "User Auth", price: 5000 }, { name: "Notifications", price: 10000 }] } }], sentAt: now - 30 * day },
        { title: "SaaS Dashboard Redesign Proposal", status: "sent" as const, clientName: "CloudMetrics", clientEmail: "jen@cloudmetrics.io", totalValue: 8500, sections: [{ id: "1", type: "heading" as const, content: "Dashboard Redesign" }, { id: "2", type: "pricing" as const, content: "Redesign Package", metadata: { items: [{ name: "UI Redesign", price: 4500 }, { name: "Data Viz Components", price: 4000 }] } }], sentAt: now - 3 * day, viewedAt: now - 2 * day },
        { title: "Creative Studios Motion Design Package", status: "viewed" as const, clientName: "Creative Studios", clientEmail: "tom@creativestudios.art", totalValue: 7500, sections: [{ id: "1", type: "heading" as const, content: "Motion Design Package" }, { id: "2", type: "pricing" as const, content: "Motion Package", metadata: { items: [{ name: "Motion Graphics", price: 5000 }, { name: "Social Content", price: 2500 }] } }], sentAt: now - 10 * day, viewedAt: now - 9 * day },
        { title: "Expired Legacy Migration Proposal", status: "expired" as const, clientName: "LegacyCo", clientEmail: "george@legacyco.com", totalValue: 18000, sections: [{ id: "1", type: "heading" as const, content: "Legacy System Migration" }, { id: "2", type: "pricing" as const, content: "Migration Package", metadata: { items: [{ name: "Data Migration", price: 8000 }, { name: "New System Build", price: 10000 }] } }], sentAt: now - 60 * day },
      ];

      for (const p of mockProposals) {
        const { status, sentAt, viewedAt, signedAt, ...rest } = p;
        const id = await ctx.db.insert("proposals", {
          userId,
          workspaceId: teamWorkspaceId,
          ...rest,
          status,
          publicToken: generateToken(),
          currency: "USD",
          validUntil: now + 30 * day,
          sentAt,
          viewedAt,
          signedAt,
          notes: "",
          createdBy: userId,
          createdAt: now - Math.floor(Math.random() * 30) * day,
          updatedAt: now,
        });
        proposalIds.push(id);
      }
      results.push("proposals");
    } else {
      proposalIds = existingProposals.map(p => p._id);
    }

    // ─── 12. Seed Proposal Follow-Ups ──────────────────────────────────────
    if (proposalIds.length > 0) {
      const existingFollowUps = await ctx.db.query("proposalFollowUps").collect();
      if (existingFollowUps.length === 0) {
        const followUpConfigs = [
          { dayNumber: 3, channel: "email" as const, subject: "Following up on your proposal", body: "Hi, just wanted to follow up on the proposal we sent." },
          { dayNumber: 7, channel: "email" as const, subject: "Proposal check-in", body: "Hi, checking in on the proposal. Let us know if you have questions." },
          { dayNumber: 14, channel: "whatsapp" as const, subject: "Final follow-up on proposal", body: "Hi, this is our final follow-up on the proposal." },
        ];
        for (const pid of proposalIds.slice(0, 3)) {
          for (const fu of followUpConfigs) {
            await ctx.db.insert("proposalFollowUps", {
              userId,
              workspaceId: teamWorkspaceId,
              createdBy: userId,
              proposalId: pid,
              dayNumber: fu.dayNumber,
              subject: fu.subject,
              body: fu.body,
              channel: fu.channel,
              status: "sent" as const,
              scheduledAt: now - fu.dayNumber * day,
              sentAt: now - (fu.dayNumber - 1) * day,
              createdAt: now - fu.dayNumber * day,
            });
          }
        }
        results.push("proposal_follow_ups");
      }
    }

    // ─── 13. Seed Invoices ─────────────────────────────────────────────────
    let invoiceIds: string[] = [];
    const existingInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingInvoices.length === 0) {
      const mockInvoices = [
        { clientName: "TechCorp Solutions", clientEmail: "billing@techcorp.io", status: "paid" as const, lineItems: [{ id: "li1", description: "Website Redesign — Phase 1: Discovery & Wireframes", quantity: 20, rate: 85, amount: 1700, hasProof: true }, { id: "li2", description: "Website Redesign — Phase 2: UI Design", quantity: 25, rate: 85, amount: 2125, hasProof: true }], subtotal: 3825, taxRate: 0, taxAmount: 0, total: 3825, issueDate: now - 60 * day, dueDate: now - 30 * day, paidDate: now - 25 * day, proofCount: 8, hasValidatedBilling: true },
        { clientName: "Global Enterprises", clientEmail: "procurement@globalent.com", status: "overdue" as const, lineItems: [{ id: "li3", description: "Data Dashboard — Backend Architecture", quantity: 40, rate: 120, amount: 4800, hasProof: true }, { id: "li4", description: "Data Dashboard — Frontend Components", quantity: 30, rate: 120, amount: 3600, hasProof: false }], subtotal: 8400, taxRate: 0, taxAmount: 0, total: 8400, issueDate: now - 45 * day, dueDate: now - 15 * day, proofCount: 3, hasValidatedBilling: true },
        { clientName: "StartupHub Inc", clientEmail: "finance@startuphub.co", status: "sent" as const, lineItems: [{ id: "li5", description: "Mobile App MVP — Sprint 1: Auth & Dashboard", quantity: 30, rate: 65, amount: 1950, hasProof: true }], subtotal: 1950, taxRate: 0, taxAmount: 0, total: 1950, issueDate: now - 7 * day, dueDate: now + 23 * day, proofCount: 4, hasValidatedBilling: true },
        { clientName: "FinServe Analytics", clientEmail: "cto@finserve.io", status: "viewed" as const, lineItems: [{ id: "li6", description: "Analytics Platform — Month 1 Retainer", quantity: 52, rate: 110, amount: 5720, hasProof: true }], subtotal: 5720, taxRate: 0, taxAmount: 0, total: 5720, issueDate: now - 5 * day, dueDate: now + 25 * day, proofCount: 6, hasValidatedBilling: true },
        { clientName: "Digital Marketing Co", clientEmail: "lisa@digitalmarketingco.com", status: "draft" as const, lineItems: [{ id: "li7", description: "Brand Identity — Logo & Guidelines", quantity: 32, rate: 45, amount: 1440, hasProof: false }], subtotal: 1440, taxRate: 0, taxAmount: 0, total: 1440, issueDate: now, dueDate: now + 30 * day, proofCount: 0, hasValidatedBilling: false },
        { clientName: "TechCorp Solutions", clientEmail: "billing@techcorp.io", status: "paid" as const, lineItems: [{ id: "li8", description: "API Integration — CRM Connector", quantity: 25, rate: 85, amount: 2125, hasProof: true }, { id: "li9", description: "API Integration — ERP Sync Module", quantity: 38, rate: 85, amount: 3230, hasProof: true }], subtotal: 5355, taxRate: 0, taxAmount: 0, total: 5355, issueDate: now - 90 * day, dueDate: now - 60 * day, paidDate: now - 55 * day, proofCount: 12, hasValidatedBilling: true },
        { clientName: "Creative Studios", clientEmail: "tom@creativestudios.art", status: "partial" as const, lineItems: [{ id: "li10", description: "Motion Reel — Initial Concepts", quantity: 20, rate: 95, amount: 1900, hasProof: true }, { id: "li11", description: "Motion Reel — Final Delivery", quantity: 15, rate: 95, amount: 1425, hasProof: true }], subtotal: 3325, taxRate: 0, taxAmount: 0, total: 3325, issueDate: now - 14 * day, dueDate: now - 0 * day, proofCount: 5, hasValidatedBilling: true },
        { clientName: "NovaTech AI", clientEmail: "billing@novatech.io", status: "cancelled" as const, lineItems: [{ id: "li12", description: "AI Dashboard — Design Phase", quantity: 30, rate: 150, amount: 4500, hasProof: false }], subtotal: 4500, taxRate: 0, taxAmount: 0, total: 4500, issueDate: now - 20 * day, dueDate: now + 10 * day, proofCount: 0, hasValidatedBilling: false },
      ];

      for (let i = 0; i < mockInvoices.length; i++) {
        const inv = mockInvoices[i];
        const id = await ctx.db.insert("invoices", {
          userId,
          workspaceId: teamWorkspaceId,
          invoiceNumber: `INV-2024-${String(i + 1).padStart(3, "0")}`,
          publicToken: generateToken(),
          currency: "USD",
          notes: "",
          sentAt: inv.status !== "draft" ? inv.issueDate : undefined,
          viewedAt: inv.status === "paid" || inv.status === "viewed" ? inv.issueDate + day : undefined,
          createdBy: userId,
          createdAt: inv.issueDate,
          updatedAt: now,
          ...inv,
        });
        invoiceIds.push(id);
      }
      results.push("invoices");
    } else {
      invoiceIds = existingInvoices.map(i => i._id);
    }

    // ─── 14. Seed Invoice Work Links ───────────────────────────────────────
    if (invoiceIds.length > 0) {
      const existingWorkLinks = await ctx.db.query("invoiceWorkLinks").collect();
      if (existingWorkLinks.length === 0) {
        const workLinks = [
          { invoiceId: invoiceIds[0] as any, lineItemId: "li1", proofType: "time_entry" as const, title: "Discovery session — wireframes", hours: 20, date: now - 60 * day, verified: true },
          { invoiceId: invoiceIds[0] as any, lineItemId: "li2", proofType: "milestone_delivery" as const, title: "UI Design milestone delivery", hours: 25, date: now - 55 * day, verified: true },
          { invoiceId: invoiceIds[1] as any, lineItemId: "li3", proofType: "time_entry" as const, title: "Backend architecture work", hours: 40, date: now - 45 * day, verified: true },
          { invoiceId: invoiceIds[5] as any, lineItemId: "li8", proofType: "task_completion" as const, title: "CRM Connector completion", hours: 25, date: now - 90 * day, verified: true },
          { invoiceId: invoiceIds[5] as any, lineItemId: "li9", proofType: "deliverable_url" as const, title: "ERP Sync Module delivery", hours: 38, date: now - 85 * day, verified: true },
        ];
        for (const wl of workLinks) {
          await ctx.db.insert("invoiceWorkLinks", {
            userId,
            workspaceId: teamWorkspaceId,
            createdBy: userId,
            ...wl,
            createdAt: wl.date,
          });
        }
        results.push("invoice_work_links");
      }
    }

    // ─── 15. Seed Payment Reminders & Settings ─────────────────────────────
    const existingReminders = await ctx.db.query("paymentReminders").collect();
    if (existingReminders.length === 0 && invoiceIds.length > 0) {
      const reminders = [
        { invoiceId: invoiceIds[1] as any, dayNumber: 3, channel: "email" as const, tone: "friendly" as const, subject: "Payment reminder", body: "Just a friendly reminder that your payment is due.", status: "sent" as const },
        { invoiceId: invoiceIds[1] as any, dayNumber: 7, channel: "email" as const, tone: "firm" as const, subject: "Payment overdue", body: "Your payment is now overdue. Please remit payment.", status: "sent" as const },
        { invoiceId: invoiceIds[1] as any, dayNumber: 14, channel: "whatsapp" as const, tone: "urgent" as const, subject: "URGENT: Payment overdue", body: "Your payment is significantly overdue. Immediate attention required.", status: "scheduled" as const },
      ];
      for (const r of reminders) {
        await ctx.db.insert("paymentReminders", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          ...r,
          scheduledAt: now - r.dayNumber * day,
          sentAt: r.status === "sent" ? now - (r.dayNumber - 1) * day : undefined,
          createdAt: now - r.dayNumber * day,
        });
      }
      results.push("payment_reminders");
    }

    const existingReminderSettings = await ctx.db.query("reminderSettings").collect();
    if (existingReminderSettings.length === 0) {
      await ctx.db.insert("reminderSettings", {
        userId,
        workspaceId: teamWorkspaceId,
        autoRemindersEnabled: true,
        day3Enabled: true,
        day7Enabled: true,
        day14Enabled: true,
        day21Enabled: false,
        defaultChannel: "email",
        createdAt: now,
        updatedAt: now,
      });
      results.push("reminder_settings");
    }

    // ─── 16. Seed Invoice Templates ────────────────────────────────────────
    const existingInvTemplates = await ctx.db.query("invoiceTemplates").collect();
    if (existingInvTemplates.length === 0) {
      const invTemplates = [
        {
          name: "Standard Invoice", industry: "Technology", description: "Default invoice template for tech projects",
          sections: [
            { id: "1", type: "invoice_meta" as const, content: "Invoice" },
            { id: "2", type: "sender_info" as const, content: "Sender" },
            { id: "3", type: "client_info" as const, content: "Client" },
            { id: "4", type: "line_items" as const, content: "Items" },
            { id: "5", type: "subtotal" as const, content: "Subtotal" },
            { id: "6", type: "tax" as const, content: "Tax" },
            { id: "7", type: "total" as const, content: "Total" },
            { id: "8", type: "bank_details" as const, content: "Payment Details" },
            { id: "9", type: "terms" as const, content: "Net 30" },
          ],
          isSystem: true, usageCount: 0, createdAt: now,
        },
        {
          name: "Detailed Invoice with Proof", industry: "Professional Services", description: "Invoice with proof-of-work section",
          sections: [
            { id: "1", type: "invoice_meta" as const, content: "Invoice" },
            { id: "2", type: "sender_info" as const, content: "Sender" },
            { id: "3", type: "client_info" as const, content: "Client" },
            { id: "4", type: "line_items" as const, content: "Items" },
            { id: "5", type: "subtotal" as const, content: "Subtotal" },
            { id: "6", type: "total" as const, content: "Total" },
            { id: "7", type: "notes" as const, content: "Proof of work attached" },
            { id: "8", type: "bank_details" as const, content: "Payment Details" },
          ],
          isSystem: true, usageCount: 0, createdAt: now,
        },
      ];
      for (const t of invTemplates) {
        await ctx.db.insert("invoiceTemplates", { workspaceId: teamWorkspaceId, createdBy: userId, ...t });
      }
      results.push("invoice_templates");
    }

    // ─── 17. Seed Messaging Channels & Messages ────────────────────────────
    const existingChannels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", teamWorkspaceId))
      .collect();

    let channelIds: any[] = [];
    if (existingChannels.length === 0) {
      const channelsToCreate = [
        { name: "general", type: "channel" as const, isPrivate: false, description: "General team discussion" },
        { name: "project-updates", type: "channel" as const, isPrivate: false, description: "Project status and updates" },
        { name: "client-escalations", type: "channel" as const, isPrivate: true, description: "Client issues and escalations" },
        { name: "evidence-review", type: "channel" as const, isPrivate: false, description: "Evidence collection and review" },
        { name: "billing", type: "channel" as const, isPrivate: true, description: "Invoice and payment discussions" },
        { name: "design-reviews", type: "channel" as const, isPrivate: false, description: "Design feedback and reviews" },
        { name: "dm-sarah", type: "dm" as const, isPrivate: true, description: "Direct message with Sarah" },
      ];

      for (const ch of channelsToCreate) {
        const channelId = await ctx.db.insert("channels", {
          name: ch.name,
          workspaceId: teamWorkspaceId,
          type: ch.type,
          isPrivate: ch.isPrivate,
          description: ch.description,
          createdBy: userId,
          isArchived: false,
          lastMessageAt: now - Math.floor(Math.random() * 60) * 60 * 1000,
        });

        await ctx.db.insert("channelMembers", {
          channelId,
          userId,
          workspaceId: teamWorkspaceId,
          role: "admin",
          isMuted: false,
          joinedAt: now - 30 * day,
          lastReadAt: now - 5 * 60 * 1000,
        });

        channelIds.push(channelId);
      }

      // Seed messages
      const messagesByChannel: Record<number, string[]> = {
        0: [ "Good morning team! Quick update on the TechCorp project — we've collected all the evidence files and the timeline report is ready for review.", "Nice work! I'll take a look at the timeline report this afternoon.", "Hey team, sprint review at 3pm today. Please make sure your status updates are in before the meeting.", "Also, just a reminder that the client onboarding for StartupHub is tomorrow.", "On it! I'll have everything ready by EOD." ],
        1: [ "Design mockups for the new dashboard are uploaded to Figma. Link in the project channel.", "API integration for the banking app is 80% complete. Should be done by Friday.", "Brand identity package for Digital Marketing Co is in final review." ],
        2: [ "Urgent: Global Enterprises has filed a dispute claiming work was not delivered per the contract terms. I've pulled the contract and work evidence — need eyes on this ASAP.", "I'll review the contract terms and prepare our response.", "Evidence package is ready. Sending to legal for review." ],
        3: [ "New screenshots attached for the Upwork project. The client changed requirements mid-sprint but we have documented everything.", "Work diary screenshots for FinServe are verified and ready." ],
        4: [ "Invoice INV-2024-001 paid by TechCorp. Marking as received.", "Global Enterprises invoice is 15 days overdue. Follow-up sent.", "New invoice created for Digital Marketing Co — pending review before sending." ],
        5: [ "New homepage mockup is ready for review. Check the Figma link.", "The color palette needs adjustment — the primary blue is too dark.", "Good feedback. I'll update the palette and reshare by EOD." ],
      };

      let msgIds: any[] = [];
      for (const [channelIdx, messages] of Object.entries(messagesByChannel)) {
        const channelId = channelIds[parseInt(channelIdx)];
        if (!channelId) continue;

        for (let i = 0; i < messages.length; i++) {
          const msgId = await ctx.db.insert("messages", {
            channelId,
            workspaceId: teamWorkspaceId,
            authorId: userId,
            content: messages[i],
            isEdited: false,
            isPinned: (i === 0 || i === 2) ? true : false,
            isDeleted: false,
          });
          msgIds.push({ id: msgId, channelId });
        }
      }

      // Seed reactions
      if (msgIds.length > 0) {
        await ctx.db.insert("reactions", { messageId: msgIds[0].id, userId, emoji: "👍", workspaceId: teamWorkspaceId });
        await ctx.db.insert("reactions", { messageId: msgIds[0].id, userId, emoji: "🎉", workspaceId: teamWorkspaceId });
        await ctx.db.insert("reactions", { messageId: msgIds[2].id, userId, emoji: "❤️", workspaceId: teamWorkspaceId });
      }

      // Seed mentions
      if (msgIds.length > 2) {
        await ctx.db.insert("mentions", { messageId: msgIds[1].id, userId, channelId: msgIds[1].channelId, workspaceId: teamWorkspaceId, isRead: true });
        await ctx.db.insert("mentions", { messageId: msgIds[3].id, userId, channelId: msgIds[3].channelId, workspaceId: teamWorkspaceId, isRead: false });
      }

      results.push("messaging");
    }

    // ─── 18. Seed Tags ─────────────────────────────────────────────────────
    const existingTags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    if (existingTags.length === 0) {
      const mockTags = [
        { name: "Web Development", color: "#3b82f6", category: "project" },
        { name: "Mobile App", color: "#8b5cf6", category: "project" },
        { name: "Design", color: "#ec4899", category: "project" },
        { name: "Branding", color: "#f59e0b", category: "client" },
        { name: "API Integration", color: "#10b981", category: "project" },
        { name: "Data Visualization", color: "#06b6d4", category: "project" },
        { name: "E-Commerce", color: "#f97316", category: "project" },
        { name: "Enterprise", color: "#6366f1", category: "client" },
        { name: "MVP", color: "#14b8a6", category: "project" },
        { name: "Healthcare", color: "#ef4444", category: "client" },
        { name: "Fintech", color: "#84cc16", category: "client" },
        { name: "Marketing", color: "#a855f7", category: "project" },
        { name: "Screenshot Evidence", color: "#0ea5e9", category: "evidence" },
        { name: "Work Diary", color: "#64748b", category: "evidence" },
        { name: "Priority", color: "#dc2626", category: "general" },
        { name: "Follow-up", color: "#d97706", category: "general" },
      ];

      for (const tag of mockTags) {
        await ctx.db.insert("tags", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          name: tag.name,
          color: tag.color,
          category: tag.category,
          usageCount: Math.floor(Math.random() * 10) + 1,
          createdAt: now,
        });
      }
      results.push("tags");
    }

    // ─── 19. Seed Goals (ALL statuses) ─────────────────────────────────────
    const existingGoals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    if (existingGoals.length === 0) {
      const mockGoals = [
        { title: "Reach $10K Monthly Revenue", description: "Achieve consistent $10K+ monthly revenue from freelance and agency projects by end of Q2.", type: "revenue", target: 10000, current: 7800, unit: "USD", deadline: now + 30 * day, status: "in_progress", milestones: [{ id: "ms1", title: "Close 3 new deals", completed: true }, { id: "ms2", title: "Increase hourly rate to $95", completed: true }, { id: "ms3", title: "Land one enterprise client", completed: false }], streak: 5, lastCheckIn: now - day },
        { title: "Complete 50 Protected Hours", description: "Log 50 hours of protected work time with full evidence collection.", type: "hours", target: 50, current: 32, unit: "hours", deadline: now + 14 * day, status: "in_progress", milestones: [{ id: "ms4", title: "Set up time tracking", completed: true }, { id: "ms5", title: "Reach 25 protected hours", completed: true }, { id: "ms6", title: "Reach 50 protected hours", completed: false }], streak: 3, lastCheckIn: now - 2 * day },
        { title: "Achieve 95% Protection Score", description: "Maintain a protection score of 95% or higher.", type: "protection", target: 95, current: 88, unit: "%", deadline: now + 60 * day, status: "in_progress", milestones: [{ id: "ms7", title: "Audit all client contracts", completed: true }, { id: "ms8", title: "Set up scope tracking", completed: false }, { id: "ms9", title: "Resolve all compliance alerts", completed: false }] },
        { title: "Win 5 Pipeline Deals", description: "Convert 5 deals from the pipeline into signed contracts.", type: "clients", target: 5, current: 2, unit: "deals", deadline: now + 45 * day, status: "in_progress", milestones: [{ id: "ms10", title: "Send proposals to leads", completed: true }, { id: "ms11", title: "Win 3 deals", completed: false }] },
        { title: "Zero Overdue Invoices", description: "Ensure all invoices are paid on time.", type: "custom", target: 0, current: 1, unit: "invoices", deadline: now + 21 * day, status: "in_progress", milestones: [{ id: "ms13", title: "Set up payment reminders", completed: true }, { id: "ms14", title: "Follow up on overdue invoices", completed: false }] },
        { title: "Onboard 8 Team Members", description: "Build a full agency team.", type: "custom", target: 8, current: 6, unit: "members", deadline: now + 30 * day, status: "in_progress", milestones: [{ id: "ms15", title: "Hire senior developer", completed: true }, { id: "ms16", title: "Hire UI/UX designer", completed: true }, { id: "ms17", title: "Hire motion designer", completed: false }] },
        { title: "Complete Certification Training", description: "Finish the advanced compliance certification.", type: "custom", target: 1, current: 1, unit: "certs", status: "completed", milestones: [{ id: "ms18", title: "Complete Module 1", completed: true, completedAt: now - 20 * day }, { id: "ms19", title: "Complete Module 2", completed: true, completedAt: now - 10 * day }], streak: 0 },
        { title: "Launch Personal Website", description: "Design and deploy a personal portfolio website.", type: "custom", target: 1, current: 0, unit: "sites", status: "not_started", milestones: [{ id: "ms20", title: "Design mockups", completed: false }, { id: "ms21", title: "Build and deploy", completed: false }] },
        { title: "Old Client Diversification Goal", description: "Diversify client base across 4 platforms.", type: "clients", target: 4, current: 2, unit: "platforms", status: "abandoned", milestones: [{ id: "ms22", title: "Join 2 new platforms", completed: false }] },
      ];

      for (const goal of mockGoals) {
        await ctx.db.insert("goals", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          title: goal.title,
          description: goal.description,
          type: goal.type,
          target: goal.target,
          current: goal.current,
          unit: goal.unit,
          deadline: goal.deadline,
          status: goal.status,
          milestones: goal.milestones,
          streak: goal.streak,
          lastCheckIn: goal.lastCheckIn,
          createdAt: now - Math.floor(Math.random() * 30) * day,
          updatedAt: now,
        });
      }
      results.push("goals");
    }

    // ─── 20. Seed Scope Definitions & Change Orders ────────────────────────
    let scopeIds: string[] = [];
    const existingScope = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    if (existingScope.length === 0) {
      const scopeItems = [
        { projectId: projectIds[0] as any, title: "TechCorp Website Redesign Scope", description: "Complete redesign of TechCorp corporate website.", deliverables: [{ id: "d1", name: "Homepage redesign", description: "Modern responsive homepage", estimatedHours: 20, status: "completed" as const }, { id: "d2", name: "Product pages", description: "Product listing and detail pages", estimatedHours: 15, status: "in_progress" as const }, { id: "d3", name: "CMS integration", description: "Content management system", estimatedHours: 25, status: "pending" as const }], totalEstimatedHours: 60, revisionLimit: 3, revisionCount: 1, status: "active" as const },
        { projectId: projectIds[1] as any, title: "StartupHub Mobile App MVP Scope", description: "Mobile app MVP for StartupHub.", deliverables: [{ id: "d4", name: "User auth", description: "Authentication with email and social login", estimatedHours: 15, status: "completed" as const }, { id: "d5", name: "Dashboard screen", description: "Main dashboard", estimatedHours: 20, status: "in_progress" as const }, { id: "d6", name: "Basic settings", description: "Settings screens", estimatedHours: 10, status: "pending" as const }], totalEstimatedHours: 45, revisionLimit: 2, revisionCount: 0, status: "active" as const },
        { projectId: projectIds[2] as any, title: "FinServe Analytics Platform Scope", description: "Financial analytics platform.", deliverables: [{ id: "d7", name: "Real-time data dashboard", description: "Live market data", estimatedHours: 30, status: "in_progress" as const }, { id: "d8", name: "Portfolio tracking", description: "Investment portfolio tracking", estimatedHours: 25, status: "pending" as const }, { id: "d9", name: "Compliance reports", description: "Automated compliance reporting", estimatedHours: 20, status: "pending" as const }], totalEstimatedHours: 75, revisionLimit: 3, revisionCount: 2, status: "active" as const },
        { title: "Completed Landing Pages Scope", description: "StartupHub landing pages — delivered.", deliverables: [{ id: "d10", name: "5 Landing pages", description: "A/B tested landing pages", estimatedHours: 30, status: "completed" as const }], totalEstimatedHours: 30, revisionLimit: 2, revisionCount: 1, status: "completed" as const },
        { title: "Disputed Data Dashboard Scope", description: "GlobalEnt data dashboard — disputed.", deliverables: [{ id: "d11", name: "Backend architecture", description: "Data pipeline and API", estimatedHours: 40, status: "completed" as const }, { id: "d12", name: "Frontend dashboard", description: "UI components and charts", estimatedHours: 30, status: "revised" as const }], totalEstimatedHours: 70, revisionLimit: 2, revisionCount: 3, status: "disputed" as const },
      ];

      for (const scope of scopeItems) {
        const id = await ctx.db.insert("scopeDefinitions", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          ...scope,
          createdAt: now - Math.floor(Math.random() * 30) * day,
          updatedAt: now,
        });
        scopeIds.push(id);
      }
      results.push("scope");
    } else {
      scopeIds = existingScope.map(s => s._id);
    }

    // Seed scope change orders
    if (scopeIds.length > 0) {
      const existingChangeOrders = await ctx.db.query("scopeChangeOrders").collect();
      if (existingChangeOrders.length === 0) {
        const changeOrders = [
          { scopeId: scopeIds[0] as any, title: "Add blog section", description: "Client requested adding a blog section to the website.", changeType: "addition" as const, impact: { hoursAdded: 15, costImpact: 1275, deadlineImpact: 7 * day }, reason: "Client wants content marketing capability.", status: "approved" as const, clientApprovalToken: generateToken(), clientApprovedAt: now - 5 * day },
          { scopeId: scopeIds[2] as any, title: "Change reporting engine", description: "Switch from custom charts to Chart.js.", changeType: "modification" as const, impact: { hoursAdded: 8, costImpact: 880, deadlineImpact: 3 * day }, reason: "Better visualization options with Chart.js.", status: "pending" as const },
          { scopeId: scopeIds[2] as any, title: "Remove real-time alerts", description: "Client no longer needs real-time push alerts.", changeType: "removal" as const, impact: { hoursAdded: -5, costImpact: -550, deadlineImpact: -2 * day }, reason: "Client simplified requirements.", status: "approved" as const, clientApprovedAt: now - 3 * day },
          { scopeId: scopeIds[4] as any, title: "Scope revision for disputed work", description: "Auto-generated scope change from revision count exceeded.", changeType: "revision" as const, impact: { hoursAdded: 10, costImpact: 1200, deadlineImpact: 5 * day }, reason: "Revision limit exceeded — formalizing additional work.", status: "auto_generated" as const, autoGenerated: true, originalLimit: 2, newLimit: 4 },
          { scopeId: scopeIds[0] as any, title: "Remove newsletter feature", description: "Client decided against newsletter.", changeType: "removal" as const, impact: { hoursAdded: -8, costImpact: -680, deadlineImpact: -3 * day }, reason: "Not needed anymore.", status: "rejected" as const },
        ];
        for (const co of changeOrders) {
          await ctx.db.insert("scopeChangeOrders", {
            userId,
            workspaceId: teamWorkspaceId,
            createdBy: userId,
            ...co,
            createdAt: now - Math.floor(Math.random() * 10) * day,
          });
        }
        results.push("scope_change_orders");
      }
    }

    // ─── 21. Seed Work Sessions & Time Blocks ───────────────────────────────
    let sessionIds: string[] = [];
    const existingSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingSessions.length === 0) {
      const hourlyRate = user?.hourlyRate ?? 85;

      // Active session
      const activeSessionId = await ctx.db.insert("workSessions", {
        userId,
        workspaceId: teamWorkspaceId,
        startTime: now - 2 * 60 * 60 * 1000,
        complianceStatus: "active",
        clientName: "TechCorp Solutions",
        projectName: "Website Revamp",
        hourlyRate,
        status: "active",
        platform: "upwork",
        notes: "Working on homepage redesign",
      });
      sessionIds.push(activeSessionId);

      // Past sessions with all status types
      const sessions = [
        { clientName: "StartupHub Inc", projectName: "Mobile App MVP", hoursAgo: 6, duration: 90, compliance: "active" as const, status: "completed" as const, platform: "fiverr" as const },
        { clientName: "FinServe Analytics", projectName: "Analytics Platform", hoursAgo: 24, duration: 180, compliance: "active" as const, status: "completed" as const, platform: "upwork" as const },
        { clientName: "Global Enterprises", projectName: "Data Dashboard", hoursAgo: 48, duration: 60, compliance: "rejected" as const, status: "completed" as const, platform: "toptal" as const },
        { clientName: "Digital Marketing Co", projectName: "Brand Identity", hoursAgo: 72, duration: 120, compliance: "active" as const, status: "completed" as const, platform: "manual" as const },
        { clientName: "Creative Studios", projectName: "Motion Reel", hoursAgo: 96, duration: 150, compliance: "active" as const, status: "stopped" as const },
        { clientName: "TechCorp Solutions", projectName: "API Integration", hoursAgo: 120, duration: 240, compliance: "active" as const, status: "completed" as const, platform: "upwork" as const, invoiced: true },
        { clientName: "StartupHub Inc", projectName: "Landing Pages", hoursAgo: 144, duration: 105, compliance: "active" as const, status: "completed" as const, invoiced: true },
        { clientName: "MediTech Health", projectName: "Patient Portal", hoursAgo: 168, duration: 200, compliance: "at_risk" as const, status: "completed" as const, platform: "upwork" as const },
        { clientName: "NovaTech AI", projectName: "AI Dashboard", hoursAgo: 4, duration: 60, compliance: "active" as const, status: "paused" as const, notes: "Lunch break" },
      ];

      for (const session of sessions) {
        const pastStart = now - session.hoursAgo * 60 * 60 * 1000;
        const pastEnd = pastStart + session.duration * 60 * 1000;
        const sid = await ctx.db.insert("workSessions", {
          userId,
          workspaceId: teamWorkspaceId,
          startTime: pastStart,
          endTime: pastEnd,
          totalMinutes: session.duration,
          complianceStatus: session.compliance,
          clientName: session.clientName,
          projectName: session.projectName,
          hourlyRate,
          status: session.status,
          platform: session.platform,
          notes: session.notes,
          invoiced: session.invoiced,
          isManualEntry: session.platform === "manual",
          createdAt: pastStart,
          updatedAt: pastEnd,
        });
        sessionIds.push(sid);
      }

      // Time blocks for active session
      const activeBase = now - 2 * 60 * 60 * 1000;
      const activeBlocks = [
        { start: activeBase, status: "compliant" as const, activity: "Code Review", website: "github.com", screenshots: 3, mouse: true, keyboard: true, inactiveSec: 12 },
        { start: activeBase + 5 * 60 * 1000, status: "at_risk" as const, activity: "Client Prospecting", website: "fiverr.com", screenshots: 2, mouse: true, keyboard: false, inactiveSec: 45 },
        { start: activeBase + 10 * 60 * 1000, status: "compliant" as const, activity: "Implement UI", website: "vercel.com", screenshots: 3, mouse: true, keyboard: true, inactiveSec: 10 },
        { start: activeBase + 15 * 60 * 1000, status: "rejected" as const, activity: "Break", website: "youtube.com", screenshots: 1, mouse: false, keyboard: false, inactiveSec: 420 },
        { start: activeBase + 20 * 60 * 1000, status: "compliant" as const, activity: "Bug Fixes", website: "github.com", screenshots: 3, mouse: true, keyboard: true, inactiveSec: 8 },
      ];

      for (const block of activeBlocks) {
        await ctx.db.insert("timeBlocks", {
          sessionId: activeSessionId,
          userId,
          workspaceId: teamWorkspaceId,
          startTime: block.start,
          endTime: block.start + 5 * 60 * 1000,
          activity: block.activity,
          website: block.website,
          complianceStatus: block.status,
          screenshotCount: block.screenshots,
          mouseActivity: block.mouse,
          keyboardActivity: block.keyboard,
          inactiveDuration: block.inactiveSec,
        });
      }

      // Compliance alerts — all types
      const alertTypes = [
        { alertType: "at_risk" as const, message: "Fiverr tab detected. Timer paused." },
        { alertType: "payment_protection_risk" as const, message: "This client has a history of late payments. Consider increasing evidence collection." },
        { alertType: "non_browser_work" as const, message: "Non-browser application detected during active session." },
        { alertType: "timer_paused" as const, message: "Timer was paused for more than 10 minutes during active work." },
      ];
      for (const alert of alertTypes) {
        await ctx.db.insert("complianceAlerts", {
          userId,
          workspaceId: teamWorkspaceId,
          sessionId: activeSessionId,
          alertType: alert.alertType,
          message: alert.message,
          triggeredAt: now - Math.floor(Math.random() * 60) * 60 * 1000,
          acknowledged: Math.random() > 0.5,
          actionTaken: Math.random() > 0.5 ? "Reviewed and resolved" : undefined,
        });
      }

      // App usage
      const appUsages = [
        { appName: "VS Code", workRelated: true, syncedToUpwork: true, duration: 90 },
        { appName: "Chrome", workRelated: true, syncedToUpwork: true, duration: 60 },
        { appName: "Figma", workRelated: true, syncedToUpwork: false, duration: 45 },
        { appName: "Slack", workRelated: true, syncedToUpwork: false, duration: 15 },
        { appName: "Spotify", workRelated: false, syncedToUpwork: false, duration: 30 },
      ];
      for (const app of appUsages) {
        const appStart = now - 3 * 60 * 60 * 1000;
        await ctx.db.insert("appUsage", {
          userId,
          workspaceId: teamWorkspaceId,
          sessionId: activeSessionId,
          appName: app.appName,
          startTime: appStart,
          endTime: appStart + app.duration * 60 * 1000,
          duration: app.duration * 60 * 1000,
          workRelated: app.workRelated,
          syncedToUpwork: app.syncedToUpwork,
        });
      }

      // Dispute reports — all statuses
      const disputes = [
        { caseId: `case-${Date.now()}-1`, status: "generated" as const, clientName: "Global Enterprises", projectName: "Data Dashboard", rejectedHours: 0.5, lostIncome: 60 },
        { caseId: `case-${Date.now()}-2`, status: "sent" as const, clientName: "RetailMax Commerce", projectName: "E-Commerce Build", rejectedHours: 2, lostIncome: 110, sentAt: now - 5 * day },
        { caseId: `case-${Date.now()}-3`, status: "viewed" as const, clientName: "Global Enterprises", projectName: "Data Dashboard", rejectedHours: 1, lostIncome: 120, sentAt: now - 10 * day, viewedAt: now - 8 * day },
        { caseId: `case-${Date.now()}-4`, status: "resolved" as const, clientName: "TechCorp Solutions", projectName: "API Integration", rejectedHours: 0.5, lostIncome: 42.5, sentAt: now - 30 * day, resolvedAt: now - 20 * day },
        { caseId: `case-${Date.now()}-5`, status: "appealed" as const, clientName: "NovaTech AI", projectName: "AI Dashboard", rejectedHours: 3, lostIncome: 450, sentAt: now - 15 * day },
      ];
      for (const d of disputes) {
        await ctx.db.insert("disputeReports", {
          userId,
          workspaceId: teamWorkspaceId,
          caseId: d.caseId,
          generatedAt: now - 3 * 60 * 60 * 1000,
          rejectedHours: d.rejectedHours,
          lostIncome: d.lostIncome,
          reportContent: "# Dispute Report\n\nEvidence of work performed during disputed period.",
          status: d.status,
          clientName: d.clientName,
          projectName: d.projectName,
          hourlyRate,
          sentAt: d.sentAt,
          viewedAt: d.viewedAt,
          resolvedAt: d.resolvedAt,
          publicToken: generateToken(),
        });
      }

      // Automated dispute reports
      if (sessionIds.length > 0) {
        const existingAutoDisputes = await ctx.db.query("automatedDisputeReports").collect();
        if (existingAutoDisputes.length === 0) {
          await ctx.db.insert("automatedDisputeReports", {
            userId,
            workspaceId: teamWorkspaceId,
            createdBy: userId,
            disputeReportId: (await ctx.db.query("disputeReports").first())?._id as any,
            automationLevel: "semi_automated",
            generatedSections: [
              { section: "Timeline", content: "Work performed between 2pm-4pm on June 10th", aiGenerated: true },
              { section: "Evidence", content: "12 screenshots, 3 memos, activity logs", aiGenerated: false },
            ],
            evidenceAttached: ["screenshot-1.png", "activity-log.txt"],
            status: "ready",
            createdAt: now - day,
          });
        }
      }

      results.push("work_sessions");
    } else {
      sessionIds = existingSessions.map(s => s._id);
    }

    // ─── 22. Seed Evidence Sessions & Events ────────────────────────────────
    const existingEvidenceSessions = await ctx.db
      .query("evidenceSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingEvidenceSessions.length === 0 && sessionIds.length > 0) {
      // Evidence sessions (active and finalized)
      const evSessions = [
        { sessionId: sessionIds[0] as any, platform: "upwork" as const, startTime: now - 2 * 60 * 60 * 1000, status: "active" as const },
        { sessionId: sessionIds[1] as any, platform: "fiverr" as const, startTime: now - 8 * 60 * 60 * 1000, endTime: now - 6.5 * 60 * 60 * 1000, status: "finalized" as const },
        { sessionId: sessionIds[2] as any, platform: "upwork" as const, startTime: now - 26 * 60 * 60 * 1000, endTime: now - 23 * 60 * 60 * 1000, status: "finalized" as const },
        { sessionId: sessionIds[3] as any, platform: "toptal" as const, startTime: now - 50 * 60 * 60 * 1000, endTime: now - 49 * 60 * 60 * 1000, status: "finalized" as const },
        { sessionId: sessionIds[4] as any, platform: "client" as const, startTime: now - 74 * 60 * 60 * 1000, endTime: now - 72 * 60 * 60 * 1000, status: "finalized" as const },
        { sessionId: sessionIds[5] as any, platform: "freelancer" as const, startTime: now - 98 * 60 * 60 * 1000, endTime: now - 95.5 * 60 * 60 * 1000, status: "finalized" as const },
      ];

      for (const es of evSessions) {
        const esId = await ctx.db.insert("evidenceSessions", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          ...es,
        });

        // Evidence events for each session
        const eventKinds = [
          { kind: "mouse" as const, data: { x: 450, y: 320, click: true } },
          { kind: "keyboard" as const, data: { keys: 42, backspace: 3 } },
          { kind: "url" as const, data: {}, url: "github.com/timelock/app" },
          { kind: "screenshot_ref" as const, data: { storageId: "ss_" + Math.random().toString(36).slice(2) } },
          { kind: "memo" as const, data: { text: "Implemented responsive header component with navigation." } },
          { kind: "platform_status" as const, data: { status: "active", platform: "upwork" } },
        ];
        for (let i = 0; i < eventKinds.length; i++) {
          await ctx.db.insert("evidenceEvents", {
            workspaceId: teamWorkspaceId,
            evidenceSessionId: esId,
            t: es.startTime + i * 5 * 60 * 1000,
            kind: eventKinds[i].kind,
            data: eventKinds[i].data,
            url: eventKinds[i].url,
          });
        }

        // Evidence metadata
        await ctx.db.insert("evidenceMetadata", {
          evidenceId: `ev_${Math.random().toString(36).slice(2)}`,
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          sessionId: es.sessionId,
          contextScore: Math.floor(Math.random() * 30 + 70),
          complianceStatus: Math.random() > 0.2 ? "compliant" : (Math.random() > 0.5 ? "at_risk" : "rejected"),
          workRelevance: Math.round((Math.random() * 0.3 + 0.7) * 100) / 100,
          activityDensity: Math.round((Math.random() * 0.3 + 0.6) * 100) / 100,
          timestamp: es.startTime,
        });
      }

      // WCVN verifications
      if (sessionIds.length > 1) {
        await ctx.db.insert("wcvmVerifications", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          sessionId: sessionIds[1] as any,
          evidenceSessionId: existingEvidenceSessions[0]?._id ?? (await ctx.db.query("evidenceSessions").first())?._id as any,
          contextRelevanceScore: 87,
          verificationMatrix: { activityScore: 92, screenshotScore: 85, memoScore: 78, urlScore: 90 },
          verificationSignature: `sig_${Math.random().toString(36).slice(2)}`,
          verifiedAt: now - 5 * day,
          clientRequirements: [
            { id: "req1", description: "Minimum activity rate 70%", relevanceScore: 92, matchedEvidence: ["event_1", "event_2"] },
            { id: "req2", description: "Screenshots every 10 minutes", relevanceScore: 85, matchedEvidence: ["event_4"] },
          ],
        });
      }

      results.push("evidence");
    }

    // ─── 23. Seed Platform Connections ──────────────────────────────────────
    const existingPlatformConns = await ctx.db
      .query("platformConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingPlatformConns.length === 0) {
      const platformConns = [
        { platform: "upwork" as const, status: "connected" as const, connectedAt: now - 60 * day, platformUserId: "upwork_12345", platformEmail: "dev@upwork.com", lastSyncedAt: now - 2 * 60 * 60 * 1000 },
        { platform: "fiverr" as const, status: "connected" as const, connectedAt: now - 45 * day, platformUserId: "fiverr_67890", platformEmail: "dev@fiverr.com", lastSyncedAt: now - day },
        { platform: "toptal" as const, status: "disconnected" as const, connectedAt: now - 90 * day, disconnectedAt: now - 30 * day, platformEmail: "dev@toptal.com" },
        { platform: "freelancer" as const, status: "pending" as const },
      ];
      for (const pc of platformConns) {
        await ctx.db.insert("platformConnections", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          ...pc,
        });
      }

      // Platform imported data
      for (const platform of ["upwork", "fiverr"] as const) {
        for (const dataType of ["profile", "workHistory", "earnings", "reviews"] as const) {
          await ctx.db.insert("platformImportedData", {
            userId,
            workspaceId: teamWorkspaceId,
            createdBy: userId,
            platform,
            dataType,
            importedAt: now - Math.floor(Math.random() * 10) * day,
            data: { summary: `${dataType} data from ${platform}`, recordCount: Math.floor(Math.random() * 50) + 5 },
            user_id_hash: hashStr(userId),
          });
        }
      }

      // Cross-platform verifications
      await ctx.db.insert("crossPlatformVerifications", {
        userId,
        workspaceId: teamWorkspaceId,
        createdBy: userId,
        platforms: ["upwork", "fiverr", "toptal"],
        verificationStatus: "verified",
        consistencyScore: 92,
        discrepancies: [{ platform1: "upwork", platform2: "fiverr", issue: "Work hours mismatch on June 5th", severity: "low" as const }],
        verifiedAt: now - 7 * day,
        nextVerification: now + 23 * day,
      });
      await ctx.db.insert("crossPlatformVerifications", {
        userId,
        workspaceId: teamWorkspaceId,
        createdBy: userId,
        platforms: ["upwork", "freelancer"],
        verificationStatus: "partial",
        consistencyScore: 68,
        discrepancies: [{ platform1: "upwork", platform2: "freelancer", issue: "Missing earnings data from freelancer", severity: "medium" as const }],
        verifiedAt: now - 3 * day,
        nextVerification: now + 27 * day,
      });

      results.push("platform_connections");
    }

    // ─── 24. Seed Extension Tokens ─────────────────────────────────────────
    const existingTokens = await ctx.db
      .query("extensionTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingTokens.length === 0) {
      await ctx.db.insert("extensionTokens", {
        userId,
        workspaceId: teamWorkspaceId,
        createdBy: userId,
        token: generateToken(),
        createdAt: now - 30 * day,
        expiresAt: now + 60 * day,
        lastUsed: now - 2 * 60 * 60 * 1000,
      });
      await ctx.db.insert("extensionTokens", {
        userId,
        workspaceId: teamWorkspaceId,
        createdBy: userId,
        token: generateToken(),
        createdAt: now - 90 * day,
        expiresAt: now - 30 * day,
        lastUsed: now - 60 * day,
      });
      results.push("extension_tokens");
    }

    // ─── 25. Seed Protection Advisor Alerts ────────────────────────────────
    const existingAdvisorAlerts = await ctx.db.query("protectionAdvisorAlerts").collect();
    if (existingAdvisorAlerts.length === 0) {
      const alerts = [
        { alertType: "activity_gap" as const, severity: "warning" as const, message: "2-hour gap detected in TechCorp session", recommendation: "Add manual time entry with evidence", actionRequired: true, autoResolved: false },
        { alertType: "screenshot_needed" as const, severity: "info" as const, message: "No screenshots in last 30 minutes for StartupHub project", recommendation: "Take a screenshot of your current work", actionRequired: false, autoResolved: true, resolvedAt: now - 10 * 60 * 1000 },
        { alertType: "policy_violation" as const, severity: "critical" as const, message: "Upwork activity requirements not met — 4 hours below threshold", recommendation: "Review work diary and add memos for low-activity periods", actionRequired: true, autoResolved: false },
        { alertType: "platform_sync_issue" as const, severity: "warning" as const, message: "Fiverr sync failed — last successful sync was 48 hours ago", recommendation: "Reconnect your Fiverr account in Settings", actionRequired: true, autoResolved: false },
        { alertType: "evidence_quality_low" as const, severity: "info" as const, message: "Memo quality score dropped below 60% for MediTech sessions", recommendation: "Add more detailed work memos to improve evidence quality", actionRequired: false, autoResolved: false },
      ];
      for (const a of alerts) {
        await ctx.db.insert("protectionAdvisorAlerts", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          ...a,
          triggeredAt: now - Math.floor(Math.random() * 24) * 60 * 60 * 1000,
        });
      }
      results.push("protection_advisor_alerts");
    }

    // ─── 26. Seed Protection Plans ─────────────────────────────────────────
    const existingPlans = await ctx.db.query("protectionPlans").collect();
    if (existingPlans.length === 0) {
      const plans = [
        { planName: "Conservative Protection", planType: "conservative" as const, customRules: [{ ruleId: "r1", ruleName: "Screenshot frequency", condition: "Every 15 minutes", action: "Auto-capture", enabled: true }], protectionGoals: { targetDisputeRate: 0, minEvidenceQuality: 80, autoScreenshotFrequency: 15 }, performance: { disputesAvoided: 3, hoursProtected: 240, incomeSecured: 20400 } },
        { planName: "Balanced Protection", planType: "balanced" as const, customRules: [{ ruleId: "r2", ruleName: "Activity monitoring", condition: "Below 50% for 10 min", action: "Alert", enabled: true }, { ruleId: "r3", ruleName: "Memo reminders", condition: "No memo for 1 hour", action: "Remind", enabled: true }], protectionGoals: { targetDisputeRate: 5, minEvidenceQuality: 70, autoScreenshotFrequency: 10 }, performance: { disputesAvoided: 7, hoursProtected: 480, incomeSecured: 40800 } },
        { planName: "Aggressive Protection", planType: "aggressive" as const, customRules: [{ ruleId: "r4", ruleName: "Continuous screenshots", condition: "Always during work", action: "Auto-capture every 5 min", enabled: true }, { ruleId: "r5", ruleName: "Cross-platform sync", condition: "Every 30 minutes", action: "Auto-sync", enabled: true }], protectionGoals: { targetDisputeRate: 0, minEvidenceQuality: 90, autoScreenshotFrequency: 5 }, performance: { disputesAvoided: 12, hoursProtected: 720, incomeSecured: 61200 } },
      ];
      for (const p of plans) {
        await ctx.db.insert("protectionPlans", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          ...p,
          createdAt: now - 30 * day,
          lastUpdated: now,
          isActive: p.planType === "balanced",
        });
      }
      results.push("protection_plans");
    }

    // ─── 27. Seed Milestone Snapshots, Alerts & Reports ───────────────────
    if (projectIds.length > 0) {
      const existingSnapshots = await ctx.db.query("milestoneSnapshots").collect();
      if (existingSnapshots.length === 0) {
        for (const pid of projectIds.slice(0, 3)) {
          for (let week = 1; week <= 4; week++) {
            const weekStart = now - (4 - week) * 7 * day;
            const weekEnd = weekStart + 7 * day;
            const snapId = await ctx.db.insert("milestoneSnapshots", {
              userId,
              workspaceId: teamWorkspaceId,
              createdBy: userId,
              projectId: pid as any,
              weekNumber: week,
              weekStart,
              weekEnd,
              totalHours: Math.floor(Math.random() * 20) + 10,
              totalEvidence: Math.floor(Math.random() * 30) + 5,
              protectionRate: Math.floor(Math.random() * 20 + 80),
              sessionCount: Math.floor(Math.random() * 8) + 2,
              createdAt: weekEnd,
            });

            // Milestone alert for some weeks
            if (week === 3) {
              await ctx.db.insert("milestoneAlerts", {
                userId,
                workspaceId: teamWorkspaceId,
                createdBy: userId,
                projectId: pid as any,
                weekNumber: week,
                alertType: "protection_drop" as const,
                severity: "warning" as const,
                message: `Protection rate dropped to 78% in week ${week}`,
                protectionRate: 78,
                isRead: week < 3,
                createdAt: weekEnd,
              });
            }
            if (week === 4) {
              await ctx.db.insert("milestoneAlerts", {
                userId,
                workspaceId: teamWorkspaceId,
                createdBy: userId,
                projectId: pid as any,
                weekNumber: week,
                alertType: "week_completion" as const,
                severity: "info" as const,
                message: `Week ${week} completed with strong metrics`,
                isRead: true,
                createdAt: weekEnd,
              });
            }

            // Milestone report for completed weeks
            if (week < 4) {
              await ctx.db.insert("milestoneReports", {
                userId,
                workspaceId: teamWorkspaceId,
                createdBy: userId,
                projectId: pid as any,
                weekNumber: week,
                weekStart,
                weekEnd,
                snapshotId: snapId,
                metrics: { totalHours: Math.floor(Math.random() * 20) + 10, totalEvidence: Math.floor(Math.random() * 30) + 5, protectionRate: Math.floor(Math.random() * 20 + 80), sessionCount: Math.floor(Math.random() * 8) + 2 },
                trends: { hoursTrend: Math.floor(Math.random() * 20 - 10), protectionTrend: Math.floor(Math.random() * 10 - 5), evidenceTrend: Math.floor(Math.random() * 15) },
                insights: [{ type: "success" as const, message: "Consistent work pattern maintained" }, { type: "warning" as const, message: "Screenshot frequency could be improved" }],
                createdAt: weekEnd,
              });
            }
          }
        }
        results.push("milestones");
      }
    }

    // ─── 28. Seed Client Companies & Verification ──────────────────────────
    const existingClientCompanies = await ctx.db.query("clientCompanies").collect();
    let clientCompanyIds: any[] = [];
    if (existingClientCompanies.length === 0) {
      const companies = [
        { email: "admin@techcorp.io", companyName: "TechCorp Solutions", contactName: "David Chen", industry: "Technology", companySize: "51-200", website: "https://techcorp.io", verificationCount: 3, subscriptionTier: "business" },
        { email: "ops@finserve.io", companyName: "FinServe Analytics", contactName: "Michael Torres", industry: "Fintech", companySize: "11-50", website: "https://finserve.io", verificationCount: 2, subscriptionTier: "professional" },
        { email: "info@meditech.org", companyName: "MediTech Health", contactName: "Dr. Robert Singh", industry: "Healthcare", companySize: "201-500", website: "https://meditech.org", verificationCount: 1, subscriptionTier: "enterprise" },
        { email: "hello@startuphub.co", companyName: "StartupHub Inc", contactName: "Sarah Mitchell", industry: "Education", companySize: "1-10", website: "https://startuphub.co", verificationCount: 0, subscriptionTier: "starter" },
      ];
      for (const c of companies) {
        const ccId = await ctx.db.insert("clientCompanies", {
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          ...c,
          createdAt: now - Math.floor(Math.random() * 60) * day,
          lastLoginAt: now - Math.floor(Math.random() * 7) * day,
        });
        clientCompanyIds.push(ccId);
      }

      // Verification requests — all statuses
      if (clientCompanyIds.length >= 2) {
        const vReqs = [
          { clientId: clientCompanyIds[0] as any, freelancerUserId: userId, projectName: "Website Redesign", projectDescription: "Full redesign of corporate website", workPeriodStart: now - 60 * day, workPeriodEnd: now - 10 * day, status: "completed" as const, freelancerResponse: "Verified - all work confirmed", respondedAt: now - 5 * day },
          { clientId: clientCompanyIds[1] as any, freelancerUserId: userId, projectName: "Analytics Platform", projectDescription: "Financial analytics dashboard", workPeriodStart: now - 30 * day, workPeriodEnd: now, status: "accepted" as const, freelancerResponse: "Confirmed", respondedAt: now - 2 * day },
          { clientId: clientCompanyIds[2] as any, freelancerUserId: userId, projectName: "Patient Portal", projectDescription: "HIPAA-compliant patient portal", workPeriodStart: now - 45 * day, workPeriodEnd: now - 5 * day, status: "pending" as const },
          { clientId: clientCompanyIds[3] as any, freelancerUserId: userId, projectName: "Mobile App MVP", projectDescription: "StartupHub mobile application", workPeriodStart: now - 20 * day, workPeriodEnd: now, status: "rejected" as const, freelancerResponse: "Cannot verify — project scope changed", respondedAt: now - 3 * day },
        ];
        for (const vr of vReqs) {
          const vrId = await ctx.db.insert("verificationRequests", {
            workspaceId: teamWorkspaceId,
            createdBy: userId,
            ...vr,
            requestedAt: now - Math.floor(Math.random() * 15) * day,
          });

          // Verification results for completed requests
          if (vr.status === "completed" || vr.status === "accepted") {
            await ctx.db.insert("clientVerificationResults", {
              workspaceId: teamWorkspaceId,
              verificationRequestId: vrId,
              clientId: vr.clientId,
              freelancerUserId: userId,
              wcvmScore: Math.floor(Math.random() * 20 + 80),
              verificationMatrix: { activityScore: 90, screenshotScore: 85, memoScore: 78, urlScore: 92 },
              evidenceSummary: { totalHours: 45, screenshotCount: 28, activityScore: 92, complianceRate: 95 },
              verificationSignature: `sig_${Math.random().toString(36).slice(2)}`,
              generatedAt: now - 3 * day,
              expiresAt: now + 87 * day,
            });
          }
        }

        // Client activity log
        for (const ccId of clientCompanyIds) {
          const actions = ["viewed_verification", "accepted_terms", "downloaded_report"];
          for (const action of actions) {
            await ctx.db.insert("clientActivityLog", {
              workspaceId: teamWorkspaceId,
              clientId: ccId,
              action,
              targetFreelancerId: userId,
              metadata: { source: "email" },
              timestamp: now - Math.floor(Math.random() * 15) * day,
            });
          }
        }
      }

      // Freelancer public profile
      const existingProfile = await ctx.db.query("freelancerPublicProfiles").collect();
      if (existingProfile.length === 0) {
        await ctx.db.insert("freelancerPublicProfiles", {
          workspaceId: teamWorkspaceId,
          userId,
          createdBy: userId,
          displayName: "Alex Developer",
          professionalTitle: "Full-Stack Developer & Designer",
          bio: "Experienced freelancer with 8+ years building web applications, mobile apps, and digital products for startups and enterprises.",
          hourlyRate: 85,
          axiaVerified: true,
          verificationScore: 92,
          totalVerifiedHours: 480,
          platformsConnected: ["upwork", "fiverr"],
          skills: ["React", "TypeScript", "Node.js", "Python", "UI/UX Design", "PostgreSQL"],
          availability: "available" as const,
          lastActive: now,
          createdAt: now - 60 * day,
        });
      }

      results.push("client_companies");
    }

    // ─── 29. Seed Compliance Tables ────────────────────────────────────────
    const existingAuditTrail = await ctx.db.query("auditTrail").collect();
    if (existingAuditTrail.length === 0) {
      const uidHash = hashStr(userId);

      // Audit trail
      const auditEntries = [
        { operation: "login", source_platform: "web", data_snapshot: { ip: "192.168.1.1" } },
        { operation: "session_start", source_platform: "extension", data_snapshot: { project: "TechCorp Redesign" } },
        { operation: "evidence_capture", source_platform: "extension", data_snapshot: { type: "screenshot", count: 3 } },
        { operation: "invoice_created", source_platform: "web", data_snapshot: { invoiceNumber: "INV-2024-001" } },
        { operation: "data_export", source_platform: "web", data_snapshot: { format: "pdf", records: 42 } },
      ];
      for (const ae of auditEntries) {
        await ctx.db.insert("auditTrail", {
          userId,
          workspaceId: teamWorkspaceId,
          user_id_hash: uidHash,
          ...ae,
          timestamp: now - Math.floor(Math.random() * 30) * day,
        });
      }

      // Consent management
      await ctx.db.insert("consentManagement", {
        userId,
        workspaceId: teamWorkspaceId,
        user_id_hash: uidHash,
        consent_type: "PII",
        status: "granted",
        version: "1.0",
        granted_at: now - 90 * day,
        expires_at: now + 275 * day,
      });
      await ctx.db.insert("consentManagement", {
        userId,
        workspaceId: teamWorkspaceId,
        user_id_hash: uidHash,
        consent_type: "health",
        status: "revoked",
        version: "1.0",
        granted_at: now - 60 * day,
        expires_at: now - 30 * day,
        revoked_at: now - 30 * day,
      });
      await ctx.db.insert("consentManagement", {
        userId,
        workspaceId: teamWorkspaceId,
        user_id_hash: uidHash,
        consent_type: "financial",
        status: "granted",
        version: "2.0",
        granted_at: now - 15 * day,
        expires_at: now + 350 * day,
      });

      // Compliance certificates
      await ctx.db.insert("complianceCertificates", {
        userId,
        workspaceId: teamWorkspaceId,
        user_id_hash: uidHash,
        certificate_type: "deletion",
        certificate_hash: `cert_hash_${Math.random().toString(36).slice(2)}`,
        issued_at: now - 10 * day,
        metadata: { requester: "client", reason: "GDPR request" },
      });
      await ctx.db.insert("complianceCertificates", {
        userId,
        workspaceId: teamWorkspaceId,
        user_id_hash: uidHash,
        certificate_type: "export",
        certificate_hash: `cert_hash_${Math.random().toString(36).slice(2)}`,
        issued_at: now - 5 * day,
        metadata: { format: "JSON", recordCount: 142 },
      });
      await ctx.db.insert("complianceCertificates", {
        userId,
        workspaceId: teamWorkspaceId,
        user_id_hash: uidHash,
        certificate_type: "audit",
        certificate_hash: `cert_hash_${Math.random().toString(36).slice(2)}`,
        issued_at: now - day,
        metadata: { auditor: "internal", scope: "full" },
      });

      // Data lineage
      await ctx.db.insert("dataLineage", {
        workspaceId: teamWorkspaceId,
        record_id: `rec_${Math.random().toString(36).slice(2)}`,
        user_id_hash: uidHash,
        source_platform: "upwork",
        import_timestamp: now - 15 * day,
        jwt_signature: `jwt_${Math.random().toString(36).slice(2)}`,
        data_type: "work_history",
      });

      // Consent audits
      const consentAudits = [
        { platform: "upwork", action: "consent_granted" as const, details: { consent_type: "PII" }, ipAddress: "192.168.1.1" },
        { platform: "fiverr", action: "data_accessed" as const, details: { records: 42 }, ipAddress: "192.168.1.2" },
        { platform: "upwork", action: "consent_revoked" as const, details: { consent_type: "health" }, ipAddress: "192.168.1.1" },
        { platform: "toptal", action: "data_deleted" as const, details: { records: 15 }, ipAddress: "192.168.1.3" },
      ];
      for (const ca of consentAudits) {
        await ctx.db.insert("consentAudits", {
          userId,
          workspaceId: teamWorkspaceId,
          ...ca,
          timestamp: now - Math.floor(Math.random() * 30) * day,
        });
      }

      // Platform compliance checks
      const platformChecks = [
        { platform: "upwork", complianceScore: 92, complianceStatus: { activity: "compliant", screenshots: "compliant", memos: "minor_issue" }, termsLastUpdated: "2024-01-15" },
        { platform: "fiverr", complianceScore: 78, complianceStatus: { activity: "compliant", screenshots: "needs_improvement", memos: "compliant" }, termsLastUpdated: "2024-02-01" },
        { platform: "toptal", complianceScore: 95, complianceStatus: { activity: "compliant", screenshots: "compliant", memos: "compliant" }, termsLastUpdated: "2023-12-01" },
      ];
      for (const pc of platformChecks) {
        await ctx.db.insert("platformComplianceChecks", {
          workspaceId: teamWorkspaceId,
          platform: pc.platform,
          complianceScore: pc.complianceScore,
          complianceStatus: pc.complianceStatus,
          lastChecked: now - Math.floor(Math.random() * 7) * day,
          termsLastUpdated: pc.termsLastUpdated,
        });
      }

      results.push("compliance");
    }

    // ─── 30. Seed Custom Field Definitions ─────────────────────────────────
    const existingCustomFields = await ctx.db.query("customFieldDefinitions").collect();
    if (existingCustomFields.length === 0) {
      const customFields = [
        { tableName: "clients", fieldName: "industry", label: "Industry", type: "select" as const, options: ["Technology", "Healthcare", "Finance", "Education", "Retail"], required: false, order: 1 },
        { tableName: "clients", fieldName: "companySize", label: "Company Size", type: "select" as const, options: ["1-10", "11-50", "51-200", "201-500", "500+"], required: false, order: 2 },
        { tableName: "clients", fieldName: "preferredContactMethod", label: "Preferred Contact", type: "text" as const, required: false, order: 3 },
        { tableName: "projects", fieldName: "techStack", label: "Tech Stack", type: "text" as const, required: false, order: 1 },
        { tableName: "projects", fieldName: "deadline", label: "Deadline", type: "date" as const, required: true, order: 2 },
        { tableName: "projects", fieldName: "budgetApproved", label: "Budget Approved", type: "boolean" as const, required: false, order: 3 },
        { tableName: "projects", fieldName: "priority", label: "Priority", type: "select" as const, options: ["Low", "Medium", "High", "Critical"], required: true, order: 4 },
        { tableName: "deals", fieldName: "leadSource", label: "Lead Source", type: "select" as const, options: ["Upwork", "Fiverr", "LinkedIn", "Referral", "Direct", "Cold Outreach"], required: false, order: 1 },
        { tableName: "deals", fieldName: "estimatedDuration", label: "Est. Duration (weeks)", type: "number" as const, required: false, order: 2 },
      ];
      for (const cf of customFields) {
        await ctx.db.insert("customFieldDefinitions", {
          workspaceId: teamWorkspaceId,
          ...cf,
          createdAt: now,
        });
      }
      results.push("custom_fields");
    }

    // ─── 31. Seed Team Validations ─────────────────────────────────────────
    const existingTeamValidations = await ctx.db.query("teamValidations").collect();
    if (existingTeamValidations.length === 0) {
      const evSession = await ctx.db.query("evidenceSessions").first();
      if (evSession) {
        const validations = [
          { validatorUserId: userId, evidenceSessionId: evSession._id, validationStatus: "approved" as const, validationScore: 92, feedback: "All evidence meets quality standards.", validatedAt: now - 5 * day, issues: [] },
          { validatorUserId: userId, evidenceSessionId: evSession._id, validationStatus: "needs_revision" as const, validationScore: 65, feedback: "Missing memos for 3 time blocks. Screenshot quality is low.", validatedAt: now - 3 * day, issues: [{ type: "missing_memo", description: "No memo for 2pm-3pm block", severity: "medium" as const }, { type: "low_quality_screenshot", description: "Blurry screenshot at 4:15pm", severity: "low" as const }] },
          { validatorUserId: userId, evidenceSessionId: evSession._id, validationStatus: "pending" as const, validationScore: 0, feedback: "", validatedAt: now, issues: [] },
          { validatorUserId: userId, evidenceSessionId: evSession._id, validationStatus: "rejected" as const, validationScore: 30, feedback: "Evidence does not match client requirements. Major gaps in activity logs.", validatedAt: now - 7 * day, issues: [{ type: "activity_gap", description: "4-hour gap with no activity", severity: "high" as const }, { type: "policy_violation", description: "Screenshots not taken per client requirements", severity: "high" as const }] },
        ];
        for (const v of validations) {
          await ctx.db.insert("teamValidations", {
            userId,
            workspaceId: teamWorkspaceId,
            createdBy: userId,
            ...v,
          });
        }
        results.push("team_validations");
      }
    }

    // ─── 32. Seed Upgrade Triggers & Conversions ──────────────────────────
    const existingUpgradeTriggers = await ctx.db.query("upgradeTriggers").collect();
    if (existingUpgradeTriggers.length === 0) {
      const triggers = [
        { triggerType: "loss_aversion", triggerSource: "dispute_report", tierShown: "pro", triggeredAt: now - 20 * day, converted: true },
        { triggerType: "feature_gate", triggerSource: "protection_plan", tierShown: "expert", triggeredAt: now - 15 * day, converted: false },
        { triggerType: "value_showcase", triggerSource: "dashboard_stats", tierShown: "pro", triggeredAt: now - 10 * day, converted: true },
        { triggerType: "loss_aversion", triggerSource: "overdue_invoice", tierShown: "starter", triggeredAt: now - 5 * day, converted: false },
      ];
      for (const t of triggers) {
        await ctx.db.insert("upgradeTriggers", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          ...t,
        });
      }

      // Upgrade conversions
      await ctx.db.insert("upgradeConversions", {
        userId,
        workspaceId: teamWorkspaceId,
        createdBy: userId,
        fromTier: "free",
        toTier: "starter",
        triggerSource: "loss_aversion",
        convertedAt: now - 60 * day,
      });
      await ctx.db.insert("upgradeConversions", {
        userId,
        workspaceId: teamWorkspaceId,
        createdBy: userId,
        fromTier: "starter",
        toTier: "pro",
        triggerSource: "dispute_report",
        convertedAt: now - 20 * day,
      });

      results.push("upgrade_triggers");
    }

    // ─── 33. Seed Waitlist Entries ─────────────────────────────────────────
    const existingWaitlist = await ctx.db.query("waitlistEntries").collect();
    if (existingWaitlist.length === 0) {
      const waitlistEntries = [
        { email: "jessica@webdev.co", source: "hero", suggestions: "Would love API integrations with Jira", position: 142, referralCode: "WL_JESS42", referredCount: 3 },
        { email: "mark@designhub.io", source: "pricing", suggestions: "Team collaboration features would be amazing", position: 143 },
        { email: "priya@freelance.dev", source: "cta", suggestions: "", position: 144, referralCode: "WL_PRIYA1", referredBy: "WL_JESS42", referredCount: 1 },
        { email: "chris@startup.tech", source: "hero", suggestions: "Better dispute resolution tools", position: 145 },
      ];
      for (const w of waitlistEntries) {
        await ctx.db.insert("waitlistEntries", {
          workspaceId: teamWorkspaceId,
          email: w.email,
          submittedAt: now - Math.floor(Math.random() * 30) * day,
          source: w.source,
          suggestions: w.suggestions,
          referralCode: w.referralCode,
          referredBy: w.referredBy,
          referredCount: w.referredCount,
          position: w.position,
        });
      }
      results.push("waitlist");
    }

    // ─── 34. Seed Scope Formalizations ─────────────────────────────────────
    if (projectIds.length > 0) {
      const existingFormalizations = await ctx.db.query("scopeFormalizations").collect();
      if (existingFormalizations.length === 0) {
        const formalizations = [
          { projectId: projectIds[0] as any, changeDescription: "Client added blog section requirement", originalScope: "Corporate website: homepage, about, contact", newScope: "Corporate website: homepage, about, contact, blog", impactAssessment: { timeImpact: "2 weeks", budgetImpact: "+$1,275", deliverableImpact: "1 additional page" }, status: "formalized" as const, clientAcknowledgment: "Approved via email", clientApprovalEvidence: "email_forward_2024.txt", formalizedAt: now - 5 * day },
          { projectId: projectIds[2] as any, changeDescription: "Changed reporting library from custom to Chart.js", originalScope: "Custom SVG-based charts", newScope: "Chart.js-based visualization engine", impactAssessment: { timeImpact: "3 days", budgetImpact: "+$880", deliverableImpact: "Same deliverables, different tech" }, status: "pending" as const },
          { projectId: projectIds[1] as any, changeDescription: "Removed push notification feature", originalScope: "Auth, dashboard, notifications", newScope: "Auth, dashboard only", impactAssessment: { timeImpact: "-1 week", budgetImpact: "-$2,500", deliverableImpact: "1 feature removed" }, status: "rejected" as const },
        ];
        for (const f of formalizations) {
          await ctx.db.insert("scopeFormalizations", {
            userId,
            workspaceId: teamWorkspaceId,
            createdBy: userId,
            ...f,
            createdAt: now - Math.floor(Math.random() * 10) * day,
          });
        }
        results.push("scope_formalizations");
      }
    }

    // ─── 35. Seed Policy Intelligence ──────────────────────────────────────
    const existingPolicyIntel = await ctx.db.query("policyIntelligence").collect();
    if (existingPolicyIntel.length === 0) {
      const existingPols = await ctx.db.query("clientPolicies").collect();
      if (existingPols.length > 0) {
        const intelEntries = [
          { clientPolicyId: existingPols[0]._id, analysisResults: { complianceScore: 88, riskAreas: ["screenshot frequency below requirement"], recommendations: ["Increase auto-capture interval to 8 minutes", "Add memo reminders"], automationOpportunities: ["Auto-capture screenshots", "Auto-generate memos"] }, workPatternMatch: 82, lastAnalyzed: now - 2 * day, nextReview: now + 12 * day },
          { clientPolicyId: existingPols[1]._id, analysisResults: { complianceScore: 75, riskAreas: ["missing work memos", "timer not running consistently"], recommendations: ["Enable auto-timer", "Set memo reminders every 2 hours"], automationOpportunities: ["Auto-start timer on browser activity"] }, workPatternMatch: 68, lastAnalyzed: now - 5 * day, nextReview: now + 9 * day },
        ];
        for (const intel of intelEntries) {
          await ctx.db.insert("policyIntelligence", {
            userId,
            workspaceId: teamWorkspaceId,
            createdBy: userId,
            ...intel,
          });
        }
        results.push("policy_intelligence");
      }
    }

    // ─── 36. Seed Network Connections ──────────────────────────────────────
    const existingNetworkConns = await ctx.db.query("networkConnections").collect();
    if (existingNetworkConns.length === 0) {
      // These would normally reference other users, but since we only have one user, use self-references
      const conns = [
        { targetUserId: userId, status: "accepted" as const, createdAt: now - 30 * day },
        { targetUserId: userId, status: "pending" as const, createdAt: now - 5 * day },
        { targetUserId: userId, status: "rejected" as const, createdAt: now - 15 * day },
      ];
      for (const c of conns) {
        await ctx.db.insert("networkConnections", {
          userId,
          workspaceId: teamWorkspaceId,
          createdBy: userId,
          ...c,
        });
      }
      results.push("network_connections");
    }

    return { seeded: true, items: results };
  },
});
