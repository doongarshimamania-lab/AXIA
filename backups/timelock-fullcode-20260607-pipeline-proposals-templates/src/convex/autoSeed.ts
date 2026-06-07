import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

/**
 * Auto-seed: Called automatically after first auth.
 * Seeds pipeline stages, deals, proposals, invoices, clients, and projects.
 * Idempotent — skips if data already exists for the user.
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
      if (!user.professionalBio) patches.professionalBio = "Experienced freelancer specializing in full-stack development and design.";
      if (user.protectedHours === undefined) patches.protectedHours = 120;
      if (user.protectedValue === undefined) patches.protectedValue = 10200;
      if (Object.keys(patches).length > 0) {
        await ctx.db.patch(userId, patches);
        results.push("user_profile");
      }
    }

    // ─── 2. Seed Pipeline Stages ───────────────────────────────────────────
    const existingStages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let stageIds: string[] = [];
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
          name: defaults[i].name,
          color: defaults[i].color,
          order: i,
          isDefault: true,
        });
        stageIds.push(id);
      }
      results.push("pipeline_stages");
    } else {
      stageIds = existingStages.sort((a, b) => a.order - b.order).map(s => s._id);
    }

    // ─── 3. Seed Pipeline Deals ────────────────────────────────────────────
    const existingDeals = await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingDeals.length === 0 && stageIds.length >= 6) {
      const mockDeals = [
        { title: "E-commerce Redesign", value: 12000, probability: 10, source: "upwork", contactName: "Sarah Chen", contactEmail: "sarah@shopstyle.com", expectedCloseDate: now + 30 * day, stageIdx: 0 },
        { title: "Mobile App MVP", value: 25000, probability: 15, source: "referral", contactName: "James Miller", contactEmail: "james@startuphub.io", expectedCloseDate: now + 45 * day, stageIdx: 0 },
        { title: "SaaS Dashboard", value: 18000, probability: 25, source: "linkedin", contactName: "Emily Rodriguez", contactEmail: "emily@cloudops.co", expectedCloseDate: now + 21 * day, stageIdx: 1 },
        { title: "Healthcare Portal", value: 35000, probability: 30, source: "direct", contactName: "Dr. Michael Brown", contactEmail: "mbrown@healthtech.org", expectedCloseDate: now + 35 * day, stageIdx: 1 },
        { title: "Brand Identity Package", value: 8500, probability: 50, source: "fiverr", contactName: "Lisa Wang", contactEmail: "lisa@brandforward.com", expectedCloseDate: now + 14 * day, stageIdx: 2 },
        { title: "API Integration", value: 15000, probability: 45, source: "upwork", contactName: "Tom Anderson", contactEmail: "tom@dataflow.dev", expectedCloseDate: now + 18 * day, stageIdx: 2 },
        { title: "Full-Stack Platform", value: 45000, probability: 70, source: "referral", contactName: "Rachel Green", contactEmail: "rachel@scaleup.io", expectedCloseDate: now + 7 * day, stageIdx: 3 },
        { title: "Website Redesign", value: 12000, probability: 100, source: "direct", contactName: "David Kim", contactEmail: "david@creativeagency.com", expectedCloseDate: now - 5 * day, stageIdx: 4 },
        { title: "Analytics Dashboard", value: 22000, probability: 100, source: "upwork", contactName: "Anna Schmidt", contactEmail: "anna@insightdata.de", expectedCloseDate: now - 10 * day, stageIdx: 4 },
        { title: "Social Media App", value: 30000, probability: 0, source: "linkedin", contactName: "Kevin Park", contactEmail: "kevin@socialnext.com", expectedCloseDate: now - 20 * day, stageIdx: 5 },
      ];

      for (let i = 0; i < mockDeals.length; i++) {
        const deal = mockDeals[i];
        const stageId = stageIds[deal.stageIdx] as any;
        if (!stageId) continue;
        await ctx.db.insert("deals", {
          userId,
          stageId,
          title: deal.title,
          value: deal.value,
          probability: deal.probability,
          source: deal.source,
          contactName: deal.contactName,
          contactEmail: deal.contactEmail,
          expectedCloseDate: deal.expectedCloseDate,
          currency: "USD",
          description: `${deal.title} - ${deal.source} lead`,
          notes: "",
          order: i,
          createdAt: now - Math.floor(Math.random() * 30) * day,
          updatedAt: now,
        });
      }
      results.push("deals");
    }

    // ─── 4. Seed Clients ───────────────────────────────────────────────────
    const existingClients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let clientIds: string[] = [];
    if (existingClients.length === 0) {
      const mockClients = [
        { clientName: "TechCorp Solutions", platform: "upwork" as const, hourlyRate: 85, contractType: "hourly" as const, riskLevel: "low" as const },
        { clientName: "StartupHub Inc", platform: "fiverr" as const, hourlyRate: 65, contractType: "hourly" as const, riskLevel: "medium" as const },
        { clientName: "Enterprise Digital", platform: "toptal" as const, hourlyRate: 120, contractType: "hourly" as const, riskLevel: "low" as const },
        { clientName: "Acme Corp", platform: "direct" as const, hourlyRate: 95, contractType: "hourly" as const, riskLevel: "low" as const },
        { clientName: "GlobalMedia", platform: "upwork" as const, hourlyRate: 75, contractType: "fixed" as const, riskLevel: "high" as const },
      ];

      for (const client of mockClients) {
        const id = await ctx.db.insert("clients", {
          userId,
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

    // ─── 5. Seed Projects ──────────────────────────────────────────────────
    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingProjects.length === 0 && clientIds.length > 0) {
      const mockProjects = [
        { clientId: clientIds[0] as any, projectName: "E-commerce Platform Redesign", hourlyRate: 85, projectType: "ongoing" as const, protectionLevel: "enhanced" as const },
        { clientId: clientIds[1] as any, projectName: "Mobile App Development", hourlyRate: 65, projectType: "milestone" as const, protectionLevel: "maximum" as const },
        { clientId: clientIds[2] as any, projectName: "Enterprise Dashboard System", hourlyRate: 120, projectType: "ongoing" as const, protectionLevel: "maximum" as const },
      ];

      for (const project of mockProjects) {
        await ctx.db.insert("projects", {
          userId,
          ...project,
          status: "active",
          createdAt: now - Math.floor(Math.random() * 60) * day,
          lastActivityAt: now,
        });
      }
      results.push("projects");
    }

    // ─── 6. Seed Proposals ─────────────────────────────────────────────────
    const existingProposals = await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingProposals.length === 0) {
      // Seed templates first
      const existingTemplates = await ctx.db
        .query("proposalTemplates")
        .withIndex("by_system", (q) => q.eq("isSystem", true))
        .collect();

      if (existingTemplates.length === 0) {
        const templates = [
          {
            name: "Web Development Proposal",
            industry: "Technology",
            description: "Professional proposal for web dev projects",
            sections: [
              { id: "1", type: "heading" as const, content: "Project Overview" },
              { id: "2", type: "text" as const, content: "We will build a modern, responsive web application." },
              { id: "3", type: "pricing" as const, content: "Development Package", metadata: { items: [{ name: "Frontend", price: 5000 }, { name: "Backend", price: 7000 }] } },
              { id: "4", type: "terms" as const, content: "30% upfront, 40% at MVP, 30% on delivery." },
            ],
            isSystem: true,
            usageCount: 0,
            createdAt: now,
          },
          {
            name: "Design & Branding Proposal",
            industry: "Creative",
            description: "Template for design services",
            sections: [
              { id: "1", type: "heading" as const, content: "Creative Brief" },
              { id: "2", type: "text" as const, content: "We'll craft a cohesive brand identity." },
              { id: "3", type: "pricing" as const, content: "Design Package", metadata: { items: [{ name: "Logo", price: 3000 }, { name: "Guidelines", price: 2000 }] } },
              { id: "4", type: "terms" as const, content: "Includes 3 revision rounds." },
            ],
            isSystem: true,
            usageCount: 0,
            createdAt: now,
          },
        ];

        for (const t of templates) {
          await ctx.db.insert("proposalTemplates", t);
        }
        results.push("proposal_templates");
      }

      const mockProposals = [
        {
          title: "E-commerce Platform Redesign",
          status: "signed" as const,
          clientName: "Acme Corp",
          clientEmail: "sarah@acmecorp.com",
          totalValue: 28000,
          sections: [
            { id: "1", type: "heading" as const, content: "Project Overview" },
            { id: "2", type: "text" as const, content: "Complete redesign of the e-commerce platform with modern UX." },
            { id: "3", type: "pricing" as const, content: "Full Package", metadata: { items: [{ name: "Design", price: 8000 }, { name: "Development", price: 15000 }, { name: "QA", price: 5000 }] } },
            { id: "4", type: "terms" as const, content: "30% upfront, 40% at MVP, 30% on delivery." },
          ],
          sentAt: now - 20 * day,
          viewedAt: now - 18 * day,
          signedAt: now - 10 * day,
        },
        {
          title: "Mobile Banking App",
          status: "sent" as const,
          clientName: "FinTech Solutions",
          clientEmail: "cto@fintechsol.com",
          totalValue: 45000,
          sections: [
            { id: "1", type: "heading" as const, content: "Mobile Banking Solution" },
            { id: "2", type: "text" as const, content: "Secure, scalable mobile banking application." },
            { id: "3", type: "pricing" as const, content: "Enterprise Package", metadata: { items: [{ name: "iOS App", price: 18000 }, { name: "Android App", price: 18000 }, { name: "Backend API", price: 9000 }] } },
            { id: "4", type: "terms" as const, content: "25% upfront, milestones-based billing." },
          ],
          sentAt: now - 5 * day,
          viewedAt: now - 3 * day,
        },
        {
          title: "Brand Identity for HealthTech",
          status: "viewed" as const,
          clientName: "MediTech Inc",
          clientEmail: "marketing@meditech.org",
          totalValue: 12000,
          sections: [
            { id: "1", type: "heading" as const, content: "Brand Identity Package" },
            { id: "2", type: "text" as const, content: "Complete brand identity for healthcare startup." },
            { id: "3", type: "pricing" as const, content: "Branding Package", metadata: { items: [{ name: "Logo Design", price: 4000 }, { name: "Brand Guidelines", price: 3000 }, { name: "Marketing Kit", price: 5000 }] } },
          ],
          sentAt: now - 7 * day,
          viewedAt: now - 5 * day,
        },
        {
          title: "Data Analytics Dashboard",
          status: "draft" as const,
          clientName: "DataViz Co",
          clientEmail: "ops@dataviz.co",
          totalValue: 20000,
          sections: [
            { id: "1", type: "heading" as const, content: "Analytics Dashboard" },
            { id: "2", type: "text" as const, content: "Real-time data visualization platform." },
            { id: "3", type: "pricing" as const, content: "Dashboard Package", metadata: { items: [{ name: "Frontend", price: 8000 }, { name: "Data Pipeline", price: 7000 }, { name: "Visualization Engine", price: 5000 }] } },
          ],
        },
        {
          title: "Social Platform MVP",
          status: "declined" as const,
          clientName: "SocialNext",
          clientEmail: "founders@socialnext.com",
          totalValue: 35000,
          sections: [
            { id: "1", type: "heading" as const, content: "Social Platform MVP" },
            { id: "2", type: "text" as const, content: "Complete social networking MVP." },
            { id: "3", type: "pricing" as const, content: "MVP Package", metadata: { items: [{ name: "Core Features", price: 20000 }, { name: "User Auth", price: 5000 }, { name: "Notifications", price: 10000 }] } },
          ],
          sentAt: now - 30 * day,
        },
      ];

      for (const p of mockProposals) {
        const { status, sentAt, viewedAt, signedAt, ...rest } = p;
        await ctx.db.insert("proposals", {
          userId,
          ...rest,
          status,
          publicToken: generateToken(),
          currency: "USD",
          validUntil: now + 30 * day,
          sentAt,
          viewedAt,
          signedAt,
          notes: "",
          createdAt: now - Math.floor(Math.random() * 30) * day,
          updatedAt: now,
        });
      }
      results.push("proposals");
    }

    // ─── 7. Seed Invoices ──────────────────────────────────────────────────
    const existingInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingInvoices.length === 0) {
      const mockInvoices = [
        {
          clientName: "Acme Corp",
          clientEmail: "billing@acmecorp.com",
          status: "paid" as const,
          lineItems: [
            { id: "li1", description: "Frontend Development - Homepage", quantity: 40, rate: 125, amount: 5000, hasProof: true },
            { id: "li2", description: "UI/UX Design - Dashboard", quantity: 20, rate: 150, amount: 3000, hasProof: true },
          ],
          subtotal: 8000, taxRate: 10, taxAmount: 800, total: 8800,
          issueDate: now - 30 * day, dueDate: now - 15 * day, paidDate: now - 12 * day,
          proofCount: 2, hasValidatedBilling: true,
        },
        {
          clientName: "TechStart Inc",
          clientEmail: "finance@techstart.io",
          status: "sent" as const,
          lineItems: [
            { id: "li1", description: "API Development - User Service", quantity: 60, rate: 150, amount: 9000, hasProof: true },
            { id: "li2", description: "Database Architecture", quantity: 15, rate: 175, amount: 2625, hasProof: false },
          ],
          subtotal: 11625, taxRate: 8, taxAmount: 930, total: 12555,
          issueDate: now - 5 * day, dueDate: now + 10 * day,
          proofCount: 1, hasValidatedBilling: true,
        },
        {
          clientName: "GlobalMedia",
          clientEmail: "accounts@globalmedia.com",
          status: "overdue" as const,
          lineItems: [
            { id: "li1", description: "Mobile App - iOS & Android", quantity: 80, rate: 125, amount: 10000, hasProof: true },
            { id: "li2", description: "QA Testing", quantity: 20, rate: 100, amount: 2000, hasProof: true },
            { id: "li3", description: "App Store Deployment", quantity: 5, rate: 200, amount: 1000, hasProof: false },
          ],
          subtotal: 13000, taxRate: 10, taxAmount: 1300, total: 14300,
          issueDate: now - 45 * day, dueDate: now - 15 * day,
          proofCount: 2, hasValidatedBilling: true,
        },
        {
          clientName: "DesignHub",
          clientEmail: "pay@designhub.co",
          status: "draft" as const,
          lineItems: [
            { id: "li1", description: "Brand Identity Package", quantity: 1, rate: 4500, amount: 4500, hasProof: false },
            { id: "li2", description: "Social Media Kit", quantity: 1, rate: 2000, amount: 2000, hasProof: false },
          ],
          subtotal: 6500, taxRate: 10, taxAmount: 650, total: 7150,
          issueDate: now, dueDate: now + 30 * day,
          proofCount: 0, hasValidatedBilling: false,
        },
      ];

      for (let i = 0; i < mockInvoices.length; i++) {
        const inv = mockInvoices[i];
        await ctx.db.insert("invoices", {
          userId,
          invoiceNumber: `INV-${String(i + 1).padStart(3, "0")}`,
          publicToken: generateToken(),
          currency: "USD",
          notes: "",
          sentAt: inv.status !== "draft" ? inv.issueDate : undefined,
          viewedAt: inv.status === "paid" ? inv.issueDate + day : undefined,
          createdAt: inv.issueDate,
          updatedAt: now,
          ...inv,
        });
      }
      results.push("invoices");
    }

    // ─── 8. Seed Work Sessions & Time Blocks ───────────────────────────────
    const existingSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingSessions.length === 0) {
      const hourlyRate = user?.hourlyRate ?? 85;

      // Active session
      const activeSessionId = await ctx.db.insert("workSessions", {
        userId,
        startTime: now - 2 * 60 * 60 * 1000,
        complianceStatus: "active",
        clientName: "Acme Corp",
        projectName: "Website Revamp",
        hourlyRate,
      });

      // Past session
      const pastStart = now - 6 * 60 * 60 * 1000;
      const pastEnd = pastStart + 90 * 60 * 1000;
      const pastSessionId = await ctx.db.insert("workSessions", {
        userId,
        startTime: pastStart,
        endTime: pastEnd,
        totalMinutes: 90,
        complianceStatus: "rejected",
        clientName: "Globex LLC",
        projectName: "Dashboard QA",
        hourlyRate,
      });

      // Time blocks for active session
      const activeBase = now - 35 * 60 * 60 * 1000;
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

      // Time blocks for past session
      const pastBase = pastStart + 10 * 60 * 1000;
      const pastBlocks = [
        { start: pastBase, status: "rejected" as const, activity: "Idle", website: "youtube.com", screenshots: 1, mouse: false, keyboard: false, inactiveSec: 600 },
        { start: pastBase + 5 * 60 * 1000, status: "at_risk" as const, activity: "Research", website: "fiverr.com", screenshots: 2, mouse: true, keyboard: false, inactiveSec: 120 },
        { start: pastBase + 10 * 60 * 1000, status: "compliant" as const, activity: "Testing", website: "github.com", screenshots: 3, mouse: true, keyboard: true, inactiveSec: 15 },
      ];

      for (const block of pastBlocks) {
        await ctx.db.insert("timeBlocks", {
          sessionId: pastSessionId,
          userId,
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

      // Compliance alert
      await ctx.db.insert("complianceAlerts", {
        userId,
        sessionId: activeSessionId,
        alertType: "at_risk",
        message: "Fiverr tab detected. Timer paused. Close tab within 5 minutes to avoid rejection.",
        triggeredAt: now - 2 * 60 * 1000,
        acknowledged: false,
      });

      // Dispute report
      await ctx.db.insert("disputeReports", {
        userId,
        sessionId: pastSessionId,
        caseId: `case-${Date.now()}`,
        generatedAt: now - 3 * 60 * 60 * 1000,
        rejectedHours: 0.5,
        lostIncome: Math.round((hourlyRate * 0.5) * 100) / 100,
        reportContent: "# Dispute Report\n\nSession contained rejected time due to inactivity. Evidence attached (screenshots and activity logs).",
        status: "generated",
      });

      results.push("work_sessions");
    }

    return { seeded: true, items: results };
  },
});
