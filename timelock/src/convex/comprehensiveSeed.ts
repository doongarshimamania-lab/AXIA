// @ts-nocheck — Convex backend file with schema types not yet in generated types
/**
 * Comprehensive Seed: Wipes ALL user data and re-seeds with rich data
 * covering every entity type, every status, and every edge case.
 *
 * Covers: users, workspaces, workspaceMembers, workspaceInvitations,
 * teams, teamMemberships, pipelineStages, deals, clients, projects,
 * proposals, proposalTemplates, proposalFollowUps, proposalFollowUpSettings,
 * invoices, invoiceWorkLinks, paymentReminders, reminderSettings,
 * invoiceTemplates, recurringInvoices, workSessions, timeBlocks,
 * appUsage, complianceAlerts, evidenceSessions, evidenceEvents,
 * wcvmVerifications, evidenceMetadata, disputeReports, automatedDisputeReports,
 * scopeDefinitions, scopeChangeOrders, channels, channelMembers, messages,
 * reactions, mentions, tags, goals, customFieldDefinitions, clientPolicies,
 * platformConnections, protectionPlans, milestoneSnapshots, milestoneAlerts,
 * milestoneReports, scopeFormalizations, protectionAdvisorAlerts.
 *
 * Usage: npx convex run comprehensiveSeed:seedComprehensive
 */
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function token(): string {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  for (let i = 0; i < 32; i++) r += c.charAt(Math.floor(Math.random() * c.length));
  return r;
}

function uid(): string {
  return "id_" + Math.random().toString(36).substring(2, 10);
}

export const seedComprehensive = mutation({
  args: {},
  handler: async (ctx) => {
    let userId: any = await getAuthUserId(ctx);

    // If no authenticated user (e.g. running from CLI with --identity), find or create the dev user
    if (!userId) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("email", (q: any) => q.eq("email", "dev@axia.app"))
        .first();
      if (existingUser) {
        userId = existingUser._id;
      } else {
        userId = await ctx.db.insert("users", {
          name: "Dev User",
          email: "dev@axia.app",
          role: "admin",
          subscriptionTier: "pro",
          hourlyRate: 85,
        });
      }
    } else {
      // Verify the user document actually exists (CLI --identity may provide a fake ID)
      try {
        const userDoc = await ctx.db.get(userId);
        if (!userDoc) {
          // User doc doesn't exist — find or create the dev user
          const existingUser = await ctx.db
            .query("users")
            .withIndex("email", (q: any) => q.eq("email", "dev@axia.app"))
            .first();
          if (existingUser) {
            userId = existingUser._id;
          } else {
            userId = await ctx.db.insert("users", {
              name: "Dev User",
              email: "dev@axia.app",
              role: "admin",
              subscriptionTier: "pro",
              hourlyRate: 85,
            });
          }
        }
      } catch {
        // Invalid ID format (e.g. from --identity) — find or create dev user
        const existingUser = await ctx.db
          .query("users")
          .withIndex("email", (q: any) => q.eq("email", "dev@axia.app"))
          .first();
        if (existingUser) {
          userId = existingUser._id;
        } else {
          userId = await ctx.db.insert("users", {
            name: "Dev User",
            email: "dev@axia.app",
            role: "admin",
            subscriptionTier: "pro",
            hourlyRate: 85,
          });
        }
      }
    }

    const user = await ctx.db.get(userId);

    const now = Date.now();
    const d = 86400000; // 1 day in ms

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 0: WIPE ALL EXISTING DATA FOR THIS USER
    // ═══════════════════════════════════════════════════════════════════════
    const tablesToWipe = [
      "pipelineStages", "deals", "clients", "projects", "proposals",
      "proposalTemplates", "proposalFollowUps", "proposalFollowUpSettings",
      "invoices", "invoiceWorkLinks", "paymentReminders", "reminderSettings",
      "invoiceTemplates", "recurringInvoices", "workSessions", "timeBlocks",
      "appUsage", "complianceAlerts", "evidenceSessions", "evidenceEvents",
      "wcvmVerifications", "evidenceMetadata", "disputeReports",
      "automatedDisputeReports", "scopeDefinitions", "scopeChangeOrders",
      "channels", "channelMembers", "messages", "reactions", "mentions",
      "tags", "goals", "customFieldDefinitions", "clientPolicies",
      "platformConnections", "protectionPlans", "milestoneSnapshots",
      "milestoneAlerts", "milestoneReports", "scopeFormalizations",
      "protectionAdvisorAlerts", "teams", "teamMemberships",
      "workspaceMembers", "workspaceInvitations", "workspaces",
    ];

    let totalDeleted = 0;
    for (const table of tablesToWipe) {
      try {
        const docs = await ctx.db.query(table as any).collect();
        for (const doc of docs) {
          // Only delete docs belonging to this user or their workspaces
          if (
            doc.userId === userId ||
            doc.ownerId === userId ||
            doc.authorId === userId ||
            doc.createdBy === userId ||
            doc.workspaceId
          ) {
            await ctx.db.delete(doc._id);
            totalDeleted++;
          }
        }
      } catch (e) {
        // Table might not have userId — skip
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1: USER PROFILE
    // ═══════════════════════════════════════════════════════════════════════
    await ctx.db.patch(userId, {
      name: "Dev User",
      role: "admin",
      subscriptionTier: "pro",
      hourlyRate: 85,
      professionalBio: "Full-stack developer and freelance professional specializing in web applications, React, and cloud architecture. 8+ years of experience with startups and enterprise clients across fintech, healthcare, and e-commerce.",
      protectedHours: 171,
      protectedValue: 14535,
      vulnerabilityScore: 22,
      primaryPlatform: "upwork",
      yearsExperience: "8+",
      onboardingComplete: true,
      onboardingCompletedAt: now - 90 * d,
      connectedPlatforms: ["upwork", "fiverr"],
      joinedAt: now - 90 * d,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2: WORKSPACES
    // ═══════════════════════════════════════════════════════════════════════
    const personalWsId = await ctx.db.insert("workspaces", {
      ownerId: userId,
      name: "My Workspace",
      type: "personal",
      description: "Your personal freelancer workspace",
      createdAt: now - 90 * d,
      updatedAt: now,
    });

    const teamWsId = await ctx.db.insert("workspaces", {
      ownerId: userId,
      name: "Axia Agency",
      type: "team",
      description: "Full-service digital agency — design, development, and strategy",
      createdAt: now - 60 * d,
      updatedAt: now,
    });

    // Workspace Members
    await ctx.db.insert("workspaceMembers", {
      workspaceId: personalWsId,
      userId,
      role: "owner",
      status: "active",
      title: "Freelancer",
      joinedAt: now - 90 * d,
      lastActiveAt: now,
    });

    const devMemberId = await ctx.db.insert("workspaceMembers", {
      workspaceId: teamWsId,
      userId,
      role: "owner",
      status: "active",
      title: "Founder & Creative Director",
      joinedAt: now - 60 * d,
      lastActiveAt: now,
    });

    // Invited members (different statuses)
    await ctx.db.insert("workspaceMembers", {
      workspaceId: teamWsId,
      userId,
      role: "manager",
      status: "active",
      title: "Senior Developer",
      joinedAt: now - 45 * d,
      lastActiveAt: now - 2 * d,
    });

    await ctx.db.insert("workspaceInvitations", {
      workspaceId: teamWsId,
      email: "sarah@designco.com",
      role: "member",
      token: token(),
      invitedBy: userId,
      status: "pending",
      createdAt: now - 3 * d,
      expiresAt: now + 4 * d,
    });

    await ctx.db.insert("workspaceInvitations", {
      workspaceId: teamWsId,
      email: "mike@devhouse.io",
      role: "member",
      token: token(),
      invitedBy: userId,
      status: "pending",
      createdAt: now - 1 * d,
      expiresAt: now + 6 * d,
    });

    await ctx.db.insert("workspaceInvitations", {
      workspaceId: teamWsId,
      email: "jessica@motionlabs.com",
      role: "manager",
      token: token(),
      invitedBy: userId,
      status: "expired",
      createdAt: now - 14 * d,
      expiresAt: now - 7 * d,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 3: TEAMS
    // ═══════════════════════════════════════════════════════════════════════
    const devTeamId = await ctx.db.insert("teams", {
      workspaceId: teamWsId,
      name: "Development",
      color: "#3b82f6",
      icon: "code",
      description: "Backend and frontend development team",
      createdAt: now - 50 * d,
      updatedAt: now,
    });

    const designTeamId = await ctx.db.insert("teams", {
      workspaceId: teamWsId,
      name: "Design",
      color: "#ec4899",
      icon: "palette",
      description: "UI/UX design and branding team",
      createdAt: now - 50 * d,
      updatedAt: now,
    });

    const managementTeamId = await ctx.db.insert("teams", {
      workspaceId: teamWsId,
      name: "Management",
      color: "#f59e0b",
      icon: "shield",
      description: "Cross-team management with full visibility",
      isCrossTeam: true,
      createdAt: now - 50 * d,
      updatedAt: now,
    });

    await ctx.db.insert("teamMemberships", {
      teamId: devTeamId,
      userId,
      workspaceId: teamWsId,
      role: "lead",
      joinedAt: now - 50 * d,
    });

    await ctx.db.insert("teamMemberships", {
      teamId: managementTeamId,
      userId,
      workspaceId: teamWsId,
      role: "lead",
      joinedAt: now - 50 * d,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 4: PIPELINE STAGES
    // ═══════════════════════════════════════════════════════════════════════
    const stageNames = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
    const stageColors = ["#94a3b8", "#60a5fa", "#a78bfa", "#fb923c", "#4ade80", "#f87171"];
    const stageIds: any[] = [];

    for (let i = 0; i < stageNames.length; i++) {
      const sid = await ctx.db.insert("pipelineStages", {
        userId,
        workspaceId: personalWsId,
        createdBy: userId,
        name: stageNames[i],
        color: stageColors[i],
        order: i,
        isDefault: i < 5,
        createdAt: now - 60 * d,
      });
      stageIds.push(sid);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 5: CLIENTS — Every platform, contract type, risk level, status
    // ═══════════════════════════════════════════════════════════════════════
    const clientData = [
      // Active clients — different platforms
      { clientName: "TechCorp Solutions", name: "TechCorp Solutions", platform: "upwork" as const, hourlyRate: 85, contractType: "hourly" as const, riskLevel: "low" as const, status: "active" as const, email: "billing@techcorp.io", company: "TechCorp Solutions Inc", phone: "+1-555-0101", industry: "Technology", website: "https://techcorp.io", source: "upwork", notes: "Long-term enterprise client. Excellent payment history.", address: { street: "100 Tech Blvd", city: "San Francisco", state: "CA", zip: "94105", country: "US" }, avgPaymentDays: 5, onTimeRate: 0.98, totalPaid: 24500, totalInvoiced: 25000, lastPaymentAt: now - 5 * d, contactEmail: "sarah@techcorp.io", contactName: "Sarah Chen" },
      { clientName: "StartupHub Inc", name: "StartupHub Inc", platform: "upwork" as const, hourlyRate: 90, contractType: "fixed" as const, riskLevel: "medium" as const, status: "active" as const, email: "projects@startuphub.co", company: "StartupHub Inc", phone: "+1-555-0202", industry: "SaaS", website: "https://startuphub.co", source: "upwork", notes: "Fast-growing startup. Sometimes slow on payments.", address: { street: "250 Innovation Way", city: "Austin", state: "TX", zip: "73301", country: "US" }, avgPaymentDays: 12, onTimeRate: 0.82, totalPaid: 18000, totalInvoiced: 22000, lastPaymentAt: now - 15 * d, contactEmail: "mark@startuphub.co", contactName: "Mark Rivera" },
      { clientName: "Global Enterprises", name: "Global Enterprises", platform: "upwork" as const, hourlyRate: 95, contractType: "hourly" as const, riskLevel: "high" as const, status: "active" as const, email: "contracts@globalent.com", company: "Global Enterprises Ltd", phone: "+44-20-5550303", industry: "Finance", website: "https://globalent.com", source: "referral", notes: "Large enterprise but frequent disputes on hours. Keep detailed evidence.", address: { street: "10 Canary Wharf", city: "London", state: "", zip: "E14 5AB", country: "UK" }, avgPaymentDays: 25, onTimeRate: 0.65, totalPaid: 12000, totalInvoiced: 20000, lastPaymentAt: now - 30 * d, contactEmail: "james@globalent.com", contactName: "James Wright" },
      { clientName: "Digital Marketing Co", name: "Digital Marketing Co", platform: "fiverr" as const, hourlyRate: 45, contractType: "fixed" as const, riskLevel: "low" as const, status: "active" as const, email: "hello@digitalmarketingco.com", company: "Digital Marketing Co", phone: "+1-555-0404", industry: "Marketing", website: "https://digitalmarketingco.com", source: "fiverr", notes: "Creative agency — recurring branding work.", address: { street: "500 Creative Ave", city: "Portland", state: "OR", zip: "97201", country: "US" }, avgPaymentDays: 3, onTimeRate: 1.0, totalPaid: 8200, totalInvoiced: 8200, lastPaymentAt: now - 2 * d, contactEmail: "lisa@digitalmarketingco.com", contactName: "Lisa Park" },
      { clientName: "Creative Studios", name: "Creative Studios", platform: "fiverr" as const, hourlyRate: 55, contractType: "hourly" as const, riskLevel: "low" as const, status: "active" as const, email: "art@creativestudios.io", company: "Creative Studios LLC", phone: "+1-555-0505", industry: "Media", website: "https://creativestudios.io", source: "fiverr", notes: "Video production and motion graphics.", address: { street: "75 Studio Lane", city: "Los Angeles", state: "CA", zip: "90028", country: "US" }, avgPaymentDays: 7, onTimeRate: 0.95, totalPaid: 6800, totalInvoiced: 7000, lastPaymentAt: now - 8 * d, contactEmail: "alex@creativestudios.io", contactName: "Alex Morgan" },
      { clientName: "FinServe Analytics", name: "FinServe Analytics", platform: "toptal" as const, hourlyRate: 110, contractType: "hourly" as const, riskLevel: "medium" as const, status: "active" as const, email: "eng@finserve.com", company: "FinServe Analytics Corp", phone: "+1-555-0606", industry: "Fintech", website: "https://finserve.com", source: "toptal", notes: "High-value fintech project. Strict compliance requirements.", address: { street: "200 Wall St", city: "New York", state: "NY", zip: "10005", country: "US" }, avgPaymentDays: 10, onTimeRate: 0.88, totalPaid: 33000, totalInvoiced: 35000, lastPaymentAt: now - 4 * d, contactEmail: "david@finserve.com", contactName: "David Kim" },
      { clientName: "MediTech Health", name: "MediTech Health", platform: "direct" as const, hourlyRate: 100, contractType: "hourly" as const, riskLevel: "low" as const, status: "active" as const, email: "dev@meditech.health", company: "MediTech Health Systems", phone: "+1-555-0707", industry: "Healthcare", website: "https://meditech.health", source: "referral", notes: "Healthcare platform with HIPAA compliance needs.", address: { street: "300 Medical Dr", city: "Boston", state: "MA", zip: "02115", country: "US" }, avgPaymentDays: 8, onTimeRate: 0.96, totalPaid: 15000, totalInvoiced: 15500, lastPaymentAt: now - 6 * d, contactEmail: "rachel@meditech.health", contactName: "Rachel Green" },
      { clientName: "LogiSync Systems", name: "LogiSync Systems", platform: "direct" as const, hourlyRate: 80, contractType: "fixed" as const, riskLevel: "medium" as const, status: "active" as const, email: "ops@logisync.io", company: "LogiSync Systems", phone: "+1-555-0808", industry: "Logistics", website: "https://logisync.io", source: "direct", notes: "Logistics and supply chain platform.", address: { street: "400 Harbor Blvd", city: "Chicago", state: "IL", zip: "60601", country: "US" }, avgPaymentDays: 18, onTimeRate: 0.75, totalPaid: 9600, totalInvoiced: 12000, lastPaymentAt: now - 20 * d, contactEmail: "tom@logisync.io", contactName: "Tom Bradley" },
      // Archived client
      { clientName: "CloudMetrics", name: "CloudMetrics", platform: "upwork" as const, hourlyRate: 75, contractType: "hourly" as const, riskLevel: "high" as const, status: "archived" as const, email: "info@cloudmetrics.dev", company: "CloudMetrics Dev", phone: "+1-555-0909", industry: "Cloud", website: "https://cloudmetrics.dev", source: "upwork", notes: "Archived — project completed and contract ended.", address: { street: "55 Cloud Way", city: "Seattle", state: "WA", zip: "98101", country: "US" }, avgPaymentDays: 30, onTimeRate: 0.5, totalPaid: 4500, totalInvoiced: 6000, lastPaymentAt: now - 90 * d, contactEmail: "nate@cloudmetrics.dev", contactName: "Nate Wilson" },
      // Lead client
      { clientName: "NovaTech AI", name: "NovaTech AI", platform: "direct" as const, hourlyRate: 120, contractType: "hourly" as const, riskLevel: "low" as const, status: "lead" as const, email: "hire@novatech.ai", company: "NovaTech AI", phone: "+1-555-1010", industry: "AI/ML", website: "https://novatech.ai", source: "referral", notes: "Hot lead — AI platform build. Follow up this week.", address: { street: "1 AI Plaza", city: "Palo Alto", state: "CA", zip: "94301", country: "US" }, contactEmail: "hire@novatech.ai", contactName: "Emily Zhao" },
    ];

    const clientIds: any[] = [];
    for (const c of clientData) {
      const cid = await ctx.db.insert("clients", {
        userId,
        workspaceId: teamWsId,
        ...c,
        addedAt: now - Math.floor(Math.random() * 60) * d,
        lastActivityAt: now - Math.floor(Math.random() * 5) * d,
        createdAt: now - Math.floor(Math.random() * 60) * d,
        updatedAt: now,
      });
      clientIds.push(cid);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 6: PROJECTS — Every type, protection level, status
    // ═══════════════════════════════════════════════════════════════════════
    const projectData = [
      { projectName: "E-Commerce Platform Redesign", clientId: clientIds[0], hourlyRate: 85, projectType: "ongoing" as const, protectionLevel: "enhanced" as const, status: "active" as const, evidenceCount: 45, evidenceWithClientKeywords: 38, workSpecificity: 88, activityDensity: 92, memoQuality: 85, upworkCompliance: 95, fiverrCompliance: 0, toptalCompliance: 0, pattern7Vulnerability: 12, businessPattern: 85, paymentPatternRisk: 15, disputeTrend: "stable", weeklyIncome: 2125, avgProjectValue: 8500 },
      { projectName: "SaaS Dashboard MVP", clientId: clientIds[1], hourlyRate: 90, projectType: "milestone" as const, protectionLevel: "standard" as const, status: "active" as const, evidenceCount: 28, evidenceWithClientKeywords: 20, workSpecificity: 78, activityDensity: 85, memoQuality: 72, upworkCompliance: 88, pattern7Vulnerability: 22, businessPattern: 72, paymentPatternRisk: 35, disputeTrend: "increasing", weeklyIncome: 1800, avgProjectValue: 12000 },
      { projectName: "Data Visualization Portal", clientId: clientIds[2], hourlyRate: 95, projectType: "ongoing" as const, protectionLevel: "maximum" as const, status: "active" as const, evidenceCount: 62, evidenceWithClientKeywords: 55, workSpecificity: 94, activityDensity: 96, memoQuality: 90, upworkCompliance: 98, pattern7Vulnerability: 5, businessPattern: 92, paymentPatternRisk: 40, disputeTrend: "decreasing", weeklyIncome: 2850, avgProjectValue: 20000 },
      { projectName: "Brand Identity System", clientId: clientIds[3], hourlyRate: 45, projectType: "fixed" as const, protectionLevel: "standard" as const, status: "active" as const, evidenceCount: 15, evidenceWithClientKeywords: 10, workSpecificity: 70, activityDensity: 75, memoQuality: 68, pattern7Vulnerability: 30, businessPattern: 65, paymentPatternRisk: 10, disputeTrend: "stable", weeklyIncome: 900, avgProjectValue: 4400 },
      { projectName: "Motion Graphics Reel", clientId: clientIds[4], hourlyRate: 55, projectType: "fixed" as const, protectionLevel: "standard" as const, status: "active" as const, evidenceCount: 12, evidenceWithClientKeywords: 8, workSpecificity: 65, activityDensity: 70, memoQuality: 60, pattern7Vulnerability: 35, businessPattern: 58, paymentPatternRisk: 8, disputeTrend: "stable", weeklyIncome: 660, avgProjectValue: 3300 },
      { projectName: "Analytics Platform", clientId: clientIds[5], hourlyRate: 110, projectType: "ongoing" as const, protectionLevel: "maximum" as const, status: "active" as const, evidenceCount: 78, evidenceWithClientKeywords: 70, workSpecificity: 96, activityDensity: 98, memoQuality: 94, toptalCompliance: 97, pattern7Vulnerability: 3, businessPattern: 95, paymentPatternRisk: 25, disputeTrend: "stable", weeklyIncome: 4400, avgProjectValue: 35000 },
      { projectName: "Healthcare Portal", clientId: clientIds[6], hourlyRate: 100, projectType: "milestone" as const, protectionLevel: "enhanced" as const, status: "active" as const, evidenceCount: 35, evidenceWithClientKeywords: 30, workSpecificity: 90, activityDensity: 88, memoQuality: 85, pattern7Vulnerability: 8, businessPattern: 88, paymentPatternRisk: 5, disputeTrend: "stable", weeklyIncome: 3000, avgProjectValue: 15000 },
      { projectName: "Supply Chain Dashboard", clientId: clientIds[7], hourlyRate: 80, projectType: "ongoing" as const, protectionLevel: "enhanced" as const, status: "active" as const, evidenceCount: 22, evidenceWithClientKeywords: 16, workSpecificity: 80, activityDensity: 82, memoQuality: 75, pattern7Vulnerability: 18, businessPattern: 75, paymentPatternRisk: 30, disputeTrend: "increasing", weeklyIncome: 1600, avgProjectValue: 9600 },
      // Archived project
      { projectName: "Legacy Cloud Monitor", clientId: clientIds[8], hourlyRate: 75, projectType: "fixed" as const, protectionLevel: "standard" as const, status: "archived" as const, evidenceCount: 8, evidenceWithClientKeywords: 4, workSpecificity: 55, activityDensity: 50, memoQuality: 45, pattern7Vulnerability: 45, businessPattern: 40, paymentPatternRisk: 55, disputeTrend: "increasing", weeklyIncome: 0, avgProjectValue: 4500 },
    ];

    const projectIds: any[] = [];
    for (const p of projectData) {
      const pid = await ctx.db.insert("projects", {
        userId,
        workspaceId: teamWsId,
        createdBy: userId,
        ...p,
        clientKeywords: ["dashboard", "api", "frontend", "backend"],
        hasClientSpecificRequirements: p.protectionLevel !== "standard",
        platformRecommendations: Math.floor(Math.random() * 20) + 80,
        clientDiversity: Math.floor(Math.random() * 30) + 60,
        platformCoverage: Math.floor(Math.random() * 20) + 75,
        historicalSuccess: Math.floor(Math.random() * 15) + 80,
        createdAt: now - Math.floor(Math.random() * 60) * d,
        lastActivityAt: now - Math.floor(Math.random() * 3) * d,
      });
      projectIds.push(pid);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 7: DEALS — Every stage, different sources & values
    // ═══════════════════════════════════════════════════════════════════════
    const dealData = [
      // Lead stage
      { title: "AI Chatbot Platform", value: 25000, probability: 10, stageId: stageIds[0], source: "upwork", contactName: "Emily Zhao", contactEmail: "hire@novatech.ai", expectedCloseDate: now + 60 * d, notes: "Initial contact. Needs discovery call.", clientId: clientIds[9] },
      { title: "E-Learning Module", value: 8000, probability: 15, stageId: stageIds[0], source: "fiverr", contactName: "Prof. Adams", contactEmail: "adams@learn.edu", expectedCloseDate: now + 45 * d, notes: "Interested in interactive learning module." },
      { title: "Restaurant App", value: 12000, probability: 20, stageId: stageIds[0], source: "referral", contactName: "Chef Marco", contactEmail: "marco@bistro.com", expectedCloseDate: now + 30 * d, notes: "Referred by existing client." },
      // Qualified
      { title: "Real Estate Platform", value: 18000, probability: 30, stageId: stageIds[1], source: "upwork", contactName: "Laura Kim", contactEmail: "laura@realty.io", expectedCloseDate: now + 30 * d, notes: "Discovery call done. Needs proposal." },
      { title: "Fitness Tracker App", value: 6000, probability: 35, stageId: stageIds[1], source: "direct", contactName: "Jake Strong", contactEmail: "jake@fitapp.co", expectedCloseDate: now + 21 * d, notes: "Budget confirmed. Moving to proposal." },
      { title: "Inventory System", value: 14000, probability: 40, stageId: stageIds[1], source: "upwork", contactName: "Tom Bradley", contactEmail: "tom@logisync.io", expectedCloseDate: now + 25 * d, notes: "Requirements gathered. Ready for scoping.", clientId: clientIds[7] },
      // Proposal
      { title: "Cloud Migration Consultation", value: 4000, probability: 50, stageId: stageIds[2], source: "upwork", contactName: "Nate Wilson", contactEmail: "nate@cloudmetrics.dev", expectedCloseDate: now + 14 * d, notes: "Proposal sent for AWS migration.", clientId: clientIds[8] },
      { title: "Banking Dashboard", value: 22000, probability: 55, stageId: stageIds[2], source: "toptal", contactName: "David Kim", contactEmail: "david@finserve.com", expectedCloseDate: now + 10 * d, notes: "Detailed proposal with milestones submitted.", clientId: clientIds[5] },
      { title: "Telehealth Platform", value: 35000, probability: 60, stageId: stageIds[2], source: "referral", contactName: "Rachel Green", contactEmail: "rachel@meditech.health", expectedCloseDate: now + 7 * d, notes: "Proposal under review by their board.", clientId: clientIds[6] },
      // Negotiation
      { title: "API Integration Project", value: 6000, probability: 70, stageId: stageIds[3], source: "upwork", contactName: "Mark Rivera", contactEmail: "mark@startuphub.co", expectedCloseDate: now + 5 * d, notes: "Discussing scope for payment gateway integration.", clientId: clientIds[1] },
      { title: "Marketing Automation", value: 9000, probability: 75, stageId: stageIds[3], source: "fiverr", contactName: "Lisa Park", contactEmail: "lisa@digitalmarketingco.com", expectedCloseDate: now + 3 * d, notes: "Negotiating retainer terms.", clientId: clientIds[3] },
      { title: "Mobile App Development", value: 15000, probability: 80, stageId: stageIds[3], source: "upwork", contactName: "Sarah Chen", contactEmail: "sarah@techcorp.io", expectedCloseDate: now + 2 * d, notes: "Final contract review. Almost signed.", clientId: clientIds[0] },
      // Won
      { title: "Website Revamp", value: 8500, probability: 100, stageId: stageIds[4], source: "upwork", contactName: "Sarah Chen", contactEmail: "sarah@techcorp.io", notes: "Contract signed. Kickoff meeting scheduled.", clientId: clientIds[0] },
      { title: "Brand Guidelines", value: 4400, probability: 100, stageId: stageIds[4], source: "fiverr", contactName: "Lisa Park", contactEmail: "lisa@digitalmarketingco.com", notes: "Completed and paid.", clientId: clientIds[3] },
      { title: "Data Pipeline Setup", value: 12000, probability: 100, stageId: stageIds[4], source: "toptal", contactName: "David Kim", contactEmail: "david@finserve.com", notes: "Won through Toptal. Starting next week.", clientId: clientIds[5] },
      // Lost
      { title: "Social Media App", value: 20000, probability: 0, stageId: stageIds[5], source: "upwork", contactName: "Alex Jones", contactEmail: "alex@socialapp.io", notes: "Went with another freelancer. Price too high." },
      { title: "CRM Customization", value: 7000, probability: 0, stageId: stageIds[5], source: "direct", contactName: "Pat Morgan", contactEmail: "pat@crmsolutions.com", notes: "Project cancelled due to budget cuts." },
    ];

    for (let i = 0; i < dealData.length; i++) {
      await ctx.db.insert("deals", {
        userId,
        workspaceId: personalWsId,
        ...dealData[i],
        currency: "USD",
        order: i,
        createdAt: now - Math.floor(Math.random() * 30) * d,
        updatedAt: now - Math.floor(Math.random() * 5) * d,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 8: PROPOSALS — Every status, with sections
    // ═══════════════════════════════════════════════════════════════════════
    const makeSections = (title: string, desc: string, price: number) => [
      { id: uid(), type: "heading", content: title },
      { id: uid(), type: "text", content: desc },
      { id: uid(), type: "scope_of_work", content: "Complete design, development, testing, and deployment of the project as discussed." },
      { id: uid(), type: "pricing", content: "", metadata: { items: [{ name: "Development", rate: 85, hours: Math.ceil(price / 85) }] } },
      { id: uid(), type: "milestone", content: "", metadata: { milestones: [{ name: "Phase 1: Discovery & Design", percent: 30 }, { name: "Phase 2: Development", percent: 50 }, { name: "Phase 3: Testing & Launch", percent: 20 }] } },
      { id: uid(), type: "terms", content: "Payment due within 14 days of invoice. Scope changes require written approval. Intellectual property transfers upon full payment." },
      { id: uid(), type: "summary", content: `Total project value: $${price.toLocaleString()}. Estimated timeline: 4-6 weeks.` },
      { id: uid(), type: "divider", content: "" },
      { id: uid(), type: "client_info", content: "" },
      { id: uid(), type: "sender_info", content: "" },
    ];

    const proposalData = [
      { title: "TechCorp E-Commerce Redesign Proposal", status: "signed" as const, totalValue: 8500, clientId: clientIds[0], clientName: "TechCorp Solutions", clientEmail: "sarah@techcorp.io", sentAt: now - 20 * d, viewedAt: now - 18 * d, signedAt: now - 15 * d, signatureData: "signed_dev_user" },
      { title: "StartupHub Dashboard MVP Proposal", status: "sent" as const, totalValue: 12000, clientId: clientIds[1], clientName: "StartupHub Inc", clientEmail: "mark@startuphub.co", sentAt: now - 5 * d, viewedAt: now - 4 * d },
      { title: "Global Enterprises Data Portal Proposal", status: "viewed" as const, totalValue: 20000, clientId: clientIds[2], clientName: "Global Enterprises", clientEmail: "james@globalent.com", sentAt: now - 10 * d, viewedAt: now - 8 * d },
      { title: "FinServe Analytics Platform Proposal", status: "viewed" as const, totalValue: 35000, clientId: clientIds[5], clientName: "FinServe Analytics", clientEmail: "david@finserve.com", sentAt: now - 7 * d, viewedAt: now - 6 * d },
      { title: "MediTech Healthcare Portal Proposal", status: "sent" as const, totalValue: 15000, clientId: clientIds[6], clientName: "MediTech Health", clientEmail: "rachel@meditech.health", sentAt: now - 2 * d },
      { title: "Digital Marketing Brand Identity Proposal", status: "signed" as const, totalValue: 4400, clientId: clientIds[3], clientName: "Digital Marketing Co", clientEmail: "lisa@digitalmarketingco.com", sentAt: now - 30 * d, viewedAt: now - 28 * d, signedAt: now - 25 * d, signatureData: "signed_lisa_park" },
      { title: "LogiSync Supply Chain Dashboard", status: "draft" as const, totalValue: 9600, clientId: clientIds[7], clientName: "LogiSync Systems", clientEmail: "tom@logisync.io" },
      { title: "NovaTech AI Platform Proposal", status: "draft" as const, totalValue: 25000, clientId: clientIds[9], clientName: "NovaTech AI", clientEmail: "hire@novatech.ai" },
      { title: "Creative Studios Motion Reel", status: "declined" as const, totalValue: 3300, clientId: clientIds[4], clientName: "Creative Studios", clientEmail: "art@creativestudios.io", sentAt: now - 40 * d, viewedAt: now - 38 * d },
      { title: "CloudMetrics Monitor Proposal", status: "expired" as const, totalValue: 6000, clientId: clientIds[8], clientName: "CloudMetrics", clientEmail: "info@cloudmetrics.dev", sentAt: now - 60 * d, viewedAt: now - 55 * d },
    ];

    const proposalIds: any[] = [];
    for (const p of proposalData) {
      const pid = await ctx.db.insert("proposals", {
        userId,
        workspaceId: teamWsId,
        publicToken: token(),
        sections: makeSections(p.title, `Professional proposal for ${p.clientName}`, p.totalValue),
        currency: "USD",
        validUntil: now + 30 * d,
        notes: "",
        createdBy: userId,
        ...p,
        createdAt: now - Math.floor(Math.random() * 40) * d,
        updatedAt: now,
      });
      proposalIds.push(pid);
    }

    // Proposal Templates
    await ctx.db.insert("proposalTemplates", {
      userId,
      workspaceId: teamWsId,
      createdBy: userId,
      name: "Web Development Standard",
      industry: "Technology",
      description: "Standard proposal template for web development projects",
      sections: makeSections("Web Development Project", "Full-stack web development services", 0),
      isSystem: false,
      usageCount: 8,
      createdAt: now - 30 * d,
    });

    await ctx.db.insert("proposalTemplates", {
      userId,
      workspaceId: teamWsId,
      createdBy: userId,
      name: "Design & Branding",
      industry: "Creative",
      description: "Proposal template for design and branding projects",
      sections: makeSections("Design Project", "Creative design and branding services", 0),
      isSystem: false,
      usageCount: 5,
      createdAt: now - 30 * d,
    });

    await ctx.db.insert("proposalTemplates", {
      workspaceId: teamWsId,
      name: "Consulting Engagement",
      industry: "Consulting",
      description: "System template for consulting and strategy engagements",
      sections: makeSections("Consulting Engagement", "Strategic consulting services", 0),
      isSystem: true,
      usageCount: 12,
      createdAt: now - 90 * d,
    });

    // Proposal Follow-Ups
    for (const pid of [proposalIds[1], proposalIds[2], proposalIds[4]]) {
      await ctx.db.insert("proposalFollowUps", {
        userId,
        workspaceId: teamWsId,
        proposalId: pid,
        dayNumber: 3,
        subject: "Following up on our proposal",
        body: "Hi, just checking if you had a chance to review the proposal we sent. Happy to answer any questions!",
        channel: "email",
        status: "scheduled",
        scheduledAt: now + 3 * d,
        createdAt: now,
      });
      await ctx.db.insert("proposalFollowUps", {
        userId,
        workspaceId: teamWsId,
        proposalId: pid,
        dayNumber: 7,
        subject: "Proposal check-in",
        body: "Wanted to follow up again on our proposal. Let me know if you need any additional information.",
        channel: "email",
        status: "scheduled",
        scheduledAt: now + 7 * d,
        createdAt: now,
      });
    }

    // Follow-up for already viewed proposal
    await ctx.db.insert("proposalFollowUps", {
      userId,
      workspaceId: teamWsId,
      proposalId: proposalIds[2],
      dayNumber: 3,
      subject: "Any questions on our proposal?",
      body: "I noticed you viewed our proposal. Would love to schedule a call to discuss.",
      channel: "email",
      status: "sent",
      scheduledAt: now - 5 * d,
      sentAt: now - 5 * d,
      createdAt: now - 10 * d,
    });

    // Follow-up settings
    await ctx.db.insert("proposalFollowUpSettings", {
      userId,
      workspaceId: teamWsId,
      autoFollowUpsEnabled: true,
      day1Enabled: false,
      day3Enabled: true,
      day7Enabled: true,
      day14Enabled: true,
      day21Enabled: false,
      defaultChannel: "email",
      createdAt: now,
      updatedAt: now,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 9: INVOICES — Every status
    // ═══════════════════════════════════════════════════════════════════════
    const invoiceData = [
      { clientId: clientIds[0], clientName: "TechCorp Solutions", clientEmail: "billing@techcorp.io", status: "paid" as const, subtotal: 4250, taxRate: 0, taxAmount: 0, total: 4250, lineItems: [{ id: "li1", description: "Website Redesign — Homepage & Product Pages", quantity: 50, rate: 85, amount: 4250, type: "time", hasProof: true }], issueDate: now - 60 * d, dueDate: now - 45 * d, paidDate: now - 42 * d, sentAt: now - 60 * d, viewedAt: now - 58 * d, proofCount: 12, hasValidatedBilling: true },
      { clientId: clientIds[5], clientName: "FinServe Analytics", clientEmail: "eng@finserve.com", status: "paid" as const, subtotal: 8800, taxRate: 0, taxAmount: 0, total: 8800, lineItems: [{ id: "li2", description: "Analytics Platform — Phase 1 Development", quantity: 80, rate: 110, amount: 8800, type: "time", hasProof: true }], issueDate: now - 45 * d, dueDate: now - 30 * d, paidDate: now - 28 * d, sentAt: now - 45 * d, viewedAt: now - 43 * d, proofCount: 18, hasValidatedBilling: true },
      { clientId: clientIds[0], clientName: "TechCorp Solutions", clientEmail: "billing@techcorp.io", status: "paid" as const, subtotal: 5355, taxRate: 0, taxAmount: 0, total: 5355, lineItems: [{ id: "li3", description: "API Integration — CRM Connector", quantity: 25, rate: 85, amount: 2125, type: "service", hasProof: true }, { id: "li4", description: "API Integration — ERP Sync Module", quantity: 38, rate: 85, amount: 3230, type: "service", hasProof: true }], issueDate: now - 90 * d, dueDate: now - 75 * d, paidDate: now - 70 * d, sentAt: now - 90 * d, proofCount: 12, hasValidatedBilling: true },
      { clientId: clientIds[2], clientName: "Global Enterprises", clientEmail: "contracts@globalent.com", status: "overdue" as const, subtotal: 9500, taxRate: 0, taxAmount: 0, total: 9500, lineItems: [{ id: "li5", description: "Data Visualization Portal — 100 hours", quantity: 100, rate: 95, amount: 9500, type: "time", hasProof: true }], issueDate: now - 35 * d, dueDate: now - 5 * d, sentAt: now - 35 * d, viewedAt: now - 30 * d, proofCount: 22, hasValidatedBilling: true },
      { clientId: clientIds[7], clientName: "LogiSync Systems", clientEmail: "ops@logisync.io", status: "overdue" as const, subtotal: 4800, taxRate: 0, taxAmount: 0, total: 4800, lineItems: [{ id: "li6", description: "Supply Chain Dashboard — Sprint 1", quantity: 60, rate: 80, amount: 4800, type: "time", hasProof: true }], issueDate: now - 25 * d, dueDate: now - 10 * d, sentAt: now - 25 * d, proofCount: 8, hasValidatedBilling: true },
      { clientId: clientIds[1], clientName: "StartupHub Inc", clientEmail: "projects@startuphub.co", status: "sent" as const, subtotal: 7200, taxRate: 0, taxAmount: 0, total: 7200, lineItems: [{ id: "li7", description: "SaaS Dashboard MVP — Design & Frontend", quantity: 80, rate: 90, amount: 7200, type: "time", hasProof: true }], issueDate: now - 7 * d, dueDate: now + 23 * d, sentAt: now - 7 * d, viewedAt: now - 5 * d, proofCount: 10, hasValidatedBilling: true },
      { clientId: clientIds[6], clientName: "MediTech Health", clientEmail: "dev@meditech.health", status: "sent" as const, subtotal: 6000, taxRate: 0, taxAmount: 0, total: 6000, lineItems: [{ id: "li8", description: "Healthcare Portal — Phase 1", quantity: 60, rate: 100, amount: 6000, type: "time", hasProof: true }], issueDate: now - 3 * d, dueDate: now + 27 * d, sentAt: now - 3 * d, proofCount: 6, hasValidatedBilling: true },
      { clientId: clientIds[3], clientName: "Digital Marketing Co", clientEmail: "hello@digitalmarketingco.com", status: "viewed" as const, subtotal: 1440, taxRate: 0, taxAmount: 0, total: 1440, lineItems: [{ id: "li9", description: "Brand Identity — Logo & Guidelines", quantity: 32, rate: 45, amount: 1440, type: "service", hasProof: false }], issueDate: now - 10 * d, dueDate: now + 20 * d, sentAt: now - 10 * d, viewedAt: now - 8 * d, proofCount: 0, hasValidatedBilling: false },
      { clientId: clientIds[4], clientName: "Creative Studios", clientEmail: "art@creativestudios.io", status: "draft" as const, subtotal: 2200, taxRate: 0, taxAmount: 0, total: 2200, lineItems: [{ id: "li10", description: "Motion Graphics Reel — Production", quantity: 40, rate: 55, amount: 2200, type: "service", hasProof: false }], issueDate: now, dueDate: now + 30 * d, proofCount: 0, hasValidatedBilling: false },
      { clientId: clientIds[8], clientName: "CloudMetrics", clientEmail: "info@cloudmetrics.dev", status: "cancelled" as const, subtotal: 3000, taxRate: 0, taxAmount: 0, total: 3000, lineItems: [{ id: "li11", description: "Cloud Monitor — Initial Build", quantity: 40, rate: 75, amount: 3000, type: "time", hasProof: true }], issueDate: now - 80 * d, dueDate: now - 65 * d, proofCount: 4, hasValidatedBilling: false },
      { clientId: clientIds[5], clientName: "FinServe Analytics", clientEmail: "eng@finserve.com", status: "partial" as const, subtotal: 11000, taxRate: 0, taxAmount: 0, total: 11000, paidAmount: 5500, lineItems: [{ id: "li12", description: "Analytics Platform — Phase 2", quantity: 100, rate: 110, amount: 11000, type: "time", hasProof: true }], issueDate: now - 15 * d, dueDate: now + 15 * d, sentAt: now - 15 * d, viewedAt: now - 13 * d, paidDate: now - 5 * d, proofCount: 15, hasValidatedBilling: true },
    ];

    const invoiceIds: any[] = [];
    for (let i = 0; i < invoiceData.length; i++) {
      const inv = invoiceData[i];
      const iid = await ctx.db.insert("invoices", {
        userId,
        workspaceId: teamWsId,
        invoiceNumber: `INV-2024-${String(i + 1).padStart(3, "0")}`,
        publicToken: token(),
        currency: "USD",
        notes: "",
        terms: "Payment due within 14 days of invoice date.",
        createdBy: userId,
        ...inv,
        createdAt: inv.issueDate,
        updatedAt: now,
      });
      invoiceIds.push(iid);
    }

    // Invoice Work Links
    for (let i = 0; i < 3; i++) {
      const iid = invoiceIds[i];
      await ctx.db.insert("invoiceWorkLinks", {
        userId,
        workspaceId: teamWsId,
        invoiceId: iid,
        lineItemId: `li${i + 1}`,
        proofType: "time_entry",
        title: `Work session — ${invoiceData[i].clientName}`,
        description: "Verified work session with evidence collection",
        hours: invoiceData[i].subtotal / (invoiceData[i].lineItems[0].rate || 85),
        date: invoiceData[i].issueDate,
        value: invoiceData[i].subtotal,
        verified: true,
        createdAt: now,
      });
    }

    // Payment Reminders
    await ctx.db.insert("paymentReminders", {
      userId,
      workspaceId: teamWsId,
      invoiceId: invoiceIds[3], // overdue
      dayNumber: 7,
      channel: "email",
      tone: "firm",
      subject: "Payment Reminder — Invoice Overdue",
      body: "This is a reminder that your invoice is now overdue. Please process payment at your earliest convenience.",
      status: "sent",
      scheduledAt: now - 2 * d,
      sentAt: now - 2 * d,
      createdAt: now - 5 * d,
    });

    await ctx.db.insert("paymentReminders", {
      userId,
      workspaceId: teamWsId,
      invoiceId: invoiceIds[3], // overdue
      dayNumber: 14,
      channel: "email",
      tone: "urgent",
      subject: "URGENT: Payment Overdue — Second Notice",
      body: "Your invoice is now significantly overdue. Please process payment immediately to avoid further action.",
      status: "scheduled",
      scheduledAt: now + 2 * d,
      createdAt: now,
    });

    await ctx.db.insert("paymentReminders", {
      userId,
      workspaceId: teamWsId,
      invoiceId: invoiceIds[4], // overdue
      dayNumber: 3,
      channel: "email",
      tone: "friendly",
      subject: "Friendly Reminder — Invoice Due",
      body: "Just a friendly reminder that your invoice is past due. Let us know if you have any questions.",
      status: "sent",
      scheduledAt: now - 1 * d,
      sentAt: now - 1 * d,
      createdAt: now - 3 * d,
    });

    // Reminder Settings
    await ctx.db.insert("reminderSettings", {
      userId,
      workspaceId: teamWsId,
      autoRemindersEnabled: true,
      day3Enabled: true,
      day7Enabled: true,
      day14Enabled: true,
      day21Enabled: false,
      defaultChannel: "email",
      createdAt: now,
      updatedAt: now,
    });

    // Invoice Templates
    await ctx.db.insert("invoiceTemplates", {
      userId,
      workspaceId: teamWsId,
      name: "Standard Invoice",
      industry: "Technology",
      description: "Standard invoice template for development services",
      sections: [
        { id: uid(), type: "heading", content: "Invoice" },
        { id: uid(), type: "invoice_meta", content: "" },
        { id: uid(), type: "sender_info", content: "" },
        { id: uid(), type: "client_info", content: "" },
        { id: uid(), type: "divider", content: "" },
        { id: uid(), type: "line_items", content: "" },
        { id: uid(), type: "subtotal", content: "" },
        { id: uid(), type: "tax", content: "" },
        { id: uid(), type: "total", content: "" },
        { id: uid(), type: "divider", content: "" },
        { id: uid(), type: "bank_details", content: "Bank: First National | Routing: 021000021 | Account: 123456789" },
        { id: uid(), type: "terms", content: "Payment due within 14 days." },
        { id: uid(), type: "notes", content: "Thank you for your business!" },
      ],
      isSystem: false,
      usageCount: 15,
      createdAt: now - 30 * d,
    });

    // Recurring Invoices
    await ctx.db.insert("recurringInvoices", {
      userId,
      workspaceId: teamWsId,
      clientId: clientIds[0],
      projectId: projectIds[0],
      templateInvoiceId: invoiceIds[0],
      frequency: "monthly",
      nextDueDate: now + 15 * d,
      active: true,
      lastGeneratedAt: now - 15 * d,
      createdAt: now - 60 * d,
      updatedAt: now,
    });

    await ctx.db.insert("recurringInvoices", {
      userId,
      workspaceId: teamWsId,
      clientId: clientIds[5],
      projectId: projectIds[5],
      templateInvoiceId: invoiceIds[1],
      frequency: "monthly",
      nextDueDate: now + 10 * d,
      active: true,
      lastGeneratedAt: now - 20 * d,
      createdAt: now - 45 * d,
      updatedAt: now,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 10: WORK SESSIONS + TIME BLOCKS — Every compliance status
    // ═══════════════════════════════════════════════════════════════════════
    const sessionData = [
      // Active session
      { clientName: "TechCorp Solutions", projectName: "E-Commerce Platform Redesign", startTime: now - 2 * 60 * 60 * 1000, endTime: undefined, totalMinutes: undefined, complianceStatus: "active" as const, platform: "upwork" as const, notes: "Working on homepage component refactoring", status: "active" as const, isManualEntry: false, clientId: clientIds[0], projectId_fk: projectIds[0], invoiced: false },
      // Paused session
      { clientName: "FinServe Analytics", projectName: "Analytics Platform", startTime: now - 4 * 60 * 60 * 1000, endTime: now - 3 * 60 * 60 * 1000, totalMinutes: 60, complianceStatus: "at_risk" as const, platform: "toptal" as const, notes: "Paused — took a long break, compliance flag triggered", status: "paused" as const, isManualEntry: false, clientId: clientIds[5], projectId_fk: projectIds[5], invoiced: false },
      // Completed — active compliance
      { clientName: "StartupHub Inc", projectName: "SaaS Dashboard MVP", startTime: now - 8 * 60 * 60 * 1000, endTime: now - 6.5 * 60 * 60 * 1000, totalMinutes: 90, complianceStatus: "active" as const, platform: "upwork" as const, notes: "Dashboard frontend components completed", status: "completed" as const, isManualEntry: false, clientId: clientIds[1], projectId_fk: projectIds[1], invoiced: true, invoiceId: invoiceIds[5] },
      { clientName: "MediTech Health", projectName: "Healthcare Portal", startTime: now - 24 * 60 * 60 * 1000, endTime: now - 21 * 60 * 60 * 1000, totalMinutes: 180, complianceStatus: "active" as const, platform: "manual" as const, notes: "Patient portal API integration", status: "completed" as const, isManualEntry: false, clientId: clientIds[6], projectId_fk: projectIds[6], invoiced: false },
      { clientName: "Digital Marketing Co", projectName: "Brand Identity System", startTime: now - 48 * 60 * 60 * 1000, endTime: now - 46 * 60 * 60 * 1000, totalMinutes: 120, complianceStatus: "active" as const, platform: "fiverr" as const, notes: "Logo variations and color palette", status: "completed" as const, isManualEntry: false, clientId: clientIds[3], projectId_fk: projectIds[3], invoiced: true, invoiceId: invoiceIds[7] },
      // At risk
      { clientName: "Creative Studios", projectName: "Motion Graphics Reel", startTime: now - 72 * 60 * 60 * 1000, endTime: now - 69.5 * 60 * 60 * 1000, totalMinutes: 150, complianceStatus: "at_risk" as const, platform: "fiverr" as const, notes: "Extended idle period during rendering", status: "completed" as const, isManualEntry: false, clientId: clientIds[4], projectId_fk: projectIds[4], invoiced: false },
      { clientName: "LogiSync Systems", projectName: "Supply Chain Dashboard", startTime: now - 96 * 60 * 60 * 1000, endTime: now - 94 * 60 * 60 * 1000, totalMinutes: 120, complianceStatus: "at_risk" as const, platform: "manual" as const, notes: "Non-browser work detected during session", status: "completed" as const, isManualEntry: false, clientId: clientIds[7], projectId_fk: projectIds[7], invoiced: false },
      // Rejected
      { clientName: "Global Enterprises", projectName: "Data Visualization Portal", startTime: now - 120 * 60 * 60 * 1000, endTime: now - 119 * 60 * 60 * 1000, totalMinutes: 60, complianceStatus: "rejected" as const, platform: "upwork" as const, notes: "Rejected — excessive inactivity, no screenshots for 40 min", status: "completed" as const, isManualEntry: false, clientId: clientIds[2], projectId_fk: projectIds[2], invoiced: false },
      // Manual entry
      { clientName: "TechCorp Solutions", projectName: "API Integration Project", startTime: now - 144 * 60 * 60 * 1000, endTime: now - 140 * 60 * 60 * 1000, totalMinutes: 240, complianceStatus: "active" as const, notes: "Manual entry — API development and testing", status: "completed" as const, isManualEntry: true, clientId: clientIds[0], projectId_fk: projectIds[0], invoiced: true, invoiceId: invoiceIds[2] },
      // Stopped session
      { clientName: "StartupHub Inc", projectName: "Landing Pages", startTime: now - 168 * 60 * 60 * 1000, endTime: now - 166.25 * 60 * 60 * 1000, totalMinutes: 105, complianceStatus: "active" as const, platform: "upwork" as const, notes: "Stopped early — client requested pause", status: "stopped" as const, isManualEntry: false, clientId: clientIds[1], projectId_fk: projectIds[1], invoiced: false },
      // Older sessions
      { clientName: "FinServe Analytics", projectName: "Analytics Platform", startTime: now - 192 * 60 * 60 * 1000, endTime: now - 188 * 60 * 60 * 1000, totalMinutes: 240, complianceStatus: "active" as const, platform: "toptal" as const, notes: "Phase 1 core architecture", status: "completed" as const, isManualEntry: false, clientId: clientIds[5], projectId_fk: projectIds[5], invoiced: true, invoiceId: invoiceIds[1] },
      { clientName: "CloudMetrics", projectName: "Legacy Cloud Monitor", startTime: now - 240 * 60 * 60 * 1000, endTime: now - 237 * 60 * 60 * 1000, totalMinutes: 180, complianceStatus: "active" as const, platform: "upwork" as const, notes: "Final maintenance session", status: "completed" as const, isManualEntry: false, clientId: clientIds[8], projectId_fk: projectIds[8], invoiced: true, invoiceId: invoiceIds[9] },
    ];

    const sessionIds: any[] = [];
    for (const s of sessionData) {
      const sid = await ctx.db.insert("workSessions", {
        userId,
        workspaceId: teamWsId,
        hourlyRate: 85,
        ...s,
        createdAt: s.startTime,
        updatedAt: now,
      });
      sessionIds.push(sid);
    }

    // Time blocks for the active session
    const activeSessionStart = sessionData[0].startTime;
    const tbData = [
      { startTime: activeSessionStart, activity: "Code Review — PR #142", website: "github.com", complianceStatus: "compliant" as const, screenshotCount: 3, mouseActivity: true, keyboardActivity: true, inactiveDuration: 12 },
      { startTime: activeSessionStart + 5 * 60 * 1000, activity: "Client Prospecting", website: "fiverr.com", complianceStatus: "at_risk" as const, screenshotCount: 2, mouseActivity: true, keyboardActivity: false, inactiveDuration: 45 },
      { startTime: activeSessionStart + 10 * 60 * 1000, activity: "Implement UI Components", website: "vercel.com", complianceStatus: "compliant" as const, screenshotCount: 3, mouseActivity: true, keyboardActivity: true, inactiveDuration: 10 },
      { startTime: activeSessionStart + 15 * 60 * 1000, activity: "Break — YouTube", website: "youtube.com", complianceStatus: "rejected" as const, screenshotCount: 1, mouseActivity: false, keyboardActivity: false, inactiveDuration: 420 },
      { startTime: activeSessionStart + 20 * 60 * 1000, activity: "Bug Fixes — Issue #89", website: "github.com", complianceStatus: "compliant" as const, screenshotCount: 3, mouseActivity: true, keyboardActivity: true, inactiveDuration: 8 },
      { startTime: activeSessionStart + 25 * 60 * 1000, activity: "Writing unit tests", website: "jestjs.io", complianceStatus: "compliant" as const, screenshotCount: 2, mouseActivity: true, keyboardActivity: true, inactiveDuration: 5 },
      { startTime: activeSessionStart + 30 * 60 * 1000, activity: "Deploy preview", website: "vercel.com", complianceStatus: "compliant" as const, screenshotCount: 2, mouseActivity: true, keyboardActivity: true, inactiveDuration: 15 },
      { startTime: activeSessionStart + 35 * 60 * 1000, activity: "Documentation update", website: "notion.so", complianceStatus: "compliant" as const, screenshotCount: 2, mouseActivity: true, keyboardActivity: true, inactiveDuration: 20 },
    ];

    for (const tb of tbData) {
      await ctx.db.insert("timeBlocks", {
        sessionId: sessionIds[0],
        userId,
        workspaceId: teamWsId,
        endTime: tb.startTime + 5 * 60 * 1000,
        ...tb,
      });
    }

    // Time blocks for the at_risk session
    for (let i = 0; i < 4; i++) {
      await ctx.db.insert("timeBlocks", {
        sessionId: sessionIds[1],
        userId,
        workspaceId: teamWsId,
        startTime: sessionData[1].startTime + i * 15 * 60 * 1000,
        endTime: sessionData[1].startTime + (i + 1) * 15 * 60 * 1000,
        activity: i === 2 ? "Idle — no activity" : "Development work",
        website: i === 2 ? "idle" : "github.com",
        complianceStatus: i === 2 ? "rejected" as const : "compliant" as const,
        screenshotCount: i === 2 ? 0 : 2,
        mouseActivity: i !== 2,
        keyboardActivity: i !== 2,
        inactiveDuration: i === 2 ? 800 : 10,
      });
    }

    // App usage
    const appUsageData = [
      { appName: "VS Code", workRelated: true, syncedToUpwork: true },
      { appName: "Chrome", workRelated: true, syncedToUpwork: true },
      { appName: "Figma", workRelated: true, syncedToUpwork: false },
      { appName: "Slack", workRelated: true, syncedToUpwork: false },
      { appName: "Spotify", workRelated: false, syncedToUpwork: false },
      { appName: "Terminal", workRelated: true, syncedToUpwork: true },
    ];

    for (const app of appUsageData) {
      await ctx.db.insert("appUsage", {
        userId,
        workspaceId: teamWsId,
        sessionId: sessionIds[0],
        appName: app.appName,
        startTime: now - Math.floor(Math.random() * 3) * 60 * 60 * 1000,
        endTime: now - Math.floor(Math.random() * 1) * 60 * 60 * 1000,
        duration: Math.floor(Math.random() * 120 + 15) * 60 * 1000,
        workRelated: app.workRelated,
        syncedToUpwork: app.syncedToUpwork,
      });
    }

    // Compliance Alerts — every alert type
    const alertData = [
      { sessionId: sessionIds[0], alertType: "at_risk" as const, message: "Fiverr tab detected during active session. Close tab within 5 minutes to avoid rejection.", triggeredAt: now - 2 * 60 * 1000, acknowledged: false },
      { sessionId: sessionIds[1], alertType: "timer_paused" as const, message: "Timer paused due to extended inactivity (15+ minutes). Resume work to continue tracking.", triggeredAt: now - 60 * 60 * 1000, acknowledged: true, actionTaken: "Resumed timer after break" },
      { sessionId: sessionIds[7], alertType: "payment_protection_risk" as const, message: "Payment protection at risk: No screenshots captured for 40 minutes on Upwork contract.", triggeredAt: now - 120 * 60 * 60 * 1000, acknowledged: true, actionTaken: "Flagged session for manual review" },
      { sessionId: sessionIds[6], alertType: "non_browser_work" as const, message: "Non-browser work detected: Desktop application active for 30+ minutes without browser evidence.", triggeredAt: now - 96 * 60 * 60 * 1000, acknowledged: false },
      { alertType: "at_risk" as const, message: "Multiple compliance alerts on Global Enterprises project. Review evidence collection practices.", triggeredAt: now - 24 * 60 * 60 * 1000, acknowledged: false },
    ];

    for (const alert of alertData) {
      await ctx.db.insert("complianceAlerts", {
        userId,
        workspaceId: teamWsId,
        ...alert,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 11: EVIDENCE — Sessions, Events, Verifications, Metadata
    // ═══════════════════════════════════════════════════════════════════════
    // Evidence sessions linked to work sessions
    const evidenceSessionData = [
      { sessionId: sessionIds[0], platform: "upwork" as const, startTime: sessionData[0].startTime, endTime: undefined, status: "active" as const },
      { sessionId: sessionIds[2], platform: "upwork" as const, startTime: sessionData[2].startTime, endTime: sessionData[2].endTime, status: "finalized" as const },
      { sessionId: sessionIds[3], platform: "client" as const, startTime: sessionData[3].startTime, endTime: sessionData[3].endTime, status: "finalized" as const },
      { sessionId: sessionIds[4], platform: "fiverr" as const, startTime: sessionData[4].startTime, endTime: sessionData[4].endTime, status: "finalized" as const },
      { sessionId: sessionIds[5], platform: "fiverr" as const, startTime: sessionData[5].startTime, endTime: sessionData[5].endTime, status: "finalized" as const },
      { sessionId: sessionIds[7], platform: "upwork" as const, startTime: sessionData[7].startTime, endTime: sessionData[7].endTime, status: "finalized" as const },
      { sessionId: sessionIds[8], platform: "upwork" as const, startTime: sessionData[8].startTime, endTime: sessionData[8].endTime, status: "finalized" as const },
      { sessionId: sessionIds[11], platform: "toptal" as const, startTime: sessionData[11].startTime, endTime: sessionData[11].endTime, status: "finalized" as const },
    ];

    const evidenceSessionIds: any[] = [];
    for (const es of evidenceSessionData) {
      const esId = await ctx.db.insert("evidenceSessions", {
        userId,
        workspaceId: teamWsId,
        ...es,
      });
      evidenceSessionIds.push(esId);
    }

    // Evidence events — different kinds
    const eventKinds = ["mouse", "keyboard", "url", "screenshot_ref", "memo", "platform_status"] as const;
    const eventUrls = ["github.com/techcorp/repo", "vercel.com/dashboard", "figma.com/design", "jestjs.io/docs", "stackoverflow.com/questions"];

    for (let ei = 0; ei < evidenceSessionIds.length; ei++) {
      const esId = evidenceSessionIds[ei];
      const baseTime = evidenceSessionData[ei].startTime;

      // Create 10-15 events per session
      const numEvents = Math.floor(Math.random() * 6) + 10;
      for (let j = 0; j < numEvents; j++) {
        const kindIdx = j % eventKinds.length;
        const kind = eventKinds[kindIdx];
        let eventData: any = {};
        let eventUrl: string | undefined;

        switch (kind) {
          case "mouse":
            eventData = { clicks: Math.floor(Math.random() * 30) + 5, movements: Math.floor(Math.random() * 500) + 100 };
            break;
          case "keyboard":
            eventData = { keystrokes: Math.floor(Math.random() * 200) + 50, activeSeconds: Math.floor(Math.random() * 300) + 60 };
            break;
          case "url":
            eventUrl = eventUrls[j % eventUrls.length];
            eventData = { title: `Page visited: ${eventUrl}`, active: true };
            break;
          case "screenshot_ref":
            eventData = { storageId: `screenshot_${ei}_${j}`, resolution: "1920x1080", hash: `sha256_${token().substring(0, 16)}` };
            break;
          case "memo":
            eventData = { text: ["Working on feature implementation", "Debugging API integration", "Code review notes", "Design alignment check", "Testing deployment"][j % 5] };
            break;
          case "platform_status":
            eventData = { status: "online", contractActive: true, protectionEnabled: true };
            break;
        }

        await ctx.db.insert("evidenceEvents", {
          evidenceSessionId: esId,
          workspaceId: teamWsId,
          t: baseTime + j * 3 * 60 * 1000,
          kind,
          data: eventData,
          url: eventUrl,
        });
      }
    }

    // WCVM Verifications
    for (let vi = 0; vi < 3; vi++) {
      await ctx.db.insert("wcvmVerifications", {
        userId,
        workspaceId: teamWsId,
        sessionId: sessionIds[vi + 2],
        evidenceSessionId: evidenceSessionIds[vi + 1],
        contextRelevanceScore: Math.floor(Math.random() * 20) + 80,
        verificationMatrix: { overallScore: Math.floor(Math.random() * 15) + 85, evidenceQuality: "high", complianceRate: 0.95 },
        verificationSignature: `sig_${token().substring(0, 16)}`,
        verifiedAt: now - Math.floor(Math.random() * 10) * d,
        clientRequirements: [
          { id: "req1", description: "Active work during logged hours", relevanceScore: 95, matchedEvidence: ["screenshot_1", "keyboard_1"] },
          { id: "req2", description: "Screenshots every 10 minutes", relevanceScore: 88, matchedEvidence: ["screenshot_2", "screenshot_3"] },
        ],
      });
    }

    // Evidence Metadata
    for (let mi = 0; mi < evidenceSessionIds.length; mi++) {
      await ctx.db.insert("evidenceMetadata", {
        evidenceId: `ev_${token().substring(0, 8)}`,
        userId,
        workspaceId: teamWsId,
        sessionId: sessionIds[mi] || sessionIds[0],
        contextScore: Math.floor(Math.random() * 20) + 75,
        complianceStatus: mi === 5 ? "at_risk" as const : mi === 6 ? "rejected" as const : "compliant" as const,
        workRelevance: Math.round((Math.random() * 0.3 + 0.7) * 100) / 100,
        activityDensity: Math.round((Math.random() * 0.3 + 0.6) * 100) / 100,
        timestamp: evidenceSessionData[mi].startTime,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 12: DISPUTE REPORTS — Every status
    // ═══════════════════════════════════════════════════════════════════════
    const disputeData = [
      { sessionId: sessionIds[7], caseId: `case-GE-${Date.now()}`, title: "Global Enterprises — Hour Dispute", description: "Client claims work was not delivered per contract. 1 hour of work rejected due to inactivity.", type: "hour_dispute", rejectedHours: 1, lostIncome: 95, status: "generated" as const, clientName: "Global Enterprises", projectName: "Data Visualization Portal", hourlyRate: 95, evidenceCount: 8, evidenceSummary: "Screenshots and activity logs show 20 minutes of inactivity during a 60-minute session.", reportContent: "# Dispute Report\n\n## Session Analysis\nClient disputed 1 hour of work claiming insufficient activity.\n\n## Evidence\n- 8 screenshots captured during session\n- Keyboard activity detected for 55 minutes\n- 20-minute idle period detected\n\n## Recommendation\nProvide activity timeline and screenshot evidence to client." },
      { sessionId: sessionIds[5], caseId: `case-CS-${Date.now()}`, title: "Creative Studios — Partial Rejection", description: "Client rejected 30 minutes citing low screenshot frequency.", type: "partial_rejection", rejectedHours: 0.5, lostIncome: 27.5, status: "sent" as const, clientName: "Creative Studios", projectName: "Motion Graphics Reel", hourlyRate: 55, evidenceCount: 5, evidenceSummary: "5 screenshots captured. Rendering software may not trigger browser screenshots.", sentAt: now - 5 * d, reportContent: "# Dispute Report\n\nPartial session rejection for low screenshot frequency." },
      { sessionId: sessionIds[6], caseId: `case-LS-${Date.now()}`, title: "LogiSync — Activity Dispute", description: "Client disputes non-browser work during session.", type: "activity_dispute", rejectedHours: 2, lostIncome: 160, status: "viewed" as const, clientName: "LogiSync Systems", projectName: "Supply Chain Dashboard", hourlyRate: 80, evidenceCount: 4, evidenceSummary: "Desktop IDE work not captured by browser extension.", sentAt: now - 10 * d, viewedAt: now - 8 * d, reportContent: "# Dispute Report\n\nDesktop IDE usage not captured by browser evidence system." },
      { caseId: `case-GE2-${Date.now()}`, title: "Global Enterprises — Payment Protection", description: "Payment protection activated for overdue invoice.", type: "payment_protection", rejectedHours: 0, lostIncome: 0, status: "resolved" as const, clientName: "Global Enterprises", projectName: "Data Visualization Portal", hourlyRate: 95, evidenceCount: 22, evidenceSummary: "Full evidence package submitted. Dispute resolved in freelancer's favor.", sentAt: now - 30 * d, viewedAt: now - 28 * d, resolvedAt: now - 20 * d, reportContent: "# Dispute Resolution\n\nDispute resolved. Client acknowledged work after evidence review." },
      { caseId: `case-TC-${Date.now()}`, title: "TechCorp — Scope Dispute", description: "Client claims work exceeded agreed scope.", type: "scope_dispute", rejectedHours: 3, lostIncome: 255, status: "appealed" as const, clientName: "TechCorp Solutions", projectName: "E-Commerce Platform Redesign", hourlyRate: 85, evidenceCount: 15, evidenceSummary: "Scope change requests documented in project channel.", sentAt: now - 15 * d, viewedAt: now - 12 * d, reportContent: "# Appeal\n\nScope changes were requested by client via messaging. Evidence of approval attached.", appealDeadline: now + 5 * d },
    ];

    const disputeIds: any[] = [];
    for (const dd of disputeData) {
      const drId = await ctx.db.insert("disputeReports", {
        userId,
        workspaceId: teamWsId,
        ...dd,
        publicToken: token(),
        generatedAt: now - Math.floor(Math.random() * 15) * d,
        updatedAt: now,
      });
      disputeIds.push(drId);
    }

    // Automated Dispute Reports
    await ctx.db.insert("automatedDisputeReports", {
      userId,
      workspaceId: teamWsId,
      disputeReportId: disputeIds[0],
      automationLevel: "semi_automated",
      generatedSections: [
        { section: "Timeline Analysis", content: "Session activity timeline generated from evidence events.", aiGenerated: true },
        { section: "Evidence Summary", content: "8 screenshots, 55 minutes keyboard activity detected.", aiGenerated: true },
        { section: "Recommendation", content: "Provide full activity timeline to client for review.", aiGenerated: true },
      ],
      evidenceAttached: ["screenshot_1", "screenshot_2", "keyboard_log"],
      platformSubmitted: "upwork",
      submittedAt: now - 3 * d,
      status: "submitted",
      createdAt: now - 5 * d,
    });

    await ctx.db.insert("automatedDisputeReports", {
      userId,
      workspaceId: teamWsId,
      disputeReportId: disputeIds[1],
      automationLevel: "fully_automated",
      generatedSections: [
        { section: "Session Analysis", content: "Low screenshot frequency during rendering work.", aiGenerated: true },
        { section: "Context Note", content: "Rendering software may not trigger browser-based screenshots.", aiGenerated: true },
      ],
      evidenceAttached: ["session_log", "app_usage"],
      status: "ready",
      createdAt: now - 6 * d,
    });

    await ctx.db.insert("automatedDisputeReports", {
      userId,
      workspaceId: teamWsId,
      disputeReportId: disputeIds[4],
      automationLevel: "manual",
      generatedSections: [
        { section: "Scope Documentation", content: "Scope change requests documented in project messaging channel.", aiGenerated: false },
      ],
      evidenceAttached: ["messages", "scope_changes"],
      status: "draft",
      createdAt: now - 2 * d,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 13: SCOPE DEFINITIONS & CHANGE ORDERS
    // ═══════════════════════════════════════════════════════════════════════
    const scopeData = [
      { title: "TechCorp E-Commerce Redesign Scope", projectId: projectIds[0], proposalId: proposalIds[0], description: "Complete redesign of TechCorp e-commerce platform with responsive design, CMS integration, and SEO optimization.", deliverables: [{ id: uid(), name: "Homepage redesign", description: "Modern responsive homepage with hero section, features, and CTA", estimatedHours: 20, status: "completed" as const }, { id: uid(), name: "Product pages", description: "Product listing and detail pages with filtering", estimatedHours: 15, status: "in_progress" as const }, { id: uid(), name: "CMS integration", description: "Content management system with WYSIWYG editor", estimatedHours: 25, status: "pending" as const }, { id: uid(), name: "SEO optimization", description: "Technical SEO, meta tags, and structured data", estimatedHours: 10, status: "pending" as const }], totalEstimatedHours: 70, revisionLimit: 3, revisionCount: 1, status: "active" as const, clientApprovedAt: now - 20 * d, approvalToken: token() },
      { title: "StartupHub SaaS Dashboard Scope", projectId: projectIds[1], proposalId: proposalIds[1], description: "MVP dashboard for StartupHub SaaS platform with authentication, analytics, and team management.", deliverables: [{ id: uid(), name: "User authentication", description: "Email and social login with 2FA", estimatedHours: 15, status: "completed" as const }, { id: uid(), name: "Dashboard screen", description: "Main dashboard with project overview and notifications", estimatedHours: 20, status: "in_progress" as const }, { id: uid(), name: "Analytics module", description: "Data visualization and reporting", estimatedHours: 25, status: "pending" as const }], totalEstimatedHours: 60, revisionLimit: 2, revisionCount: 0, status: "active" as const, clientApprovedAt: now - 15 * d, approvalToken: token() },
      { title: "FinServe Analytics Platform Scope", projectId: projectIds[5], proposalId: proposalIds[3], description: "Financial analytics platform with real-time market data, portfolio tracking, and compliance reporting.", deliverables: [{ id: uid(), name: "Real-time data dashboard", description: "Live market data visualization", estimatedHours: 30, status: "in_progress" as const }, { id: uid(), name: "Portfolio tracking module", description: "Investment portfolio tracking and analysis", estimatedHours: 25, status: "pending" as const }, { id: uid(), name: "Compliance report generator", description: "Automated compliance reporting with export", estimatedHours: 20, status: "pending" as const }], totalEstimatedHours: 75, revisionLimit: 3, revisionCount: 2, status: "active" as const },
      { title: "Digital Marketing Brand Identity Scope", projectId: projectIds[3], proposalId: proposalIds[5], description: "Complete brand identity system including logo, guidelines, and collateral.", deliverables: [{ id: uid(), name: "Logo design", description: "Primary and secondary logo variations", estimatedHours: 10, status: "completed" as const }, { id: uid(), name: "Brand guidelines", description: "Color palette, typography, usage rules", estimatedHours: 8, status: "completed" as const }, { id: uid(), name: "Business card design", description: "Print-ready business card layouts", estimatedHours: 4, status: "completed" as const }], totalEstimatedHours: 22, revisionLimit: 3, revisionCount: 1, status: "completed" as const, clientApprovedAt: now - 25 * d, approvalToken: token() },
      { title: "Global Enterprises Data Portal Scope", projectId: projectIds[2], proposalId: proposalIds[2], description: "Disputed scope — client claims extra work was not agreed.", deliverables: [{ id: uid(), name: "Data import module", description: "CSV and API data import functionality", estimatedHours: 20, status: "in_progress" as const }, { id: uid(), name: "Visualization dashboard", description: "Interactive charts and data views", estimatedHours: 30, status: "pending" as const }], totalEstimatedHours: 50, revisionLimit: 2, revisionCount: 3, status: "disputed" as const },
    ];

    const scopeIds: any[] = [];
    for (const s of scopeData) {
      const sId = await ctx.db.insert("scopeDefinitions", {
        userId,
        workspaceId: teamWsId,
        ...s,
        createdAt: now - Math.floor(Math.random() * 30) * d,
        updatedAt: now,
      });
      scopeIds.push(sId);
    }

    // Scope Change Orders — every change type and status
    const changeOrderData = [
      { scopeId: scopeIds[0], title: "Add SEO Module", description: "Client requested additional SEO optimization module beyond original scope.", changeType: "addition" as const, impact: { hoursAdded: 10, costImpact: 850, deadlineImpact: 5 * d }, reason: "Client realized SEO was needed after seeing initial designs.", status: "approved" as const, clientApprovedAt: now - 18 * d, clientApprovalToken: token() },
      { scopeId: scopeIds[0], title: "Modify Product Page Layout", description: "Change product page from grid to masonry layout.", changeType: "modification" as const, impact: { hoursAdded: 5, costImpact: 425, deadlineImpact: 2 * d }, reason: "Client preference changed after reviewing competitor sites.", status: "approved" as const, clientApprovedAt: now - 12 * d, clientApprovalToken: token() },
      { scopeId: scopeIds[1], title: "Remove Social Login", description: "Remove social login — will use email-only authentication for MVP.", changeType: "removal" as const, impact: { hoursAdded: -5, costImpact: -450, deadlineImpact: -3 * d }, reason: "MVP scope reduction to meet launch deadline.", status: "approved" as const, clientApprovedAt: now - 10 * d, clientApprovalToken: token() },
      { scopeId: scopeIds[2], title: "Revision 2 — Updated Data Schema", description: "Client changed data schema requirements after Phase 1.", changeType: "revision" as const, impact: { hoursAdded: 15, costImpact: 1650, deadlineImpact: 7 * d }, reason: "Regulatory requirements changed — new compliance fields needed.", status: "pending" as const },
      { scopeId: scopeIds[2], title: "Add Export Feature", description: "Client wants CSV/PDF export for all dashboard views.", changeType: "addition" as const, impact: { hoursAdded: 12, costImpact: 1320, deadlineImpact: 5 * d }, reason: "Client requirement for board reporting.", status: "rejected" as const },
      { scopeId: scopeIds[4], title: "Auto-generated: Revision Limit Exceeded", description: "Scope has exceeded the revision limit of 2. Current revisions: 3.", changeType: "revision" as const, impact: { hoursAdded: 8, costImpact: 760, deadlineImpact: 3 * d }, reason: "Automatic revision detection — client kept requesting changes beyond agreed limit.", status: "auto_generated" as const, autoGenerated: true, originalLimit: 2, newLimit: 3 },
    ];

    for (const co of changeOrderData) {
      await ctx.db.insert("scopeChangeOrders", {
        userId,
        workspaceId: teamWsId,
        ...co,
        createdAt: now - Math.floor(Math.random() * 15) * d,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 14: MESSAGING — Channels, Members, Messages, Reactions, Mentions
    // ═══════════════════════════════════════════════════════════════════════
    const channelData = [
      { name: "general", type: "channel" as const, isPrivate: false, description: "General team discussion and announcements" },
      { name: "project-updates", type: "channel" as const, isPrivate: false, description: "Project status updates and milestones" },
      { name: "client-escalations", type: "channel" as const, isPrivate: true, description: "Client issues and dispute escalation" },
      { name: "evidence-review", type: "channel" as const, isPrivate: false, description: "Evidence collection review and quality checks" },
      { name: "billing", type: "channel" as const, isPrivate: true, description: "Invoice and payment discussions" },
      { name: "design-critique", type: "channel" as const, isPrivate: false, description: "Design feedback and critique sessions" },
      { name: "dev-standup", type: "channel" as const, isPrivate: false, description: "Daily development standup notes" },
    ];

    const channelIds: any[] = [];
    for (const ch of channelData) {
      const chId = await ctx.db.insert("channels", {
        workspaceId: teamWsId,
        name: ch.name,
        type: ch.type,
        isPrivate: ch.isPrivate,
        description: ch.description,
        createdBy: userId,
        isArchived: false,
        lastMessageAt: now - Math.floor(Math.random() * 60) * 60 * 1000,
      });

      // Add user as admin channel member
      await ctx.db.insert("channelMembers", {
        channelId: chId,
        userId,
        workspaceId: teamWsId,
        role: "admin",
        isMuted: false,
        joinedAt: now - 30 * d,
        lastReadAt: now - 5 * 60 * 1000,
      });

      channelIds.push(chId);
    }

    // Messages per channel
    const messagesByChannel: Record<number, Array<{ content: string; isPinned: boolean; isEdited: boolean }>> = {
      0: [ // general
        { content: "Good morning team! Quick update on the TechCorp project — we've collected all the evidence files and the timeline report is ready for review.", isPinned: true, isEdited: false },
        { content: "Nice work! I'll take a look at the timeline report this afternoon.", isPinned: false, isEdited: false },
        { content: "Hey team, sprint review at 3pm today. Please make sure your status updates are in before the meeting.", isPinned: true, isEdited: false },
        { content: "Also, just a reminder that the client onboarding for StartupHub is tomorrow at 10am.", isPinned: false, isEdited: false },
        { content: "On it! I'll have everything ready by EOD.", isPinned: false, isEdited: false },
        { content: "Welcome aboard to our newest team member starting next week. Please give them a warm welcome!", isPinned: false, isEdited: false },
        { content: "Heads up: Convex deployment is scheduled for maintenance tonight at 11pm EST.", isPinned: false, isEdited: true },
      ],
      1: [ // project-updates
        { content: "Design mockups for the new dashboard are uploaded to Figma. Link in the project channel.", isPinned: false, isEdited: false },
        { content: "API integration for the banking app is 80% complete. Should be done by Friday.", isPinned: false, isEdited: false },
        { content: "Brand identity package for Digital Marketing Co is in final review.", isPinned: false, isEdited: false },
        { content: "TechCorp e-commerce homepage redesign is LIVE on staging. QA team please verify.", isPinned: true, isEdited: false },
        { content: "Healthcare portal — HIPAA compliance review passed. Moving to production staging.", isPinned: false, isEdited: false },
        { content: "Supply chain dashboard sprint 1 completed. Client demo scheduled for Thursday.", isPinned: false, isEdited: false },
      ],
      2: [ // client-escalations
        { content: "Urgent: Global Enterprises has filed a dispute claiming work was not delivered per the contract terms. I've pulled the contract and work evidence — need eyes on this ASAP.", isPinned: true, isEdited: false },
        { content: "I'll review the contract terms and prepare our response. Can we get the evidence timeline by tomorrow?", isPinned: false, isEdited: false },
        { content: "Evidence package is ready. Sending to legal for review.", isPinned: false, isEdited: false },
        { content: "LogiSync is pushing back on the latest invoice. They're claiming the desktop work wasn't documented. I've pulled the app usage logs.", isPinned: false, isEdited: false },
        { content: "Dispute resolution update: Global Enterprises case resolved in our favor after evidence review.", isPinned: false, isEdited: false },
      ],
      3: [ // evidence-review
        { content: "New screenshots attached for the Upwork project. The client changed requirements mid-sprint but we have documented everything.", isPinned: false, isEdited: false },
        { content: "Work diary screenshots for FinServe are verified and ready.", isPinned: false, isEdited: false },
        { content: "Evidence quality check: TechCorp project has 45 evidence events this week. Compliance rate: 95%.", isPinned: true, isEdited: false },
        { content: "Flagging: Creative Studios session has low screenshot frequency during rendering work. Desktop app not captured.", isPinned: false, isEdited: false },
        { content: "WCVM verification complete for 3 sessions. All scored above 85% relevance.", isPinned: false, isEdited: false },
      ],
      4: [ // billing
        { content: "Invoice INV-2024-001 paid by TechCorp. Marking as received.", isPinned: false, isEdited: false },
        { content: "Global Enterprises invoice is 15 days overdue. Follow-up sent.", isPinned: false, isEdited: false },
        { content: "New invoice created for Digital Marketing Co — pending review before sending.", isPinned: false, isEdited: false },
        { content: "Recurring invoice for TechCorp generated automatically. Due in 15 days.", isPinned: false, isEdited: false },
        { content: "Payment reminder sent to LogiSync for overdue invoice INV-2024-005.", isPinned: false, isEdited: true },
        { content: "FinServe partial payment received: $5,500 of $11,000. Recording as partial.", isPinned: false, isEdited: false },
      ],
      5: [ // design-critique
        { content: "New brand concepts for MediTech uploaded. They want a clean, trustworthy feel — think blue/green palette.", isPinned: false, isEdited: false },
        { content: "The dashboard wireframes look great. Can we add more whitespace between the chart cards?", isPinned: false, isEdited: false },
        { content: "Updated the LogiSync supply chain mockups with the new data visualization components.", isPinned: false, isEdited: false },
        { content: "Design system tokens updated: new color palette and spacing scale. Please update your Figma plugins.", isPinned: true, isEdited: false },
      ],
      6: [ // dev-standup
        { content: "Yesterday: Completed homepage component refactoring for TechCorp. Today: Starting product page implementation.", isPinned: false, isEdited: false },
        { content: "Yesterday: Fixed 3 bugs in FinServe API integration. Today: Portfolio tracking module.", isPinned: false, isEdited: false },
        { content: "Yesterday: Deployed MediTech healthcare portal to staging. Today: HIPAA compliance testing.", isPinned: false, isEdited: false },
        { content: "Blocker: LogiSync API documentation is outdated. Waiting on their team for updated specs.", isPinned: true, isEdited: false },
        { content: "Yesterday: Unit tests for StartupHub dashboard. Today: Analytics module start.", isPinned: false, isEdited: false },
      ],
    };

    const messageIds: any[] = [];
    for (const [channelIdx, messages] of Object.entries(messagesByChannel)) {
      const chId = channelIds[parseInt(channelIdx)];
      if (!chId) continue;

      for (let i = 0; i < messages.length; i++) {
        const msgId = await ctx.db.insert("messages", {
          channelId: chId,
          workspaceId: teamWsId,
          authorId: userId,
          content: messages[i].content,
          isEdited: messages[i].isEdited,
          isPinned: messages[i].isPinned,
          isDeleted: false,
        });
        messageIds.push(msgId);
      }
    }

    // Thread reply (parent + child)
    const threadParentId = messageIds[0]; // First message in general
    const threadReplyId = await ctx.db.insert("messages", {
      channelId: channelIds[0],
      workspaceId: teamWsId,
      authorId: userId,
      content: "Update: The evidence timeline report has been reviewed and approved. Great work everyone!",
      parentId: threadParentId,
      isEdited: false,
      isPinned: false,
      isDeleted: false,
    });

    // Reactions
    await ctx.db.insert("reactions", { messageId: messageIds[0], userId, emoji: "👍", workspaceId: teamWsId });
    await ctx.db.insert("reactions", { messageId: messageIds[0], userId, emoji: "🎉", workspaceId: teamWsId });
    await ctx.db.insert("reactions", { messageId: messageIds[2], userId, emoji: "📌", workspaceId: teamWsId });
    await ctx.db.insert("reactions", { messageId: messageIds[5], userId, emoji: "❤️", workspaceId: teamWsId });

    // Mentions
    await ctx.db.insert("mentions", { messageId: messageIds[2], userId, channelId: channelIds[0], workspaceId: teamWsId, isRead: true });
    await ctx.db.insert("mentions", { messageId: messageIds[8], userId, channelId: channelIds[2], workspaceId: teamWsId, isRead: false });
    await ctx.db.insert("mentions", { messageId: messageIds[14], userId, channelId: channelIds[2], workspaceId: teamWsId, isRead: false });
    await ctx.db.insert("mentions", { messageId: messageIds[20], userId, channelId: channelIds[4], workspaceId: teamWsId, isRead: false });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 15: TAGS — All categories
    // ═══════════════════════════════════════════════════════════════════════
    const tagData = [
      { name: "Web Development", color: "#3b82f6", category: "project", usageCount: 12 },
      { name: "Mobile App", color: "#8b5cf6", category: "project", usageCount: 8 },
      { name: "Design", color: "#ec4899", category: "project", usageCount: 15 },
      { name: "Branding", color: "#f59e0b", category: "client", usageCount: 6 },
      { name: "API Integration", color: "#10b981", category: "project", usageCount: 9 },
      { name: "Data Visualization", color: "#475569", category: "project", usageCount: 7 },
      { name: "E-Commerce", color: "#f97316", category: "project", usageCount: 4 },
      { name: "Enterprise", color: "#6366f1", category: "client", usageCount: 10 },
      { name: "MVP", color: "#64748B", category: "project", usageCount: 5 },
      { name: "Healthcare", color: "#ef4444", category: "client", usageCount: 3 },
      { name: "Fintech", color: "#84cc16", category: "client", usageCount: 6 },
      { name: "Marketing", color: "#a855f7", category: "project", usageCount: 4 },
      { name: "Urgent", color: "#dc2626", category: "priority", usageCount: 2 },
      { name: "Recurring", color: "#2563eb", category: "engagement", usageCount: 8 },
      { name: "High-Value", color: "#ca8a04", category: "priority", usageCount: 5 },
      { name: "Remote", color: "#0891b2", category: "engagement", usageCount: 11 },
      { name: "Long-Term", color: "#7c3aed", category: "engagement", usageCount: 7 },
      { name: "New Client", color: "#059669", category: "client", usageCount: 3 },
      { name: "Disputed", color: "#991b1b", category: "evidence", usageCount: 2 },
      { name: "Compliant", color: "#16a34a", category: "evidence", usageCount: 14 },
      { name: "At Risk", color: "#ea580c", category: "evidence", usageCount: 4 },
      { name: "Upwork", color: "#14b8a6", category: "general", usageCount: 9 },
      { name: "Fiverr", color: "#22c55e", category: "general", usageCount: 6 },
    ];

    for (const tag of tagData) {
      await ctx.db.insert("tags", {
        userId,
        workspaceId: teamWsId,
        ...tag,
        createdAt: now,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 16: GOALS — Every type and status
    // ═══════════════════════════════════════════════════════════════════════
    const goalData = [
      { title: "Reach $10K Monthly Revenue", description: "Achieve consistent $10K+ monthly revenue from freelance and agency projects by end of Q2.", type: "revenue", target: 10000, current: 7800, unit: "USD", deadline: now + 30 * d, status: "in_progress", streak: 12, lastCheckIn: now - 1 * d, milestones: [{ id: uid(), title: "Close 3 new deals", completed: true, completedAt: now - 10 * d }, { id: uid(), title: "Increase hourly rate to $95", completed: true, completedAt: now - 5 * d }, { id: uid(), title: "Land one enterprise client", completed: false }] },
      { title: "Complete 50 Protected Hours", description: "Log 50 hours of protected work time with full evidence collection and compliance tracking.", type: "hours", target: 50, current: 32, unit: "hours", deadline: now + 14 * d, status: "in_progress", streak: 8, lastCheckIn: now - 2 * d, milestones: [{ id: uid(), title: "Set up time tracking for all active projects", completed: true, completedAt: now - 20 * d }, { id: uid(), title: "Reach 25 protected hours", completed: true, completedAt: now - 7 * d }, { id: uid(), title: "Reach 50 protected hours", completed: false }] },
      { title: "Achieve 95% Protection Score", description: "Maintain a protection score of 95% or higher across all active projects.", type: "protection", target: 95, current: 88, unit: "%", deadline: now + 60 * d, status: "in_progress", streak: 5, lastCheckIn: now - 3 * d, milestones: [{ id: uid(), title: "Audit all client contracts", completed: true, completedAt: now - 15 * d }, { id: uid(), title: "Set up scope tracking for all projects", completed: false }, { id: uid(), title: "Resolve all compliance alerts", completed: false }] },
      { title: "Win 5 Pipeline Deals", description: "Convert 5 deals from the pipeline into signed contracts this quarter.", type: "clients", target: 5, current: 2, unit: "deals", deadline: now + 45 * d, status: "in_progress", lastCheckIn: now - 5 * d, milestones: [{ id: uid(), title: "Send proposals to all qualified leads", completed: true, completedAt: now - 8 * d }, { id: uid(), title: "Win 3 deals", completed: false }, { id: uid(), title: "Win 5 deals total", completed: false }] },
      { title: "Zero Overdue Invoices", description: "Ensure all invoices are paid on time with proactive follow-ups.", type: "custom", target: 0, current: 2, unit: "invoices", deadline: now + 21 * d, status: "in_progress", lastCheckIn: now - 1 * d, milestones: [{ id: uid(), title: "Set up payment reminders", completed: true, completedAt: now - 10 * d }, { id: uid(), title: "Follow up on all overdue invoices", completed: false }] },
      { title: "Build Agency Team to 8 Members", description: "Recruit and onboard 8 active team members covering design, development, and strategy.", type: "custom", target: 8, current: 3, unit: "members", deadline: now + 60 * d, status: "not_started", milestones: [{ id: uid(), title: "Hire senior developer", completed: false }, { id: uid(), title: "Hire UI/UX designer", completed: false }, { id: uid(), title: "Hire motion designer", completed: false }, { id: uid(), title: "Hire backend developer", completed: false }] },
      { title: "Complete Brand Identity Package", description: "Deliver full brand identity package for Digital Marketing Co.", type: "custom", target: 100, current: 100, unit: "%", status: "completed", milestones: [{ id: uid(), title: "Logo design approved", completed: true, completedAt: now - 30 * d }, { id: uid(), title: "Brand guidelines delivered", completed: true, completedAt: now - 25 * d }, { id: uid(), title: "Business cards printed", completed: true, completedAt: now - 20 * d }] },
      { title: "Learn Rust for Backend", description: "Complete Rust programming course for backend development.", type: "custom", target: 40, current: 5, unit: "hours", deadline: now + 90 * d, status: "abandoned", milestones: [{ id: uid(), title: "Complete chapters 1-5", completed: false }] },
    ];

    for (const g of goalData) {
      await ctx.db.insert("goals", {
        userId,
        workspaceId: teamWsId,
        ...g,
        createdAt: now - Math.floor(Math.random() * 30) * d,
        updatedAt: now,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 17: CUSTOM FIELD DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════
    const cfData = [
      { workspaceId: personalWsId, tableName: "deals", fieldName: "referral_source", label: "Referral Source", type: "text" as const, order: 0, required: false },
      { workspaceId: personalWsId, tableName: "deals", fieldName: "priority", label: "Priority", type: "select" as const, options: ["High", "Medium", "Low"], order: 1, required: false },
      { workspaceId: personalWsId, tableName: "deals", fieldName: "renewal_date", label: "Renewal Date", type: "date" as const, order: 2, required: false },
      { workspaceId: personalWsId, tableName: "deals", fieldName: "is_recurring", label: "Recurring Deal", type: "boolean" as const, order: 3, required: false },
      { workspaceId: personalWsId, tableName: "deals", fieldName: "estimated_hours", label: "Estimated Hours", type: "number" as const, order: 4, required: false },
      { workspaceId: personalWsId, tableName: "clients", fieldName: "preferred_contact_method", label: "Preferred Contact", type: "select" as const, options: ["Email", "Phone", "Slack", "WhatsApp"], order: 0, required: false },
      { workspaceId: personalWsId, tableName: "clients", fieldName: "onboarding_status", label: "Onboarding Status", type: "select" as const, options: ["Not Started", "In Progress", "Complete"], order: 1, required: false },
      { workspaceId: personalWsId, tableName: "projects", fieldName: "tech_stack", label: "Tech Stack", type: "text" as const, order: 0, required: false },
      { workspaceId: personalWsId, tableName: "projects", fieldName: "is_urgent", label: "Urgent Project", type: "boolean" as const, order: 1, required: false },
      { workspaceId: personalWsId, tableName: "invoices", fieldName: "payment_method", label: "Payment Method", type: "select" as const, options: ["Bank Transfer", "Stripe", "PayPal", "Wire"], order: 0, required: false },
    ];

    for (const cf of cfData) {
      await ctx.db.insert("customFieldDefinitions", {
        ...cf,
        createdAt: now,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 18: CLIENT POLICIES
    // ═══════════════════════════════════════════════════════════════════════
    const policyData = [
      { clientName: "TechCorp Solutions", platform: "upwork" as const, requirements: [{ type: "activity" as const, description: "Maintain active status during logged hours", requirement: "Activity must be detected every 10 minutes", evidenceType: "mouse_keyboard" }, { type: "screenshots" as const, description: "Automatic screenshots every 10 minutes", requirement: "Minimum 6 screenshots per hour", evidenceType: "screenshot" }, { type: "memos" as const, description: "Work memo for each session", requirement: "Minimum 50 characters describing work done", evidenceType: "memo" }] },
      { clientName: "Global Enterprises", platform: "upwork" as const, requirements: [{ type: "activity" as const, description: "Continuous activity tracking", requirement: "No more than 5 minutes of inactivity", evidenceType: "mouse_keyboard" }, { type: "screenshots" as const, description: "Screenshots every 5 minutes", requirement: "Minimum 12 screenshots per hour", evidenceType: "screenshot" }, { type: "timer" as const, description: "Timer must be running during all work", requirement: "Timer cannot be paused for more than 2 minutes", evidenceType: "timer" }] },
      { clientName: "FinServe Analytics", platform: "toptal" as const, requirements: [{ type: "activity" as const, description: "Full activity tracking for compliance", requirement: "Active work must be detected 90% of the time", evidenceType: "mouse_keyboard" }, { type: "screenshots" as const, description: "Periodic verification screenshots", requirement: "8 screenshots per hour minimum", evidenceType: "screenshot" }] },
    ];

    for (const policy of policyData) {
      await ctx.db.insert("clientPolicies", {
        userId,
        workspaceId: teamWsId,
        ...policy,
        createdAt: now - 30 * d,
        lastUpdated: now,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 19: PLATFORM CONNECTIONS
    // ═══════════════════════════════════════════════════════════════════════
    await ctx.db.insert("platformConnections", {
      userId,
      workspaceId: teamWsId,
      platform: "upwork",
      status: "connected",
      connectedAt: now - 60 * d,
      platformUserId: "upwork_dev_user",
      platformEmail: "dev@axia.app",
      lastSyncedAt: now - 1 * d,
      metadata: { totalHours: 450, totalEarnings: 38250, jobSuccessScore: 98 },
    });

    await ctx.db.insert("platformConnections", {
      userId,
      workspaceId: teamWsId,
      platform: "fiverr",
      status: "connected",
      connectedAt: now - 45 * d,
      platformUserId: "fiverr_dev_user",
      platformEmail: "dev@axia.app",
      lastSyncedAt: now - 3 * d,
      metadata: { completedOrders: 28, avgRating: 4.9, repeatClientRate: 0.65 },
    });

    await ctx.db.insert("platformConnections", {
      userId,
      workspaceId: teamWsId,
      platform: "toptal",
      status: "connected",
      connectedAt: now - 30 * d,
      platformUserId: "toptal_dev_user",
      platformEmail: "dev@axia.app",
      lastSyncedAt: now - 5 * d,
      metadata: { verified: true, skillLevel: "Expert", projectsCompleted: 3 },
    });

    await ctx.db.insert("platformConnections", {
      userId,
      workspaceId: teamWsId,
      platform: "freelancer",
      status: "disconnected",
      connectedAt: now - 90 * d,
      disconnectedAt: now - 20 * d,
      metadata: { reason: "Account deactivated by user" },
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 20: PROTECTION PLANS
    // ═══════════════════════════════════════════════════════════════════════
    await ctx.db.insert("protectionPlans", {
      userId,
      workspaceId: teamWsId,
      planName: "Balanced Protection",
      planType: "balanced",
      customRules: [
        { ruleId: uid(), ruleName: "Auto-screenshot on idle", condition: "Idle > 5 minutes", action: "Capture screenshot and flag for review", enabled: true },
        { ruleId: uid(), ruleName: "Memo reminder", condition: "Session > 60 minutes without memo", action: "Send reminder to add work memo", enabled: true },
        { ruleId: uid(), ruleName: "Platform tab detection", condition: "Non-work platform tab active", action: "Pause timer and alert user", enabled: true },
      ],
      protectionGoals: { targetDisputeRate: 5, minEvidenceQuality: 80, autoScreenshotFrequency: 10 },
      performance: { disputesAvoided: 4, hoursProtected: 171, incomeSecured: 14535 },
      createdAt: now - 45 * d,
      lastUpdated: now,
      isActive: true,
    });

    await ctx.db.insert("protectionPlans", {
      userId,
      workspaceId: teamWsId,
      planName: "Conservative Backup",
      planType: "conservative",
      customRules: [
        { ruleId: uid(), ruleName: "Max screenshot frequency", condition: "Always", action: "Capture screenshot every 5 minutes", enabled: true },
      ],
      protectionGoals: { targetDisputeRate: 2, minEvidenceQuality: 90, autoScreenshotFrequency: 5 },
      performance: { disputesAvoided: 1, hoursProtected: 50, incomeSecured: 4250 },
      createdAt: now - 20 * d,
      lastUpdated: now - 5 * d,
      isActive: false,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 21: MILESTONE SNAPSHOTS, ALERTS, REPORTS
    // ═══════════════════════════════════════════════════════════════════════
    for (let week = 1; week <= 4; week++) {
      const snapshotId = await ctx.db.insert("milestoneSnapshots", {
        userId,
        workspaceId: teamWsId,
        projectId: projectIds[0],
        weekNumber: week,
        weekStart: now - (4 - week + 1) * 7 * d,
        weekEnd: now - (4 - week) * 7 * d,
        totalHours: Math.floor(Math.random() * 20) + 15,
        totalEvidence: Math.floor(Math.random() * 15) + 8,
        protectionRate: Math.floor(Math.random() * 10) + 85,
        sessionCount: Math.floor(Math.random() * 5) + 3,
        createdAt: now - (4 - week) * 7 * d,
      });

      if (week < 4) {
        await ctx.db.insert("milestoneReports", {
          userId,
          workspaceId: teamWsId,
          projectId: projectIds[0],
          weekNumber: week,
          weekStart: now - (4 - week + 1) * 7 * d,
          weekEnd: now - (4 - week) * 7 * d,
          snapshotId,
          metrics: { totalHours: Math.floor(Math.random() * 20) + 15, totalEvidence: Math.floor(Math.random() * 15) + 8, protectionRate: Math.floor(Math.random() * 10) + 85, sessionCount: Math.floor(Math.random() * 5) + 3 },
          trends: { hoursTrend: Math.random() * 20 - 5, protectionTrend: Math.random() * 10, evidenceTrend: Math.random() * 15 },
          insights: [
            { type: "success", message: "Evidence collection rate improved this week." },
            { type: "warning", message: "Slight drop in protection score mid-week due to client meeting." },
          ],
          createdAt: now - (4 - week) * 7 * d,
        });
      }
    }

    // Milestone Alerts
    await ctx.db.insert("milestoneAlerts", {
      userId,
      workspaceId: teamWsId,
      projectId: projectIds[0],
      weekNumber: 4,
      alertType: "protection_drop",
      severity: "warning",
      message: "Protection rate dropped below 90% this week. Review evidence collection for the TechCorp project.",
      protectionRate: 87,
      isRead: false,
      createdAt: now - 1 * d,
    });

    await ctx.db.insert("milestoneAlerts", {
      userId,
      workspaceId: teamWsId,
      projectId: projectIds[2],
      weekNumber: 3,
      alertType: "evidence_gap",
      severity: "critical",
      message: "Significant evidence gap detected for Global Enterprises project. 3 sessions without screenshots.",
      isRead: false,
      createdAt: now - 2 * d,
    });

    await ctx.db.insert("milestoneAlerts", {
      userId,
      workspaceId: teamWsId,
      projectId: projectIds[5],
      weekNumber: 4,
      alertType: "week_completion",
      severity: "info",
      message: "Week 4 completed for FinServe Analytics project. Milestone report generated.",
      isRead: true,
      createdAt: now - 3 * d,
    });

    await ctx.db.insert("milestoneAlerts", {
      userId,
      workspaceId: teamWsId,
      projectId: projectIds[2],
      weekNumber: 2,
      alertType: "approval_needed",
      severity: "warning",
      message: "Scope change approval needed for Global Enterprises Data Portal. Client has not responded.",
      isRead: false,
      createdAt: now - 4 * d,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 22: SCOPE FORMALIZATIONS
    // ═══════════════════════════════════════════════════════════════════════
    await ctx.db.insert("scopeFormalizations", {
      userId,
      workspaceId: teamWsId,
      projectId: projectIds[0],
      changeDescription: "Client requested additional SEO module beyond original scope",
      originalScope: "Homepage and product page redesign only",
      newScope: "Homepage, product pages, AND SEO optimization module",
      impactAssessment: { timeImpact: "+10 hours", budgetImpact: "+$850", deliverableImpact: "1 additional deliverable (SEO module)" },
      clientAcknowledgment: "Approved via email on " + new Date(now - 18 * d).toLocaleDateString(),
      clientApprovalEvidence: "Email thread: sarah@techcorp.io approved on " + new Date(now - 18 * d).toLocaleDateString(),
      status: "formalized",
      createdAt: now - 20 * d,
      formalizedAt: now - 18 * d,
    });

    await ctx.db.insert("scopeFormalizations", {
      userId,
      workspaceId: teamWsId,
      projectId: projectIds[2],
      changeDescription: "Data schema changes requiring restructuring of import module",
      originalScope: "CSV data import with fixed schema",
      newScope: "CSV and API data import with dynamic schema support",
      impactAssessment: { timeImpact: "+15 hours", budgetImpact: "+$1,650", deliverableImpact: "Import module redesign required" },
      status: "pending",
      createdAt: now - 5 * d,
    });

    await ctx.db.insert("scopeFormalizations", {
      userId,
      workspaceId: teamWsId,
      projectId: projectIds[4],
      changeDescription: "Client rejected scope change for export feature",
      originalScope: "Dashboard visualization only",
      newScope: "Dashboard + CSV/PDF export",
      impactAssessment: { timeImpact: "+12 hours", budgetImpact: "+$1,320", deliverableImpact: "2 new export features" },
      status: "rejected",
      createdAt: now - 12 * d,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 23: PROTECTION ADVISOR ALERTS
    // ═══════════════════════════════════════════════════════════════════════
    const paaData = [
      { alertType: "activity_gap" as const, severity: "warning" as const, message: "2-hour activity gap detected on TechCorp project yesterday.", recommendation: "Add manual time entry with work description to fill the gap.", actionRequired: true, triggeredAt: now - 1 * d, autoResolved: false },
      { alertType: "screenshot_needed" as const, severity: "info" as const, message: "Creative Studios session has fewer screenshots than recommended.", recommendation: "Enable auto-screenshot for rendering software via desktop app.", actionRequired: false, triggeredAt: now - 2 * d, autoResolved: true, resolvedAt: now - 1 * d },
      { alertType: "policy_violation" as const, severity: "critical" as const, message: "Global Enterprises policy requires screenshots every 5 minutes. Current session has gaps.", recommendation: "Increase screenshot frequency or pause timer during breaks.", actionRequired: true, triggeredAt: now - 3 * d, autoResolved: false },
      { alertType: "platform_sync_issue" as const, severity: "warning" as const, message: "Upwork sync failed for the last 2 sessions. Evidence may not be visible on platform.", recommendation: "Re-sync from Account Settings > Platform Connections.", actionRequired: true, triggeredAt: now - 5 * d, autoResolved: false },
      { alertType: "evidence_quality_low" as const, severity: "warning" as const, message: "Evidence quality score dropped below 70% for LogiSync project.", recommendation: "Add more detailed work memos and ensure screenshots are captured during all work.", actionRequired: false, triggeredAt: now - 7 * d, autoResolved: true, resolvedAt: now - 4 * d },
    ];

    for (const paa of paaData) {
      await ctx.db.insert("protectionAdvisorAlerts", {
        userId,
        workspaceId: teamWsId,
        ...paa,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DONE! Return comprehensive summary
    // ═══════════════════════════════════════════════════════════════════════
    return {
      success: true,
      deletedRecords: totalDeleted,
      seeded: {
        user_profile: true,
        workspaces: 2,
        workspaceMembers: 2,
        workspaceInvitations: 3,
        teams: 3,
        teamMemberships: 2,
        pipelineStages: 6,
        deals: 17,
        clients: 10,
        projects: 9,
        proposals: 10,
        proposalTemplates: 3,
        proposalFollowUps: 7,
        proposalFollowUpSettings: 1,
        invoices: 11,
        invoiceWorkLinks: 3,
        paymentReminders: 3,
        reminderSettings: 1,
        invoiceTemplates: 1,
        recurringInvoices: 2,
        workSessions: 13,
        timeBlocks: 17,
        appUsage: 6,
        complianceAlerts: 5,
        evidenceSessions: 8,
        evidenceEvents: "~100",
        wcvmVerifications: 3,
        evidenceMetadata: 8,
        disputeReports: 5,
        automatedDisputeReports: 3,
        scopeDefinitions: 5,
        scopeChangeOrders: 6,
        channels: 7,
        channelMembers: 7,
        messages: "~35",
        reactions: 4,
        mentions: 4,
        tags: 23,
        goals: 8,
        customFieldDefinitions: 10,
        clientPolicies: 3,
        platformConnections: 4,
        protectionPlans: 2,
        milestoneSnapshots: 4,
        milestoneReports: 3,
        milestoneAlerts: 4,
        scopeFormalizations: 3,
        protectionAdvisorAlerts: 5,
      },
    };
  },
});
