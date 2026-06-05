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
      for (let i = 0; i < defaults.length; i++) {
        await ctx.db.insert("pipelineStages", {
          userId,
          name: defaults[i].name,
          color: defaults[i].color,
          order: i,
          isDefault: true,
        });
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
      // ── Lead stage (5 deals) ──
      {
        title: "E-Commerce Platform Build",
        value: 12000,
        probability: 10,
        source: "upwork",
        contactName: "Tom Bradley",
        contactEmail: "tom@creativestudios.art",
        expectedCloseDate: now + 60 * day,
        description: "Full e-commerce platform with product catalog, cart, checkout, and admin dashboard for a boutique retail brand.",
        notes: "Initial inquiry received. Needs scoping call scheduled for next week. Client wants Shopify-like functionality with custom checkout flow.",
        stageIdx: 0,
        daysAgo: 5,
      },
      {
        title: "AI Chatbot Integration",
        value: 6000,
        probability: 10,
        source: "fiverr",
        contactName: "Nina Patel",
        contactEmail: "nina@smartassist.ai",
        expectedCloseDate: now + 75 * day,
        description: "Custom AI chatbot with NLP capabilities for customer support automation in a SaaS product.",
        notes: "Inbound lead from Fiverr. Wants to integrate a custom AI chatbot into their existing SaaS product. Early stage exploration.",
        stageIdx: 0,
        daysAgo: 2,
      },
      {
        title: "Real Estate Listing Portal",
        value: 18000,
        probability: 15,
        source: "linkedin",
        contactName: "Marcus Rivera",
        contactEmail: "marcus@primeproperty.com",
        expectedCloseDate: now + 90 * day,
        description: "Property listing portal with map search, virtual tours, and agent management for a regional real estate firm.",
        notes: "Found us on LinkedIn. Currently using an off-the-shelf solution and wants something custom. Budget not confirmed yet.",
        stageIdx: 0,
        daysAgo: 1,
      },
      {
        title: "EdTech Course Platform",
        value: 9500,
        probability: 10,
        source: "referral",
        contactName: "Prof. Anika Desai",
        contactEmail: "anika@learnvista.edu",
        expectedCloseDate: now + 50 * day,
        description: "Online course platform with video hosting, quizzes, progress tracking, and certificate generation.",
        notes: "Referred by Priya at FinServe. University setting, so compliance and accessibility are critical. Long sales cycle expected.",
        stageIdx: 0,
        daysAgo: 3,
      },
      {
        title: "Fitness App MVP",
        value: 7500,
        probability: 8,
        source: "upwork",
        contactName: "Jake Morrison",
        contactEmail: "jake@fittrack.app",
        expectedCloseDate: now + 40 * day,
        description: "MVP fitness tracking app with workout plans, progress photos, and social features.",
        notes: "Startup founder with limited budget. Exploring options. May need phased approach to fit their funding timeline.",
        stageIdx: 0,
        daysAgo: 4,
      },

      // ── Qualified stage (4 deals) ──
      {
        title: "SaaS Dashboard Redesign",
        value: 8500,
        probability: 25,
        source: "linkedin",
        contactName: "Jennifer Wu",
        contactEmail: "jen@cloudmetrics.io",
        expectedCloseDate: now + 45 * day,
        description: "Complete redesign of analytics dashboard with real-time data visualization, team collaboration, and role-based views.",
        notes: "Qualified lead. Demo scheduled for next week. They are comparing 3 agencies and we are shortlisted. CTO is our champion internally.",
        stageIdx: 1,
        daysAgo: 12,
      },
      {
        title: "Digital Marketing Landing Pages",
        value: 4500,
        probability: 25,
        source: "upwork",
        contactName: "Lisa Park",
        contactEmail: "lisa@digitalmarketingco.com",
        expectedCloseDate: now + 30 * day,
        description: "5 A/B tested landing pages with analytics tracking and conversion optimization for product launch campaign.",
        notes: "Returning client. Budget approved internally. Wants to start as soon as proposal is approved. Quick turnaround expected.",
        stageIdx: 1,
        daysAgo: 8,
      },
      {
        title: "Supply Chain Management System",
        value: 32000,
        probability: 30,
        source: "direct",
        contactName: "Robert Chang",
        contactEmail: "rchang@logisync.com",
        expectedCloseDate: now + 60 * day,
        description: "End-to-end supply chain management with inventory tracking, vendor management, and predictive analytics.",
        notes: "Enterprise client. Very thorough evaluation process. We presented our capabilities deck and they were impressed. Decision expected in 3 weeks.",
        stageIdx: 1,
        daysAgo: 15,
      },
      {
        title: "Restaurant POS & Ordering System",
        value: 14000,
        probability: 20,
        source: "referral",
        contactName: "Maria Santos",
        contactEmail: "maria@freshbites.co",
        expectedCloseDate: now + 35 * day,
        description: "Point-of-sale system with online ordering, table management, and kitchen display integration.",
        notes: "Referred by Sam from TechCorp. Chain of 12 restaurants. Needs consistent system across all locations. Pilot at 2 locations first.",
        stageIdx: 1,
        daysAgo: 10,
      },

      // ── Proposal stage (4 deals) ──
      {
        title: "Mobile Banking App",
        value: 25000,
        probability: 50,
        source: "referral",
        contactName: "Michael Torres",
        contactEmail: "cto@finserve.io",
        expectedCloseDate: now + 30 * day,
        description: "Full-featured mobile banking app with biometric auth, real-time transactions, and compliance reporting.",
        notes: "Proposal sent. Awaiting board approval. CTO is our champion internally. Decision expected within 2 weeks. Very strong relationship.",
        stageIdx: 2,
        daysAgo: 20,
      },
      {
        title: "Creative Studios Motion Design Package",
        value: 7500,
        probability: 50,
        source: "direct",
        contactName: "Tom Bradley",
        contactEmail: "tom@creativestudios.art",
        expectedCloseDate: now + 21 * day,
        description: "Motion graphics reel and social media content package for brand launch campaign.",
        notes: "Existing client expanding scope. Proposal includes motion graphics, social media content, and brand animations. They viewed it within 2 hours of sending.",
        stageIdx: 2,
        daysAgo: 10,
      },
      {
        title: "Healthcare Patient Portal",
        value: 35000,
        probability: 45,
        source: "direct",
        contactName: "Dr. Robert Singh",
        contactEmail: "robert@medportal.health",
        expectedCloseDate: now + 28 * day,
        description: "HIPAA-compliant patient portal with appointment scheduling, secure messaging, and medical records access.",
        notes: "Proposal sent with detailed compliance section. Their CIO requested additional security documentation. Providing supplemental materials this week.",
        stageIdx: 2,
        daysAgo: 14,
      },
      {
        title: "Brand Identity for NovaTech",
        value: 8500,
        probability: 55,
        source: "fiverr",
        contactName: "Aisha Khan",
        contactEmail: "aisha@novatech.io",
        expectedCloseDate: now + 14 * day,
        description: "Complete brand identity package: logo, color palette, typography, brand guidelines, and marketing collateral templates.",
        notes: "Startup rebranding after Series A. They love our portfolio. Decision maker is the CEO who we have a direct line to. Close date is tight.",
        stageIdx: 2,
        daysAgo: 7,
      },

      // ── Negotiation stage (3 deals) ──
      {
        title: "Full-Stack SaaS Platform",
        value: 45000,
        probability: 70,
        source: "referral",
        contactName: "Rachel Green",
        contactEmail: "rachel@scaleup.io",
        expectedCloseDate: now + 7 * day,
        description: "Multi-tenant SaaS platform with subscription billing, analytics, and white-label capabilities.",
        notes: "Close to agreement. Their legal team is reviewing our contract terms. Only sticking point is the IP ownership clause. Our lawyer is preparing a compromise.",
        stageIdx: 3,
        daysAgo: 35,
      },
      {
        title: "StartupHub Mobile App Phase 2",
        value: 9500,
        probability: 70,
        source: "fiverr",
        contactName: "Sarah Mitchell",
        contactEmail: "sarah@startuphub.co",
        expectedCloseDate: now + 10 * day,
        description: "Phase 2 of StartupHub mobile app: push notifications, payment integration, and analytics dashboard.",
        notes: "Phase 1 was successful. Client wants to add push notifications, payment integration, and analytics. Negotiating final scope and timeline.",
        stageIdx: 3,
        daysAgo: 18,
      },
      {
        title: "Insurance Claims Platform",
        value: 28000,
        probability: 65,
        source: "linkedin",
        contactName: "Vikram Mehta",
        contactEmail: "vikram@insureflow.com",
        expectedCloseDate: now + 14 * day,
        description: "Claims processing platform with document OCR, automated workflows, and regulatory compliance engine.",
        notes: "Very promising. Budget approved by CFO. Final negotiation on maintenance terms and SLA guarantees. They want 99.9% uptime commitment.",
        stageIdx: 3,
        daysAgo: 25,
      },

      // ── Won stage (4 deals) ──
      {
        title: "TechCorp Phase 2 — CMS & Marketing Automation",
        value: 15000,
        probability: 100,
        source: "upwork",
        contactName: "David Chen",
        contactEmail: "david.chen@techcorp.io",
        expectedCloseDate: now - 3 * day,
        description: "Phase 2 of TechCorp website: CMS integration, marketing automation, and analytics dashboard.",
        notes: "Won! Phase 2 approved. CMS integration and marketing automation modules confirmed. Kickoff meeting scheduled for next Monday.",
        stageIdx: 4,
        daysAgo: 60,
      },
      {
        title: "FinServe Analytics Platform",
        value: 5720,
        probability: 100,
        source: "upwork",
        contactName: "Michael Torres",
        contactEmail: "cto@finserve.io",
        expectedCloseDate: now - 10 * day,
        description: "Financial analytics platform with real-time market data, portfolio tracking, and compliance reporting.",
        notes: "Monthly retainer won. Ongoing engagement for analytics platform. First invoice paid. Excellent client relationship.",
        stageIdx: 4,
        daysAgo: 30,
      },
      {
        title: "GlobalEnt Data Dashboard",
        value: 22000,
        probability: 100,
        source: "toptal",
        contactName: "Anna Schmidt",
        contactEmail: "anna@insightdata.de",
        expectedCloseDate: now - 15 * day,
        description: "Enterprise analytics dashboard with real-time data streaming, complex visualizations, and role-based access control.",
        notes: "Won after 3-month sales cycle. Enterprise contract with annual renewal. Dedicated team of 3 assigned. First sprint starting next week.",
        stageIdx: 4,
        daysAgo: 45,
      },
      {
        title: "DigiMark Brand Identity",
        value: 3200,
        probability: 100,
        source: "freelancer",
        contactName: "Lisa Park",
        contactEmail: "lisa@digitalmarketingco.com",
        expectedCloseDate: now - 7 * day,
        description: "Complete brand identity package: logo, color palette, typography, and brand guidelines document.",
        notes: "Small but reliable client. Quick project, already delivered. They loved the work and are referring us to their network.",
        stageIdx: 4,
        daysAgo: 25,
      },

      // ── Lost stage (2 deals) ──
      {
        title: "Legacy System Migration",
        value: 22000,
        probability: 0,
        source: "toptal",
        contactName: "Frank Miller",
        contactEmail: "frank@oldtech.com",
        expectedCloseDate: now - 20 * day,
        description: "Legacy .NET system migration to modern React/Node.js stack with zero downtime.",
        notes: "Lost to competitor. Budget constraints cited by client. Went with a cheaper offshore alternative. Follow up in 6 months when they likely need fixes.",
        stageIdx: 5,
        daysAgo: 45,
      },
      {
        title: "Retail Inventory System",
        value: 14000,
        probability: 0,
        source: "linkedin",
        contactName: "Amy Foster",
        contactEmail: "amy@retailpro.com",
        expectedCloseDate: now - 30 * day,
        description: "Custom inventory management system with barcode scanning and supplier integration.",
        notes: "Lost due to project scope mismatch. Client needed an off-the-shelf solution rather than custom development. Good learning for future retail leads.",
        stageIdx: 5,
        daysAgo: 55,
      },
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
        description: deal.description,
        notes: deal.notes,
        order: i,
        createdAt: now - deal.daysAgo * day,
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
          description: "Professional proposal template for web development projects with phased delivery and milestone-based billing",
          sections: [
            { id: "1", type: "heading" as const, content: "Project Overview" },
            { id: "2", type: "text" as const, content: "We will build a modern, responsive web application tailored to your business needs. Our approach combines clean architecture with pixel-perfect design, ensuring scalability and maintainability from day one." },
            { id: "3", type: "pricing" as const, content: "Development Package", metadata: { items: [{ name: "Frontend Development", price: 5000 }, { name: "Backend Development", price: 7000 }, { name: "Testing & QA", price: 2000 }, { name: "DevOps & Deployment", price: 1500 }] } },
            { id: "4", type: "milestone" as const, content: "Project Milestones", metadata: { milestones: [{ name: "Design Approval", weeks: 2 }, { name: "MVP Delivery", weeks: 6 }, { name: "Final Delivery", weeks: 10 }] } },
            { id: "5", type: "terms" as const, content: "Payment Terms: 30% upfront, 40% at MVP, 30% on delivery. Project scope changes will be billed at $150/hr. All IP transfers upon final payment." },
          ],
          isSystem: true,
          usageCount: 0,
          createdAt: Date.now(),
        },
        {
          name: "Design & Branding Proposal",
          industry: "Creative",
          description: "Template for design, branding, and creative services with revision rounds and deliverables",
          sections: [
            { id: "1", type: "heading" as const, content: "Creative Brief" },
            { id: "2", type: "text" as const, content: "We will craft a cohesive brand identity that resonates with your target audience and sets you apart from competitors. Our design process is collaborative, with structured feedback loops to ensure alignment." },
            { id: "3", type: "pricing" as const, content: "Design Package", metadata: { items: [{ name: "Logo Design (3 concepts)", price: 3000 }, { name: "Brand Guidelines Document", price: 2000 }, { name: "Marketing Collateral", price: 2500 }, { name: "Social Media Kit", price: 1500 }] } },
            { id: "4", type: "terms" as const, content: "Includes 3 revision rounds per deliverable. Additional revisions billed at $100/round. Final files delivered in AI, SVG, PNG, and PDF formats." },
          ],
          isSystem: true,
          usageCount: 0,
          createdAt: Date.now(),
        },
        {
          name: "Consulting Proposal",
          industry: "Professional Services",
          description: "Template for consulting and advisory engagements with discovery, analysis, and implementation phases",
          sections: [
            { id: "1", type: "heading" as const, content: "Engagement Overview" },
            { id: "2", type: "text" as const, content: "Our consulting engagement will provide strategic guidance and actionable recommendations to optimize your operations. We combine deep industry expertise with data-driven analysis to deliver measurable results." },
            { id: "3", type: "pricing" as const, content: "Consulting Package", metadata: { items: [{ name: "Discovery Phase (2 weeks)", price: 4000 }, { name: "Analysis & Recommendations", price: 6000 }, { name: "Implementation Support (4 weeks)", price: 5000 }, { name: "Follow-up Review", price: 2000 }] } },
            { id: "4", type: "terms" as const, content: "Billed monthly. 30-day cancellation notice required. Travel expenses billed separately at cost. All deliverables and recommendations remain client property." },
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
      // ── Signed proposals (3) ──
      {
        title: "TechCorp Phase 2 — CMS & Marketing Automation",
        status: "signed" as const,
        clientName: "David Chen",
        clientEmail: "david.chen@techcorp.io",
        totalValue: 15000,
        sections: [
          { id: "1", type: "heading" as const, content: "TechCorp Phase 2: CMS & Marketing Automation" },
          { id: "2", type: "text" as const, content: "Building on the successful Phase 1 website redesign, this phase adds a headless CMS, marketing automation workflows, lead scoring, and a comprehensive analytics dashboard. We will integrate with their existing HubSpot and Salesforce instances." },
          { id: "3", type: "pricing" as const, content: "Phase 2 Package", metadata: { items: [{ name: "CMS Integration (Sanity.io)", price: 5000 }, { name: "Marketing Automation Workflows", price: 4000 }, { name: "Analytics Dashboard", price: 3500 }, { name: "QA & Deployment", price: 2500 }] } },
          { id: "4", type: "milestone" as const, content: "Delivery Milestones", metadata: { milestones: [{ name: "CMS Setup & Content Migration", weeks: 3 }, { name: "Automation Workflow Build", weeks: 5 }, { name: "Dashboard & Final QA", weeks: 8 }] } },
          { id: "5", type: "terms" as const, content: "30% upfront ($4,500), 40% at CMS milestone ($6,000), 30% on delivery ($4,500). Includes 60 days post-launch support." },
        ],
        sentAt: now - 20 * day,
        viewedAt: now - 18 * day,
        signedAt: now - 10 * day,
      },
      {
        title: "E-Commerce Platform Redesign",
        status: "signed" as const,
        clientName: "Acme Corp",
        clientEmail: "sarah@acmecorp.com",
        totalValue: 28000,
        sections: [
          { id: "1", type: "heading" as const, content: "E-Commerce Platform Complete Redesign" },
          { id: "2", type: "text" as const, content: "Complete redesign of the e-commerce platform with modern UX, mobile-first approach, and optimized checkout flow. Includes product catalog with advanced filtering, wishlist, reviews, and Stripe payment integration." },
          { id: "3", type: "pricing" as const, content: "Full Package", metadata: { items: [{ name: "UX Research & Wireframes", price: 4000 }, { name: "UI Design (All Pages)", price: 5000 }, { name: "Frontend Development", price: 8000 }, { name: "Backend & API Development", price: 7000 }, { name: "QA & Performance Testing", price: 4000 }] } },
          { id: "4", type: "milestone" as const, content: "Delivery Milestones", metadata: { milestones: [{ name: "Design Approval", weeks: 3 }, { name: "MVP (Core Shopping Flow)", weeks: 7 }, { name: "Full Platform Delivery", weeks: 12 }] } },
          { id: "5", type: "terms" as const, content: "30% upfront, 40% at MVP, 30% on delivery. Includes 90 days of bug-fix support. Performance guarantee: <2s page load on 3G." },
        ],
        sentAt: now - 25 * day,
        viewedAt: now - 22 * day,
        signedAt: now - 12 * day,
      },
      {
        title: "DigiMark Brand Identity Package",
        status: "signed" as const,
        clientName: "Lisa Park",
        clientEmail: "lisa@digitalmarketingco.com",
        totalValue: 3200,
        sections: [
          { id: "1", type: "heading" as const, content: "Brand Identity for Digital Marketing Co" },
          { id: "2", type: "text" as const, content: "Complete brand identity refresh including updated logo, modern color palette, professional typography, and comprehensive brand guidelines document. Designed to reflect the company's growth and evolving market position." },
          { id: "3", type: "pricing" as const, content: "Brand Package", metadata: { items: [{ name: "Logo Design (3 concepts + refinements)", price: 1200 }, { name: "Brand Guidelines Document", price: 800 }, { name: "Business Card & Letterhead", price: 500 }, { name: "Social Media Templates (5)", price: 700 }] } },
          { id: "4", type: "terms" as const, content: "50% upfront, 50% on delivery. Includes 2 revision rounds. Final files in AI, SVG, PNG, PDF." },
        ],
        sentAt: now - 15 * day,
        viewedAt: now - 14 * day,
        signedAt: now - 8 * day,
      },

      // ── Sent proposals (2) ──
      {
        title: "Mobile Banking App — Full Development",
        status: "sent" as const,
        clientName: "Michael Torres",
        clientEmail: "cto@finserve.io",
        totalValue: 25000,
        sections: [
          { id: "1", type: "heading" as const, content: "FinServe Mobile Banking Application" },
          { id: "2", type: "text" as const, content: "A secure, scalable mobile banking application built with React Native, featuring biometric authentication, real-time transaction feeds, bill pay, and PCI-DSS compliant data handling. Backend powered by Node.js with PostgreSQL." },
          { id: "3", type: "pricing" as const, content: "Enterprise Package", metadata: { items: [{ name: "iOS & Android App (React Native)", price: 12000 }, { name: "Backend API & Security Layer", price: 8000 }, { name: "Admin Dashboard", price: 3000 }, { name: "Penetration Testing & QA", price: 2000 }] } },
          { id: "4", type: "milestone" as const, content: "Delivery Milestones", metadata: { milestones: [{ name: "Design & Architecture", weeks: 3 }, { name: "Core Banking Features", weeks: 8 }, { name: "Security Audit & Launch", weeks: 12 }] } },
          { id: "5", type: "terms" as const, content: "25% upfront, milestone-based billing thereafter. Includes 6 months security patch support. SLA: 99.9% uptime guarantee." },
        ],
        sentAt: now - 5 * day,
        viewedAt: now - 3 * day,
      },
      {
        title: "Insurance Claims Processing Platform",
        status: "sent" as const,
        clientName: "Vikram Mehta",
        clientEmail: "vikram@insureflow.com",
        totalValue: 28000,
        sections: [
          { id: "1", type: "heading" as const, content: "InsureFlow Claims Processing Platform" },
          { id: "2", type: "text" as const, content: "Modern claims processing platform with document OCR, automated approval workflows, fraud detection, and regulatory compliance engine. Built for adjusters, managers, and policyholders with role-based dashboards." },
          { id: "3", type: "pricing" as const, content: "Platform Package", metadata: { items: [{ name: "Document Processing Engine (OCR + AI)", price: 8000 }, { name: "Workflow Automation System", price: 7000 }, { name: "Policyholder Portal", price: 5000 }, { name: "Compliance & Audit Module", price: 5000 }, { name: "Integration & Testing", price: 3000 }] } },
          { id: "4", type: "milestone" as const, content: "Delivery Milestones", metadata: { milestones: [{ name: "OCR & Document Pipeline", weeks: 4 }, { name: "Workflow Engine", weeks: 8 }, { name: "Full Platform Launch", weeks: 14 }] } },
          { id: "5", type: "terms" as const, content: "20% upfront, 30% at workflow milestone, 30% at portal milestone, 20% on delivery. 12-month warranty on core platform." },
        ],
        sentAt: now - 3 * day,
        viewedAt: now - 1 * day,
      },

      // ── Viewed proposals (2) ──
      {
        title: "Creative Studios Motion Design Package",
        status: "viewed" as const,
        clientName: "Tom Bradley",
        clientEmail: "tom@creativestudios.art",
        totalValue: 7500,
        sections: [
          { id: "1", type: "heading" as const, content: "Motion Design & Social Media Content Package" },
          { id: "2", type: "text" as const, content: "A comprehensive motion design package for Creative Studios' brand launch campaign. Includes a 60-second motion graphics reel, 10 social media animations (Instagram/TikTok), and branded transition templates for ongoing content creation." },
          { id: "3", type: "pricing" as const, content: "Motion Package", metadata: { items: [{ name: "Motion Graphics Reel (60s)", price: 3000 }, { name: "Social Media Animations (10x)", price: 2500 }, { name: "Branded Transition Templates", price: 2000 }] } },
          { id: "4", type: "terms" as const, content: "40% upfront, 60% on delivery. Includes 2 revision rounds per deliverable. Source After Effects files included." },
        ],
        sentAt: now - 8 * day,
        viewedAt: now - 6 * day,
      },
      {
        title: "Brand Identity for HealthTech Startup",
        status: "viewed" as const,
        clientName: "MediTech Inc",
        clientEmail: "marketing@meditech.org",
        totalValue: 12000,
        sections: [
          { id: "1", type: "heading" as const, content: "MediTech Brand Identity & Marketing Kit" },
          { id: "2", type: "text" as const, content: "Complete brand identity for a healthcare technology startup entering a regulated market. Includes trust-building visual language, accessible design system meeting WCAG 2.1 AA standards, and healthcare-appropriate color palette." },
          { id: "3", type: "pricing" as const, content: "Healthcare Branding Package", metadata: { items: [{ name: "Logo Design (3 concepts)", price: 4000 }, { name: "Brand Guidelines (Healthcare-Focused)", price: 3000 }, { name: "Marketing Kit (Brochure, Flyer, Email)", price: 3000 }, { name: "Website Design Mockups (3 pages)", price: 2000 }] } },
          { id: "4", type: "terms" as const, content: "50% upfront, 50% on delivery. Includes 3 revision rounds. All designs meet healthcare accessibility standards." },
        ],
        sentAt: now - 7 * day,
        viewedAt: now - 5 * day,
      },

      // ── Draft proposals (3) ──
      {
        title: "Supply Chain Management System",
        status: "draft" as const,
        clientName: "Robert Chang",
        clientEmail: "rchang@logisync.com",
        totalValue: 32000,
        sections: [
          { id: "1", type: "heading" as const, content: "LogiSync Supply Chain Platform" },
          { id: "2", type: "text" as const, content: "End-to-end supply chain management platform with real-time inventory tracking, vendor management portal, predictive demand analytics, and automated reorder workflows. Built for mid-market logistics companies." },
          { id: "3", type: "pricing" as const, content: "Platform Package", metadata: { items: [{ name: "Inventory Management Module", price: 8000 }, { name: "Vendor Portal & API", price: 7000 }, { name: "Predictive Analytics Engine", price: 9000 }, { name: "Dashboard & Reporting", price: 5000 }, { name: "Integration & QA", price: 3000 }] } },
          { id: "4", type: "milestone" as const, content: "Delivery Milestones", metadata: { milestones: [{ name: "Inventory Module MVP", weeks: 6 }, { name: "Vendor Portal", weeks: 10 }, { name: "Full Platform Launch", weeks: 16 }] } },
        ],
      },
      {
        title: "Data Analytics Dashboard",
        status: "draft" as const,
        clientName: "DataViz Co",
        clientEmail: "ops@dataviz.co",
        totalValue: 20000,
        sections: [
          { id: "1", type: "heading" as const, content: "Real-Time Analytics Dashboard" },
          { id: "2", type: "text" as const, content: "High-performance data visualization platform supporting 100K+ data points with real-time streaming. Features custom chart builder, collaborative annotations, and automated report generation." },
          { id: "3", type: "pricing" as const, content: "Dashboard Package", metadata: { items: [{ name: "Chart Engine & Visualization Library", price: 8000 }, { name: "Real-Time Data Pipeline", price: 7000 }, { name: "Report Builder & Export", price: 5000 }] } },
        ],
      },
      {
        title: "Restaurant POS & Ordering System",
        status: "draft" as const,
        clientName: "Maria Santos",
        clientEmail: "maria@freshbites.co",
        totalValue: 14000,
        sections: [
          { id: "1", type: "heading" as const, content: "FreshBites POS & Online Ordering" },
          { id: "2", type: "text" as const, content: "Integrated point-of-sale and online ordering system for a 12-location restaurant chain. Includes table management, kitchen display system, online ordering with delivery integration, and multi-location analytics dashboard." },
          { id: "3", type: "pricing" as const, content: "Restaurant System Package", metadata: { items: [{ name: "POS System (12 locations)", price: 5000 }, { name: "Online Ordering & Delivery", price: 4000 }, { name: "Kitchen Display System", price: 2500 }, { name: "Analytics Dashboard", price: 2500 }] } },
          { id: "4", type: "milestone" as const, content: "Pilot & Rollout", metadata: { milestones: [{ name: "Pilot (2 locations)", weeks: 6 }, { name: "Refinements", weeks: 8 }, { name: "Full Rollout (12 locations)", weeks: 14 }] } },
        ],
      },

      // ── Declined proposals (1) ──
      {
        title: "Social Platform MVP",
        status: "declined" as const,
        clientName: "SocialNext",
        clientEmail: "founders@socialnext.com",
        totalValue: 35000,
        sections: [
          { id: "1", type: "heading" as const, content: "SocialNext Platform MVP" },
          { id: "2", type: "text" as const, content: "Complete social networking MVP with user profiles, feed algorithm, messaging, content creation tools, and notification system. Built for scale with microservices architecture." },
          { id: "3", type: "pricing" as const, content: "MVP Package", metadata: { items: [{ name: "Core Social Features", price: 15000 }, { name: "Real-Time Messaging", price: 8000 }, { name: "Content & Feed Algorithm", price: 7000 }, { name: "Notification System", price: 5000 }] } },
          { id: "4", type: "terms" as const, content: "25% upfront, milestone-based billing. Includes 90 days post-launch support." },
        ],
        sentAt: now - 30 * day,
      },

      // ── Expired proposal (1) ──
      {
        title: "EdTech Course Platform Proposal",
        status: "expired" as const,
        clientName: "Prof. Anika Desai",
        clientEmail: "anika@learnvista.edu",
        totalValue: 9500,
        sections: [
          { id: "1", type: "heading" as const, content: "LearnVista Course Platform" },
          { id: "2", type: "text" as const, content: "Online course platform with video hosting, interactive quizzes, progress tracking, certificate generation, and LTI integration for university learning management systems." },
          { id: "3", type: "pricing" as const, content: "EdTech Package", metadata: { items: [{ name: "Course Builder & Video Hosting", price: 4000 }, { name: "Quiz & Assessment Engine", price: 2500 }, { name: "Certificate & LTI Integration", price: 3000 }] } },
          { id: "4", type: "terms" as const, content: "40% upfront, 60% on delivery. WCAG 2.1 AA compliance guaranteed. University procurement process supported." },
        ],
        sentAt: now - 45 * day,
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
