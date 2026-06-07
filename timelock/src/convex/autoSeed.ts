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
 * Seeds workspaces, pipeline stages, deals, proposals, invoices, clients,
 * projects, messaging channels/messages, tags, goals, and scope definitions.
 * Idempotent — skips if data already exists for the user.
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
      if (!user.professionalBio) patches.professionalBio = "Experienced freelancer specializing in full-stack development and design.";
      if (user.protectedHours === undefined) patches.protectedHours = 120;
      if (user.protectedValue === undefined) patches.protectedValue = 10200;
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

    // ─── 4. Seed Pipeline Stages ───────────────────────────────────────────
    // Schema: pipelineStages { userId, name, color, order, isDefault?, createdAt }
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
          createdAt: now,
        });
        stageIds.push(id);
      }
      results.push("pipeline_stages");
    } else {
      stageIds = existingStages.sort((a, b) => a.order - b.order).map(s => s._id);
    }

    // ─── 5. Seed Pipeline Deals ────────────────────────────────────────────
    // Schema: deals { userId, stageId, clientId?, proposalId?, title, description?, value, probability, currency?, source?, contactEmail?, contactName?, expectedCloseDate?, notes?, order, createdAt, updatedAt }
    const existingDeals = await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingDeals.length === 0 && stageIds.length >= 6) {
      const mockDeals = [
        { title: "E-Commerce Platform Build", value: 12000, probability: 10, source: "upwork", contactName: "Tom Bradley", contactEmail: "tom@creativestudios.art", expectedCloseDate: now + 60 * day, stageIdx: 0, description: "Full e-commerce platform with product catalog, cart, checkout, and admin dashboard." },
        { title: "AI Chatbot Integration", value: 6000, probability: 10, source: "fiverr", contactName: "Nina Patel", contactEmail: "nina@smartassist.ai", expectedCloseDate: now + 75 * day, stageIdx: 0, description: "Custom AI chatbot with NLP capabilities for customer support automation." },
        { title: "Real Estate Listing Portal", value: 18000, probability: 15, source: "linkedin", contactName: "Marcus Rivera", contactEmail: "marcus@primeproperty.com", expectedCloseDate: now + 90 * day, stageIdx: 0, description: "Property listing portal with map search, virtual tours, and agent management." },
        { title: "EdTech Course Platform", value: 9500, probability: 10, source: "referral", contactName: "Prof. Anika Desai", contactEmail: "anika@learnvista.edu", expectedCloseDate: now + 50 * day, stageIdx: 0, description: "Online course platform with video hosting, quizzes, and certificate generation." },
        { title: "Fitness App MVP", value: 7500, probability: 8, source: "upwork", contactName: "Jake Morrison", contactEmail: "jake@fittrack.app", expectedCloseDate: now + 40 * day, stageIdx: 0, description: "MVP fitness tracking app with workout plans and progress photos." },
        { title: "SaaS Dashboard Redesign", value: 8500, probability: 25, source: "linkedin", contactName: "Jennifer Wu", contactEmail: "jen@cloudmetrics.io", expectedCloseDate: now + 45 * day, stageIdx: 1, description: "Complete redesign of analytics dashboard with real-time data visualization." },
        { title: "Digital Marketing Landing Pages", value: 4500, probability: 25, source: "upwork", contactName: "Lisa Park", contactEmail: "lisa@digitalmarketingco.com", expectedCloseDate: now + 30 * day, stageIdx: 1, description: "5 A/B tested landing pages with analytics tracking and conversion optimization." },
        { title: "Supply Chain Management System", value: 32000, probability: 30, source: "direct", contactName: "Robert Chang", contactEmail: "rchang@logisync.com", expectedCloseDate: now + 60 * day, stageIdx: 1, description: "End-to-end supply chain management with inventory tracking and vendor management." },
        { title: "Restaurant POS & Ordering", value: 14000, probability: 20, source: "referral", contactName: "Maria Santos", contactEmail: "maria@freshbites.co", expectedCloseDate: now + 35 * day, stageIdx: 1, description: "Point-of-sale system with online ordering and kitchen display integration." },
        { title: "Mobile Banking App", value: 25000, probability: 50, source: "referral", contactName: "Michael Torres", contactEmail: "cto@finserve.io", expectedCloseDate: now + 30 * day, stageIdx: 2, description: "Full-featured mobile banking app with biometric auth and real-time transactions." },
        { title: "Creative Studios Motion Design", value: 7500, probability: 50, source: "direct", contactName: "Tom Bradley", contactEmail: "tom@creativestudios.art", expectedCloseDate: now + 21 * day, stageIdx: 2, description: "Motion graphics reel and social media content package for brand launch." },
        { title: "Healthcare Patient Portal", value: 35000, probability: 45, source: "direct", contactName: "Dr. Robert Singh", contactEmail: "robert@medportal.health", expectedCloseDate: now + 28 * day, stageIdx: 2, description: "HIPAA-compliant patient portal with appointment scheduling and secure messaging." },
        { title: "Brand Identity for NovaTech", value: 8500, probability: 55, source: "fiverr", contactName: "Aisha Khan", contactEmail: "aisha@novatech.io", expectedCloseDate: now + 14 * day, stageIdx: 2, description: "Complete brand identity package: logo, color palette, typography, and brand guidelines." },
        { title: "Full-Stack SaaS Platform", value: 45000, probability: 70, source: "referral", contactName: "Rachel Green", contactEmail: "rachel@scaleup.io", expectedCloseDate: now + 7 * day, stageIdx: 3, description: "Multi-tenant SaaS platform with subscription billing and white-label capabilities." },
        { title: "StartupHub Mobile App Phase 2", value: 9500, probability: 70, source: "fiverr", contactName: "Sarah Mitchell", contactEmail: "sarah@startuphub.co", expectedCloseDate: now + 10 * day, stageIdx: 3, description: "Phase 2 of StartupHub mobile app: push notifications, payment integration, and analytics." },
        { title: "Insurance Claims Platform", value: 28000, probability: 65, source: "linkedin", contactName: "Vikram Mehta", contactEmail: "vikram@insureflow.com", expectedCloseDate: now + 14 * day, stageIdx: 3, description: "Claims processing platform with document OCR and automated workflows." },
        { title: "TechCorp Website Redesign", value: 12000, probability: 100, source: "direct", contactName: "David Chen", contactEmail: "david@techcorp.io", expectedCloseDate: now - 5 * day, stageIdx: 4, description: "Complete website redesign with responsive design and CMS integration." },
        { title: "FinServe Analytics Platform", value: 22000, probability: 100, source: "upwork", contactName: "Michael Torres", contactEmail: "cto@finserve.io", expectedCloseDate: now - 10 * day, stageIdx: 4, description: "Financial analytics platform with real-time market data and portfolio tracking." },
        { title: "Social Media App (Lost)", value: 30000, probability: 0, source: "linkedin", contactName: "Kevin Park", contactEmail: "kevin@socialnext.com", expectedCloseDate: now - 20 * day, stageIdx: 5, description: "Social networking app that went to a competitor." },
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
          description: deal.description,
          notes: "",
          order: i,
          createdAt: now - Math.floor(Math.random() * 30) * day,
          updatedAt: now,
        });
      }
      results.push("deals");
    }

    // ─── 6. Seed Clients ───────────────────────────────────────────────────
    // Schema: clients { userId, clientName, platform, hourlyRate, contractType, riskLevel, addedAt, lastActivityAt }
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
        { clientName: "Digital Marketing Co", platform: "freelancer" as const, hourlyRate: 45, contractType: "hourly" as const, riskLevel: "low" as const },
        { clientName: "Creative Studios", platform: "direct" as const, hourlyRate: 95, contractType: "fixed" as const, riskLevel: "medium" as const },
        { clientName: "FinServe Analytics", platform: "upwork" as const, hourlyRate: 110, contractType: "hourly" as const, riskLevel: "low" as const },
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

    // ─── 7. Seed Projects ──────────────────────────────────────────────────
    // Schema: projects { userId, clientId, projectName, hourlyRate, projectType, protectionLevel, status, createdAt, lastActivityAt }
    // Note: status only allows "active" or "archived"
    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingProjects.length === 0 && clientIds.length > 0) {
      const mockProjects = [
        { clientId: clientIds[0] as any, projectName: "TechCorp Website Redesign", hourlyRate: 85, projectType: "ongoing" as const, protectionLevel: "enhanced" as const },
        { clientId: clientIds[1] as any, projectName: "StartupHub Mobile App MVP", hourlyRate: 65, projectType: "milestone" as const, protectionLevel: "enhanced" as const },
        { clientId: clientIds[2] as any, projectName: "GlobalEnt Data Dashboard", hourlyRate: 120, projectType: "ongoing" as const, protectionLevel: "maximum" as const },
        { clientId: clientIds[3] as any, projectName: "DigiMark Brand Identity", hourlyRate: 45, projectType: "fixed" as const, protectionLevel: "standard" as const },
        { clientId: clientIds[4] as any, projectName: "Creative Studios Motion Reel", hourlyRate: 95, projectType: "fixed" as const, protectionLevel: "enhanced" as const },
        { clientId: clientIds[5] as any, projectName: "FinServe Analytics Platform", hourlyRate: 110, projectType: "ongoing" as const, protectionLevel: "maximum" as const },
        { clientId: clientIds[0] as any, projectName: "TechCorp API Integration", hourlyRate: 85, projectType: "fixed" as const, protectionLevel: "enhanced" as const },
        { clientId: clientIds[1] as any, projectName: "StartupHub Landing Pages", hourlyRate: 65, projectType: "fixed" as const, protectionLevel: "standard" as const },
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

    // ─── 8. Seed Proposals ─────────────────────────────────────────────────
    // Schema: proposals { userId, clientId?, dealId?, title, status, publicToken, sections, totalValue, currency?, validUntil?, templateId?, clientName?, clientEmail?, sentAt?, viewedAt?, signedAt?, signatureData?, notes?, createdAt, updatedAt }
    const existingProposals = await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingProposals.length === 0) {
      // Seed templates first
      // Schema: proposalTemplates { userId?, name, industry?, description?, sections, isSystem?, usageCount?, createdAt }
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
          clientName: "TechCorp Solutions",
          clientEmail: "david.chen@techcorp.io",
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
          clientName: "FinServe Analytics",
          clientEmail: "cto@finserve.io",
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
        {
          title: "SaaS Dashboard Redesign Proposal",
          status: "sent" as const,
          clientName: "CloudMetrics",
          clientEmail: "jen@cloudmetrics.io",
          totalValue: 8500,
          sections: [
            { id: "1", type: "heading" as const, content: "Dashboard Redesign" },
            { id: "2", type: "text" as const, content: "Complete redesign of analytics dashboard." },
            { id: "3", type: "pricing" as const, content: "Redesign Package", metadata: { items: [{ name: "UI Redesign", price: 4500 }, { name: "Data Viz Components", price: 4000 }] } },
          ],
          sentAt: now - 3 * day,
          viewedAt: now - 2 * day,
        },
        {
          title: "Creative Studios Motion Design Package",
          status: "viewed" as const,
          clientName: "Creative Studios",
          clientEmail: "tom@creativestudios.art",
          totalValue: 7500,
          sections: [
            { id: "1", type: "heading" as const, content: "Motion Design Package" },
            { id: "2", type: "text" as const, content: "Motion graphics reel and social media content package." },
            { id: "3", type: "pricing" as const, content: "Motion Package", metadata: { items: [{ name: "Motion Graphics", price: 5000 }, { name: "Social Content", price: 2500 }] } },
          ],
          sentAt: now - 10 * day,
          viewedAt: now - 9 * day,
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

    // ─── 9. Seed Invoices ──────────────────────────────────────────────────
    // Schema: invoices { userId, clientId?, invoiceNumber, publicToken, status, issueDate, dueDate, paidDate?, clientName?, clientEmail?, lineItems, subtotal, taxRate?, taxAmount?, total, currency?, notes?, proofCount?, hasValidatedBilling?, sentAt?, viewedAt?, createdAt, updatedAt }
    const existingInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingInvoices.length === 0) {
      const mockInvoices = [
        {
          clientName: "TechCorp Solutions",
          clientEmail: "billing@techcorp.io",
          status: "paid" as const,
          lineItems: [
            { id: "li1", description: "Website Redesign — Phase 1: Discovery & Wireframes", quantity: 20, rate: 85, amount: 1700, hasProof: true },
            { id: "li2", description: "Website Redesign — Phase 2: UI Design", quantity: 25, rate: 85, amount: 2125, hasProof: true },
          ],
          subtotal: 3825, taxRate: 0, taxAmount: 0, total: 3825,
          issueDate: now - 60 * day, dueDate: now - 30 * day, paidDate: now - 25 * day,
          proofCount: 8, hasValidatedBilling: true,
        },
        {
          clientName: "Global Enterprises",
          clientEmail: "procurement@globalent.com",
          status: "overdue" as const,
          lineItems: [
            { id: "li3", description: "Data Dashboard — Backend Architecture", quantity: 40, rate: 120, amount: 4800, hasProof: true },
            { id: "li4", description: "Data Dashboard — Frontend Components", quantity: 30, rate: 120, amount: 3600, hasProof: false },
          ],
          subtotal: 8400, taxRate: 0, taxAmount: 0, total: 8400,
          issueDate: now - 45 * day, dueDate: now - 15 * day,
          proofCount: 3, hasValidatedBilling: true,
        },
        {
          clientName: "StartupHub Inc",
          clientEmail: "finance@startuphub.co",
          status: "sent" as const,
          lineItems: [
            { id: "li5", description: "Mobile App MVP — Sprint 1: Auth & Dashboard", quantity: 30, rate: 65, amount: 1950, hasProof: true },
          ],
          subtotal: 1950, taxRate: 0, taxAmount: 0, total: 1950,
          issueDate: now - 7 * day, dueDate: now + 23 * day,
          proofCount: 4, hasValidatedBilling: true,
        },
        {
          clientName: "FinServe Analytics",
          clientEmail: "cto@finserve.io",
          status: "sent" as const,
          lineItems: [
            { id: "li6", description: "Analytics Platform — Month 1 Retainer", quantity: 52, rate: 110, amount: 5720, hasProof: true },
          ],
          subtotal: 5720, taxRate: 0, taxAmount: 0, total: 5720,
          issueDate: now - 5 * day, dueDate: now + 25 * day,
          proofCount: 6, hasValidatedBilling: true,
        },
        {
          clientName: "Digital Marketing Co",
          clientEmail: "lisa@digitalmarketingco.com",
          status: "draft" as const,
          lineItems: [
            { id: "li7", description: "Brand Identity — Logo & Guidelines", quantity: 32, rate: 45, amount: 1440, hasProof: false },
          ],
          subtotal: 1440, taxRate: 0, taxAmount: 0, total: 1440,
          issueDate: now, dueDate: now + 30 * day,
          proofCount: 0, hasValidatedBilling: false,
        },
        {
          clientName: "TechCorp Solutions",
          clientEmail: "billing@techcorp.io",
          status: "paid" as const,
          lineItems: [
            { id: "li8", description: "API Integration — CRM Connector", quantity: 25, rate: 85, amount: 2125, hasProof: true },
            { id: "li9", description: "API Integration — ERP Sync Module", quantity: 38, rate: 85, amount: 3230, hasProof: true },
          ],
          subtotal: 5355, taxRate: 0, taxAmount: 0, total: 5355,
          issueDate: now - 90 * day, dueDate: now - 60 * day, paidDate: now - 55 * day,
          proofCount: 12, hasValidatedBilling: true,
        },
      ];

      for (let i = 0; i < mockInvoices.length; i++) {
        const inv = mockInvoices[i];
        await ctx.db.insert("invoices", {
          userId,
          invoiceNumber: `INV-2024-${String(i + 1).padStart(3, "0")}`,
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

    // ─── 10. Seed Messaging Channels & Messages ────────────────────────────
    // Schema: channels { name, workspaceId, type, isPrivate, description?, createdBy, isArchived, lastMessageAt? }
    const existingChannels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", teamWorkspaceId))
      .collect();

    if (existingChannels.length === 0) {
      const channelsToCreate = [
        { name: "general", type: "channel" as const, isPrivate: false, description: "General team discussion" },
        { name: "project-updates", type: "channel" as const, isPrivate: false, description: "Project status and updates" },
        { name: "client-escalations", type: "channel" as const, isPrivate: true, description: "Client issues and escalations" },
        { name: "evidence-review", type: "channel" as const, isPrivate: false, description: "Evidence collection and review" },
        { name: "billing", type: "channel" as const, isPrivate: true, description: "Invoice and payment discussions" },
      ];

      const channelIds: any[] = [];
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

        // Add user as admin member
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

      // Seed messages for the first few channels
      const messagesByChannel: Record<number, string[]> = {
        0: [ // general
          "Good morning team! Quick update on the TechCorp project — we've collected all the evidence files and the timeline report is ready for review.",
          "Nice work! I'll take a look at the timeline report this afternoon.",
          "Hey team, sprint review at 3pm today. Please make sure your status updates are in before the meeting.",
          "Also, just a reminder that the client onboarding for StartupHub is tomorrow.",
          "On it! I'll have everything ready by EOD.",
        ],
        1: [ // project-updates
          "Design mockups for the new dashboard are uploaded to Figma. Link in the project channel.",
          "API integration for the banking app is 80% complete. Should be done by Friday.",
          "Brand identity package for Digital Marketing Co is in final review.",
        ],
        2: [ // client-escalations
          "Urgent: Global Enterprises has filed a dispute claiming work was not delivered per the contract terms. I've pulled the contract and work evidence — need eyes on this ASAP.",
          "I'll review the contract terms and prepare our response.",
          "Evidence package is ready. Sending to legal for review.",
        ],
        3: [ // evidence-review
          "New screenshots attached for the Upwork project. The client changed requirements mid-sprint but we have documented everything.",
          "Work diary screenshots for FinServe are verified and ready.",
        ],
        4: [ // billing
          "Invoice INV-2024-001 paid by TechCorp. Marking as received.",
          "Global Enterprises invoice is 15 days overdue. Follow-up sent.",
          "New invoice created for Digital Marketing Co — pending review before sending.",
        ],
      };

      for (const [channelIdx, messages] of Object.entries(messagesByChannel)) {
        const channelId = channelIds[parseInt(channelIdx)];
        if (!channelId) continue;

        for (let i = 0; i < messages.length; i++) {
          await ctx.db.insert("messages", {
            channelId,
            workspaceId: teamWorkspaceId,
            authorId: userId,
            content: messages[i],
            isEdited: false,
            isPinned: (i === 0 || i === 2) ? true : false,
            isDeleted: false,
          });
        }
      }

      results.push("messaging");
    }

    // ─── 11. Seed Tags ─────────────────────────────────────────────────────
    // Schema: tags { userId, workspaceId?, name, color, category?, usageCount, createdAt }
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
      ];

      for (const tag of mockTags) {
        await ctx.db.insert("tags", {
          userId,
          workspaceId: teamWorkspaceId,
          name: tag.name,
          color: tag.color,
          category: tag.category,
          usageCount: Math.floor(Math.random() * 10) + 1,
          createdAt: now,
        });
      }
      results.push("tags");
    }

    // ─── 12. Seed Goals ────────────────────────────────────────────────────
    // Schema: goals { userId, workspaceId?, title, description?, type, target, current, unit, deadline?, status, milestones?, streak?, lastCheckIn?, createdAt, updatedAt }
    const existingGoals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    if (existingGoals.length === 0) {
      const mockGoals = [
        {
          title: "Reach $10K Monthly Revenue",
          description: "Achieve consistent $10K+ monthly revenue from freelance and agency projects by end of Q2.",
          type: "revenue",
          target: 10000,
          current: 7800,
          unit: "USD",
          deadline: now + 30 * day,
          status: "in_progress",
          milestones: [
            { id: "ms1", title: "Close 3 new deals", completed: true },
            { id: "ms2", title: "Increase hourly rate to $95", completed: true },
            { id: "ms3", title: "Land one enterprise client", completed: false },
          ],
        },
        {
          title: "Complete 50 Protected Hours",
          description: "Log 50 hours of protected work time with full evidence collection and compliance tracking.",
          type: "hours",
          target: 50,
          current: 32,
          unit: "hours",
          deadline: now + 14 * day,
          status: "in_progress",
          milestones: [
            { id: "ms4", title: "Set up time tracking for all active projects", completed: true },
            { id: "ms5", title: "Reach 25 protected hours", completed: true },
            { id: "ms6", title: "Reach 50 protected hours", completed: false },
          ],
        },
        {
          title: "Achieve 95% Protection Score",
          description: "Maintain a protection score of 95% or higher across all active projects and clients.",
          type: "protection",
          target: 95,
          current: 88,
          unit: "%",
          deadline: now + 60 * day,
          status: "in_progress",
          milestones: [
            { id: "ms7", title: "Audit all client contracts", completed: true },
            { id: "ms8", title: "Set up scope tracking for all projects", completed: false },
            { id: "ms9", title: "Resolve all compliance alerts", completed: false },
          ],
        },
        {
          title: "Win 5 Pipeline Deals",
          description: "Convert 5 deals from the pipeline into signed contracts this quarter.",
          type: "clients",
          target: 5,
          current: 2,
          unit: "deals",
          deadline: now + 45 * day,
          status: "in_progress",
          milestones: [
            { id: "ms10", title: "Send proposals to all qualified leads", completed: true },
            { id: "ms11", title: "Win 3 deals", completed: false },
            { id: "ms12", title: "Win 5 deals total", completed: false },
          ],
        },
        {
          title: "Zero Overdue Invoices",
          description: "Ensure all invoices are paid on time with proactive follow-ups and payment reminders.",
          type: "custom",
          target: 0,
          current: 1,
          unit: "invoices",
          deadline: now + 21 * day,
          status: "in_progress",
          milestones: [
            { id: "ms13", title: "Set up payment reminders", completed: true },
            { id: "ms14", title: "Follow up on all overdue invoices", completed: false },
          ],
        },
        {
          title: "Onboard 8 Team Members",
          description: "Build a full agency team with 8 active members covering design, development, and strategy.",
          type: "custom",
          target: 8,
          current: 6,
          unit: "members",
          deadline: now + 30 * day,
          status: "in_progress",
          milestones: [
            { id: "ms15", title: "Hire senior developer", completed: true },
            { id: "ms16", title: "Hire UI/UX designer", completed: true },
            { id: "ms17", title: "Hire motion designer", completed: false },
            { id: "ms18", title: "Hire backend developer", completed: false },
          ],
        },
      ];

      for (const goal of mockGoals) {
        await ctx.db.insert("goals", {
          userId,
          workspaceId: teamWorkspaceId,
          title: goal.title,
          description: goal.description,
          type: goal.type,
          target: goal.target,
          current: goal.current,
          unit: goal.unit,
          deadline: goal.deadline,
          status: goal.status,
          milestones: goal.milestones,
          createdAt: now - Math.floor(Math.random() * 30) * day,
          updatedAt: now,
        });
      }
      results.push("goals");
    }

    // ─── 13. Seed Scope Definitions ────────────────────────────────────────
    // Schema: scopeDefinitions { userId, projectId?, proposalId?, title, description, deliverables, totalEstimatedHours?, revisionLimit, revisionCount, status, clientApprovedAt?, approvalToken?, createdAt, updatedAt }
    const existingScope = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    if (existingScope.length === 0 && clientIds.length > 0) {
      const scopeItems = [
        {
          projectId: undefined,
          proposalId: undefined,
          title: "TechCorp Website Redesign Scope",
          description: "Complete redesign of TechCorp corporate website including responsive design, new brand identity, CMS integration, and SEO optimization.",
          deliverables: [
            { id: "d1", name: "Homepage redesign", description: "Modern responsive homepage with hero section, features, and CTA", estimatedHours: 20, status: "completed" as const },
            { id: "d2", name: "Product pages", description: "Product listing and detail pages with filtering", estimatedHours: 15, status: "in_progress" as const },
            { id: "d3", name: "CMS integration", description: "Content management system with WYSIWYG editor", estimatedHours: 25, status: "pending" as const },
          ],
          totalEstimatedHours: 60,
          revisionLimit: 3,
          revisionCount: 1,
          status: "active" as const,
        },
        {
          projectId: undefined,
          proposalId: undefined,
          title: "StartupHub Mobile App MVP Scope",
          description: "Mobile app MVP for StartupHub — includes user authentication, dashboard, and notification system.",
          deliverables: [
            { id: "d4", name: "User auth (login/signup)", description: "Authentication with email and social login", estimatedHours: 15, status: "completed" as const },
            { id: "d5", name: "Dashboard screen", description: "Main dashboard with project overview and notifications", estimatedHours: 20, status: "in_progress" as const },
            { id: "d6", name: "Basic settings", description: "User profile and app settings screens", estimatedHours: 10, status: "pending" as const },
          ],
          totalEstimatedHours: 45,
          revisionLimit: 2,
          revisionCount: 0,
          status: "active" as const,
        },
        {
          projectId: undefined,
          proposalId: undefined,
          title: "FinServe Analytics Platform Scope",
          description: "Financial analytics platform with real-time market data, portfolio tracking, and compliance reporting.",
          deliverables: [
            { id: "d7", name: "Real-time data dashboard", description: "Live market data visualization dashboard", estimatedHours: 30, status: "in_progress" as const },
            { id: "d8", name: "Portfolio tracking module", description: "Investment portfolio tracking and analysis", estimatedHours: 25, status: "pending" as const },
            { id: "d9", name: "Compliance report generator", description: "Automated compliance reporting with export", estimatedHours: 20, status: "pending" as const },
          ],
          totalEstimatedHours: 75,
          revisionLimit: 3,
          revisionCount: 2,
          status: "active" as const,
        },
      ];

      for (const scope of scopeItems) {
        await ctx.db.insert("scopeDefinitions", {
          userId,
          ...scope,
          createdAt: now - Math.floor(Math.random() * 30) * day,
          updatedAt: now,
        });
      }
      results.push("scope");
    }

    // ─── 14. Seed Work Sessions & Time Blocks ───────────────────────────────
    // Schema: workSessions { userId, startTime, endTime?, totalMinutes?, complianceStatus, clientName, projectName, hourlyRate, platform?, notes?, isManualEntry?, status?, createdAt?, updatedAt? }
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
        clientName: "TechCorp Solutions",
        projectName: "Website Revamp",
        hourlyRate,
      });

      // Past sessions
      const sessions = [
        { clientName: "StartupHub Inc", projectName: "Mobile App MVP", hoursAgo: 6, duration: 90, status: "active" as const },
        { clientName: "FinServe Analytics", projectName: "Analytics Platform", hoursAgo: 24, duration: 180, status: "active" as const },
        { clientName: "Global Enterprises", projectName: "Data Dashboard", hoursAgo: 48, duration: 60, status: "rejected" as const },
        { clientName: "Digital Marketing Co", projectName: "Brand Identity", hoursAgo: 72, duration: 120, status: "active" as const },
        { clientName: "Creative Studios", projectName: "Motion Reel", hoursAgo: 96, duration: 150, status: "active" as const },
        { clientName: "TechCorp Solutions", projectName: "API Integration", hoursAgo: 120, duration: 240, status: "active" as const },
        { clientName: "StartupHub Inc", projectName: "Landing Pages", hoursAgo: 144, duration: 105, status: "active" as const },
      ];

      for (const session of sessions) {
        const pastStart = now - session.hoursAgo * 60 * 60 * 1000;
        const pastEnd = pastStart + session.duration * 60 * 1000;
        await ctx.db.insert("workSessions", {
          userId,
          startTime: pastStart,
          endTime: pastEnd,
          totalMinutes: session.duration,
          complianceStatus: session.status,
          clientName: session.clientName,
          projectName: session.projectName,
          hourlyRate,
        });
      }

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

      // Compliance alert
      // Schema: complianceAlerts { userId, sessionId?, alertType, message, triggeredAt, acknowledged, actionTaken? }
      await ctx.db.insert("complianceAlerts", {
        userId,
        sessionId: activeSessionId,
        alertType: "at_risk",
        message: "Fiverr tab detected. Timer paused. Close tab within 5 minutes to avoid rejection.",
        triggeredAt: now - 2 * 60 * 1000,
        acknowledged: false,
      });

      // Dispute report
      // Schema: disputeReports { userId, sessionId?, caseId, generatedAt, rejectedHours, lostIncome, reportContent?, status, ... }
      await ctx.db.insert("disputeReports", {
        userId,
        sessionId: existingSessions.length > 0 ? undefined : undefined,
        caseId: `case-${Date.now()}`,
        generatedAt: now - 3 * 60 * 60 * 1000,
        rejectedHours: 0.5,
        lostIncome: Math.round((hourlyRate * 0.5) * 100) / 100,
        reportContent: "# Dispute Report\n\nSession contained rejected time due to inactivity. Evidence attached (screenshots and activity logs).",
        status: "generated",
        clientName: "Global Enterprises",
        projectName: "Data Dashboard",
        hourlyRate,
      });

      results.push("work_sessions");
    }

    return { seeded: true, items: results };
  },
});
