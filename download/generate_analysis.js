const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, PageBreak, TableOfContents,
  Header, Footer, PageNumber, NumberFormat,
  SectionType, TableLayoutType
} = require("docx");
const fs = require("fs");

// ─── GO-1 Palette (Graphite Orange) ───
const P = {
  bg: "1A2330",
  primary: "FFFFFF",
  accent: "D4875A",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "D4875A", headerText: "FFFFFF", accentLine: "D4875A", innerLine: "DDD0C8", surface: "F8F0EB" },
  // Body page colors (dark text on white)
  body: "1E293B",
  bodyMid: "475569",
  bodyLight: "94A3B8",
  bodyBg: "F8FAFC",
};

// ─── Borders ───
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ─── Helpers ───
const FONT_ASCII = "Calibri";
const FONT_EA = "Microsoft YaHei";
const FONT_HEADING_ASCII = "Times New Roman";
const FONT_HEADING_EA = "SimHei";

function bodyRun(text, opts = {}) {
  return new TextRun({ text, font: { ascii: FONT_ASCII, eastAsia: FONT_EA }, size: 24, color: P.body, ...opts });
}
function boldRun(text, opts = {}) {
  return new TextRun({ text, font: { ascii: FONT_ASCII, eastAsia: FONT_EA }, size: 24, color: P.body, bold: true, ...opts });
}

function para(children, opts = {}) {
  if (typeof children === "string") children = [bodyRun(children)];
  return new Paragraph({ spacing: { after: 120, line: 312 }, ...opts, children });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 80, line: 312 },
    children: [bodyRun(text)],
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200, line: 312 },
    children: [new TextRun({ text, font: { ascii: FONT_HEADING_ASCII, eastAsia: FONT_HEADING_EA }, size: 32, bold: true, color: "0F172A" })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160, line: 312 },
    children: [new TextRun({ text, font: { ascii: FONT_HEADING_ASCII, eastAsia: FONT_HEADING_EA }, size: 28, bold: true, color: "1E293B" })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, font: { ascii: FONT_HEADING_ASCII, eastAsia: FONT_HEADING_EA }, size: 26, bold: true, color: P.accent })],
  });
}

function boldPara(label, value) {
  return new Paragraph({
    spacing: { after: 80, line: 312 },
    children: [
      boldRun(label),
      bodyRun(value, { color: P.bodyMid }),
    ],
  });
}

function emptyPara() {
  return new Paragraph({ children: [new TextRun({ text: "", size: 2 })] });
}

// ─── Table helpers ───
function makeTableHeaderCell(text) {
  return new TableCell({
    shading: { fill: P.table.headerBg, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text, font: { ascii: FONT_ASCII, eastAsia: FONT_EA }, size: 22, bold: true, color: P.table.headerText })],
    })],
  });
}

function makeTableCell(text, isAlt) {
  return new TableCell({
    shading: isAlt ? { fill: P.table.surface, type: ShadingType.CLEAR } : { fill: "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 40, bottom: 40, left: 120, right: 120 },
    children: [new Paragraph({
      spacing: { after: 0, line: 312 },
      children: [bodyRun(String(text), { size: 21 })],
    })],
  });
}

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => makeTableHeaderCell(h)),
  });
  const dataRows = rows.map((row, idx) =>
    new TableRow({
      children: row.map(cell => makeTableCell(cell, idx % 2 === 0)),
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [headerRow, ...dataRows],
  });
}

// ─── calcTitleLayout ───
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 26) {
  const charWidth = (pt) => pt * 22;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    const cpl = charsPerLine(minPt);
    lines = splitTitleLines(title, cpl);
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([...'，。、；：！？的与和及之在于为-_—–·/', ...' \t']);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

// ─── COVER PAGE (R4: Top Color Block with GO-1) ───
function buildCoverR4() {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR;
  const { titlePt, titleLines } = calcTitleLayout("Axia B2B Pivot Strategy", availableWidth, 40, 26);
  const titleSize = titlePt * 2;

  const titleBlockHeight = titleLines.length * (titlePt * 23 + 200);
  const subtitleH = 12 * 23 + 200;
  const upperContentH = titleBlockHeight + subtitleH;
  const UPPER_MIN = 7500;
  const UPPER_H = Math.max(UPPER_MIN, upperContentH + 1500 + 800);
  const DIVIDER_H = 60;

  const topSpacing = Math.max(UPPER_H - upperContentH - 280 - 800, 400);

  const upperBlock = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: UPPER_H, rule: "exact" },
      children: [new TableCell({
        shading: { fill: P.bg }, borders: noBorders,
        verticalAlign: "top",
        margins: { left: padL, right: padR },
        children: [
          new Paragraph({ spacing: { before: topSpacing } }),
          ...titleLines.map((line, i) => new Paragraph({
            spacing: { after: i < titleLines.length - 1 ? 100 : 200, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
            children: [new TextRun({ text: line, size: titleSize, bold: true, color: P.cover.titleColor, font: { eastAsia: FONT_HEADING_EA, ascii: "Arial" } })],
          })),
          new Paragraph({
            spacing: { after: 100, line: 312 },
            children: [new TextRun({ text: "Complete Change Analysis & Implementation Roadmap", size: 24, color: P.cover.subtitleColor, font: { eastAsia: FONT_EA, ascii: "Arial" } })],
          }),
        ],
      })],
    })],
  });

  const divider = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: DIVIDER_H, rule: "exact" },
      children: [new TableCell({ borders: noBorders, shading: { fill: P.accent }, children: [emptyPara()] })],
    })],
  });

  const lowerContent = [
    new Paragraph({ spacing: { before: 800 } }),
    new Paragraph({
      indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: "Prepared for Shubham Mamania", size: 28, color: P.cover.metaColor, font: { eastAsia: FONT_EA, ascii: "Arial" } })],
    }),
    new Paragraph({
      indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: "Analysis Date: June 2026", size: 28, color: P.cover.metaColor, font: { eastAsia: FONT_EA, ascii: "Arial" } })],
    }),
    new Paragraph({
      indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: "Current State: Pre-launch, 103 on waitlist", size: 28, color: P.cover.metaColor, font: { eastAsia: FONT_EA, ascii: "Arial" } })],
    }),
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      indent: { left: padL },
      children: [
        new TextRun({ text: "Axia B2B Pivot Analysis", size: 22, color: "909090" }),
      ],
    }),
  ];

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { fill: "FFFFFF" }, borders: noBorders,
        verticalAlign: "top",
        children: [upperBlock, divider, ...lowerContent],
      })],
    })],
  })];
}

// ─── PAGE NUMBER FOOTER ───
function makePageNumFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ children: [PageNumber.CURRENT], font: { ascii: FONT_ASCII, eastAsia: FONT_EA }, size: 18, color: P.bodyLight }),
      ],
    })],
  });
}

// ─── BUILD BODY CONTENT ───
function buildBody() {
  const children = [];

  // ═══ Section 1: Executive Summary ═══
  children.push(heading1("1. Executive Summary"));
  children.push(para("The Axia B2B Pivot Strategy PDF prescribes a fundamental shift in the company's go-to-market direction: from an 80% B2C / 20% B2B split to an 80% B2B / 20% B2C focus. This pivot is not a minor reprioritization but a complete reorientation of the product, pricing, sales motion, and feature roadmap. The rationale is clear: one agency paying $49/seat with 8 members generates $392/month, compared to 26 individual freelancers at $15/month each. B2B customers have 3-5% churn versus 15-25% for B2C, and they expand over time rather than churn."));
  children.push(para("After analyzing every page of the 18-page strategy document and cross-referencing against the entire Axia codebase (30+ database tables, 75+ backend functions, 25 pages, 140+ components), we identified 4 CRITICAL blockers, 5 HIGH-priority gaps, and 6 MEDIUM-priority improvements. The critical items are architectural: they prevent B2B launch entirely. The high-priority items are feature gaps that would make the B2B product uncompetitive. The medium-priority items are enhancements that strengthen the value proposition but are not launch-blocking."));
  children.push(para("The #1 blocker is architectural: the entire system is single-user. All 30+ tables are keyed by userId as the sole ownership key. There is no workspace, organization, or multi-tenant concept anywhere in the codebase. The Teams.tsx component is purely cosmetic with hardcoded mock members. The getTeamMembers function returns an empty array. The inviteTeamMember function is a no-op. This means that before any B2B feature can be built, the entire data model must be extended to support workspaces with role-based access."));
  children.push(para("However, the Truth Layer and Scope Protection features are genuinely well-built competitive advantages that no competitor offers. They need shareable links and workspace scoping, not rebuilding. The pivot is primarily about adding multi-user capabilities and repositioning what already exists."));

  // ═══ Section 2: PDF Strategy Summary ═══
  children.push(heading1("2. PDF Strategy Summary (Key Takeaways)"));

  // 2.1
  children.push(heading2("2.1 Why This Pivot Makes Sense"));
  children.push(bullet("One agency at $49/seat with 8 members = $392/month vs 26 freelancers at $15/month"));
  children.push(bullet("B2B churn is 3-5% vs B2C 15-25% — agencies are stickier and expand over time"));
  children.push(bullet("Truth Layer is a B2B killer feature — agencies need proof of work to justify invoices to clients"));
  children.push(bullet("Consolidation story: agencies use 8-12 tools ($500-1500/month), Axia replaces half at $49-149/month"));
  children.push(bullet("Expansion revenue: agencies add seats, upgrade plans, buy white-label — freelancers don't"));

  // 2.2
  children.push(heading2("2.2 Current vs Target State"));
  children.push(makeTable(
    ["Dimension", "Current (80% B2C)", "Target (80% B2B)"],
    [
      ["Primary Buyer", "Individual freelancer", "Agency owner / COO"],
      ["Decision Maker", "Single user", "Team of 3-5 stakeholders"],
      ["Avg Deal Value", "$7-15/month", "$99-499/month"],
      ["Sales Cycle", "Self-serve, minutes", "Demo-driven, 2-6 weeks"],
      ["Churn Rate", "15-25%", "3-5%"],
      ["Expansion Revenue", "Minimal (upgrade tier)", "High (add seats, upgrade plan)"],
      ["Key Value Prop", "Don't get scammed", "Prove your work, win more clients"],
      ["Truth Layer Role", "Dispute defense (reactive)", "Client-proof billing (proactive)"],
      ["Pricing Unit", "Per user (flat)", "Per seat (quantity-based)"],
      ["Onboarding", "Self-serve", "Guided + white-glove for Agency+"],
      ["Support", "Community / email", "Priority + dedicated CSM for Enterprise"],
      ["Competitors", "Time trackers, screenshot tools", "Harvest, Hubstaff, Monday, Teamwork"],
    ]
  ));

  // 2.3
  children.push(heading2("2.3 New ICP — Three B2B Personas"));
  children.push(heading3("2.3.1 Agency Owner (50% of B2B Revenue)"));
  children.push(bullet("3-25 person creative/marketing agency"));
  children.push(bullet("Bills $20K-200K/month to clients"));
  children.push(bullet("Loses 5-15% to scope creep (no proof of work)"));
  children.push(bullet("Needs: proof of work for invoicing, scope protection, team oversight"));

  children.push(heading3("2.3.2 Operations Manager / COO (25%)"));
  children.push(bullet("15-50 person agency"));
  children.push(bullet("Manages 8-12 SaaS tools"));
  children.push(bullet("Needs ROI justification for every tool, team utilization metrics"));

  children.push(heading3("2.3.3 Small Business Owner with Contractors (25%)"));
  children.push(bullet("Non-agency business with 3-10 freelancers"));
  children.push(bullet("Needs contractor accountability, proof of hours worked"));

  // 2.4
  children.push(heading2("2.4 Pricing Strategy"));
  children.push(makeTable(
    ["Plan", "Price", "Target", "Seats", "Key B2B Features"],
    [
      ["Free", "$0", "Solo freelancer", "1", "Basic time tracking, evidence collection"],
      ["Starter", "$12/user/mo", "Small team", "1-3", "Team time tracking, shareable proofs"],
      ["Pro", "$29/user/mo", "Growing agency", "3-15", "QuickBooks sync, team dashboards, client portal"],
      ["Agency", "$49/user/mo", "Established agency", "10-50", "White-label, retainer mgmt, Slack integration"],
      ["Enterprise", "Custom", "Large org", "50+", "API access, SSO, dedicated CSM"],
    ]
  ));

  // ═══ Section 3: CRITICAL Priority (P0) ═══
  children.push(heading1("3. Codebase Gap Analysis — CRITICAL Priority (P0)"));
  children.push(para("These are hard blockers. B2B launch is impossible without them.", { run: { bold: true, color: "B91C1C" } }));

  // 3.1
  children.push(heading2("3.1 Workspace/Organization Architecture"));
  children.push(boldPara("What PDF demands: ", "Multi-user workspaces with Owner/Manager/Member roles, workspace-scoped data isolation"));
  children.push(boldPara("What exists: ", "NOTHING. No workspaces table, no workspaceMembers, no roles. All 30+ tables use userId as sole ownership key. Teams.tsx is cosmetic with hardcoded mock members. getTeamMembers returns empty array. inviteTeamMember is a no-op."));
  children.push(para("What must be built:"));
  children.push(bullet("New tables: workspaces, workspaceMembers (with roles: owner/admin/manager/member), workspaceInvitations"));
  children.push(bullet("Add workspaceId to ALL existing tables (workSessions, timeBlocks, clients, projects, invoices, proposals, scopeDefinitions, pipelineStages, deals, evidenceSessions, etc.)"));
  children.push(bullet("Every Convex query needs workspace-scoped variants"));
  children.push(bullet("Workspace switcher UI, workspace settings page, member management page"));
  children.push(bullet("Auth must track current workspace context"));
  children.push(bullet("Data migration: existing userId-scoped data migrated to personal workspaces"));
  children.push(boldPara("Estimated effort: ", "3-4 weeks"));

  // 3.2
  children.push(heading2("3.2 Real Payment Processing (Stripe)"));
  children.push(boldPara("What PDF demands: ", "Per-seat pricing with Stripe, annual billing, 20% discount, free onboarding for 10+ seats"));
  children.push(boldPara("What exists: ", "Subscription page with 4 tiers, but tier management is localStorage only (localStorage.setItem('axia_subscription_tier', newTier)). No Stripe, no checkout, no webhooks. Pricing is per-user flat ($0/$9/$29/$79), not per-seat."));
  children.push(para("What must be built:"));
  children.push(bullet("Stripe Checkout integration (subscription creation, customer portal, webhooks)"));
  children.push(bullet("Per-seat pricing model (quantity-based subscriptions)"));
  children.push(bullet("Annual billing with 20% discount"));
  children.push(bullet("Trial management (14-day enforcement)"));
  children.push(bullet("Invoice generation for subscriptions"));
  children.push(bullet("Current tiers need restructuring: Free($0), Starter($12/user/mo), Pro($29/user/mo), Agency($49/user/mo), Enterprise(custom)"));
  children.push(boldPara("Estimated effort: ", "2 weeks"));

  // 3.3
  children.push(heading2("3.3 Team Time Tracking Aggregation"));
  children.push(boldPara("What PDF demands: ", "Team dashboard aggregating time across all members for a project/client, who worked on what, how long, budget mapping"));
  children.push(boldPara("What exists: ", "Individual time tracking works (workSessions, timeBlocks, TimeTracking.tsx with timer UI). But all queries filter by userId. No team aggregation. No project/client tagging with IDs (just string names). TimeTracking.tsx uses mock data."));
  children.push(para("What must be built:"));
  children.push(bullet("Team time tracking view (aggregate hours across workspace members)"));
  children.push(bullet("Team utilization reports (billable vs non-billable hours per member)"));
  children.push(bullet("Project-based time aggregation (link time entries to projectId, not just strings)"));
  children.push(bullet("Client-level time reporting"));
  children.push(bullet("Manager time approval workflow"));
  children.push(bullet("Budget tracking against logged hours"));
  children.push(boldPara("Estimated effort: ", "1.5 weeks"));

  // 3.4
  children.push(heading2("3.4 Team/Agency Reporting Dashboard"));
  children.push(boldPara("What PDF demands: ", "Team utilization rate, client profitability, scope creep financial impact, invoice-to-payment time, proposal-to-close rate"));
  children.push(boldPara("What exists: ", "Dashboard.tsx (individual), OwnerDashboard.tsx (MRR tracking with mock data), Reports.tsx (dispute reports with mock data). No team utilization. No client profitability. No workspace-level metrics."));
  children.push(para("What must be built:"));
  children.push(bullet("Agency dashboard replacing OwnerDashboard"));
  children.push(bullet("Team utilization widget (billable % per member)"));
  children.push(bullet("Client profitability widget (revenue minus team cost)"));
  children.push(bullet("Scope creep financial impact tracker"));
  children.push(bullet("Invoice aging report"));
  children.push(bullet("Proposal conversion funnel"));
  children.push(bullet("All scoped to workspace, not user"));
  children.push(boldPara("Estimated effort: ", "1.5 weeks"));

  // 3.5
  children.push(heading2("3.5 Critical Integrations"));
  children.push(boldPara("What PDF demands: ", "QuickBooks/Xero sync, Slack notifications, email delivery for follow-ups"));
  children.push(boldPara("What exists: ", "Platform connections (Upwork/Fiverr/Toptal OAuth), Chrome extension for evidence, HTTP API for extension. NO accounting sync, NO Slack, NO email delivery. Follow-up reminders are scheduled but never sent."));
  children.push(para("What must be built:"));
  children.push(bullet("QuickBooks Online integration (invoice sync, customer sync)"));
  children.push(bullet("Xero integration (parallel to QuickBooks)"));
  children.push(bullet("Slack integration (team notifications, scope alerts, project updates)"));
  children.push(bullet("Email delivery system (transactional emails for invoices, proposals, follow-ups)"));
  children.push(bullet("Stripe billing integration (listed above)"));
  children.push(boldPara("Estimated effort: ", "2-3 weeks"));

  // ═══ Section 4: HIGH Priority (P1) ═══
  children.push(heading1("4. Codebase Gap Analysis — HIGH Priority (P1)"));

  // 4.1
  children.push(heading2("4.1 Per-Seat Pricing Model"));
  children.push(boldPara("Current: ", "Flat per-user pricing ($0/$9/$29/$79)"));
  children.push(boldPara("PDF demands: ", "Per-seat pricing with quantity. Free($0), Starter($12/user/mo), Pro($29/user/mo), Agency($49/user/mo), Enterprise(custom)"));
  children.push(boldPara("Changes: ", "Restructure Subscription.tsx, implement seat counting, add billing for seat quantity changes, add annual toggle"));

  // 4.2
  children.push(heading2("4.2 Client Portal — Real Auth + Shareable Proof Links"));
  children.push(boldPara("What exists: ", "ClientLogin.tsx, ClientSignup.tsx, ClientDashboard.tsx exist but use localStorage (no real auth). Client companies are a separate entity from users. No shareable proof links. No client-facing verification reports."));
  children.push(para("What must be built:"));
  children.push(bullet("Real auth for clients (Convex Auth)"));
  children.push(bullet("Shareable verification URLs (like proposals have publicToken)"));
  children.push(bullet("Client-facing project progress view"));
  children.push(bullet("Notification system for clients"));

  // 4.3
  children.push(heading2("4.3 Pipeline Deal Assignment to Team Members"));
  children.push(boldPara("What exists: ", "Pipeline CRUD is functional (stages, deals, stats). But no assignedTo field on deals. No revenue forecasting. No client contact management."));
  children.push(para("What must be built:"));
  children.push(bullet("assignedTo field on deals"));
  children.push(bullet("Deal assignment UI"));
  children.push(bullet("Revenue forecasting from pipeline data"));
  children.push(bullet("Client contact enrichment"));

  // 4.4
  children.push(heading2("4.4 Multi-Currency UI + Exchange Rates"));
  children.push(boldPara("What exists: ", "Currency field exists in schema (optional string) but no validation, no currency picker UI, no formatting, defaults to USD hardcoded"));
  children.push(para("What must be built:"));
  children.push(bullet("Currency picker component"));
  children.push(bullet("Locale-aware formatting"));
  children.push(bullet("Exchange rate API integration"));
  children.push(bullet("Multi-currency reporting"));

  // 4.5
  children.push(heading2("4.5 Workspace-Scoped Data Migration"));
  children.push(para("All existing data (30+ tables) is keyed by userId. When workspaces launch, every existing user's data must be migrated into a personal workspace. This is a one-time migration script."));
  children.push(boldPara("Estimated effort: ", "1 week"));

  // ═══ Section 5: MEDIUM Priority (P2) ═══
  children.push(heading1("5. Codebase Gap Analysis — MEDIUM Priority (P2)"));

  // 5.1
  children.push(heading2("5.1 White-Label / Custom Branding for Agency Tier"));
  children.push(boldPara("PDF demands: ", "Agencies brand client portal with own logo, colors, domain"));
  children.push(boldPara("Currently: ", "No white-label support at all"));
  children.push(para("Build: Custom CSS theming per workspace, custom domain mapping, logo/branding in client portal"));

  // 5.2
  children.push(heading2("5.2 API Access for Custom Integrations"));
  children.push(boldPara("Currently: ", "Only extension-facing HTTP endpoints"));
  children.push(para("Build: Public REST API with API keys, rate limiting, documentation (OpenAPI), webhook support"));

  // 5.3
  children.push(heading2("5.3 Retainer Management Module"));
  children.push(boldPara("Currently: ", "No retainer tracking. Billing is project/invoice-based only."));
  children.push(para("Build: Monthly retainer creation, automatic hour deduction, retainer limit alerts, auto-invoice at retainer period start"));

  // 5.4
  children.push(heading2("5.4 Team Capacity Planning"));
  children.push(para("Build: Per-member booked vs available hours view, project staffing recommendations, burnout alerts"));

  // 5.5
  children.push(heading2("5.5 Client Health Score"));
  children.push(para("Build: Automated score based on payment speed, scope creep frequency, communication responsiveness, proposal acceptance rate"));

  // 5.6
  children.push(heading2("5.6 Team Scope Alerts"));
  children.push(boldPara("Currently: ", "Scope protection is solid for individuals. No team-level alerts."));
  children.push(para("Build: Team-level scope alerts, retainer burn-down tracking, automatic change order generation when team exceeds scope"));

  // ═══ Section 6: What Already Works Well ═══
  children.push(heading1("6. What Already Works Well (Keep & Enhance)"));

  children.push(heading2("6.1 Truth Layer / Evidence System — RATING: 5/5"));
  children.push(para("Evidence sessions, WCVM context scanner, verification signatures, dispute reports, Chrome extension — all functional and genuinely competitive. This is the hardest feature to build and Axia has it working."));
  children.push(para("ONLY needs: shareable proof links (publicToken like proposals), workspace scoping", { run: { bold: true } }));

  children.push(heading2("6.2 Scope Creep Protection — RATING: 5/5"));
  children.push(para("Scope definitions, change orders, client approval via approvalToken, scope formalization — all solid."));
  children.push(para("ONLY needs: team-level alerts, workspace scoping", { run: { bold: true } }));

  children.push(heading2("6.3 Proposals System — RATING: 5/5"));
  children.push(para("Full CRUD, public client view via publicToken, e-signature, templates, follow-up automation, stats — most B2B-ready feature."));
  children.push(para("ONLY needs: collaborative editing, workspace scoping, template library per workspace", { run: { bold: true } }));

  children.push(heading2("6.4 Billing System — RATING: 4/5"));
  children.push(para("Invoice CRUD, work links, payment reminders, stats, currency field — solid foundation."));
  children.push(para("Needs: QuickBooks/Xero sync, multi-client billing from workspace, real payment reminders (email delivery)", { run: { bold: true } }));

  children.push(heading2("6.5 Pipeline / CRM — RATING: 4/5"));
  children.push(para("Stages, deals, stats, currency, source tracking — functional."));
  children.push(para("Needs: deal assignment, revenue forecasting, client contact management", { run: { bold: true } }));

  children.push(heading2("6.6 Client Portal Skeleton — RATING: 3/5"));
  children.push(para("Login, signup, dashboard, WCVM verification, freelancer directory, verification requests — UI exists."));
  children.push(para("Needs: Real auth (not localStorage), shareable proof links, project progress view", { run: { bold: true } }));

  // ═══ Section 7: 90-Day Implementation Roadmap ═══
  children.push(heading1("7. 90-Day Implementation Roadmap"));
  children.push(makeTable(
    ["Phase", "Timeline", "Product Focus", "Sales/Marketing Focus", "Success Metric"],
    [
      ["Phase 1 — Foundation", "Week 1-4",
        "Workspace architecture (workspaces, members, roles, invitations); Add workspaceId to all tables, data migration; Workspace switcher UI, settings page; Stripe integration with per-seat pricing",
        "Create B2B landing page, ROI calculator, demo script",
        "Multi-user workspace in beta; 10 demo bookings"],
      ["Phase 2 — Launch", "Week 5-8",
        "Client portal v1 with real auth and shareable proof links; Team time tracking aggregation; Team reporting dashboard; QuickBooks integration",
        "Launch B2B pricing; Outbound to 50 agencies/week",
        "5 paying agencies on Pro/Agency tier; $2K MRR"],
      ["Phase 3 — Scale", "Week 9-12",
        "White-label for Agency tier; Slack integration; Team-level scope creep alerts; Agency referral program",
        "G2/Capterra listings; 2 published case studies",
        "15 paying agencies; $8K MRR; 2 referrals/week"],
      ["Phase 4 — Expand", "Month 4+",
        "API access; Retainer management; Capacity planning; Client health score",
        "Hire first SDR; Attend agency conferences",
        "30+ agencies; $20K+ MRR; <5% monthly churn"],
    ]
  ));

  // ═══ Section 8: Risk Assessment ═══
  children.push(heading1("8. Risk Assessment"));
  children.push(makeTable(
    ["Risk", "Likelihood", "Impact", "Mitigation"],
    [
      ["Workspace architecture takes too long", "High", "High", "Prioritize ruthlessly: workspaces + members + roles first. Ship minimum, iterate."],
      ["Agencies don't convert from waitlist", "Medium", "High", "Do 20 discovery calls BEFORE building. Validate ICP."],
      ["Competitors add verification", "Low (12+ months)", "High", "Move fast. Ship client portal before anyone starts building it."],
      ["Pricing too high for Indian market", "High", "Medium", "Consider India-specific pricing (40-50% discount for India-registered businesses)."],
      ["Freelancer users feel abandoned", "Medium", "Low", "Keep Free/Starter tiers untouched. Add 'Growing team?' prompt."],
      ["Sales cycle too long for early startup", "High", "Medium", "Target micro-agencies (3-5 people) first. They decide in days."],
      ["Churn in first 3 months (teams revert)", "Medium", "High", "Invest heavily in onboarding. First 30 days = hand-holding. Check in weekly."],
    ]
  ));

  // ═══ Section 9: The Bottom Line ═══
  children.push(heading1("9. The Bottom Line"));
  children.push(para("Axia already has the hardest feature to build: the Truth Layer. The B2B pivot is primarily about adding multi-user capabilities and repositioning what already exists. This is not starting from scratch — it's taking the strongest asset (work verification) and pointing it at the audience that values it most (agencies losing real money without proof of work). The competitive moat is real: no other tool offers automated work verification that creates client-proof billing. That's not a feature — it's a category."));
  children.push(para("The total estimated effort for CRITICAL items is 10-12 weeks. With HIGH priority items, 14-16 weeks. The recommended approach is the 90-day roadmap: ship workspaces first, then client portal, then scale. The key is to not try to build everything before launch — get workspaces + Stripe + basic team reporting working, and start selling. The Truth Layer and scope protection will close deals on their own."));
  children.push(para("The key insight from the PDF that should guide every decision: 'The Truth Layer is your #1 competitive advantage in B2B. No other tool offers automated work verification that creates client-proof billing. Lead with this in EVERY sales conversation, demo, and piece of marketing material.' This isn't just a positioning statement — it's the entire product strategy in one sentence. Every feature decision, every sales pitch, every marketing asset should reinforce this truth."));

  return children;
}

// ─── TOC Section Content ───
function buildTocSection() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 360 },
      children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, font: { eastAsia: FONT_HEADING_EA, ascii: FONT_HEADING_ASCII } })],
    }),
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: 'Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select "Update Field."', italics: true, size: 18, color: "888888" })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── MAIN ───
async function main() {
  const outputPath = "/home/z/my-project/download/axia_b2b_pivot_change_analysis.docx";

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: { ascii: FONT_ASCII, eastAsia: FONT_EA }, size: 24, color: P.body },
          paragraph: { spacing: { line: 312 } },
        },
        heading1: {
          run: { font: { ascii: FONT_HEADING_ASCII, eastAsia: FONT_HEADING_EA }, size: 32, bold: true, color: "0F172A" },
        },
        heading2: {
          run: { font: { ascii: FONT_HEADING_ASCII, eastAsia: FONT_HEADING_EA }, size: 28, bold: true, color: "1E293B" },
        },
        heading3: {
          run: { font: { ascii: FONT_HEADING_ASCII, eastAsia: FONT_HEADING_EA }, size: 26, bold: true, color: P.accent },
        },
      },
    },
    sections: [
      // Section 1: Cover — no page number
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children: buildCoverR4(),
      },
      // Section 2: TOC — Roman numerals
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
          },
        },
        footers: { default: makePageNumFooter() },
        children: buildTocSection(),
      },
      // Section 3: Body — Arabic numerals
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        footers: { default: makePageNumFooter() },
        children: buildBody(),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document generated: ${outputPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
