import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

// Add: helper to generate demo data for a specific user
async function seedUserData(ctx: any, userId: Id<"users">, hourlyRate: number) {
  const now = Date.now();
  const activeSessionId = await ctx.db.insert("workSessions", {
    userId,
    startTime: now - 90 * 60 * 1000, // 1.5h ago
    complianceStatus: "active",
    clientName: "Demo Client",
    projectName: "Landing Improvements",
    hourlyRate,
  });

  const pastStart = now - 6 * 60 * 60 * 1000; // 6h ago
  const pastEnd = pastStart + 60 * 60 * 1000; // 1h session
  const pastSessionId = await ctx.db.insert("workSessions", {
    userId,
    startTime: pastStart,
    endTime: pastEnd,
    totalMinutes: 60,
    complianceStatus: "rejected",
    clientName: "Legacy Client",
    projectName: "Cleanup",
    hourlyRate,
  });

  const addBlock = async ({
    sessionId,
    start,
    status,
    activity,
    website,
    screenshots,
    mouse,
    keyboard,
    inactiveSec,
  }: {
    sessionId: Id<"workSessions">;
    start: number;
    status: "compliant" | "at_risk" | "rejected";
    activity: string;
    website: string;
    screenshots: number;
    mouse: boolean;
    keyboard: boolean;
    inactiveSec: number;
  }) => {
    await ctx.db.insert("timeBlocks", {
      sessionId,
      userId,
      startTime: start,
      endTime: start + 5 * 60 * 1000,
      activity,
      website,
      complianceStatus: status,
      screenshotCount: screenshots,
      mouseActivity: mouse,
      keyboardActivity: keyboard,
      inactiveDuration: inactiveSec,
    });
  };

  // Active session blocks (~25 minutes)
  const activeBase = now - 30 * 60 * 1000;
  await addBlock({
    sessionId: activeSessionId,
    start: activeBase,
    status: "compliant",
    activity: "Review PRs",
    website: "github.com",
    screenshots: 3,
    mouse: true,
    keyboard: true,
    inactiveSec: 20,
  });
  await addBlock({
    sessionId: activeSessionId,
    start: activeBase + 5 * 60 * 1000,
    status: "at_risk",
    activity: "Competitive Research",
    website: "fiverr.com",
    screenshots: 2,
    mouse: true,
    keyboard: false,
    inactiveSec: 60,
  });
  await addBlock({
    sessionId: activeSessionId,
    start: activeBase + 10 * 60 * 1000,
    status: "compliant",
    activity: "Deploy fixes",
    website: "vercel.com",
    screenshots: 3,
    mouse: true,
    keyboard: true,
    inactiveSec: 12,
  });
  await addBlock({
    sessionId: activeSessionId,
    start: activeBase + 15 * 60 * 1000,
    status: "rejected",
    activity: "Idle",
    website: "youtube.com",
    screenshots: 1,
    mouse: false,
    keyboard: false,
    inactiveSec: 380,
  });
  await addBlock({
    sessionId: activeSessionId,
    start: activeBase + 20 * 60 * 1000,
    status: "compliant",
    activity: "Email client",
    website: "gmail.com",
    screenshots: 3,
    mouse: true,
    keyboard: true,
    inactiveSec: 10,
  });

  // Past session blocks (3 blocks)
  const pastBase = pastStart + 10 * 60 * 1000;
  await addBlock({
    sessionId: pastSessionId,
    start: pastBase,
    status: "rejected",
    activity: "AFK",
    website: "youtube.com",
    screenshots: 1,
    mouse: false,
    keyboard: false,
    inactiveSec: 600,
  });
  await addBlock({
    sessionId: pastSessionId,
    start: pastBase + 5 * 60 * 1000,
    status: "at_risk",
    activity: "Prospecting",
    website: "freelancer.com",
    screenshots: 2,
    mouse: true,
    keyboard: false,
    inactiveSec: 90,
  });
  await addBlock({
    sessionId: pastSessionId,
    start: pastBase + 10 * 60 * 1000,
    status: "compliant",
    activity: "Testing",
    website: "github.com",
    screenshots: 3,
    mouse: true,
    keyboard: true,
    inactiveSec: 20,
  });

  // Dispute report for past session
  await ctx.db.insert("disputeReports", {
    userId,
    sessionId: pastSessionId,
    caseId: `${String(userId).substring(0, 5)}-${new Date().toISOString().split("T")[0]}`,
    generatedAt: now - 2 * 60 * 60 * 1000,
    rejectedHours: 0.5,
    lostIncome: Math.round(hourlyRate * 0.5 * 100) / 100,
    reportContent:
      "# Dispute Report\n\nRejected time due to inactivity. Evidence attached (screenshots & activity logs).",
    status: "generated",
  });

  // One at-risk alert
  await ctx.db.insert("complianceAlerts", {
    userId,
    sessionId: activeSessionId,
    alertType: "at_risk",
    message: "Non-Upwork marketplace tab detected. Timer paused until closed.",
    triggeredAt: now - 3 * 60 * 1000,
    acknowledged: false,
    actionTaken: undefined,
  });

  // Ensure clients and projects exist for seeded sessions
  const ensureClient = async (
    clientName: string,
    platform: "upwork" | "fiverr" | "toptal" | "freelancer" | "direct",
    rate: number
  ) => {
    const existing = await ctx.db
      .query("clients")
      .withIndex("by_user_and_name", (q: any) => q.eq("userId", userId).eq("clientName", clientName))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("clients", {
      userId,
      clientName,
      platform,
      hourlyRate: rate,
      contractType: "hourly",
      riskLevel: "medium",
      addedAt: Date.now(),
      lastActivityAt: Date.now(),
    });
  };

  const ensureProject = async (
    clientId: Id<"clients">,
    projectName: string,
    rate: number
  ): Promise<Id<"projects">> => {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_user_and_name", (q: any) => q.eq("userId", userId).eq("projectName", projectName))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("projects", {
      userId,
      clientId,
      projectName,
      hourlyRate: rate,
      projectType: "ongoing",
      protectionLevel: "enhanced",
      status: "active",
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });
  };

  // Link data for Demo Client / Landing Improvements
  const demoClientId = await ensureClient("Demo Client", "direct", hourlyRate);
  await ensureProject(demoClientId, "Landing Improvements", hourlyRate);

  // Link data for Legacy Client / Cleanup
  const legacyClientId = await ensureClient("Legacy Client", "direct", hourlyRate);
  await ensureProject(legacyClientId, "Cleanup", hourlyRate);
}

export const seedCurrentUserData = mutation({
  args: {
    subscriptionTier: v.optional(v.union(v.literal("free"), v.literal("pro"))),
    hourlyRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("No signed-in user found. Please open /auth and sign in first.");
    }

    // If already seeded (has any timeBlocks), skip
    const existingBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(1);

    if (existingBlocks.length > 0) {
      return { status: "exists", message: "Mock data already present for current user." };
    }

    // Ensure basic user fields
    await ctx.db.patch(user._id, {
      subscriptionTier: args.subscriptionTier ?? "free",
      hourlyRate: args.hourlyRate ?? 22,
      joinedAt: user.joinedAt ?? Date.now(),
    });

    // Create a current active session (no endTime)
    const now = Date.now();
    const activeSessionId = await ctx.db.insert("workSessions", {
      userId: user._id,
      startTime: now - 2 * 60 * 60 * 1000, // started 2h ago
      complianceStatus: "active",
      clientName: "Acme Corp",
      projectName: "Website Revamp",
      hourlyRate: args.hourlyRate ?? 22,
    });

    // Create a past ended session
    const pastStart = now - 6 * 60 * 60 * 1000; // 6h ago
    const pastEnd = pastStart + 90 * 60 * 1000; // 1.5h session
    const pastSessionId = await ctx.db.insert("workSessions", {
      userId: user._id,
      startTime: pastStart,
      endTime: pastEnd,
      totalMinutes: Math.floor((pastEnd - pastStart) / (1000 * 60)),
      complianceStatus: "rejected",
      clientName: "Globex LLC",
      projectName: "Dashboard QA",
      hourlyRate: args.hourlyRate ?? 22,
    });

    // Helper to add 5-min blocks
    const addBlock = async ({
      sessionId,
      start,
      status,
      activity,
      website,
      screenshots,
      mouse,
      keyboard,
      inactiveSec,
    }: {
      sessionId: typeof activeSessionId;
      start: number;
      status: "compliant" | "at_risk" | "rejected";
      activity: string;
      website: string;
      screenshots: number;
      mouse: boolean;
      keyboard: boolean;
      inactiveSec: number;
    }) => {
      await ctx.db.insert("timeBlocks", {
        sessionId,
        userId: user._id,
        startTime: start,
        endTime: start + 5 * 60 * 1000,
        activity,
        website,
        complianceStatus: status,
        screenshotCount: screenshots,
        mouseActivity: mouse,
        keyboardActivity: keyboard,
        inactiveDuration: inactiveSec,
      });
    };

    // Populate time blocks for active session (last ~30 minutes)
    const activeBase = now - 35 * 60 * 1000;
    await addBlock({
      sessionId: activeSessionId,
      start: activeBase,
      status: "compliant",
      activity: "Code Review",
      website: "github.com",
      screenshots: 3,
      mouse: true,
      keyboard: true,
      inactiveSec: 12,
    });
    await addBlock({
      sessionId: activeSessionId,
      start: activeBase + 5 * 60 * 1000,
      status: "at_risk",
      activity: "Client Prospecting",
      website: "fiverr.com",
      screenshots: 2,
      mouse: true,
      keyboard: false,
      inactiveSec: 45,
    });
    await addBlock({
      sessionId: activeSessionId,
      start: activeBase + 10 * 60 * 1000,
      status: "compliant",
      activity: "Implement UI",
      website: "vercel.com",
      screenshots: 3,
      mouse: true,
      keyboard: true,
      inactiveSec: 10,
    });
    await addBlock({
      sessionId: activeSessionId,
      start: activeBase + 15 * 60 * 1000,
      status: "rejected",
      activity: "Break",
      website: "youtube.com",
      screenshots: 1,
      mouse: false,
      keyboard: false,
      inactiveSec: 420, // 7m inactivity
    });
    await addBlock({
      sessionId: activeSessionId,
      start: activeBase + 20 * 60 * 1000,
      status: "compliant",
      activity: "Bug Fixes",
      website: "github.com",
      screenshots: 3,
      mouse: true,
      keyboard: true,
      inactiveSec: 8,
    });
    await addBlock({
      sessionId: activeSessionId,
      start: activeBase + 25 * 60 * 1000,
      status: "at_risk",
      activity: "Compare Offers",
      website: "freelancer.com",
      screenshots: 2,
      mouse: true,
      keyboard: false,
      inactiveSec: 60,
    });

    // Populate blocks for past rejected session (3 blocks)
    const pastBase = pastStart + 10 * 60 * 1000;
    await addBlock({
      sessionId: pastSessionId,
      start: pastBase,
      status: "rejected",
      activity: "Idle",
      website: "youtube.com",
      screenshots: 1,
      mouse: false,
      keyboard: false,
      inactiveSec: 600,
    });
    await addBlock({
      sessionId: pastSessionId,
      start: pastBase + 5 * 60 * 1000,
      status: "at_risk",
      activity: "Research",
      website: "fiverr.com",
      screenshots: 2,
      mouse: true,
      keyboard: false,
      inactiveSec: 120,
    });
    await addBlock({
      sessionId: pastSessionId,
      start: pastBase + 10 * 60 * 1000,
      status: "compliant",
      activity: "Testing",
      website: "github.com",
      screenshots: 3,
      mouse: true,
      keyboard: true,
      inactiveSec: 15,
    });

    // Create one dispute report for the past session
    await ctx.db.insert("disputeReports", {
      userId: user._id,
      sessionId: pastSessionId,
      caseId: `${user._id.substring(0, 5)}-${new Date().toISOString().split("T")[0]}`,
      generatedAt: now - 3 * 60 * 60 * 1000,
      rejectedHours: 0.5,
      lostIncome: Math.round(((args.hourlyRate ?? 22) * 0.5) * 100) / 100,
      reportContent:
        "# Dispute Report\n\nSession contained rejected time due to inactivity. Evidence attached (screenshots and activity logs).",
      status: "generated",
    });

    // Add an active at-risk compliance alert
    await ctx.db.insert("complianceAlerts", {
      userId: user._id,
      sessionId: activeSessionId,
      alertType: "at_risk",
      message: "Fiverr tab detected. Timer paused. Close tab within 5 minutes to avoid rejection.",
      triggeredAt: now - 2 * 60 * 1000,
      acknowledged: false,
      actionTaken: undefined,
    });

    // Ensure clients and projects exist for seeded current user sessions
    const ensureClient = async (
      clientName: string,
      platform: "upwork" | "fiverr" | "toptal" | "freelancer" | "direct",
      rate: number
    ) => {
      const existing = await ctx.db
        .query("clients")
        .withIndex("by_user_and_name", (q: any) => q.eq("userId", user._id).eq("clientName", clientName))
        .first();
      if (existing) return existing._id;
      return await ctx.db.insert("clients", {
        userId: user._id,
        clientName,
        platform,
        hourlyRate: rate,
        contractType: "hourly",
        riskLevel: "medium",
        addedAt: Date.now(),
        lastActivityAt: Date.now(),
      });
    };

    const ensureProject = async (
      clientId: Id<"clients">,
      projectName: string,
      rate: number
    ): Promise<Id<"projects">> => {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_user_and_name", (q: any) => q.eq("userId", user._id).eq("projectName", projectName))
        .first();
      if (existing) return existing._id;
      return await ctx.db.insert("projects", {
        userId: user._id,
        clientId,
        projectName,
        hourlyRate: rate,
        projectType: "ongoing",
        protectionLevel: "enhanced",
        status: "active",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      });
    };

    // Link data for Acme Corp / Website Revamp
    const acmeClientId = await ensureClient("Acme Corp", "direct", args.hourlyRate ?? 22);
    await ensureProject(acmeClientId, "Website Revamp", args.hourlyRate ?? 22);

    // Link data for Globex LLC / Dashboard QA
    const globexClientId = await ensureClient("Globex LLC", "direct", args.hourlyRate ?? 22);
    await ensureProject(globexClientId, "Dashboard QA", args.hourlyRate ?? 22);

    return { status: "ok", message: "Seeded mock data for current user." };
  },
});

// Add: seed multiple demo users with realistic variance
export const seedDemoUsers = mutation({
  args: {
    count: v.optional(v.number()), // default 5
  },
  handler: async (ctx, args) => {
    const count = Math.min(Math.max(args.count ?? 5, 1), 20);

    const createdUsers: Array<{ userId: Id<"users">; email: string }> = [];

    for (let i = 1; i <= count; i++) {
      const email = `demo+${i}@timestop.app`;

      // If a demo user with this email already exists, skip creating a new one
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q: any) => q.eq("email", email))
        .first();

      let userId: Id<"users">;
      if (existing) {
        userId = existing._id as Id<"users">;
      } else {
        const subscriptionTier = i % 3 === 0 ? "pro" : "free";
        const hourlyRate = 12 + i * 2; // 14,16,18...

        userId = await ctx.db.insert("users", {
          email,
          name: `Demo User ${i}`,
          role: "user",
          subscriptionTier,
          hourlyRate,
          joinedAt: Date.now() - i * 24 * 60 * 60 * 1000,
        });
      }

      await seedUserData(ctx, userId, 12 + i * 2);
      createdUsers.push({ userId, email });
    }

    return {
      status: "ok",
      created: createdUsers.length,
      users: createdUsers,
      note:
        "Demo users seeded. Use Convex dashboard or future owner views to inspect multi-user data.",
    };
  },
});

// Add: Dev helper to make a user admin (and optionally seed their account) by email
export const makeDevAdmin = mutation({
  args: {
    email: v.string(),
    seed: v.optional(v.boolean()),
    hourlyRate: v.optional(v.number()),
    subscriptionTier: v.optional(v.union(v.literal("free"), v.literal("pro"))),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found for provided email");
    }

    const rate = args.hourlyRate ?? user.hourlyRate ?? 30;
    const tier = args.subscriptionTier ?? user.subscriptionTier ?? "pro";

    await ctx.db.patch(user._id, {
      role: "admin",
      subscriptionTier: tier,
      hourlyRate: rate,
      joinedAt: user.joinedAt ?? Date.now(),
    });

    if (args.seed) {
      // Seed realistic sessions, blocks, dispute, alerts, clients & projects for this user
      await seedUserData(ctx, user._id, rate);
    }

    return {
      status: "ok",
      userId: user._id,
      role: "admin",
      seeded: !!args.seed,
    };
  },
});

// Add: Internal helper to seed evidence for a given user (no api usage to avoid deep types)
async function seedEvidenceForUser(ctx: any, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");

  // Get or create a work session
  let workSession = await ctx.db
    .query("workSessions")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!workSession) {
    const sessionId = await ctx.db.insert("workSessions", {
      userId,
      startTime: Date.now() - 2 * 60 * 60 * 1000,
      endTime: Date.now() - 30 * 60 * 1000,
      clientName: "OmniTech Labs",
      projectName: "Compliance Engine",
      hourlyRate: user.hourlyRate ?? 30,
      complianceStatus: "rejected",
    });
    workSession = await ctx.db.get(sessionId);
  }

  if (!workSession) {
    throw new Error("Failed to create or load a work session");
  }

  // Create an evidence session with randomized platform
  const platforms: Array<"upwork" | "fiverr" | "toptal" | "freelancer" | "client"> = [
    "upwork",
    "fiverr",
    "toptal",
    "freelancer",
    "client",
  ];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];

  const evidenceSessionId = await ctx.db.insert("evidenceSessions", {
    userId,
    sessionId: workSession._id,
    platform,
    startTime: workSession.startTime,
    endTime: workSession.endTime,
    status: "finalized",
  });

  // Generate diverse evidence events
  const events: Array<{
    evidenceSessionId: Id<"evidenceSessions">;
    t: number;
    kind: "mouse" | "keyboard" | "url" | "screenshot_ref" | "memo" | "platform_status";
    data: any;
    url?: string;
  }> = [];

  const sessionDuration = (workSession.endTime || Date.now()) - workSession.startTime;
  const eventCount = Math.max(120, Math.floor(sessionDuration / 20000)); // richer density

  const urlPool = [
    "https://github.com/org/project",
    "https://figma.com/file/design",
    "https://upwork.com/contracts",
    "https://notion.so/specs",
    "https://trello.com/b/board",
    "https://docs.google.com/document/d/123",
    "https://stackoverflow.com/questions/xyz",
    "https://slack.com/app_redirect?channel=dev",
  ];

  for (let i = 0; i < eventCount; i++) {
    const t = workSession.startTime + i * Math.floor(sessionDuration / eventCount);

    if (i % 2 === 0) {
      events.push({
        evidenceSessionId,
        t,
        kind: "mouse",
        data: { type: "mousemove", x: Math.random() * 1920, y: Math.random() * 1080 },
      } as any);
    }

    if (i % 3 === 0) {
      events.push({
        evidenceSessionId,
        t: t + 500,
        kind: "keyboard",
        data: { key: "k", code: "KeyK" },
      } as any);
    }

    if (i % 4 === 0) {
      const url = urlPool[i % urlPool.length];
      events.push({
        evidenceSessionId,
        t: t + 1000,
        kind: "url",
        data: { url },
        url,
      } as any);
    }

    if (i % 6 === 0) {
      events.push({
        evidenceSessionId,
        t: t + 1500,
        kind: "screenshot_ref",
        data: { ref: `shot_${i}.png`, resolution: "1920x1080" },
      } as any);
    }

    if (i % 10 === 0) {
      events.push({
        evidenceSessionId,
        t: t + 2000,
        kind: "memo",
        data: { content: `Progress note #${i}: implemented feature and addressed feedback` },
      } as any);
    }

    if (i % 12 === 0) {
      events.push({
        evidenceSessionId,
        t: t + 2500,
        kind: "platform_status",
        data: { status: i % 24 === 0 ? "paused" : "active" },
      } as any);
    }
  }

  // Insert in batches
  for (let i = 0; i < events.length; i += 100) {
    const batch = events.slice(i, i + 100);
    for (const e of batch) {
      await ctx.db.insert("evidenceEvents", e);
    }
  }

  return {
    evidenceSessionId,
    eventCount: events.length,
    workSessionId: workSession._id,
    platform,
  };
}

export const seedEvidenceData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const result = await seedEvidenceForUser(ctx, user._id);
    return result;
  },
});

// Update: Use the helper above to avoid api.runMutation (prevents deep type instantiation)
export const seedEvidenceDataForEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found for provided email");
    }

    const result = await seedEvidenceForUser(ctx, user._id);
    return { status: "ok", ...result };
  },
});

// Update: call helper directly instead of ctx.runMutation(api.seed.seedEvidenceDataForEmail, ...)
export const seedAllForEmail = mutation({
  args: {
    email: v.string(),
    hourlyRate: v.optional(v.number()),
    subscriptionTier: v.optional(v.union(v.literal("free"), v.literal("pro"))),
  },
  handler: async (ctx, args) => {
    // Find or create user by email
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();

    const rate = args.hourlyRate ?? user?.hourlyRate ?? 30;
    const tier = args.subscriptionTier ?? user?.subscriptionTier ?? "pro";

    if (!user) {
      const userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.email.split("@")[0],
        role: "user",
        subscriptionTier: tier,
        hourlyRate: rate,
        joinedAt: Date.now(),
        professionalBio: "Experienced freelancer specializing in full-stack development and design.",
        protectedHours: 0,
        protectedValue: 0,
        onboardingComplete: true,
        onboardingCompletedAt: Date.now(),
      });
      const created = await ctx.db.get(userId);
      if (!created) throw new Error("Failed to create user");
      user = created;
    }

    // Promote to admin and ensure tier/rate with full profile
    await ctx.db.patch(user._id, {
      role: "admin",
      subscriptionTier: tier,
      hourlyRate: rate,
      joinedAt: user.joinedAt ?? Date.now(),
      professionalBio: user.professionalBio ?? "Experienced freelancer specializing in full-stack development and design.",
      onboardingComplete: true,
      onboardingCompletedAt: user.onboardingCompletedAt ?? Date.now(),
    });

    // Clear existing data to avoid duplicates
    const existingSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const session of existingSessions) {
      await ctx.db.delete(session._id);
    }

    const existingBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const block of existingBlocks) {
      await ctx.db.delete(block._id);
    }

    const existingReports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const report of existingReports) {
      await ctx.db.delete(report._id);
    }

    const existingAlerts = await ctx.db
      .query("complianceAlerts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const alert of existingAlerts) {
      await ctx.db.delete(alert._id);
    }

    const existingClients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const client of existingClients) {
      await ctx.db.delete(client._id);
    }

    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const project of existingProjects) {
      await ctx.db.delete(project._id);
    }

    const existingEvidenceSessions = await ctx.db
      .query("evidenceSessions")
      .withIndex("by_user_and_status", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const evidenceSession of existingEvidenceSessions) {
      const events = await ctx.db
        .query("evidenceEvents")
        .withIndex("by_session_and_time", (q: any) => q.eq("evidenceSessionId", evidenceSession._id))
        .collect();
      for (const event of events) {
        await ctx.db.delete(event._id);
      }
      await ctx.db.delete(evidenceSession._id);
    }

    // Seed realistic sessions, time blocks, dispute, alerts, clients & projects
    await seedUserData(ctx, user._id, rate);

    // Seed evidence data for analytics
    const seeded = await seedEvidenceForUser(ctx, user._id);

    return {
      status: "ok",
      userId: user._id,
      email: args.email,
      tier,
      rate,
      message:
        "User promoted to admin and fully seeded with sessions, time blocks, disputes, alerts, and evidence.",
      evidenceSessionId: seeded.evidenceSessionId,
      eventCount: seeded.eventCount,
      workSessionId: seeded.workSessionId,
    };
  },
});

// Add: helper to switch a user's subscription tier by email
export const setUserTierForEmail = mutation({
  args: {
    email: v.string(),
    subscriptionTier: v.union(v.literal("free"), v.literal("pro")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found for provided email");
    }

    await ctx.db.patch(user._id, { subscriptionTier: args.subscriptionTier });

    return {
      status: "ok",
      userId: user._id,
      email: args.email,
      subscriptionTier: args.subscriptionTier,
    };
  },
});

// Add: Seed client-side data for testing
export const seedClientData = mutation({
  args: {},
  handler: async (ctx) => {
    // Create a test client company
    const testClientEmail = "client@acmecorp.com";
    
    let clientCompany = await ctx.db
      .query("clientCompanies")
      .withIndex("by_email", (q: any) => q.eq("email", testClientEmail))
      .first();

    if (!clientCompany) {
      const clientId = await ctx.db.insert("clientCompanies", {
        email: testClientEmail,
        companyName: "Acme Corporation",
        contactName: "Jane Smith",
        industry: "Technology",
        companySize: "51-200",
        website: "https://acmecorp.com",
        verificationCount: 12,
        createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
        lastLoginAt: Date.now(),
        subscriptionTier: "pro",
      });
      clientCompany = await ctx.db.get(clientId);
    }

    if (!clientCompany) throw new Error("Failed to create client company");

    // Create freelancer public profiles
    const freelancerProfiles = [
      {
        displayName: "Alex Johnson",
        professionalTitle: "Full-Stack Developer",
        bio: "Experienced full-stack developer with 8+ years building scalable web applications. Specialized in React, Node.js, and cloud infrastructure.",
        hourlyRate: 85,
        skills: ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL"],
        availability: "available" as const,
        verificationScore: 95,
        totalVerifiedHours: 1240,
      },
      {
        displayName: "Maria Garcia",
        professionalTitle: "UI/UX Designer",
        bio: "Creative designer focused on user-centered design and modern interfaces. Expert in Figma, design systems, and prototyping.",
        hourlyRate: 75,
        skills: ["Figma", "UI Design", "UX Research", "Prototyping", "Design Systems"],
        availability: "available" as const,
        verificationScore: 92,
        totalVerifiedHours: 980,
      },
      {
        displayName: "David Chen",
        professionalTitle: "DevOps Engineer",
        bio: "DevOps specialist with expertise in CI/CD, containerization, and cloud infrastructure. Passionate about automation and reliability.",
        hourlyRate: 95,
        skills: ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD"],
        availability: "busy" as const,
        verificationScore: 98,
        totalVerifiedHours: 1560,
      },
      {
        displayName: "Sarah Williams",
        professionalTitle: "Mobile Developer",
        bio: "iOS and Android developer creating beautiful, performant mobile experiences. 6 years of experience with React Native and native development.",
        hourlyRate: 80,
        skills: ["React Native", "iOS", "Android", "Swift", "Kotlin"],
        availability: "available" as const,
        verificationScore: 89,
        totalVerifiedHours: 720,
      },
      {
        displayName: "Michael Brown",
        professionalTitle: "Backend Engineer",
        bio: "Backend specialist focused on scalable APIs and microservices. Strong background in distributed systems and database optimization.",
        hourlyRate: 90,
        skills: ["Python", "Django", "PostgreSQL", "Redis", "Microservices"],
        availability: "unavailable" as const,
        verificationScore: 94,
        totalVerifiedHours: 1100,
      },
    ];

    const createdFreelancerIds: Array<Id<"users">> = [];

    for (const profile of freelancerProfiles) {
      const email = `${profile.displayName.toLowerCase().replace(" ", ".")}@freelancer.com`;
      
      let user = await ctx.db
        .query("users")
        .withIndex("email", (q: any) => q.eq("email", email))
        .first();

      if (!user) {
        const userId = await ctx.db.insert("users", {
          email,
          name: profile.displayName,
          role: "user",
          subscriptionTier: "pro",
          hourlyRate: profile.hourlyRate,
          joinedAt: Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
          professionalBio: profile.bio,
          protectedHours: profile.totalVerifiedHours,
          protectedValue: profile.totalVerifiedHours * profile.hourlyRate,
          onboardingComplete: true,
          onboardingCompletedAt: Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
        });
        user = await ctx.db.get(userId);
      }

      if (!user) continue;
      createdFreelancerIds.push(user._id);

      const existingProfile = await ctx.db
        .query("freelancerPublicProfiles")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .first();

      if (!existingProfile) {
        await ctx.db.insert("freelancerPublicProfiles", {
          userId: user._id,
          displayName: profile.displayName,
          professionalTitle: profile.professionalTitle,
          bio: profile.bio,
          hourlyRate: profile.hourlyRate,
          timelockVerified: true,
          verificationScore: profile.verificationScore,
          totalVerifiedHours: profile.totalVerifiedHours,
          platformsConnected: ["upwork", "fiverr"],
          skills: profile.skills,
          availability: profile.availability,
          lastActive: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
          createdAt: Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
        });
      }
    }

    // Create verification requests
    const verificationStatuses = ["pending", "accepted", "completed", "rejected"] as const;
    const projectNames = [
      "E-commerce Platform Redesign",
      "Mobile App Development",
      "API Integration Project",
      "Dashboard Analytics Feature",
      "Marketing Website Build",
    ];

    for (let i = 0; i < 8; i++) {
      if (createdFreelancerIds.length === 0) break;
      
      const freelancerId = createdFreelancerIds[i % createdFreelancerIds.length];
      const status = verificationStatuses[i % verificationStatuses.length];
      const projectName = projectNames[i % projectNames.length];
      
      const workPeriodStart = Date.now() - (30 - i * 3) * 24 * 60 * 60 * 1000;
      const workPeriodEnd = workPeriodStart + 7 * 24 * 60 * 60 * 1000;

      await ctx.db.insert("verificationRequests", {
        clientId: clientCompany._id,
        freelancerUserId: freelancerId,
        projectName,
        projectDescription: `Verification request for ${projectName} work completed during the specified period.`,
        workPeriodStart,
        workPeriodEnd,
        requestedAt: workPeriodStart - 24 * 60 * 60 * 1000,
        status,
        respondedAt: status !== "pending" ? workPeriodStart : undefined,
        freelancerResponse: status === "accepted" || status === "completed" ? "Accepted and ready to provide verification" : undefined,
      });
    }

    return {
      status: "ok",
      clientCompany: clientCompany._id,
      freelancersCreated: createdFreelancerIds.length,
      verificationRequestsCreated: 8,
      message: "Client-side mock data seeded successfully. Login with: client@acmecorp.com",
    };
  },
});