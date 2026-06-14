import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const seedMockPipeline = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if stages already exist
    const existingStages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let stages = existingStages;
    if (stages.length === 0) {
      const defaults = [
        { name: "Lead", color: "#6366f1" },
        { name: "Qualified", color: "#8b5cf6" },
        { name: "Proposal", color: "#a855f7" },
        { name: "Negotiation", color: "#c084fc" },
        { name: "Won", color: "#22c55e" },
        { name: "Lost", color: "#ef4444" },
      ];
      const ids = [];
      for (let i = 0; i < defaults.length; i++) {
        ids.push(await ctx.db.insert("pipelineStages", {
          userId,
          name: defaults[i].name,
          color: defaults[i].color,
          order: i,
          isDefault: true,
        }));
      }
      stages = await ctx.db
        .query("pipelineStages")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    // Check if deals already exist
    const existingDeals = await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingDeals.length > 0) return { seeded: false, dealCount: existingDeals.length };

    const now = Date.now();
    const day = 86400000;

    const mockDeals = [
      // Lead stage
      { title: "E-commerce Redesign", value: 12000, probability: 10, source: "upwork", contactName: "Sarah Chen", contactEmail: "sarah@shopstyle.com", expectedCloseDate: now + 30 * day, stageIdx: 0 },
      { title: "Mobile App MVP", value: 25000, probability: 15, source: "referral", contactName: "James Miller", contactEmail: "james@startuphub.io", expectedCloseDate: now + 45 * day, stageIdx: 0 },

      // Qualified stage
      { title: "SaaS Dashboard", value: 18000, probability: 25, source: "linkedin", contactName: "Emily Rodriguez", contactEmail: "emily@cloudops.co", expectedCloseDate: now + 21 * day, stageIdx: 1 },
      { title: "Healthcare Portal", value: 35000, probability: 30, source: "direct", contactName: "Dr. Michael Brown", contactEmail: "mbrown@healthtech.org", expectedCloseDate: now + 35 * day, stageIdx: 1 },

      // Proposal stage
      { title: "Brand Identity Package", value: 8500, probability: 50, source: "fiverr", contactName: "Lisa Wang", contactEmail: "lisa@brandforward.com", expectedCloseDate: now + 14 * day, stageIdx: 2 },
      { title: "API Integration", value: 15000, probability: 45, source: "upwork", contactName: "Tom Anderson", contactEmail: "tom@dataflow.dev", expectedCloseDate: now + 18 * day, stageIdx: 2 },

      // Negotiation stage
      { title: "Full-Stack Platform", value: 45000, probability: 70, source: "referral", contactName: "Rachel Green", contactEmail: "rachel@scaleup.io", expectedCloseDate: now + 7 * day, stageIdx: 3 },

      // Won stage
      { title: "Website Redesign", value: 12000, probability: 100, source: "direct", contactName: "David Kim", contactEmail: "david@creativeagency.com", expectedCloseDate: now - 5 * day, stageIdx: 4 },
      { title: "Analytics Dashboard", value: 22000, probability: 100, source: "upwork", contactName: "Anna Schmidt", contactEmail: "anna@insightdata.de", expectedCloseDate: now - 10 * day, stageIdx: 4 },

      // Lost stage
      { title: "Social Media App", value: 30000, probability: 0, source: "linkedin", contactName: "Kevin Park", contactEmail: "kevin@socialnext.com", expectedCloseDate: now - 20 * day, stageIdx: 5 },
    ];

    for (let i = 0; i < mockDeals.length; i++) {
      const deal = mockDeals[i];
      const stage = stages[deal.stageIdx];
      if (!stage) continue;

      await ctx.db.insert("deals", {
        userId,
        stageId: stage._id,
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

    return { seeded: true, dealCount: mockDeals.length, stageCount: stages.length };
  },
});

export const seedMockProposals = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existing.length > 0) return { seeded: false, count: existing.length };

    // Seed templates first
    const templateResult = await ctx.db
      .query("proposalTemplates")
      .withIndex("by_system", (q) => q.eq("isSystem", true))
      .collect();

    if (templateResult.length === 0) {
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
          createdAt: Date.now(),
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
          createdAt: Date.now(),
        },
        {
          name: "Consulting Proposal",
          industry: "Professional Services",
          description: "Template for consulting engagements",
          sections: [
            { id: "1", type: "heading" as const, content: "Engagement Overview" },
            { id: "2", type: "text" as const, content: "Strategic guidance and actionable recommendations." },
            { id: "3", type: "pricing" as const, content: "Consulting Package", metadata: { items: [{ name: "Discovery", price: 4000 }, { name: "Analysis", price: 6000 }] } },
            { id: "4", type: "terms" as const, content: "Billed monthly. 30-day cancellation notice." },
          ],
          isSystem: true,
          usageCount: 0,
          createdAt: Date.now(),
        },
      ];

      for (const t of templates) {
        await ctx.db.insert("proposalTemplates", t);
      }
    }

    const now = Date.now();
    const day = 86400000;

    function generateToken(): string {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
      return result;
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
          { id: "4", type: "terms" as const, content: "50% upfront, 50% on delivery." },
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

    return { seeded: true, count: mockProposals.length };
  },
});

export const seedMockClients = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existing.length > 0) return { seeded: false, count: existing.length };

    const now = Date.now();
    const hour = 3600000;
    const day = 86400000;

    const mockClients = [
      {
        clientName: "TechCorp Solutions",
        platform: "upwork" as const,
        hourlyRate: 85,
        contractType: "hourly" as const,
        riskLevel: "low" as const,
        lastActivityAt: now - 2 * hour,
      },
      {
        clientName: "StartupHub Inc",
        platform: "fiverr" as const,
        hourlyRate: 65,
        contractType: "fixed" as const,
        riskLevel: "medium" as const,
        lastActivityAt: now - 15 * 60 * 1000,
      },
      {
        clientName: "Global Enterprises",
        platform: "toptal" as const,
        hourlyRate: 120,
        contractType: "hourly" as const,
        riskLevel: "high" as const,
        lastActivityAt: now - 24 * hour,
      },
      {
        clientName: "Digital Marketing Co",
        platform: "freelancer" as const,
        hourlyRate: 45,
        contractType: "hourly" as const,
        riskLevel: "low" as const,
        lastActivityAt: now - 48 * hour,
      },
      {
        clientName: "Creative Studios",
        platform: "direct" as const,
        hourlyRate: 95,
        contractType: "fixed" as const,
        riskLevel: "medium" as const,
        lastActivityAt: now - 72 * hour,
      },
    ];

    for (const c of mockClients) {
      await ctx.db.insert("clients", {
        userId,
        clientName: c.clientName,
        platform: c.platform,
        hourlyRate: c.hourlyRate,
        contractType: c.contractType,
        riskLevel: c.riskLevel,
        addedAt: now - Math.floor(Math.random() * 30) * day,
        lastActivityAt: c.lastActivityAt,
      });
    }

    return { seeded: true, count: mockClients.length };
  },
});
