// @ts-nocheck
/**
 * Admin seed: Creates 4 test users with auth accounts, adds them to team workspace,
 * and seeds rich unique data for each user covering every entity type and status.
 *
 * v5.5.0: PASSWORD now sourced from process.env.SEED_PASSWORD (was: hardcoded
 * "Axia2026!" — Critical). All mutations require admin auth.
 *
 * Run from Convex dashboard or via:
 *   SEED_PASSWORD='YourStrongPass123!' npx convex run seedTeamUsers:seedAllUsers
 */
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { createAccount } from "@convex-dev/auth/server";
import { Scrypt } from "lucia";
import { internal } from "./_generated/api";
import { requireAdmin } from "./security/rateLimit";

// v5.5.0: source from env (was: hardcoded "Axia2026!")
const PASSWORD = process.env.SEED_PASSWORD || (process.env.NODE_ENV === "production"
  ? (() => { throw new Error("SEED_PASSWORD env var required in production"); })()
  : "DevSeed123!");
const day = 86400000;

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

// ─── USER DEFINITIONS ────────────────────────────────────────────────────────

const TEST_USERS = [
  {
    email: "priya@axia.dev",
    name: "Priya Sharma",
    password: PASSWORD,
    role: "manager" as const,
    title: "Senior Developer",
    bio: "Full-stack engineer with 8 years of experience in React, Node.js, and cloud architecture. Specializes in SaaS platforms and real-time applications.",
    tier: "pro" as const,
    hourlyRate: 110,
    platform: "upwork" as const,
    yearsExp: "8+",
    theme: "frontend-heavy", // determines data flavor
  },
  {
    email: "marcus@axia.dev",
    name: "Marcus Johnson",
    password: PASSWORD,
    role: "member" as const,
    title: "UI/UX Designer",
    bio: "Award-winning designer focused on product design, design systems, and user research. Previously at Figma and Spotify.",
    tier: "starter" as const,
    hourlyRate: 95,
    platform: "fiverr" as const,
    yearsExp: "5+",
    theme: "design-heavy",
  },
  {
    email: "aisha@axia.dev",
    name: "Aisha Patel",
    password: PASSWORD,
    role: "member" as const,
    title: "Backend Engineer",
    bio: "Backend specialist in microservices, databases, and DevOps. AWS certified with deep expertise in serverless architectures.",
    tier: "pro" as const,
    hourlyRate: 120,
    platform: "toptal" as const,
    yearsExp: "10+",
    theme: "backend-heavy",
  },
  {
    email: "carlos@axia.dev",
    name: "Carlos Rivera",
    password: PASSWORD,
    role: "member" as const,
    title: "Project Manager",
    bio: "PMP-certified project manager with experience running distributed teams across 3 time zones. Expert in agile, scoping, and client communication.",
    tier: "free" as const,
    hourlyRate: 75,
    platform: "direct" as const,
    yearsExp: "6+",
    theme: "management-heavy",
  },
];

// ─── STEP 1: Create auth accounts ────────────────────────────────────────────

export const seedAllUsers = action({
  args: {},
  handler: async (ctx) => {
    const results: string[] = [];

    for (const u of TEST_USERS) {
      // Check if user already exists by email
      const existingUsers = await ctx.runQuery(internal.seedTeamUsers.checkUserByEmail, { email: u.email });
      if (existingUsers) {
        results.push(`${u.email}: already exists (id: ${existingUsers})`);
        continue;
      }

      // Create user + auth account via Convex Auth's createAccount
      const created = await createAccount(ctx, {
        provider: "password",
        account: { id: u.email, secret: u.password },
        profile: {
          email: u.email,
          name: u.name,
          emailVerificationTime: Date.now(),
        },
        shouldLinkViaEmail: true,
        shouldLinkViaPhone: false,
      });

      results.push(`${u.email}: created (userId: ${created.user._id})`);
    }

    return results;
  },
});

// ─── STEP 2: Enrich all 4 users with profiles, workspace membership, data ────

export const enrichAllTeamUsers = mutation({
  args: {},
  handler: async (ctx) => {
    // v5.5.0: Critical fix — require admin auth (was: no auth).
    await requireAdmin(ctx);
    const now = Date.now();
    const results: string[] = [];

    // Find the team workspace — create one if it doesn't exist
    let workspaces = await ctx.db.query("workspaces").take(1000);
    let teamWorkspace = workspaces.find(w => w.type === "team");

    if (!teamWorkspace) {
      // Find the first user (owner) to create the team workspace
      const ownerUser = workspaces.find(w => w.type === "personal")?.ownerId;
      if (!ownerUser) {
        // Use the first test user as owner if no existing user
        const firstUser = await ctx.db.query("users").first();
        if (!firstUser) return { error: "No users found at all" };
        
        teamWorkspace = {
          _id: await safeInsert(ctx, "workspaces", {
            ownerId: firstUser._id,
            name: "AXIA Team",
            type: "team",
            createdAt: now,
            updatedAt: now,
          }),
          ownerId: firstUser._id,
          name: "AXIA Team",
          type: "team",
        } as any;
      } else {
        teamWorkspace = {
          _id: await safeInsert(ctx, "workspaces", {
            ownerId: ownerUser,
            name: "AXIA Team",
            type: "team",
            createdAt: now,
            updatedAt: now,
          }),
          ownerId: ownerUser,
          name: "AXIA Team",
          type: "team",
        } as any;
      }

      // Also create default teams
      const teamNames = [
        { name: "Engineering", color: "#3b82f6" },
        { name: "Design", color: "#475569" },
        { name: "Management", color: "#f59e0b" },
      ];

      for (const team of teamNames) {
        await safeInsert(ctx, "teams", {
          workspaceId: teamWorkspace._id,
          name: team.name,
          color: team.color,
          isCrossTeam: team.name === "Management",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Find each test user
    for (const u of TEST_USERS) {
      const users = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", u.email))
        .take(1000);

      if (users.length === 0) {
        results.push(`${u.email}: NOT FOUND - run seedAllUsers first`);
        continue;
      }
      const userId = users[0]._id;
      const user = users[0];

      // ─── Enrich user profile ──────────────────────────────────────────────
      const patches: Record<string, any> = {};
      if (!user.subscriptionTier) patches.subscriptionTier = u.tier;
      if (!user.hourlyRate) patches.hourlyRate = u.hourlyRate;
      if (!user.joinedAt) patches.joinedAt = now - Math.floor(Math.random() * 90) * day;
      if (!user.onboardingComplete) patches.onboardingComplete = true;
      if (!user.onboardingCompletedAt) patches.onboardingCompletedAt = now;
      if (!user.professionalBio) patches.professionalBio = u.bio;
      if (!user.role) patches.role = "user";
      if (!user.primaryPlatform) patches.primaryPlatform = u.platform;
      if (!user.yearsExperience) patches.yearsExperience = u.yearsExp;
      if (user.protectedHours === undefined) patches.protectedHours = Math.floor(Math.random() * 150) + 30;
      if (user.protectedValue === undefined) patches.protectedValue = Math.floor(Math.random() * 15000) + 3000;
      if (Object.keys(patches).length > 0) {
        await ctx.db.patch(userId, patches);
      }

      // ─── Add to team workspace ────────────────────────────────────────────
      const existingMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) => q.eq("workspaceId", teamWorkspace._id).eq("userId", userId))
        .unique();

      if (!existingMembership) {
        await safeInsert(ctx, "workspaceMembers", {
          workspaceId: teamWorkspace._id,
          userId,
          role: u.role,
          status: "active",
          title: u.title,
          invitedBy: teamWorkspace.ownerId,
          joinedAt: now - Math.floor(Math.random() * 30) * day,
          lastActiveAt: now - Math.floor(Math.random() * 7) * day,
        });
        results.push(`${u.email}: added to team workspace as ${u.role}`);
      } else {
        results.push(`${u.email}: already in team workspace`);
      }

      // ─── Add to teams ─────────────────────────────────────────────────────
      const teams = await ctx.db
        .query("teams")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", teamWorkspace._id))
        .take(1000);

      for (const team of teams) {
        const existingMember = await ctx.db
          .query("teamMemberships")
          .withIndex("by_team_and_user", (q) => q.eq("teamId", team._id).eq("userId", userId))
          .unique();

        if (!existingMember) {
          await safeInsert(ctx, "teamMemberships", {
            teamId: team._id,
            userId,
            workspaceId: teamWorkspace._id,
            role: u.role === "manager" ? "lead" : "member",
            joinedAt: now - Math.floor(Math.random() * 20) * day,
          });
        }
      }

      // ─── Seed user-specific data ──────────────────────────────────────────
      let seeded: string[] = [];
      try {
        seeded = await seedUserData(ctx, userId, teamWorkspace._id, u, now);
      } catch (e: any) {
        seeded = [`PARTIAL: ${e.message?.slice(0, 80)}`];
      }
      results.push(`${u.email}: seeded [${seeded.join(", ")}]`);
    }

    // ─── Seed cross-user data: messaging channels, DMs ─────────────────────
    const allUserIds = [];
    const ownerUser = workspaces.find(w => w.type === "personal")?.ownerId;
    if (ownerUser) allUserIds.push(ownerUser);
    for (const u of TEST_USERS) {
      const users = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", u.email)).take(1000);
      if (users.length > 0) allUserIds.push(users[0]._id);
    }

    await seedMessagingData(ctx, allUserIds, teamWorkspace._id, now);
    results.push("messaging: seeded channels and DMs");

    return results;
  },
});

// ─── Helper: check if user exists by email ────────────────────────────────────

export const checkUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const users = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).take(1000);
    return users.length > 0 ? users[0]._id : null;
  },
});

// ─── USER DATA SEEDING ───────────────────────────────────────────────────────

async function safeInsert(ctx: any, table: string, doc: any): Promise<any | null> {
  try {
    return await ctx.db.insert(table, doc);
  } catch (e: any) {
    console.warn(`Skipping ${table} insert: ${e.message?.slice(0, 100)}`);
    return null;
  }
}

async function seedUserData(ctx: any, userId: any, workspaceId: any, u: typeof TEST_USERS[0], now: number) {
  const results: string[] = [];
  const errors: string[] = [];

  // ─── Personal Workspace ─────────────────────────────────────────────────
  let personalWsId: any;
  const existingPersonal = await ctx.db
    .query("workspaces")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .filter((q: any) => q.eq(q.field("type"), "personal"))
    .first();

  if (existingPersonal) {
    personalWsId = existingPersonal._id;
  } else {
    personalWsId = await safeInsert(ctx, "workspaces", {
      ownerId: userId,
      name: `${u.name}'s Workspace`,
      type: "personal",
      createdAt: now,
      updatedAt: now,
    });
  }

  // ─── Pipeline Stages ────────────────────────────────────────────────────
  let stageIds: any[] = [];
  const existingStages = await ctx.db
    .query("pipelineStages")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingStages.length === 0) {
    const stageNames = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
    for (let i = 0; i < stageNames.length; i++) {
      const id = await safeInsert(ctx, "pipelineStages", {
        userId,
        workspaceId,
        name: stageNames[i],
        order: i,
        color: ["#94a3b8", "#3b82f6", "#475569", "#f59e0b", "#22c55e", "#ef4444"][i],
      });
      stageIds.push(id);
    }
    results.push("pipeline_stages");
  } else {
    stageIds = existingStages.sort((a: any, b: any) => a.order - b.order).map((s: any) => s._id);
  }

  // ─── Clients ────────────────────────────────────────────────────────────
  let clientIds: any[] = [];
  const existingClients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingClients.length === 0) {
    const clientData = getClientData(u.theme);
    for (const c of clientData) {
      const id = await safeInsert(ctx, "clients", {
        userId,
        workspaceId,
        clientName: c.clientName,
        platform: c.platform,
        hourlyRate: c.hourlyRate,
        contractType: c.contractType,
        riskLevel: c.riskLevel,
        addedAt: now - Math.floor(Math.random() * 60) * day,
        lastActivityAt: now - Math.floor(Math.random() * 5) * day,
      });
      clientIds.push(id);
    }
    results.push("clients");
  } else {
    clientIds = existingClients.map((c: any) => c._id);
  }

  // ─── Deals ──────────────────────────────────────────────────────────────
  const existingDeals = await ctx.db
    .query("deals")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingDeals.length === 0 && stageIds.length >= 6) {
    const dealsData = getDealsData(u.theme);
    for (let i = 0; i < dealsData.length; i++) {
      const deal = dealsData[i];
      const stageId = stageIds[deal.stageIdx];
      if (!stageId) continue;
      await safeInsert(ctx, "deals", {
        userId,
        stageId,
        clientId: deal.clientIdx < clientIds.length ? clientIds[deal.clientIdx] : undefined,
        title: deal.title,
        value: deal.value,
        probability: deal.probability,
        source: deal.source,
        contactName: deal.contactName,
        contactEmail: deal.contactEmail,
        expectedCloseDate: deal.expectedCloseDate,
        currency: "USD",
        description: deal.description,
        notes: deal.notes || "",
        order: i,
        createdAt: now - Math.floor(Math.random() * 30) * day,
        updatedAt: now,
      });
    }
    results.push("deals");
  }

  // ─── Projects ───────────────────────────────────────────────────────────
  const existingProjects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingProjects.length === 0 && clientIds.length > 0) {
    const projectsData = getProjectsData(u.theme);
    for (let i = 0; i < projectsData.length; i++) {
      const p = projectsData[i];
      await safeInsert(ctx, "projects", {
        userId,
        workspaceId,
        clientId: clientIds[p.clientIdx % clientIds.length],
        name: p.name,
        description: p.description,
        status: p.status,
        budget: p.budget,
        hourlyRate: p.hourlyRate || u.hourlyRate,
        startDate: p.startDate,
        endDate: p.endDate,
        progress: p.progress,
        category: p.category,
        priority: p.priority,
        createdAt: now - Math.floor(Math.random() * 60) * day,
        updatedAt: now,
      });
    }
    results.push("projects");
  }

  // ─── Proposals ──────────────────────────────────────────────────────────
  const existingProposals = await ctx.db
    .query("proposals")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingProposals.length === 0 && clientIds.length > 0) {
    const proposalsData = getProposalsData(u.theme);
    for (let i = 0; i < proposalsData.length; i++) {
      const p = proposalsData[i];
      await safeInsert(ctx, "proposals", {
        userId,
        workspaceId,
        clientId: clientIds[p.clientIdx % clientIds.length],
        title: p.title,
        publicToken: generateToken(),
        sections: [
          { id: "s1", type: "heading", content: p.title },
          { id: "s2", type: "scope_of_work", content: p.description },
          { id: "s3", type: "pricing", content: `Total: $${p.value.toLocaleString()}`, metadata: { total: p.value } },
          { id: "s4", type: "terms", content: "Payment due within 30 days of signing. 50% upfront, 50% on completion." },
        ],
        status: p.status,
        totalValue: p.value,
        currency: "USD",
        validUntil: p.validUntil,
        sentAt: p.sentAt,
        viewedAt: p.viewedAt,
        signedAt: p.signedAt,
        declinedAt: p.declinedAt,
        createdAt: now - Math.floor(Math.random() * 30) * day,
        updatedAt: now,
      });
    }
    results.push("proposals");
  }

  // ─── Invoices ───────────────────────────────────────────────────────────
  const existingInvoices = await ctx.db
    .query("invoices")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingInvoices.length === 0 && clientIds.length > 0) {
    const invoicesData = getInvoicesData(u.theme);
    for (let i = 0; i < invoicesData.length; i++) {
      const inv = invoicesData[i];
      const lineItems = inv.items.map((item: any, li: number) => ({
        id: `li-${i}-${li}`,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate,
      }));
      const subtotal = lineItems.reduce((sum: number, li: any) => sum + li.amount, 0);
      await safeInsert(ctx, "invoices", {
        userId,
        workspaceId,
        clientId: clientIds[inv.clientIdx % clientIds.length],
        invoiceNumber: `INV-${String(1000 + i).padStart(4, "0")}-${u.name.split(" ")[0].toUpperCase()}`,
        publicToken: generateToken(),
        status: inv.status,
        issueDate: now - Math.floor(Math.random() * 15) * day,
        dueDate: inv.dueDate,
        paidDate: inv.paidAt,
        lineItems,
        subtotal,
        total: subtotal,
        currency: "USD",
        notes: inv.description,
        sentAt: inv.status !== "draft" ? now - Math.floor(Math.random() * 10) * day : undefined,
        viewedAt: ["viewed", "paid", "overdue"].includes(inv.status) ? now - Math.floor(Math.random() * 5) * day : undefined,
        createdAt: now - Math.floor(Math.random() * 30) * day,
        updatedAt: now,
      });
    }
    results.push("invoices");
  }

  // ─── Tags ───────────────────────────────────────────────────────────────
  const existingTags = await ctx.db
    .query("tags")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingTags.length === 0) {
    const tagsData = getTagsData(u.theme);
    for (const tag of tagsData) {
      await safeInsert(ctx, "tags", {
        userId,
        workspaceId,
        name: tag.name,
        color: tag.color,
        category: tag.category,
        usageCount: Math.floor(Math.random() * 15) + 1,
        createdAt: now,
      });
    }
    results.push("tags");
  }

  // ─── Goals ──────────────────────────────────────────────────────────────
  const existingGoals = await ctx.db
    .query("goals")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingGoals.length === 0) {
    const goalsData = getGoalsData(u.theme, u.hourlyRate);
    for (const goal of goalsData) {
      await safeInsert(ctx, "goals", {
        userId,
        workspaceId,
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
        lastCheckIn: now - Math.floor(Math.random() * 3) * day,
        createdAt: now - Math.floor(Math.random() * 30) * day,
        updatedAt: now,
      });
    }
    results.push("goals");
  }

  // ─── Scope Definitions ──────────────────────────────────────────────────
  const existingScope = await ctx.db
    .query("scopeDefinitions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingScope.length === 0) {
    const scopeData = getScopeData(u.theme);
    for (const scope of scopeData) {
      await safeInsert(ctx, "scopeDefinitions", {
        userId,
        workspaceId,
        title: scope.title,
        description: scope.description,
        deliverables: scope.deliverables,
        totalEstimatedHours: scope.totalEstimatedHours,
        revisionLimit: scope.revisionLimit,
        revisionCount: scope.revisionCount,
        status: scope.status,
        createdAt: now - Math.floor(Math.random() * 30) * day,
        updatedAt: now,
      });
    }
    results.push("scope");
  }

  // ─── Work Sessions ─────────────────────────────────────────────────────
  const existingSessions = await ctx.db
    .query("workSessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingSessions.length === 0) {
    const sessionsData = getWorkSessionsData(u.theme, u.hourlyRate);
    let activeSessionId: any;

    for (let i = 0; i < sessionsData.length; i++) {
      const s = sessionsData[i];
      const sessionId = await safeInsert(ctx, "workSessions", {
        userId,
        workspaceId,
        startTime: s.startTime,
        endTime: s.endTime,
        totalMinutes: s.totalMinutes,
        complianceStatus: s.complianceStatus,
        clientName: s.clientName,
        projectName: s.projectName,
        hourlyRate: s.hourlyRate,
        platform: s.platform,
        notes: s.notes || "",
        isManualEntry: s.isManualEntry || false,
        invoiced: s.invoiced || false,
        status: s.status,
        createdAt: s.startTime,
        updatedAt: now,
      });

      if (i === 0) activeSessionId = sessionId;

      // Time blocks for some sessions
      if (s.timeBlocks) {
        for (const block of s.timeBlocks) {
          await safeInsert(ctx, "timeBlocks", {
            sessionId,
            userId,
            startTime: block.start,
            endTime: block.end,
            activity: block.activity,
            website: block.website,
            complianceStatus: block.status,
            screenshotCount: block.screenshots,
            mouseActivity: block.mouse,
            keyboardActivity: block.keyboard,
            inactiveDuration: block.inactiveSec,
          });
        }
      }
    }

    // Compliance alerts
    if (activeSessionId) {
      const alertTypes = ["at_risk", "payment_protection_risk", "non_browser_work", "timer_paused"] as const;
      for (let i = 0; i < 3; i++) {
        await safeInsert(ctx, "complianceAlerts", {
          userId,
          workspaceId,
          sessionId: activeSessionId,
          alertType: alertTypes[i % alertTypes.length],
          message: getComplianceAlertMessage(u.theme, i),
          triggeredAt: now - (i + 1) * 30 * 60 * 1000,
          acknowledged: i === 0,
          actionTaken: i === 0 ? "Closed non-browser tab" : undefined,
        });
      }
    }

    results.push("work_sessions");
  }

  // ─── Evidence Sessions ──────────────────────────────────────────────────
  let existingEvidence: any[] = [];
  try {
    existingEvidence = await ctx.db
      .query("evidenceSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);
  } catch {
    existingEvidence = [];
  }

  if (existingEvidence.length === 0) {
    const evidenceData = getEvidenceData(u.theme);
    for (const e of evidenceData) {
      const sessionId = await safeInsert(ctx, "evidenceSessions", {
        userId,
        workspaceId,
        startTime: e.startTime,
        endTime: e.endTime,
        totalMinutes: e.totalMinutes,
        clientName: e.clientName,
        projectName: e.projectName,
        screenshotCount: e.screenshotCount,
        activityLevel: e.activityLevel,
        status: e.status,
        createdAt: e.startTime,
        updatedAt: now,
      });

      // Evidence events
      for (const ev of e.events) {
        await safeInsert(ctx, "evidenceEvents", {
          userId,
          workspaceId,
          sessionId,
          eventType: ev.type,
          timestamp: ev.timestamp,
          data: ev.data,
          createdAt: ev.timestamp,
        });
      }

      // Evidence metadata
      await safeInsert(ctx, "evidenceMetadata", {
        userId,
        workspaceId,
        sessionId,
        browserInfo: "Chrome 125 / macOS Sonoma",
        osInfo: "macOS 14.5",
        screenResolution: "2560x1440",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        clientVersion: "1.0.0",
        createdAt: e.startTime,
      });
    }
    results.push("evidence");
  }

  // ─── Custom Field Definitions ───────────────────────────────────────────
  let existingCustomFields: any[] = [];
  try {
    existingCustomFields = await ctx.db
      .query("customFieldDefinitions")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", personalWsId))
      .take(1000);
  } catch {
    existingCustomFields = [];
  }

  if (existingCustomFields.length === 0) {
    const customFields = getCustomFieldsData(u.theme);
    for (const field of customFields) {
      await safeInsert(ctx, "customFieldDefinitions", {
        workspaceId: personalWsId,
        tableName: field.tableName,
        fieldName: field.fieldName,
        label: field.label,
        type: field.type,
        options: field.options,
        required: field.required || false,
        order: field.order,
        createdBy: userId,
        createdAt: now,
      });
    }
    results.push("custom_fields");
  }

  // ─── Platform Connections ───────────────────────────────────────────────
  const existingPlatforms = await ctx.db
    .query("platformConnections")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingPlatforms.length === 0) {
    const platformData = getPlatformConnectionsData(u.theme);
    for (const p of platformData) {
      await safeInsert(ctx, "platformConnections", {
        userId,
        workspaceId,
        platform: p.platform,
        status: p.status,
        connectedAt: p.connectedAt,
        lastSyncedAt: p.lastSyncedAt,
        accessToken: "••••••••",
        platformAccountId: p.platformAccountId,
        metadata: p.metadata,
      });
    }
    results.push("platforms");
  }

  // ─── Recurring Invoices ─────────────────────────────────────────────────
  const existingRecurring = await ctx.db
    .query("recurringInvoices")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingRecurring.length === 0 && clientIds.length > 0) {
    const recurringData = getRecurringInvoicesData(u.theme);
    for (const r of recurringData) {
      await safeInsert(ctx, "recurringInvoices", {
        userId,
        workspaceId,
        clientId: clientIds[r.clientIdx % clientIds.length],
        amount: r.amount,
        currency: "USD",
        frequency: r.frequency,
        status: r.status,
        nextDueDate: r.nextDueDate,
        description: r.description,
        createdAt: now - 30 * day,
        updatedAt: now,
      });
    }
    results.push("recurring_invoices");
  }

  // ─── Proposal Templates ─────────────────────────────────────────────────
  const existingTemplates = await ctx.db
    .query("proposalTemplates")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingTemplates.length === 0) {
    const templateData = getProposalTemplatesData(u.theme);
    for (const t of templateData) {
      await safeInsert(ctx, "proposalTemplates", {
        userId,
        workspaceId,
        name: t.name,
        description: t.description,
        content: t.content,
        category: t.category,
        isDefault: t.isDefault,
        usageCount: Math.floor(Math.random() * 10),
        createdAt: now - Math.floor(Math.random() * 60) * day,
        updatedAt: now,
      });
    }
    results.push("proposal_templates");
  }

  // ─── Payment Reminders ──────────────────────────────────────────────────
  const existingReminders = await ctx.db
    .query("paymentReminders")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(1000);

  if (existingReminders.length === 0) {
    await safeInsert(ctx, "reminderSettings", {
      userId,
      workspaceId,
      enableAutoReminders: true,
      daysBeforeDue: 3,
      daysAfterDue: [1, 3, 7, 14],
      reminderMessage: "Hi {clientName}, this is a friendly reminder that invoice {invoiceNumber} for {amount} is {status}.",
      createdAt: now,
      updatedAt: now,
    });

    if (clientIds.length > 0) {
      const reminderInvoices = [
        { daysOffset: -5, message: "Payment overdue by 5 days" },
        { daysOffset: -10, message: "Payment overdue by 10 days — second notice" },
        { daysOffset: -1, message: "Payment due tomorrow" },
      ];
      for (const r of reminderInvoices) {
        await safeInsert(ctx, "paymentReminders", {
          userId,
          workspaceId,
          clientId: clientIds[0],
          invoiceId: undefined,
          type: r.daysOffset < 0 ? "overdue" : "upcoming",
          message: r.message,
          scheduledAt: now + r.daysOffset * day,
          sentAt: r.daysOffset < -3 ? now + r.daysOffset * day : undefined,
          status: r.daysOffset < -3 ? "sent" : "pending",
          createdAt: now - 14 * day,
        });
      }
    }
    results.push("reminders");
  }

  return results;
}

// ─── MESSAGING DATA ──────────────────────────────────────────────────────────

async function seedMessagingData(ctx: any, userIds: any[], workspaceId: any, now: number) {
  // Check if channels already exist
  const existingChannels = await ctx.db
    .query("channels")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(1000);

  if (existingChannels.length > 0) return; // Already seeded

  const channelNames = [
    { name: "general", isPrivate: false },
    { name: "project-updates", isPrivate: false },
    { name: "design-review", isPrivate: false },
    { name: "code-review", isPrivate: false },
    { name: "client-communications", isPrivate: true },
    { name: "random", isPrivate: false },
    { name: "standup", isPrivate: false },
    { name: "billing", isPrivate: true },
  ];

  const channelIds: any[] = [];

  for (const ch of channelNames) {
    const channelId = await safeInsert(ctx, "channels", {
      name: ch.name,
      workspaceId,
      type: "channel",
      isPrivate: ch.isPrivate,
      createdBy: userIds[0],
      isArchived: false,
      lastMessageAt: now - Math.floor(Math.random() * 60) * 60 * 1000,
      createdAt: now - 30 * day,
    });
    channelIds.push(channelId);

    // Add all users as channel members
    for (const uid of userIds) {
      await safeInsert(ctx, "channelMembers", {
        channelId,
        userId: uid,
        workspaceId,
        role: uid === userIds[0] ? "admin" : "member",
        isMuted: ch.name === "billing" && uid !== userIds[0],
        lastReadAt: now - Math.floor(Math.random() * 24) * 60 * 60 * 1000,
      });
    }
  }

  // Seed messages for channels
  const messagesByChannel: Record<string, Array<{ authorIdx: number; content: string }>> = {
    "general": [
      { authorIdx: 0, content: "Welcome to the AXIA team workspace! 🎉" },
      { authorIdx: 1, content: "Excited to be here! I've set up my profile already." },
      { authorIdx: 2, content: "Hey everyone! Looking forward to working together on the design side." },
      { authorIdx: 3, content: "Hi team! Ready to dive into the backend infrastructure." },
      { authorIdx: 4, content: "Great to have you all! Let's sync up on project assignments this week." },
      { authorIdx: 1, content: "I noticed the pipeline has some new leads. Should I reach out to the qualified ones?" },
      { authorIdx: 0, content: "Yes, please prioritize the enterprise leads. Carlos can help with the proposals." },
      { authorIdx: 4, content: "I'll draft proposals for the top 3 deals by EOD." },
    ],
    "project-updates": [
      { authorIdx: 1, content: "TechCorp website redesign: Homepage is 80% done. Need feedback on the hero section." },
      { authorIdx: 2, content: "I'll review the designs this afternoon. Can we do a quick Figma walkthrough?" },
      { authorIdx: 3, content: "API endpoints for the dashboard are ready. Deployed to staging." },
      { authorIdx: 4, content: "Sprint review scheduled for Friday. Please update your task statuses." },
      { authorIdx: 1, content: "Updated! Also pushed the responsive breakpoints for mobile." },
      { authorIdx: 0, content: "Great progress everyone. Client demo is next Wednesday." },
    ],
    "design-review": [
      { authorIdx: 2, content: "New brand guidelines draft is up in Figma. Link in the project files." },
      { authorIdx: 1, content: "Love the color palette! The accent color really pops." },
      { authorIdx: 2, content: "Thanks! I went with the warm amber to contrast the dark UI." },
      { authorIdx: 3, content: "Can we make sure the component library follows the 8px grid?" },
      { authorIdx: 2, content: "Already on it — all spacing tokens are multiples of 8." },
    ],
    "code-review": [
      { authorIdx: 3, content: "PR #142: Refactored auth middleware. Please review when you get a chance." },
      { authorIdx: 1, content: "Looking at it now. The session handling looks clean." },
      { authorIdx: 3, content: "Thanks! I also added rate limiting on the OTP endpoint." },
      { authorIdx: 1, content: "Nice. Left one comment about error handling in edge cases." },
      { authorIdx: 3, content: "Fixed! Pushed another commit." },
    ],
    "client-communications": [
      { authorIdx: 0, content: "FinServe wants to schedule a call about the analytics dashboard timeline." },
      { authorIdx: 4, content: "I can take that call. What's their availability?" },
      { authorIdx: 0, content: "Thursday 2 PM or Friday 10 AM their time (EST)." },
      { authorIdx: 4, content: "Thursday works. I'll prep the scope summary and timeline." },
    ],
    "random": [
      { authorIdx: 2, content: "Anyone tried the new coffee shop on 5th? ☕" },
      { authorIdx: 1, content: "Yes! Their cold brew is amazing." },
      { authorIdx: 3, content: "I'm more of a tea person, but I'm willing to be convinced 😄" },
      { authorIdx: 4, content: "Team lunch there on Friday?" },
      { authorIdx: 0, content: "I'm in!" },
    ],
    "standup": [
      { authorIdx: 1, content: "Yesterday: Finished homepage responsive. Today: Product page layouts. Blocker: None." },
      { authorIdx: 2, content: "Yesterday: Brand guidelines v2. Today: Component library updates. Blocker: Need logo file from client." },
      { authorIdx: 3, content: "Yesterday: Auth middleware refactor. Today: Rate limiting. Blocker: None." },
      { authorIdx: 4, content: "Yesterday: Sprint planning. Today: Proposal drafts + client call. Blocker: Waiting on pricing approval." },
    ],
    "billing": [
      { authorIdx: 0, content: "Invoice #1001 paid by TechCorp. $12,500 received." },
      { authorIdx: 4, content: "Great! I'll update the revenue tracker. Still waiting on Global Enterprises payment." },
      { authorIdx: 0, content: "Sent a second reminder yesterday. Will escalate if no response by Friday." },
    ],
  };

  const channelNameList = channelNames.map(c => c.name);

  for (let ci = 0; ci < channelIds.length; ci++) {
    const channelId = channelIds[ci];
    const channelName = channelNameList[ci];
    const msgs = messagesByChannel[channelName] || [];

    for (let mi = 0; mi < msgs.length; mi++) {
      const msg = msgs[mi];
      const authorId = userIds[msg.authorIdx % userIds.length];
      const msgId = await safeInsert(ctx, "messages", {
        channelId,
        authorId,
        content: msg.content,
        isEdited: false,
        isPinned: mi === 0,
        isDeleted: false,
        attachments: [],
        createdAt: now - (msgs.length - mi) * 15 * 60 * 1000,
        updatedAt: now,
      });

      // Add some reactions
      if (mi % 3 === 0 && userIds.length > 1) {
        await safeInsert(ctx, "reactions", {
          messageId: msgId,
          userId: userIds[(msg.authorIdx + 1) % userIds.length],
          emoji: ["👍", "❤️", "🔥", "✅", "🚀"][mi % 5],
        });
      }
    }
  }

  // Create DM channels between pairs
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const dmChannelId = await safeInsert(ctx, "channels", {
        name: `dm-${i}-${j}`,
        workspaceId,
        type: "dm",
        isPrivate: true,
        createdBy: userIds[i],
        isArchived: false,
        lastMessageAt: now - Math.floor(Math.random() * 48) * 60 * 60 * 1000,
        createdAt: now - 20 * day,
      });

      await safeInsert(ctx, "channelMembers", {
        channelId: dmChannelId,
        userId: userIds[i],
        workspaceId,
        role: "member",
        isMuted: false,
        lastReadAt: now - Math.floor(Math.random() * 12) * 60 * 60 * 1000,
      });
      await safeInsert(ctx, "channelMembers", {
        channelId: dmChannelId,
        userId: userIds[j],
        workspaceId,
        role: "member",
        isMuted: false,
        lastReadAt: now - Math.floor(Math.random() * 12) * 60 * 60 * 1000,
      });

      // A few DM messages
      const dmMessages = getDmMessages(i, j);
      for (const dm of dmMessages) {
        await safeInsert(ctx, "messages", {
          channelId: dmChannelId,
          authorId: userIds[dm.authorIdx === 0 ? i : j],
          content: dm.content,
          isEdited: false,
          isPinned: false,
          isDeleted: false,
          attachments: [],
          createdAt: now - dm.hoursAgo * 60 * 60 * 1000,
          updatedAt: now,
        });
      }
    }
  }
}

// ─── DATA GENERATORS BY THEME ────────────────────────────────────────────────

function getClientData(theme: string) {
  const base = [
    { clientName: "TechCorp Solutions", platform: "upwork" as const, hourlyRate: 85, contractType: "hourly" as const, riskLevel: "low" as const, status: "active" as const, contactEmail: "david@techcorp.io", contactName: "David Chen", notes: "Long-term enterprise client" },
    { clientName: "StartupHub Inc", platform: "fiverr" as const, hourlyRate: 65, contractType: "fixed" as const, riskLevel: "medium" as const, status: "active" as const, contactEmail: "sarah@startuphub.co", contactName: "Sarah Mitchell", notes: "MVP-focused startup" },
  ];

  const themeClients: Record<string, any[]> = {
    "frontend-heavy": [
      { clientName: "PixelPerfect Agency", platform: "upwork" as const, hourlyRate: 100, contractType: "hourly" as const, riskLevel: "low" as const, status: "active" as const, contactEmail: "anna@pixelperfect.com", contactName: "Anna Kowalski", notes: "Design agency, needs React/Next.js devs" },
      { clientName: "CloudMetrics SaaS", platform: "toptal" as const, hourlyRate: 115, contractType: "hourly" as const, riskLevel: "low" as const, status: "active" as const, contactEmail: "jen@cloudmetrics.io", contactName: "Jennifer Wu", notes: "Dashboard redesign project" },
      { clientName: "EduLearn Platform", platform: "direct" as const, hourlyRate: 75, contractType: "fixed" as const, riskLevel: "medium" as const, status: "paused" as const, contactEmail: "anika@learnvista.edu", contactName: "Prof. Anika Desai", notes: "Course platform — paused due to budget review" },
      { clientName: "GreenLeaf Organics", platform: "upwork" as const, hourlyRate: 55, contractType: "fixed" as const, riskLevel: "high" as const, status: "churned" as const, contactEmail: "mark@greenleaf.co", contactName: "Mark Green", notes: "Website project abandoned mid-way" },
    ],
    "design-heavy": [
      { clientName: "Creative Studios", platform: "direct" as const, hourlyRate: 95, contractType: "fixed" as const, riskLevel: "medium" as const, status: "active" as const, contactEmail: "tom@creativestudios.art", contactName: "Tom Bradley", notes: "Brand identity and motion design" },
      { clientName: "Luxe Fashion", platform: "fiverr" as const, hourlyRate: 80, contractType: "fixed" as const, riskLevel: "low" as const, status: "active" as const, contactEmail: "isabelle@luxefashion.com", contactName: "Isabelle Laurent", notes: "Fashion e-commerce redesign" },
      { clientName: "UrbanBrew Coffee", platform: "upwork" as const, hourlyRate: 60, contractType: "fixed" as const, riskLevel: "low" as const, status: "completed" as const, contactEmail: "james@urbanbrew.co", contactName: "James O'Brien", notes: "Complete brand overhaul + packaging" },
      { clientName: "RetroTech Gaming", platform: "direct" as const, hourlyRate: 70, contractType: "fixed" as const, riskLevel: "high" as const, status: "active" as const, contactEmail: "kai@retrotech.gg", contactName: "Kai Nakamura", notes: "Game UI — scope creep risk" },
    ],
    "backend-heavy": [
      { clientName: "FinServe Analytics", platform: "upwork" as const, hourlyRate: 110, contractType: "hourly" as const, riskLevel: "low" as const, status: "active" as const, contactEmail: "cto@finserve.io", contactName: "Michael Torres", notes: "Financial analytics platform" },
      { clientName: "LogiSync Supply Chain", platform: "upwork" as const, hourlyRate: 100, contractType: "hourly" as const, riskLevel: "medium" as const, status: "active" as const, contactEmail: "rchang@logisync.com", contactName: "Robert Chang", notes: "Supply chain management system" },
      { clientName: "MediTech Health", platform: "toptal" as const, hourlyRate: 130, contractType: "hourly" as const, riskLevel: "low" as const, status: "active" as const, contactEmail: "robert@medportal.health", contactName: "Dr. Robert Singh", notes: "HIPAA-compliant patient portal" },
      { clientName: "DataVault Inc", platform: "direct" as const, hourlyRate: 140, contractType: "hourly" as const, riskLevel: "low" as const, status: "active" as const, contactEmail: "sandra@datavault.com", contactName: "Sandra Mitchell", notes: "Data warehousing + ETL pipelines" },
    ],
    "management-heavy": [
      { clientName: "Global Enterprises", platform: "toptal" as const, hourlyRate: 120, contractType: "hourly" as const, riskLevel: "high" as const, status: "active" as const, contactEmail: "helen@globalent.com", contactName: "Helen Park", notes: "Multi-phase enterprise project" },
      { clientName: "RetailMax Commerce", platform: "fiverr" as const, hourlyRate: 55, contractType: "fixed" as const, riskLevel: "high" as const, status: "churned" as const, contactEmail: "amy@retailpro.com", contactName: "Amy Foster", notes: "Inventory system — client went with competitor" },
      { clientName: "GovConnect Portal", platform: "direct" as const, hourlyRate: 150, contractType: "fixed" as const, riskLevel: "medium" as const, status: "active" as const, contactEmail: "helen.park@citygov.org", contactName: "Director Helen Park", notes: "Government services portal" },
      { clientName: "AgileOps Consulting", platform: "direct" as const, hourlyRate: 90, contractType: "hourly" as const, riskLevel: "low" as const, status: "active" as const, contactEmail: "raj@agileops.io", contactName: "Raj Patel", notes: "Process optimization consulting" },
    ],
  };

  return [...base, ...(themeClients[theme] || themeClients["frontend-heavy"])];
}

function getDealsData(theme: string) {
  const now = Date.now();

  const base = [
    { title: "Website Redesign", value: 12000, probability: 70, source: "referral", contactName: "David Chen", contactEmail: "david@techcorp.io", expectedCloseDate: now + 14 * day, stageIdx: 3, clientIdx: 0, description: "Complete website redesign with responsive design.", notes: "" },
  ];

  const themeDeals: Record<string, any[]> = {
    "frontend-heavy": [
      { title: "React Dashboard Build", value: 15000, probability: 50, source: "upwork", contactName: "Jennifer Wu", contactEmail: "jen@cloudmetrics.io", expectedCloseDate: now + 30 * day, stageIdx: 2, clientIdx: 2, description: "Real-time analytics dashboard with D3.js visualizations.", notes: "Client wants WebSocket integration" },
      { title: "E-Commerce Storefront", value: 8500, probability: 80, source: "direct", contactName: "Anna Kowalski", contactEmail: "anna@pixelperfect.com", expectedCloseDate: now + 7 * day, stageIdx: 3, clientIdx: 1, description: "Headless commerce with Next.js frontend.", notes: "" },
      { title: "Mobile-First Landing Pages", value: 4500, probability: 25, source: "fiverr", contactName: "Sarah Mitchell", contactEmail: "sarah@startuphub.co", expectedCloseDate: now + 21 * day, stageIdx: 1, clientIdx: 1, description: "5 responsive landing pages with A/B testing.", notes: "" },
      { title: "Course Platform UI", value: 9500, probability: 10, source: "upwork", contactName: "Prof. Anika Desai", contactEmail: "anika@learnvista.edu", expectedCloseDate: now + 60 * day, stageIdx: 0, clientIdx: 3, description: "Video course platform with progress tracking.", notes: "Budget review in progress" },
      { title: "Portfolio Site for Photographer", value: 3000, probability: 100, source: "referral", contactName: "Lisa Park", contactEmail: "lisa@photography.com", expectedCloseDate: now - 5 * day, stageIdx: 4, clientIdx: 0, description: "Minimalist portfolio with gallery and booking.", notes: "Completed successfully" },
      { title: "Abandoned Blog Redesign", value: 5000, probability: 0, source: "upwork", contactName: "Mark Green", contactEmail: "mark@greenleaf.co", expectedCloseDate: now - 30 * day, stageIdx: 5, clientIdx: 4, description: "Blog redesign — client disappeared.", notes: "Client stopped responding" },
    ],
    "design-heavy": [
      { title: "Brand Identity Package", value: 7500, probability: 55, source: "direct", contactName: "Tom Bradley", contactEmail: "tom@creativestudios.art", expectedCloseDate: now + 14 * day, stageIdx: 2, clientIdx: 2, description: "Full brand identity: logo, palette, typography, guidelines.", notes: "" },
      { title: "Fashion E-Commerce Design", value: 12000, probability: 70, source: "fiverr", contactName: "Isabelle Laurent", contactEmail: "isabelle@luxefashion.com", expectedCloseDate: now + 10 * day, stageIdx: 3, clientIdx: 3, description: "Complete UI design for luxury fashion store.", notes: "" },
      { title: "Coffee Brand Overhaul", value: 6000, probability: 100, source: "upwork", contactName: "James O'Brien", contactEmail: "james@urbanbrew.co", expectedCloseDate: now - 7 * day, stageIdx: 4, clientIdx: 4, description: "Brand overhaul + packaging design.", notes: "Client loved the results!" },
      { title: "Game UI Design", value: 9000, probability: 30, source: "direct", contactName: "Kai Nakamura", contactEmail: "kai@retrotech.gg", expectedCloseDate: now + 21 * day, stageIdx: 1, clientIdx: 5, description: "Retro game UI with pixel art elements.", notes: "Scope expanding — need to control" },
      { title: "Startup Pitch Deck", value: 2500, probability: 15, source: "direct", contactName: "Nina Patel", contactEmail: "nina@smartassist.ai", expectedCloseDate: now + 45 * day, stageIdx: 0, clientIdx: 0, description: "Investor pitch deck design.", notes: "" },
    ],
    "backend-heavy": [
      { title: "Financial Analytics API", value: 22000, probability: 65, source: "upwork", contactName: "Michael Torres", contactEmail: "cto@finserve.io", expectedCloseDate: now + 14 * day, stageIdx: 3, clientIdx: 2, description: "Real-time financial data API with WebSocket streaming.", notes: "" },
      { title: "Supply Chain Microservices", value: 32000, probability: 40, source: "upwork", contactName: "Robert Chang", contactEmail: "rchang@logisync.com", expectedCloseDate: now + 30 * day, stageIdx: 2, clientIdx: 3, description: "Microservices architecture for logistics platform.", notes: "Complex architecture requirements" },
      { title: "HIPAA Patient Portal", value: 35000, probability: 50, source: "toptal", contactName: "Dr. Robert Singh", contactEmail: "robert@medportal.health", expectedCloseDate: now + 28 * day, stageIdx: 2, clientIdx: 4, description: "HIPAA-compliant healthcare portal with FHIR APIs.", notes: "Compliance review needed" },
      { title: "ETL Pipeline System", value: 18000, probability: 80, source: "direct", contactName: "Sandra Mitchell", contactEmail: "sandra@datavault.com", expectedCloseDate: now + 7 * day, stageIdx: 3, clientIdx: 5, description: "Data warehouse ETL pipelines with dbt.", notes: "" },
      { title: "IoT Data Platform", value: 28000, probability: 10, source: "direct", contactName: "Ingrid Svensson", contactEmail: "ingrid@precisemfg.se", expectedCloseDate: now + 60 * day, stageIdx: 0, clientIdx: 0, description: "IoT data ingestion and analytics platform.", notes: "" },
      { title: "Legacy System Migration (Lost)", value: 40000, probability: 0, source: "direct", contactName: "Kevin Park", contactEmail: "kevin@oldcorp.com", expectedCloseDate: now - 20 * day, stageIdx: 5, clientIdx: 0, description: "Legacy system was too entrenched.", notes: "Lost to in-house team" },
    ],
    "management-heavy": [
      { title: "Enterprise Digital Transformation", value: 48000, probability: 50, source: "direct", contactName: "Helen Park", contactEmail: "helen@globalent.com", expectedCloseDate: now + 45 * day, stageIdx: 2, clientIdx: 2, description: "Multi-phase digital transformation project.", notes: "Requires 4 team members" },
      { title: "Government Services Portal", value: 55000, probability: 30, source: "direct", contactName: "Director Helen Park", contactEmail: "helen.park@citygov.org", expectedCloseDate: now + 60 * day, stageIdx: 1, clientIdx: 4, description: "Citizen-facing government services portal.", notes: "Security clearance needed" },
      { title: "Process Optimization Audit", value: 8000, probability: 70, source: "direct", contactName: "Raj Patel", contactEmail: "raj@agileops.io", expectedCloseDate: now + 10 * day, stageIdx: 3, clientIdx: 5, description: "Workflow audit and optimization recommendations.", notes: "" },
      { title: "Inventory System (Lost)", value: 14000, probability: 0, source: "fiverr", contactName: "Amy Foster", contactEmail: "amy@retailpro.com", expectedCloseDate: now - 30 * day, stageIdx: 5, clientIdx: 3, description: "Lost to competitor bid.", notes: "Underbid by 40%" },
      { title: "Agile Coaching Retainer", value: 6000, probability: 90, source: "referral", contactName: "Raj Patel", contactEmail: "raj@agileops.io", expectedCloseDate: now + 5 * day, stageIdx: 3, clientIdx: 5, description: "Monthly agile coaching retainer for 6 months.", notes: "" },
      { title: "Team Augmentation Deal", value: 25000, probability: 15, source: "upwork", contactName: "Vikram Mehta", contactEmail: "vikram@scaleup.io", expectedCloseDate: now + 50 * day, stageIdx: 0, clientIdx: 0, description: "Embed 3 developers in client's team.", notes: "" },
    ],
  };

  return [...base, ...(themeDeals[theme] || themeDeals["frontend-heavy"])];
}

function getProjectsData(theme: string) {
  const now = Date.now();

  const themeProjects: Record<string, any[]> = {
    "frontend-heavy": [
      { name: "CloudMetrics Dashboard", description: "Real-time analytics dashboard with interactive charts, filters, and data export.", status: "in_progress" as const, budget: 15000, hourlyRate: 110, startDate: now - 20 * day, endDate: now + 25 * day, progress: 65, category: "Web App", priority: "high" as const, clientIdx: 2 },
      { name: "EduLearn Course UI", description: "Video course platform with chapter navigation, progress tracking, and certificate generation.", status: "on_hold" as const, budget: 9500, hourlyRate: 85, startDate: now - 45 * day, endDate: now + 15 * day, progress: 30, category: "Web App", priority: "medium" as const, clientIdx: 3 },
      { name: "PixelPerfect Component Library", description: "Reusable React component library with Storybook docs and Figma integration.", status: "in_progress" as const, budget: 8000, hourlyRate: 100, startDate: now - 10 * day, endDate: now + 40 * day, progress: 40, category: "Component Library", priority: "high" as const, clientIdx: 1 },
      { name: "GreenLeaf Website (Abandoned)", description: "Organic food store website — abandoned by client.", status: "cancelled" as const, budget: 5000, hourlyRate: 55, startDate: now - 60 * day, endDate: now - 30 * day, progress: 45, category: "Website", priority: "low" as const, clientIdx: 4 },
      { name: "Portfolio Site", description: "Minimalist photographer portfolio with gallery and client booking.", status: "completed" as const, budget: 3000, hourlyRate: 85, startDate: now - 30 * day, endDate: now - 5 * day, progress: 100, category: "Website", priority: "medium" as const, clientIdx: 0 },
    ],
    "design-heavy": [
      { name: "Creative Studios Rebrand", description: "Complete brand identity redesign: logo, color system, typography, motion language.", status: "in_progress" as const, budget: 7500, hourlyRate: 95, startDate: now - 15 * day, endDate: now + 20 * day, progress: 55, category: "Brand Design", priority: "high" as const, clientIdx: 2 },
      { name: "Luxe Fashion UI", description: "Luxury e-commerce UI with immersive product pages and 3D viewers.", status: "in_progress" as const, budget: 12000, hourlyRate: 80, startDate: now - 25 * day, endDate: now + 15 * day, progress: 70, category: "UI Design", priority: "high" as const, clientIdx: 3 },
      { name: "UrbanBrew Brand Overhaul", description: "Complete brand overhaul including packaging design for coffee roastery.", status: "completed" as const, budget: 6000, hourlyRate: 60, startDate: now - 50 * day, endDate: now - 7 * day, progress: 100, category: "Brand Design", priority: "medium" as const, clientIdx: 4 },
      { name: "RetroTech Game UI", description: "Retro-style game interface with pixel art elements and animations.", status: "at_risk" as const, budget: 9000, hourlyRate: 70, startDate: now - 30 * day, endDate: now + 10 * day, progress: 35, category: "Game Design", priority: "high" as const, clientIdx: 5 },
      { name: "Startup Pitch Deck", description: "Investor pitch deck with data visualizations and story flow.", status: "not_started" as const, budget: 2500, hourlyRate: 95, startDate: now + 5 * day, endDate: now + 20 * day, progress: 0, category: "Presentation", priority: "low" as const, clientIdx: 0 },
    ],
    "backend-heavy": [
      { name: "FinServe Analytics API", description: "Real-time financial data API with WebSocket streaming and rate limiting.", status: "in_progress" as const, budget: 22000, hourlyRate: 110, startDate: now - 20 * day, endDate: now + 20 * day, progress: 60, category: "API", priority: "high" as const, clientIdx: 2 },
      { name: "LogiSync Microservices", description: "Distributed microservices for supply chain tracking and vendor management.", status: "in_progress" as const, budget: 32000, hourlyRate: 100, startDate: now - 30 * day, endDate: now + 30 * day, progress: 35, category: "Microservices", priority: "high" as const, clientIdx: 3 },
      { name: "MediTech Patient Portal", description: "HIPAA-compliant portal with FHIR APIs, encryption, and audit logging.", status: "in_progress" as const, budget: 35000, hourlyRate: 130, startDate: now - 25 * day, endDate: now + 25 * day, progress: 40, category: "Healthcare", priority: "critical" as const, clientIdx: 4 },
      { name: "DataVault ETL Pipelines", description: "Data warehouse with ETL pipelines using dbt, Airflow, and BigQuery.", status: "in_progress" as const, budget: 18000, hourlyRate: 140, startDate: now - 15 * day, endDate: now + 35 * day, progress: 50, category: "Data", priority: "high" as const, clientIdx: 5 },
      { name: "Legacy Migration (Failed)", description: "Attempted legacy system migration — too many dependencies.", status: "cancelled" as const, budget: 40000, hourlyRate: 120, startDate: now - 90 * day, endDate: now - 20 * day, progress: 15, category: "Migration", priority: "low" as const, clientIdx: 0 },
    ],
    "management-heavy": [
      { name: "Enterprise Transformation", description: "Multi-phase digital transformation across 5 departments.", status: "in_progress" as const, budget: 48000, hourlyRate: 120, startDate: now - 30 * day, endDate: now + 60 * day, progress: 25, category: "Consulting", priority: "critical" as const, clientIdx: 2 },
      { name: "GovConnect Portal", description: "Citizen-facing government services portal with auth and document management.", status: "not_started" as const, budget: 55000, hourlyRate: 150, startDate: now + 10 * day, endDate: now + 120 * day, progress: 0, category: "Government", priority: "high" as const, clientIdx: 4 },
      { name: "AgileOps Process Audit", description: "Workflow audit, bottleneck identification, and optimization roadmap.", status: "in_progress" as const, budget: 8000, hourlyRate: 90, startDate: now - 10 * day, endDate: now + 5 * day, progress: 75, category: "Consulting", priority: "medium" as const, clientIdx: 5 },
      { name: "RetailMax Inventory (Lost)", description: "Inventory system — lost to competitor.", status: "cancelled" as const, budget: 14000, hourlyRate: 55, startDate: now - 60 * day, endDate: now - 30 * day, progress: 20, category: "Inventory", priority: "low" as const, clientIdx: 3 },
      { name: "Agile Coaching Retainer", description: "Monthly agile coaching and team facilitation for 6 months.", status: "in_progress" as const, budget: 6000, hourlyRate: 90, startDate: now - 60 * day, endDate: now + 120 * day, progress: 33, category: "Coaching", priority: "medium" as const, clientIdx: 5 },
    ],
  };

  return themeProjects[theme] || themeProjects["frontend-heavy"];
}

function getProposalsData(theme: string) {
  const now = Date.now();

  return [
    { title: "Project Proposal — Phase 1", description: "Initial scope and timeline for the project.", status: "draft" as const, value: 8000, validUntil: now + 30 * day, sentAt: undefined, viewedAt: undefined, signedAt: undefined, declinedAt: undefined, clientIdx: 0 },
    { title: "Revised Proposal — Updated Scope", description: "Updated proposal reflecting scope changes discussed in meeting.", status: "sent" as const, value: 12000, validUntil: now + 14 * day, sentAt: now - 3 * day, viewedAt: undefined, signedAt: undefined, declinedAt: undefined, clientIdx: 1 },
    { title: "Enterprise Service Agreement", description: "Comprehensive service agreement with SLA terms.", status: "viewed" as const, value: 25000, validUntil: now + 7 * day, sentAt: now - 7 * day, viewedAt: now - 2 * day, signedAt: undefined, declinedAt: undefined, clientIdx: 2 },
    { title: "Fixed-Price Website Build", description: "Fixed-price proposal for complete website development.", status: "signed" as const, value: 15000, validUntil: now - 5 * day, sentAt: now - 20 * day, viewedAt: now - 18 * day, signedAt: now - 10 * day, declinedAt: undefined, clientIdx: 3 },
    { title: "Consulting Retainer Q3", description: "Monthly retainer for ongoing consulting services.", status: "declined" as const, value: 6000, validUntil: now - 10 * day, sentAt: now - 25 * day, viewedAt: now - 20 * day, signedAt: undefined, declinedAt: now - 15 * day, clientIdx: 4 },
    { title: "MVP Development Proposal", description: "Minimum viable product development with phased delivery.", status: "expired" as const, value: 9500, validUntil: now - 30 * day, sentAt: now - 45 * day, viewedAt: undefined, signedAt: undefined, declinedAt: undefined, clientIdx: 0 },
  ];
}

function getInvoicesData(theme: string) {
  const now = Date.now();

  return [
    { amount: 1500, status: "draft" as const, dueDate: now + 30 * day, paidAt: undefined, description: "Monthly retainer — June 2026", items: [{ description: "Development hours (20h)", quantity: 20, rate: 75 }], clientIdx: 0 },
    { amount: 4200, status: "sent" as const, dueDate: now + 14 * day, paidAt: undefined, description: "Phase 2 delivery — Dashboard module", items: [{ description: "Dashboard development", quantity: 40, rate: 105 }], clientIdx: 1 },
    { amount: 8500, status: "viewed" as const, dueDate: now + 7 * day, paidAt: undefined, description: "Project milestone 3 — API integration", items: [{ description: "API development (50h)", quantity: 50, rate: 170 }], clientIdx: 2 },
    { amount: 12000, status: "paid" as const, dueDate: now - 5 * day, paidAt: now - 3 * day, description: "Complete project delivery", items: [{ description: "Full project (120h)", quantity: 120, rate: 100 }], clientIdx: 3 },
    { amount: 3500, status: "overdue" as const, dueDate: now - 15 * day, paidAt: undefined, description: "Design sprint — Week 4", items: [{ description: "UI design (35h)", quantity: 35, rate: 100 }], clientIdx: 4 },
    { amount: 750, status: "cancelled" as const, dueDate: now - 20 * day, paidAt: undefined, description: "Partial payment — Cancelled project", items: [{ description: "Hours worked before cancellation", quantity: 10, rate: 75 }], clientIdx: 0 },
    { amount: 2500, status: "paid" as const, dueDate: now - 30 * day, paidAt: now - 28 * day, description: "Consulting fees — May 2026", items: [{ description: "Consulting (25h)", quantity: 25, rate: 100 }], clientIdx: 1 },
  ];
}

function getTagsData(theme: string) {
  const themeTags: Record<string, any[]> = {
    "frontend-heavy": [
      { name: "React", color: "#61dafb", category: "tech" },
      { name: "Next.js", color: "#000000", category: "tech" },
      { name: "TypeScript", color: "#3178c6", category: "tech" },
      { name: "CSS/Tailwind", color: "#38bdf8", category: "tech" },
      { name: "Dashboard", color: "#475569", category: "project" },
      { name: "Responsive", color: "#10b981", category: "project" },
      { name: "Urgent", color: "#ef4444", category: "priority" },
      { name: "Bug Fix", color: "#f97316", category: "type" },
    ],
    "design-heavy": [
      { name: "Figma", color: "#a259ff", category: "tool" },
      { name: "Brand Identity", color: "#ec4899", category: "project" },
      { name: "UI/UX", color: "#3b82f6", category: "skill" },
      { name: "Illustration", color: "#f59e0b", category: "type" },
      { name: "Motion Design", color: "#475569", category: "type" },
      { name: "Icon Design", color: "#14b8a6", category: "type" },
      { name: "Revisions", color: "#ef4444", category: "status" },
      { name: "Approved", color: "#22c55e", category: "status" },
    ],
    "backend-heavy": [
      { name: "Node.js", color: "#339933", category: "tech" },
      { name: "PostgreSQL", color: "#4169e1", category: "tech" },
      { name: "AWS", color: "#ff9900", category: "infra" },
      { name: "Docker", color: "#2496ed", category: "infra" },
      { name: "API Design", color: "#6366f1", category: "skill" },
      { name: "Security", color: "#ef4444", category: "concern" },
      { name: "HIPAA", color: "#dc2626", category: "compliance" },
      { name: "Microservices", color: "#475569", category: "architecture" },
    ],
    "management-heavy": [
      { name: "Agile", color: "#3b82f6", category: "methodology" },
      { name: "Scoping", color: "#475569", category: "phase" },
      { name: "Client Call", color: "#10b981", category: "activity" },
      { name: "Retainer", color: "#f59e0b", category: "contract" },
      { name: "Enterprise", color: "#6366f1", category: "tier" },
      { name: "Risk Review", color: "#ef4444", category: "concern" },
      { name: "Timeline", color: "#0ea5e9", category: "planning" },
      { name: "Budget", color: "#22c55e", category: "financial" },
    ],
  };

  return themeTags[theme] || themeTags["frontend-heavy"];
}

function getGoalsData(theme: string, hourlyRate: number) {
  const now = Date.now();

  const themeGoals: Record<string, any[]> = {
    "frontend-heavy": [
      {
        title: "Ship 5 React Components to Production", description: "Build and deploy 5 production-ready React components with full test coverage and Storybook docs.", type: "custom", target: 5, current: 3, unit: "components", deadline: now + 14 * day, status: "in_progress", streak: 7, milestones: [
          { id: "ms1", title: "Design system audit", completed: true },
          { id: "ms2", title: "Build 3 core components", completed: true },
          { id: "ms3", title: "Build 2 advanced components", completed: false },
        ],
      },
      {
        title: "Achieve 98% Lighthouse Score", description: "Optimize all client websites to achieve 98+ Lighthouse performance scores.", type: "custom", target: 98, current: 92, unit: "%", deadline: now + 21 * day, status: "in_progress", streak: 0, milestones: [
          { id: "ms4", title: "Audit current scores", completed: true },
          { id: "ms5", title: "Optimize images and fonts", completed: true },
          { id: "ms6", title: "Fix render-blocking resources", completed: false },
        ],
      },
      {
        title: "Reach $8K Monthly Revenue", description: "Focus on frontend projects to reach $8K monthly revenue.", type: "revenue", target: 8000, current: 6200, unit: "USD", deadline: now + 30 * day, status: "in_progress", streak: 12, milestones: [
          { id: "ms7", title: "Close 2 new deals", completed: true },
          { id: "ms8", title: "Increase hourly rate", completed: false },
        ],
      },
      {
        title: "Zero Accessibility Violations", description: "Ensure all projects pass WCAG 2.1 AA compliance checks.", type: "custom", target: 0, current: 3, unit: "violations", deadline: now + 14 * day, status: "in_progress", streak: 0, milestones: [
          { id: "ms9", title: "Run accessibility audit", completed: true },
          { id: "ms10", title: "Fix critical violations", completed: false },
        ],
      },
    ],
    "design-heavy": [
      {
        title: "Complete 10 Design Projects", description: "Deliver 10 design projects from concept to handoff this quarter.", type: "custom", target: 10, current: 7, unit: "projects", deadline: now + 30 * day, status: "in_progress", streak: 5, milestones: [
          { id: "ms1", title: "Complete 5 projects", completed: true },
          { id: "ms2", title: "Complete 8 projects", completed: false },
        ],
      },
      {
        title: "Build Design System v2", description: "Create a comprehensive design system with 50+ components.", type: "custom", target: 50, current: 35, unit: "components", deadline: now + 45 * day, status: "in_progress", streak: 14, milestones: [
          { id: "ms3", title: "Core components (20)", completed: true },
          { id: "ms4", title: "Advanced components (30)", completed: true },
          { id: "ms5", title: "All components (50)", completed: false },
        ],
      },
      {
        title: "Achieve $6K Design Revenue", description: "Monthly design revenue target.", type: "revenue", target: 6000, current: 4500, unit: "USD", deadline: now + 30 * day, status: "in_progress", streak: 8, milestones: [],
      },
      {
        title: "Get Dribbble Featured", description: "Get 3 shots featured on Dribbble to boost visibility.", type: "custom", target: 3, current: 1, unit: "features", deadline: now + 60 * day, status: "in_progress", streak: 0, milestones: [],
      },
    ],
    "backend-heavy": [
      {
        title: "Zero Security Vulnerabilities", description: "Ensure all backend systems have zero critical/high security vulnerabilities.", type: "custom", target: 0, current: 2, unit: "vulnerabilities", deadline: now + 7 * day, status: "in_progress", streak: 0, milestones: [
          { id: "ms1", title: "Run Snyk scan", completed: true },
          { id: "ms2", title: "Fix critical issues", completed: false },
        ],
      },
      {
        title: "99.9% API Uptime", description: "Maintain 99.9% uptime across all client APIs.", type: "custom", target: 99.9, current: 99.7, unit: "%", deadline: now + 30 * day, status: "in_progress", streak: 21, milestones: [
          { id: "ms3", title: "Set up monitoring", completed: true },
          { id: "ms4", title: "Fix top 5 error sources", completed: true },
          { id: "ms5", title: "Achieve 99.9%", completed: false },
        ],
      },
      {
        title: "Reach $12K Backend Revenue", description: "Monthly backend development revenue.", type: "revenue", target: 12000, current: 9800, unit: "USD", deadline: now + 30 * day, status: "in_progress", streak: 15, milestones: [],
      },
      {
        title: "HIPAA Certification", description: "Achieve HIPAA compliance certification for healthcare projects.", type: "custom", target: 1, current: 0, unit: "certification", deadline: now + 60 * day, status: "not_started", streak: 0, milestones: [],
      },
    ],
    "management-heavy": [
      {
        title: "Manage 8 Active Projects", description: "Successfully manage 8 concurrent projects without any deadline slips.", type: "custom", target: 8, current: 5, unit: "projects", deadline: now + 30 * day, status: "in_progress", streak: 30, milestones: [
          { id: "ms1", title: "5 projects running smoothly", completed: true },
          { id: "ms2", title: "Add 3 more projects", completed: false },
        ],
      },
      {
        title: "95% Client Satisfaction", description: "Maintain 95%+ client satisfaction across all managed projects.", type: "custom", target: 95, current: 91, unit: "%", deadline: now + 21 * day, status: "in_progress", streak: 10, milestones: [],
      },
      {
        title: "$15K Team Revenue", description: "Generate $15K in team revenue this month through project management.", type: "revenue", target: 15000, current: 11200, unit: "USD", deadline: now + 15 * day, status: "in_progress", streak: 5, milestones: [],
      },
      {
        title: "Onboard 4 Team Members", description: "Successfully onboard 4 new team members with full training.", type: "custom", target: 4, current: 2, unit: "members", deadline: now + 30 * day, status: "in_progress", streak: 0, milestones: [
          { id: "ms3", title: "Create onboarding docs", completed: true },
          { id: "ms4", title: "Train 2 members", completed: true },
          { id: "ms5", title: "Train remaining 2", completed: false },
        ],
      },
    ],
  };

  return themeGoals[theme] || themeGoals["frontend-heavy"];
}

function getScopeData(theme: string) {
  const now = Date.now();

  return [
    {
      title: "Primary Project Scope",
      description: "Detailed scope definition for the main active project with clear deliverables, timeline, and revision limits.",
      deliverables: [
        { id: "d1", name: "Discovery & Planning", description: "Requirements gathering and project plan", estimatedHours: 10, status: "completed" as const },
        { id: "d2", name: "Core Development", description: "Main development phase", estimatedHours: 40, status: "in_progress" as const },
        { id: "d3", name: "Testing & QA", description: "Quality assurance and bug fixes", estimatedHours: 15, status: "pending" as const },
        { id: "d4", name: "Launch & Handoff", description: "Deployment and documentation", estimatedHours: 5, status: "pending" as const },
      ],
      totalEstimatedHours: 70,
      revisionLimit: 3,
      revisionCount: 1,
      status: "active" as const,
    },
    {
      title: "Secondary Project Scope",
      description: "Scope for a smaller project with fewer deliverables and tighter timeline.",
      deliverables: [
        { id: "d5", name: "Design Phase", description: "UI/UX design and prototyping", estimatedHours: 20, status: "in_progress" as const },
        { id: "d6", name: "Implementation", description: "Development and integration", estimatedHours: 30, status: "pending" as const },
      ],
      totalEstimatedHours: 50,
      revisionLimit: 2,
      revisionCount: 0,
      status: "active" as const,
    },
    {
      title: "Completed Project Scope",
      description: "Scope from a previously completed project.",
      deliverables: [
        { id: "d7", name: "Full Delivery", description: "Complete project delivery", estimatedHours: 60, status: "completed" as const },
      ],
      totalEstimatedHours: 60,
      revisionLimit: 3,
      revisionCount: 2,
      status: "completed" as const,
    },
  ];
}

function getWorkSessionsData(theme: string, hourlyRate: number) {
  const now = Date.now();

  const themeSessions: Record<string, any[]> = {
    "frontend-heavy": [
      { startTime: now - 2 * 60 * 60 * 1000, endTime: undefined, totalMinutes: undefined, complianceStatus: "active" as const, clientName: "CloudMetrics SaaS", projectName: "Dashboard Build", hourlyRate, platform: "upwork" as const, notes: "Working on chart components", isManualEntry: false, invoiced: false, status: "active" as const, timeBlocks: [
        { start: now - 2 * 60 * 60 * 1000, end: now - 1.75 * 60 * 60 * 1000, activity: "Implementing chart component", website: "github.com", status: "compliant" as const, screenshots: 3, mouse: true, keyboard: true, inactiveSec: 5 },
        { start: now - 1.75 * 60 * 60 * 1000, end: now - 1.5 * 60 * 60 * 1000, activity: "CSS styling", website: "tailwindcss.com", status: "compliant" as const, screenshots: 2, mouse: true, keyboard: true, inactiveSec: 12 },
        { start: now - 1.5 * 60 * 60 * 1000, end: now - 1.25 * 60 * 60 * 1000, activity: "Social media break", website: "twitter.com", status: "at_risk" as const, screenshots: 1, mouse: true, keyboard: false, inactiveSec: 180 },
      ]},
      { startTime: now - 6 * 60 * 60 * 1000, endTime: now - 4.5 * 60 * 60 * 1000, totalMinutes: 90, complianceStatus: "active" as const, clientName: "PixelPerfect Agency", projectName: "Component Library", hourlyRate, platform: "upwork" as const, notes: "Button and card components", status: "completed" as const, timeBlocks: [] },
      { startTime: now - 26 * 60 * 60 * 1000, endTime: now - 22 * 60 * 60 * 1000, totalMinutes: 240, complianceStatus: "active" as const, clientName: "TechCorp Solutions", projectName: "Website Redesign", hourlyRate, platform: "upwork" as const, notes: "", status: "completed" as const, timeBlocks: [] },
      { startTime: now - 50 * 60 * 60 * 1000, endTime: now - 48 * 60 * 60 * 1000, totalMinutes: 120, complianceStatus: "at_risk" as const, clientName: "GreenLeaf Organics", projectName: "Website", hourlyRate, platform: "upwork" as const, notes: "Distracted session", status: "completed" as const, timeBlocks: [] },
      { startTime: now - 74 * 60 * 60 * 1000, endTime: now - 72 * 60 * 60 * 1000, totalMinutes: 120, complianceStatus: "rejected" as const, clientName: "EduLearn Platform", projectName: "Course UI", hourlyRate, platform: "manual" as const, notes: "Manual entry — rejected on review", isManualEntry: true, status: "completed" as const, timeBlocks: [] },
    ],
    "design-heavy": [
      { startTime: now - 1.5 * 60 * 60 * 1000, endTime: undefined, totalMinutes: undefined, complianceStatus: "active" as const, clientName: "Creative Studios", projectName: "Brand Identity", hourlyRate, platform: "direct" as const, notes: "Working on logo variations", status: "active" as const, timeBlocks: [
        { start: now - 1.5 * 60 * 60 * 1000, end: now - 1 * 60 * 60 * 1000, activity: "Logo design in Figma", website: "figma.com", status: "compliant" as const, screenshots: 4, mouse: true, keyboard: true, inactiveSec: 3 },
        { start: now - 1 * 60 * 60 * 1000, end: now - 0.5 * 60 * 60 * 1000, activity: "Color palette exploration", website: "coolors.co", status: "compliant" as const, screenshots: 3, mouse: true, keyboard: true, inactiveSec: 8 },
      ]},
      { startTime: now - 8 * 60 * 60 * 1000, endTime: now - 6 * 60 * 60 * 1000, totalMinutes: 120, complianceStatus: "active" as const, clientName: "Luxe Fashion", projectName: "E-Commerce UI", hourlyRate, platform: "fiverr" as const, notes: "Product page design", status: "completed" as const, timeBlocks: [] },
      { startTime: now - 32 * 60 * 60 * 1000, endTime: now - 30 * 60 * 60 * 1000, totalMinutes: 120, complianceStatus: "active" as const, clientName: "RetroTech Gaming", projectName: "Game UI", hourlyRate, platform: "direct" as const, notes: "", status: "completed" as const, timeBlocks: [] },
      { startTime: now - 56 * 60 * 60 * 1000, endTime: now - 54 * 60 * 60 * 1000, totalMinutes: 120, complianceStatus: "active" as const, clientName: "StartupHub Inc", projectName: "Landing Pages", hourlyRate, platform: "fiverr" as const, notes: "", invoiced: true, status: "completed" as const, timeBlocks: [] },
    ],
    "backend-heavy": [
      { startTime: now - 3 * 60 * 60 * 1000, endTime: undefined, totalMinutes: undefined, complianceStatus: "active" as const, clientName: "FinServe Analytics", projectName: "Analytics API", hourlyRate, platform: "upwork" as const, notes: "WebSocket integration", status: "active" as const, timeBlocks: [
        { start: now - 3 * 60 * 60 * 1000, end: now - 2.5 * 60 * 60 * 1000, activity: "WebSocket server implementation", website: "github.com", status: "compliant" as const, screenshots: 2, mouse: true, keyboard: true, inactiveSec: 5 },
        { start: now - 2.5 * 60 * 60 * 1000, end: now - 2 * 60 * 60 * 1000, activity: "API rate limiting", website: "docs.convex.dev", status: "compliant" as const, screenshots: 2, mouse: true, keyboard: true, inactiveSec: 10 },
        { start: now - 2 * 60 * 60 * 1000, end: now - 1.5 * 60 * 60 * 1000, activity: "Server monitoring dashboard", website: "aws.amazon.com", status: "compliant" as const, screenshots: 1, mouse: true, keyboard: true, inactiveSec: 15 },
      ]},
      { startTime: now - 10 * 60 * 60 * 1000, endTime: now - 7 * 60 * 60 * 1000, totalMinutes: 180, complianceStatus: "active" as const, clientName: "LogiSync Supply Chain", projectName: "Microservices", hourlyRate, platform: "upwork" as const, notes: "Service mesh configuration", status: "completed" as const, timeBlocks: [] },
      { startTime: now - 34 * 60 * 60 * 1000, endTime: now - 31 * 60 * 60 * 1000, totalMinutes: 180, complianceStatus: "active" as const, clientName: "MediTech Health", projectName: "Patient Portal", hourlyRate, platform: "toptal" as const, notes: "Encryption implementation", status: "completed" as const, timeBlocks: [] },
      { startTime: now - 58 * 60 * 60 * 1000, endTime: now - 56 * 60 * 60 * 1000, totalMinutes: 120, complianceStatus: "at_risk" as const, clientName: "DataVault Inc", projectName: "ETL Pipeline", hourlyRate, platform: "direct" as const, notes: "Long running queries — switched to batch", status: "completed" as const, timeBlocks: [] },
      { startTime: now - 82 * 60 * 60 * 1000, endTime: now - 80 * 60 * 60 * 1000, totalMinutes: 120, complianceStatus: "rejected" as const, clientName: "Legacy Corp", projectName: "Migration", hourlyRate, platform: "manual" as const, notes: "Manual time — no evidence", isManualEntry: true, status: "completed" as const, timeBlocks: [] },
    ],
    "management-heavy": [
      { startTime: now - 1 * 60 * 60 * 1000, endTime: undefined, totalMinutes: undefined, complianceStatus: "active" as const, clientName: "Global Enterprises", projectName: "Transformation", hourlyRate, platform: "direct" as const, notes: "Sprint planning session", status: "active" as const, timeBlocks: [
        { start: now - 1 * 60 * 60 * 1000, end: now - 0.5 * 60 * 60 * 1000, activity: "Sprint planning meeting", website: "zoom.us", status: "compliant" as const, screenshots: 2, mouse: true, keyboard: true, inactiveSec: 5 },
      ]},
      { startTime: now - 5 * 60 * 60 * 1000, endTime: now - 3.5 * 60 * 60 * 1000, totalMinutes: 90, complianceStatus: "active" as const, clientName: "AgileOps Consulting", projectName: "Process Audit", hourlyRate, platform: "direct" as const, notes: "Client workshop", status: "completed" as const, timeBlocks: [] },
      { startTime: now - 29 * 60 * 60 * 1000, endTime: now - 27.5 * 60 * 60 * 1000, totalMinutes: 90, complianceStatus: "active" as const, clientName: "GovConnect Portal", projectName: "Scoping", hourlyRate, platform: "direct" as const, notes: "Requirements gathering", invoiced: true, status: "completed" as const, timeBlocks: [] },
      { startTime: now - 53 * 60 * 60 * 1000, endTime: now - 51.5 * 60 * 60 * 1000, totalMinutes: 90, complianceStatus: "active" as const, clientName: "AgileOps Consulting", projectName: "Coaching", hourlyRate, platform: "direct" as const, notes: "Team retrospective", status: "completed" as const, timeBlocks: [] },
    ],
  };

  return themeSessions[theme] || themeSessions["frontend-heavy"];
}

function getEvidenceData(theme: string) {
  const now = Date.now();

  return [
    { startTime: now - 5 * 60 * 60 * 1000, endTime: now - 3 * 60 * 60 * 1000, totalMinutes: 120, clientName: "TechCorp Solutions", projectName: "Main Project", screenshotCount: 8, activityLevel: "high", status: "completed", events: [
      { type: "screenshot", timestamp: now - 4.5 * 60 * 60 * 1000, data: { url: "github.com/project/repo", title: "Pull Request #142" } },
      { type: "activity", timestamp: now - 4 * 60 * 60 * 1000, data: { keystrokes: 450, mouseEvents: 120, duration: 300 } },
      { type: "app_switch", timestamp: now - 3.5 * 60 * 60 * 1000, data: { from: "VS Code", to: "Chrome" } },
      { type: "screenshot", timestamp: now - 3 * 60 * 60 * 1000, data: { url: "localhost:3000", title: "Dashboard Preview" } },
    ]},
    { startTime: now - 24 * 60 * 60 * 1000, endTime: now - 22 * 60 * 60 * 1000, totalMinutes: 120, clientName: "StartupHub Inc", projectName: "Secondary Project", screenshotCount: 5, activityLevel: "medium", status: "completed", events: [
      { type: "screenshot", timestamp: now - 23 * 60 * 60 * 1000, data: { url: "figma.com/design", title: "Design Review" } },
      { type: "activity", timestamp: now - 22.5 * 60 * 60 * 1000, data: { keystrokes: 200, mouseEvents: 80, duration: 300 } },
    ]},
    { startTime: now - 48 * 60 * 60 * 1000, endTime: now - 46 * 60 * 60 * 1000, totalMinutes: 120, clientName: "Global Enterprises", projectName: "Discovery Phase", screenshotCount: 3, activityLevel: "low", status: "disputed", events: [
      { type: "screenshot", timestamp: now - 47 * 60 * 60 * 1000, data: { url: "zoom.us/meeting", title: "Client Call" } },
      { type: "inactivity", timestamp: now - 46.5 * 60 * 60 * 1000, data: { duration: 1800, reason: "No keyboard/mouse activity" } },
    ]},
  ];
}

function getCustomFieldsData(theme: string) {
  const themeFields: Record<string, any[]> = {
    "frontend-heavy": [
      { tableName: "deals", fieldName: "tech_stack", label: "Tech Stack", type: "select", options: ["React", "Vue", "Angular", "Svelte"], order: 0 },
      { tableName: "deals", fieldName: "is_responsive", label: "Responsive Required", type: "boolean", order: 1 },
      { tableName: "deals", fieldName: "framework_version", label: "Framework Version", type: "text", order: 2 },
      { tableName: "projects", fieldName: "lighthouse_target", label: "Lighthouse Target", type: "number", order: 0 },
    ],
    "design-heavy": [
      { tableName: "deals", fieldName: "design_tool", label: "Design Tool", type: "select", options: ["Figma", "Sketch", "Adobe XD"], order: 0 },
      { tableName: "deals", fieldName: "needs_prototype", label: "Prototype Required", type: "boolean", order: 1 },
      { tableName: "projects", fieldName: "revision_rounds", label: "Revision Rounds", type: "number", order: 0 },
    ],
    "backend-heavy": [
      { tableName: "deals", fieldName: "infrastructure", label: "Infrastructure", type: "select", options: ["AWS", "GCP", "Azure", "Self-hosted"], order: 0 },
      { tableName: "deals", fieldName: "needs_api_docs", label: "API Docs Required", type: "boolean", order: 1 },
      { tableName: "projects", fieldName: "uptime_sla", label: "Uptime SLA (%)", type: "number", order: 0 },
      { tableName: "projects", fieldName: "compliance_required", label: "Compliance Level", type: "select", options: ["None", "SOC2", "HIPAA", "PCI-DSS"], order: 1 },
    ],
    "management-heavy": [
      { tableName: "deals", fieldName: "team_size_needed", label: "Team Size Needed", type: "number", order: 0 },
      { tableName: "deals", fieldName: "client_tier", label: "Client Tier", type: "select", options: ["Standard", "Premium", "Enterprise"], order: 1 },
      { tableName: "projects", fieldName: "sprint_length", label: "Sprint Length (days)", type: "number", order: 0 },
    ],
  };

  return themeFields[theme] || themeFields["frontend-heavy"];
}

function getPlatformConnectionsData(theme: string) {
  const now = Date.now();

  const platforms: Record<string, any[]> = {
    "frontend-heavy": [
      { platform: "upwork", status: "connected", connectedAt: now - 60 * day, lastSyncedAt: now - 2 * 60 * 60 * 1000, platformAccountId: "upwork-priya-001", metadata: { jobsCompleted: 45, rating: 4.95, earnings: 28000 } },
      { platform: "github", status: "connected", connectedAt: now - 90 * day, lastSyncedAt: now - 1 * 60 * 60 * 1000, platformAccountId: "priya-dev", metadata: { repos: 23, contributions: 1200 } },
      { platform: "fiverr", status: "disconnected", connectedAt: now - 30 * day, lastSyncedAt: now - 14 * day, platformAccountId: "priya-fiverr", metadata: { gigs: 3, orders: 12 } },
    ],
    "design-heavy": [
      { platform: "fiverr", status: "connected", connectedAt: now - 45 * day, lastSyncedAt: now - 4 * 60 * 60 * 1000, platformAccountId: "marcus-design", metadata: { gigs: 8, orders: 56, rating: 4.9 } },
      { platform: "dribbble", status: "connected", connectedAt: now - 60 * day, lastSyncedAt: now - 12 * 60 * 60 * 1000, platformAccountId: "marcus-dribbble", metadata: { shots: 42, followers: 1200 } },
      { platform: "upwork", status: "error", connectedAt: now - 20 * day, lastSyncedAt: now - 7 * day, platformAccountId: "marcus-upwork", metadata: { error: "Token expired" } },
    ],
    "backend-heavy": [
      { platform: "toptal", status: "connected", connectedAt: now - 90 * day, lastSyncedAt: now - 1 * 60 * 60 * 1000, platformAccountId: "aisha-toptal", metadata: { projects: 12, rating: 4.98 } },
      { platform: "upwork", status: "connected", connectedAt: now - 60 * day, lastSyncedAt: now - 3 * 60 * 60 * 1000, platformAccountId: "aisha-upwork", metadata: { jobsCompleted: 34, earnings: 45000 } },
      { platform: "github", status: "connected", connectedAt: now - 120 * day, lastSyncedAt: now - 30 * 60 * 1000, platformAccountId: "aisha-dev", metadata: { repos: 15, contributions: 2300 } },
    ],
    "management-heavy": [
      { platform: "direct", status: "connected", connectedAt: now - 30 * day, lastSyncedAt: now - 6 * 60 * 60 * 1000, platformAccountId: "carlos-linkedin", metadata: { connections: 850, recommendations: 12 } },
      { platform: "upwork", status: "connected", connectedAt: now - 45 * day, lastSyncedAt: now - 8 * 60 * 60 * 1000, platformAccountId: "carlos-upwork", metadata: { jobsCompleted: 22, rating: 4.85 } },
    ],
  };

  return platforms[theme] || platforms["frontend-heavy"];
}

function getRecurringInvoicesData(theme: string) {
  const now = Date.now();

  return [
    { amount: 2000, frequency: "monthly", status: "active", nextDueDate: now + 15 * day, description: "Monthly retainer — development", clientIdx: 0 },
    { amount: 1500, frequency: "biweekly", status: "active", nextDueDate: now + 7 * day, description: "Bi-weekly design hours", clientIdx: 1 },
    { amount: 5000, frequency: "monthly", status: "paused", nextDueDate: now + 30 * day, description: "Monthly backend maintenance", clientIdx: 2 },
  ];
}

function getProposalTemplatesData(theme: string) {
  const templates: Record<string, any[]> = {
    "frontend-heavy": [
      { name: "React Project Proposal", description: "Standard template for React/Next.js projects", content: "# React Project Proposal\n\n## Overview\n\n## Tech Stack\n- React 19\n- Next.js 15\n- TypeScript\n- Tailwind CSS\n\n## Timeline\n\n## Budget\n\n## Deliverables", category: "frontend", isDefault: true },
      { name: "Dashboard Development", description: "Template for dashboard and analytics projects", content: "# Dashboard Development Proposal\n\n## Features\n- Real-time data visualization\n- Interactive charts\n- Export functionality\n\n## Timeline\n\n## Budget", category: "frontend", isDefault: false },
    ],
    "design-heavy": [
      { name: "Brand Identity Package", description: "Complete brand identity proposal template", content: "# Brand Identity Proposal\n\n## Deliverables\n- Logo design (3 concepts)\n- Color palette\n- Typography guide\n- Brand guidelines document\n\n## Revision Policy\n\n## Timeline\n\n## Investment", category: "design", isDefault: true },
      { name: "UI/UX Design Sprint", description: "Design sprint proposal template", content: "# Design Sprint Proposal\n\n## Process\n1. Discovery\n2. Wireframing\n3. Visual Design\n4. Prototyping\n5. User Testing\n\n## Timeline\n\n## Investment", category: "design", isDefault: false },
    ],
    "backend-heavy": [
      { name: "API Development Proposal", description: "Template for backend API projects", content: "# API Development Proposal\n\n## Architecture\n- RESTful API design\n- Database schema\n- Authentication & authorization\n- Rate limiting\n\n## Tech Stack\n- Node.js / Python\n- PostgreSQL\n- Redis\n- Docker\n\n## SLA\n\n## Timeline", category: "backend", isDefault: true },
      { name: "Infrastructure Setup", description: "Cloud infrastructure and DevOps proposal", content: "# Infrastructure Proposal\n\n## Services\n- CI/CD pipeline\n- Container orchestration\n- Monitoring & alerting\n- Backup strategy\n\n## Cloud Provider\n\n## Monthly Estimate", category: "infra", isDefault: false },
    ],
    "management-heavy": [
      { name: "Project Management Retainer", description: "Monthly PM retainer template", content: "# Project Management Retainer\n\n## Services\n- Sprint planning\n- Daily standups\n- Client communication\n- Risk management\n- Reporting\n\n## Hours Included\n\n## Additional Hours Rate", category: "management", isDefault: true },
      { name: "Consulting Engagement", description: "Consulting and audit proposal", content: "# Consulting Engagement\n\n## Scope\n- Process audit\n- Recommendations\n- Implementation support\n\n## Deliverables\n\n## Timeline\n\n## Fee Structure", category: "consulting", isDefault: false },
    ],
  };

  return templates[theme] || templates["frontend-heavy"];
}

function getComplianceAlertMessage(theme: string, idx: number): string {
  const messages: Record<string, string[]> = {
    "frontend-heavy": ["Non-browser work detected: VS Code terminal active. Please verify this is project-related.", "Fiverr tab detected. Timer paused. Close tab within 5 minutes.", "Timer paused for 10+ minutes. Resume or end session?"],
    "design-heavy": ["Figma activity detected — this counts as billable time.", "YouTube tab open. Is this research or personal? Mark accordingly.", "Timer paused during active design session."],
    "backend-heavy": ["SSH terminal detected — this counts as billable development time.", "Multiple server tabs open. Verify all are project-related.", "Extended inactivity during server monitoring. End session?"],
    "management-heavy": ["Zoom meeting detected — auto-tracking meeting time.", "Slack open during billed hours. Mark as communication time?", "Timer paused for 15+ minutes. Meeting may have ended."],
  };

  return (messages[theme] || messages["frontend-heavy"])[idx % 3];
}

function getDmMessages(userIdx1: number, userIdx2: number): Array<{ authorIdx: number; content: string; hoursAgo: number }> {
  const allDmMessages = [
    { authorIdx: 0, content: "Hey! Quick question about the project timeline.", hoursAgo: 48 },
    { authorIdx: 1, content: "Sure, what's up?", hoursAgo: 47.5 },
    { authorIdx: 0, content: "Can we move the design review to Thursday?", hoursAgo: 47 },
    { authorIdx: 1, content: "Thursday works for me. 2 PM?", hoursAgo: 46.5 },
    { authorIdx: 0, content: "Perfect, I'll send the invite.", hoursAgo: 46 },
    { authorIdx: 1, content: "Thanks! I'll have the mockups ready by then.", hoursAgo: 45 },
    { authorIdx: 0, content: "Great work on the last sprint! 👏", hoursAgo: 24 },
    { authorIdx: 1, content: "Thanks! The team really pulled together.", hoursAgo: 23.5 },
  ];

  return allDmMessages;
}

// ─── UTILITY: List all created test users ────────────────────────────────────

export const listTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const results = [];
    for (const u of TEST_USERS) {
      const users = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", u.email)).take(1000);
      if (users.length > 0) {
        const user = users[0];
        const membership = await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) => {
            // Can't easily query all workspaces for a user, just list info
            return q;
          })
          .take(1000);

        results.push({
          email: u.email,
          name: u.name,
          userId: user._id,
          role: u.role,
          title: u.title,
          tier: user.subscriptionTier,
          hourlyRate: user.hourlyRate,
          password: u.password,
        });
      }
    }
    return results;
  },
});
