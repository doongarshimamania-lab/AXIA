import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, PageBreak, TableOfContents,
  Header, Footer, PageNumber, NumberFormat,
  SectionType
} from "docx";
import fs from "fs";

const FONT = "Space Grotesk";
const FONT_BODY = "Calibri";
const COLOR_PRIMARY = "00246B";
const COLOR_ACCENT = "5C6AC4";
const COLOR_DARK = "1E293B";
const COLOR_MID = "475569";
const COLOR_LIGHT = "94A3B8";
const COLOR_BG = "F8FAFC";

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: FONT, size: 56, bold: true, color: COLOR_PRIMARY })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, font: FONT, size: 44, bold: true, color: COLOR_DARK })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, font: FONT, size: 36, bold: true, color: COLOR_ACCENT })],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 312 },
    ...opts,
    children: [new TextRun({ text, font: FONT_BODY, size: 22, color: COLOR_DARK, ...opts.run })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 60, line: 312 },
    children: [new TextRun({ text, font: FONT_BODY, size: 22, color: COLOR_DARK })],
  });
}

function boldPara(label, value) {
  return new Paragraph({
    spacing: { after: 80, line: 312 },
    children: [
      new TextRun({ text: label, font: FONT_BODY, size: 22, bold: true, color: COLOR_DARK }),
      new TextRun({ text: value, font: FONT_BODY, size: 22, color: COLOR_MID }),
    ],
  });
}

function tableRow(cells, isHeader = false) {
  return new TableRow({
    tableHeader: isHeader,
    children: cells.map(text =>
      new TableCell({
        shading: isHeader
          ? { fill: COLOR_PRIMARY, type: ShadingType.CLEAR }
          : { fill: COLOR_BG, type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun({
            text: String(text),
            font: FONT_BODY,
            size: 20,
            bold: isHeader,
            color: isHeader ? "FFFFFF" : COLOR_DARK,
          })],
        })],
      })
    ),
  });
}

function makeTable(headers, rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      tableRow(headers, true),
      ...rows.map(r => tableRow(r)),
    ],
  });
}

// ====================== COVER PAGE ======================
const coverSection = {
  properties: {
    page: {
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    },
  },
  children: [
    new Paragraph({ spacing: { before: 4000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "AXIA", font: FONT, size: 96, bold: true, color: COLOR_PRIMARY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "Freelancer Payment Protection Platform", font: FONT, size: 40, color: COLOR_ACCENT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ text: "Comprehensive Technical Analysis Report", font: FONT, size: 32, color: COLOR_MID })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "________________________________________", font: FONT, size: 28, color: COLOR_LIGHT })],
    }),
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "Full Stack Application Audit", font: FONT_BODY, size: 24, color: COLOR_MID })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "Vite + Convex + React + TypeScript", font: FONT_BODY, size: 24, color: COLOR_MID })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, font: FONT_BODY, size: 22, color: COLOR_LIGHT })],
    }),
  ],
};

// ====================== TOC ======================
const tocSection = {
  properties: {
    page: {
      margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
    },
  },
  children: [
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: "Table of Contents", font: FONT, size: 48, bold: true, color: COLOR_PRIMARY })],
    }),
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({
      children: [new TextRun({ text: "Right-click the Table of Contents and select \"Update Field\" to refresh page numbers.", font: FONT_BODY, size: 18, italics: true, color: COLOR_LIGHT })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ],
};

// ====================== BODY ======================
const bodyChildren = [];

// ===== 1. EXECUTIVE SUMMARY =====
bodyChildren.push(heading1("1. Executive Summary"));
bodyChildren.push(para("Axia is a full-stack Software-as-a-Service (SaaS) platform designed to protect freelancers from payment denials on platforms like Upwork, Fiverr, and Toptal. The application provides real-time compliance monitoring, evidence collection, AI-powered dispute prediction, and automated dispute report generation. The platform operates on a tiered subscription model (Free, Starter, Pro, Expert) with progressively more sophisticated protection features unlocked at each tier."));
bodyChildren.push(para("The application is built using a modern web stack: Vite as the build tool, React with TypeScript for the frontend, Convex as the real-time backend and database, and Tailwind CSS with shadcn/ui for styling. The app features 25 distinct pages, 140+ components, 30 database tables, and 75+ backend functions. A dual-user architecture supports both freelancer-facing and client-facing interfaces, connected through the Work Context Verification Matrix (WCVM) system."));
bodyChildren.push(para("The application is currently in a functional demo/MVP stage: the Convex backend is deployed and operational with real-time queries and mutations, but many dashboard pages use mock data rather than live Convex data. The evidence collection pipeline is architected but relies on a browser extension (not yet deployed) for real-time data capture. The authentication system uses Convex Auth with email OTP and supports anonymous sign-in."));

// ===== 2. TECHNOLOGY STACK =====
bodyChildren.push(heading1("2. Technology Stack"));
bodyChildren.push(makeTable(
  ["Layer", "Technology", "Version/Details"],
  [
    ["Frontend Framework", "React", "18+ with TypeScript"],
    ["Build Tool", "Vite", "6.4.2"],
    ["Backend", "Convex", "Cloud deployment (artful-civet-344)"],
    ["Auth", "@convex-dev/auth", "Email OTP + Anonymous providers"],
    ["Routing", "React Router", "Client-side SPA routing"],
    ["Styling", "Tailwind CSS 4", "With @tailwindcss/vite plugin"],
    ["UI Components", "shadcn/ui", "46 primitives (Radix UI based)"],
    ["Animations", "Framer Motion", "Page transitions, sidebar, cards"],
    ["State (Server)", "Convex queries/mutations", "Real-time subscriptions"],
    ["State (Client)", "localStorage + React Context", "Theme, tier, sidebar state"],
    ["Notifications", "Sonner", "Toast notifications"],
    ["Charts", "Recharts (via shadcn/ui chart)", "Used in dashboards"],
    ["AI", "OpenAI GPT-4o-mini", "Via LangChain in Convex actions"],
    ["Encryption", "AES-256-GCM + HMAC-SHA256", "User ID hashing, data encryption"],
  ]
));

// ===== 3. APPLICATION ARCHITECTURE =====
bodyChildren.push(heading1("3. Application Architecture"));
bodyChildren.push(heading2("3.1 High-Level Architecture"));
bodyChildren.push(para("The application follows a three-tier architecture: a React SPA frontend served as static files, a Convex cloud backend providing real-time data and serverless functions, and a browser extension (architected but not yet deployed) for evidence collection. The frontend communicates with Convex via WebSocket for real-time subscriptions and HTTPS for mutations and actions. A Caddy reverse proxy sits in front of the static file server for production access."));
bodyChildren.push(para("The Convex backend serves as both the database and the API layer. It provides queries (read, real-time subscribed), mutations (write, transactional), actions (serverless functions with external API access), and HTTP endpoints (for the browser extension). All data flows through Convex, which handles caching, real-time subscriptions, and optimistic updates automatically."));

bodyChildren.push(heading2("3.2 Routing Architecture"));
bodyChildren.push(para("The application uses React Router with two layout patterns: public pages (no sidebar) and dashboard pages (with a collapsible sidebar). An error boundary wraps the ConvexAuthProvider to prevent backend errors from crashing the entire app. A safe useQuery wrapper converts thrown errors into undefined returns, preventing cascade failures."));
bodyChildren.push(makeTable(
  ["Route", "Component", "Layout", "Auth Required"],
  [
    ["/", "Landing", "Public (no sidebar)", "No"],
    ["/auth", "AuthPage", "Public (no sidebar)", "No"],
    ["/waitlist/success", "WaitlistSuccess", "Public (no sidebar)", "No"],
    ["/onboarding-user-information", "OnboardingUserInformation", "Public (no sidebar)", "Yes"],
    ["/onboarding-source", "OnboardingSource", "Public (no sidebar)", "Yes"],
    ["/client-login", "ClientLogin", "Public (no sidebar)", "No"],
    ["/client-signup", "ClientSignup", "Public (no sidebar)", "No"],
    ["/client-dashboard", "ClientDashboard", "Public (no sidebar)", "Client auth"],
    ["/owner-dashboard", "OwnerDashboard", "Standalone (password)", "Password"],
    ["/dashboard", "Dashboard", "Sidebar layout", "Yes"],
    ["/clients", "Clients", "Sidebar layout", "Yes"],
    ["/projects", "Projects", "Sidebar layout", "Yes"],
    ["/protection-value", "ProtectionValueDashboard", "Sidebar layout", "Yes"],
    ["/network", "PremiumNetwork", "Sidebar layout", "Yes"],
    ["/teams", "Teams", "Sidebar layout", "Yes"],
    ["/evidence-library", "EvidenceLibrary", "Sidebar layout", "Yes"],
    ["/time-tracking", "TimeTracking", "Sidebar layout", "Yes"],
    ["/tags", "Tags", "Sidebar layout", "Yes"],
    ["/goals", "Goals", "Sidebar layout", "Yes"],
    ["/invoices", "Invoices", "Sidebar layout", "Yes"],
    ["/payment-patterns", "PaymentPatterns", "Sidebar layout", "Yes"],
    ["/reports", "Reports", "Sidebar layout", "Yes"],
    ["/platform-integrations", "PlatformIntegrations", "Sidebar layout", "Yes"],
    ["/evidence-export", "EvidenceExport", "Sidebar layout", "Yes"],
    ["/api-settings", "ApiSettings", "Sidebar layout", "Yes"],
    ["/subscription", "Subscription", "Sidebar layout", "Yes"],
    ["/help-center", "HelpCenter", "Sidebar layout", "Yes"],
    ["/*", "NotFound", "None", "No"],
  ]
));

bodyChildren.push(heading2("3.3 State Management"));
bodyChildren.push(para("The application uses a hybrid state management approach combining three distinct strategies:"));
bodyChildren.push(bullet("Convex Real-Time State: Server-side data managed through Convex queries and mutations. This includes user profiles, work sessions, evidence data, dispute reports, and platform connections. Convex provides automatic real-time subscriptions so all connected clients see updates instantly."));
bodyChildren.push(bullet("localStorage Persistence: Client-side data stored in the browser with the 'axia_' prefix. This includes the theme preference (axia_theme), subscription tier (axia_subscription_tier), sidebar state (axia_sidebar_state), sidebar sections (axia_sidebar_sections), sidebar scroll position (axia_sidebar_scroll), and pending platform connections (axia_pending_platform)."));
bodyChildren.push(bullet("React Context + Local State: The ThemeProvider context manages dark/light mode globally, the useSubscriptionTier hook manages tier state with cross-tab synchronization via StorageEvent and custom DOM events, and individual components use useState for local UI state like form inputs, modals, and filters."));

bodyChildren.push(heading2("3.4 Theme System"));
bodyChildren.push(para("The application supports dark and light themes via Tailwind CSS's class-based dark mode strategy. The ThemeProvider component manages a React context that toggles the 'dark' class on the document root element. CSS variables in :root define light theme colors, while .dark overrides define dark theme colors. The system uses @custom-variant dark (&:is(.dark *)) for component-level dark mode styling. The flash-of-wrong-theme is prevented by an inline script in index.html that applies the stored theme before React hydrates, and the ThemeProvider applies DOM changes synchronously inside the state updater for zero-lag toggling."));

bodyChildren.push(heading2("3.5 Error Handling"));
bodyChildren.push(para("The application implements a multi-layer error handling strategy to prevent blank screens and cascade failures:"));
bodyChildren.push(bullet("ConvexErrorBoundary: A React error boundary in main.tsx that always renders children even when errors occur, preventing the blank screen issue that would otherwise result from Convex backend errors."));
bodyChildren.push(bullet("Safe useQuery Wrapper: Located at src/lib/safe-convex-react.ts, this wraps Convex's useQuery_experimental with throwOnError: false, converting query errors into undefined returns instead of thrown exceptions that crash the React tree."));
bodyChildren.push(bullet("Vite Alias Redirect: The vite.config.ts redirects all 'convex/react' imports to the safe wrapper, ensuring that every component automatically uses the safe version without manual changes."));
bodyChildren.push(bullet("Mock Data Fallbacks: Most dashboard pages use mock/hardcoded data instead of live Convex queries, which means they render correctly even when the backend is completely unavailable."));

// ===== 4. PAGES =====
bodyChildren.push(heading1("4. Page-by-Page Analysis"));

bodyChildren.push(heading2("4.1 Public Pages"));
bodyChildren.push(heading3("4.1.1 Landing Page (/)"));
bodyChildren.push(para("The landing page is the public-facing marketing homepage for Axia. It serves as the entry point for new users and provides an overview of the platform's value proposition. The page features a hero section with the main tagline and call-to-action, a 'Problems We Solve' section with animated problem cards highlighting freelancer payment issues, a social proof section with testimonials and statistics (83% dispute success rate, $1,028 average loss prevented, 12k+ users, 4.9/5 rating), a final CTA section, and a footer. A fixed-position dark mode toggle is located in the top-right corner using a Switch component with Sun and Moon icons. The 'Get Started' button scrolls to the waitlist form section. The page uses smooth-scroll navigation for section links."));

bodyChildren.push(heading3("4.1.2 Auth Page (/auth)"));
bodyChildren.push(para("The authentication page implements a two-step sign-in flow: first the user enters their email, then they verify a 6-digit OTP code sent to their email. The page also features platform connection buttons (Upwork, Fiverr, Toptal) that initiate a simulated OAuth flow, a Google sign-in button, and a 'More options' section that reveals an email + password form (which uses the Convex OTP flow under the hood). When a platform is selected, a modal shows the permissions Axia needs (view work activity, manage time entries) before connecting. The pending platform choice is stored in localStorage and processed after authentication. A custom platform setup modal allows adding platforms with name, policy URL, and compliance rules."));

bodyChildren.push(heading3("4.1.3 Waitlist Success (/waitlist/success)"));
bodyChildren.push(para("Displayed after a user joins the waitlist. Shows the user's position in line, a unique referral link with copy-to-clipboard functionality, a progress bar toward early access (5 referrals needed), social sharing buttons (Twitter, Facebook, LinkedIn, native share API), and a referral count. Uses Convex to query referral stats in real-time."));

bodyChildren.push(heading3("4.1.4 Onboarding - User Information (/onboarding-user-information)"));
bodyChildren.push(para("Step 1 of the 2-step onboarding flow. Collects the user's professional profile: full name, hourly rate (USD), primary platform (dropdown with 8 options: Upwork, Fiverr, Toptal, Freelancer, Toptal, Guru, PeoplePerHour, Other), years of experience, and professional bio. The data is saved to localStorage under 'onboardingData' and the user is navigated to step 2."));

bodyChildren.push(heading3("4.1.5 Onboarding - Source (/onboarding-source)"));
bodyChildren.push(para("Step 2 of the onboarding flow. Presents a 4x3 grid of 12 acquisition source options (Search Engine, Social Media, Blog, Podcast, YouTube, Paid Ad, Friend Referral, Colleague, Community, Course, Conference, Other). Conditional detail inputs appear for 'Friend Referral' and 'Other' selections. After completing this step, the user is navigated to the main dashboard."));

bodyChildren.push(heading3("4.1.6 Client Login (/client-login) & Client Signup (/client-signup)"));
bodyChildren.push(para("Separate authentication flow for client companies. The signup form collects contact name, company email, company name, industry (select from 8 options), company size (select from 5 options), and website. The login page accepts an email with demo mode (any email accepted). The client email is stored in localStorage for session persistence. After authentication, clients are directed to the Client Dashboard."));

bodyChildren.push(heading2("4.2 Dashboard Pages (Sidebar Layout)"));
bodyChildren.push(heading3("4.2.1 Dashboard (/dashboard)"));
bodyChildren.push(para("The main freelancer dashboard is the application's primary hub, containing the most feature-dense interface. It is organized into several distinct sections:"));
bodyChildren.push(bullet("Compliance Status Widget: A top-bar banner showing the current compliance status (active/at_risk/rejected) with a countdown timer, loss-aversion messaging showing weekly platform-specific losses, and a CTA to generate dispute reports when status is rejected."));
bodyChildren.push(bullet("Platform Selector Tabs: Four tabs (All Platforms, Upwork, Fiverr, Toptal) that filter the dashboard content by platform, with connection status indicators (green/red dots)."));
bodyChildren.push(bullet("Stats Cards: Three cards showing Active Session duration (with live evidence collection count), Rejected Hours this month, and Dispute Reports generated this month with usage limits."));
bodyChildren.push(bullet("Work Diary Simulator: A visual timeline of 5-minute work blocks with compliance status coloring (green=compliant, yellow=at risk, red=rejected), clickable to open a detailed timeline popup."));
bodyChildren.push(bullet("My Reports: A list of generated dispute reports with case IDs, timestamps, status badges, and view buttons."));
bodyChildren.push(bullet("Quick Actions: Start Timer button, Automated Dispute Report (Pro+ only), and Upgrade to Pro CTA for free users."));
bodyChildren.push(bullet("Right Sidebar: Evidence Monitor (live collection status), WCVM Verification Badge (context relevance score, requirement matches, gaps), Real-Time Protection Advisor (Pro+), Cross-Platform Verification (Pro+), AI Dispute Prediction (Pro+), Custom Policy Analyzer (Pro+), and Lost Income Calculator (free) or Premium Value Section (pro+)."));

bodyChildren.push(heading3("4.2.2 Projects (/projects)"));
bodyChildren.push(para("The project protection page provides comprehensive per-project analysis. It displays a project list with selection, an 'Add Test Project' seeder button, and six full-width feature sections for the selected project:"));
bodyChildren.push(bullet("Protection Score: A circular score visualization with tier-based breakdowns showing how different factors contribute to the overall protection level."));
bodyChildren.push(bullet("Health Dashboard: A tier-gated multi-pillar health assessment. Free users see 2 pillars (Compliance, Evidence), Starter sees 3 (+Work Context), Pro sees 4 (+Vulnerabilities), Expert sees full + business map and predictions."));
bodyChildren.push(bullet("Risk Timeline: A chronological view of risk events and compliance status changes over time, with tier-specific detail levels."));
bodyChildren.push(bullet("Milestone Protection: Weekly milestone tracking with protection rates, evidence counts, snapshots, and alerts. Expert tier includes AI predictions."));
bodyChildren.push(bullet("Adaptive Evidence System: Tier-gated evidence collection recommendations based on the project's current compliance gaps and platform requirements."));
bodyChildren.push(bullet("Protection Risk Heatmap: A visual matrix showing risk levels across different dimensions (time, activity, evidence, compliance) with color-coded cells."));

bodyChildren.push(heading3("4.2.3 Clients (/clients)"));
bodyChildren.push(para("The client protection and trust analysis page provides detailed insights about each client relationship. It features a client list with selection and tier-gated analysis sections:"));
bodyChildren.push(bullet("Client Trust Score: Free tier shows payment reliability only, Starter adds communication patterns, Pro adds Pattern #7 vulnerability detection, Expert adds business pattern analysis."));
bodyChildren.push(bullet("Client Protection Score: Similar tier gating showing how well-protected the freelancer is when working with each client."));
bodyChildren.push(bullet("Client Dispute Simulation: Simulates a dispute scenario with the client showing likely outcomes and evidence strength."));
bodyChildren.push(bullet("Client Payment Pattern: Visual timeline of payment behavior with on-time/late indicators."));
bodyChildren.push(bullet("Client Policy Profile: Extracted client contract terms and requirements for compliance checking."));
bodyChildren.push(bullet("Client Gap Prediction: AI-powered prediction of potential compliance gaps with the client."));
bodyChildren.push(bullet("Team Evidence Validation (Expert only): Collaborative evidence verification with team members."));

bodyChildren.push(heading3("4.2.4 Time Tracking (/time-tracking)"));
bodyChildren.push(para("A full time tracking page with a timer interface and entries list. Features include start/pause/stop timer controls, manual time entry dialog (free tier limited), stats cards (Total This Week, Compliance Rate, Flagged Hours, Average Daily), time entries list with expandable details (memo, time range, tags), edit/delete capabilities, compliance badges (compliant/at_risk/flagged), and platform badges. The page uses 5 mock time entries for demo purposes."));

bodyChildren.push(heading3("4.2.5 Evidence Library (/evidence-library)"));
bodyChildren.push(para("The evidence library provides comprehensive evidence viewing and health monitoring. It uses real Convex queries for evidence data and timeline. Features include: Evidence Health Score with visual gauge, Dispute Success Simulation (Starter+), Work Content Analysis (Pro+), Evidence Gap Prediction (Starter+), Evidence Timeline with hourly granularity, Evidence Quality Scorecard (Pro+), Team Validation (Expert+), and an Evidence Items List with view mode switcher (date/project/client/type)."));

bodyChildren.push(heading3("4.2.6 Invoices (/invoices)"));
bodyChildren.push(para("Invoice creation and management with stats cards (Total Revenue, Pending Amount, Overdue Amount, Average Payment Time), search and filter by status, invoice list with expand/collapse showing line items table, actions (Send, Mark as Paid, File Dispute Report for Pro+ overdue invoices), Create Invoice dialog with dynamic line items, overdue day calculation, and platform badges. Uses 6 mock invoices."));

bodyChildren.push(heading3("4.2.7 Reports (/reports)"));
bodyChildren.push(para("Dispute report generation and management with stats (Total Reports, Success Rate, Average Resolution Time, Protected Amount), free tier limit notice (1 report/month), tab filters (All/Active/Resolved/Appealed), search by case ID/client/project, expandable report cards with description, evidence summary, and recommendations, Pro-only advanced analysis panel (Evidence Strength, Dispute Risk, WCVM Score), status transitions (generated to sent to resolved/appealed), and Generate Report dialog with evidence source selector (Pro-only). Uses 6 mock reports."));

bodyChildren.push(heading3("4.2.8 Payment Patterns (/payment-patterns)"));
bodyChildren.push(para("Payment analytics and late-payment risk detection with extensive mock data. Features stats cards (Total Earned, Average Payment Time, On-Time Rate, At-Risk Amount), tabbed interface (Overview, Payment Timeline, Late Alerts, Risk Analysis, Predictions [Pro-only]), platform breakdown with trends, animated bar chart for monthly trend, payment timeline with search/filter, late payment alerts with severity and actions (Send Reminder, Escalate [Pro]), client risk analysis with risk scores, and Pro-only predictive analytics (next-month estimates, cash flow forecast, recommendations)."));

bodyChildren.push(heading3("4.2.9 Tags (/tags)"));
bodyChildren.push(para("Tag management for organizing work entries with stats (Total Tags, Most Used, Untagged Entries), search and quick-filter by tag, tag cards in grid layout with name/color/description/count/last used, full CRUD operations (create with name/color/description, edit, delete with confirmation), and a color picker with 12 presets plus custom color. Uses 10 preset tags."));

bodyChildren.push(heading3("4.2.10 Goals (/goals)"));
bodyChildren.push(para("Goal setting and tracking with stats (Active Goals, Completion Rate, Best Streak), status filter (all/active/completed/paused/overdue), goal cards with progress bar, milestones, tags, deadline countdown, and streak indicator, full CRUD operations (create with title/description/target date/metric/tags, edit, delete with confirmation), and mark complete functionality. Uses 6 mock goals."));

bodyChildren.push(heading3("4.2.11 Platform Integrations (/platform-integrations)"));
bodyChildren.push(para("Platform connection management for Upwork, Fiverr, Toptal, and Freelancer.com. Features platform cards with connect/disconnect buttons, connection status with last-synced timestamp, Connect modal (permissions disclosure and data access list), Disconnect confirmation AlertDialog, and simulated connect/disconnect with toast feedback. Uses local state rather than Convex."));

bodyChildren.push(heading3("4.2.12 Evidence Export (/evidence-export)"));
bodyChildren.push(para("Evidence export and packaging tool with summary dashboard (Total Items, Last Export, Compliance Score, Verified Exports), format selection (CSV=free, JSON=starter, PDF/Legal Package=pro), date range and project/client filters, evidence type checkboxes with counts, export preview panel, compliance verification badge (Pro+), export action with simulated processing, and recent exports history with status. Uses mock data."));

bodyChildren.push(heading3("4.2.13 API Settings (/api-settings)"));
bodyChildren.push(para("API key and webhook management with tier info banner (rate limits: Free=100/day, Pro=10,000/day), API usage stats (Requests Today, Rate Limit, Error Rate), API key management (generate with name, reveal/mask toggle, copy-to-clipboard, revoke with confirmation, delete), webhook configuration (URL, event selection from 6 events, enable/pause toggle, save), and API documentation links placeholder. Uses mock API keys."));

bodyChildren.push(heading3("4.2.14 Subscription (/subscription)"));
bodyChildren.push(para("Subscription plan management and billing with current plan card with upgrade button, usage stats (Dispute Reports, Platforms, Evidence) with progress bars, pricing cards with monthly/annual toggle (20% discount for annual), feature comparison table, billing history table, FAQ accordion, and plan change confirmation dialog with change plan flow (upgrade immediate, downgrade at period end). Four tiers: Free ($0), Starter ($9), Pro ($29), Expert ($79)."));

bodyChildren.push(heading3("4.2.15 Help Center (/help-center)"));
bodyChildren.push(para("Help center with search bar with filtered results, quick action cards (Contact Support, Schedule Call, Report Bug, Feature Request), FAQ accordion (8 items), Getting Started guide (5 steps), video tutorials grid (6 items), contact form (name/email/subject/message), and support ticket status list. Uses mock articles, tutorials, and tickets."));

bodyChildren.push(heading2("4.3 Special Pages"));
bodyChildren.push(heading3("4.3.1 Owner Dashboard (/owner-dashboard)"));
bodyChildren.push(para("A password-protected admin dashboard (password: @@@@HHH$) with 10-minute session timeout. Features include: Revenue Speedometer (SVG gauge toward $500 MRR target), Priority Actions modal (message high-value users, update compliance rules, launch referral program), Compliance Rule Tester (URL testing against work-site lists), System Health Monitor (Stripe/Upwork/Airtable/Auth API status with fix countdown), Convex Logs viewer (real-time console interception), and Waitlist Entries table with real-time Convex subscription. Uses separate Convex clients for production and development data."));

bodyChildren.push(heading3("4.3.2 Client Dashboard (/client-dashboard)"));
bodyChildren.push(para("Client-facing dashboard for verifying freelancer work with stats cards (Total Verifications, Pending Requests, Verified Freelancers, Company), tabbed interface with 5 tabs: Overview, WCVM Dashboard (verification request dashboard with scores and matrices), Freelancer Directory (searchable verified freelancer directory), Verification Requests (create verification request form), and Real-time Validation (live activity feed and validation status). Uses Convex query for client profile."));

// ===== 5. BACKEND =====
bodyChildren.push(heading1("5. Backend Architecture (Convex)"));
bodyChildren.push(heading2("5.1 Database Schema"));
bodyChildren.push(para("The Convex database contains 30 tables organized into functional groups. The schema uses Convex's type-safe document model with validators for all fields:"));
bodyChildren.push(makeTable(
  ["Category", "Tables", "Purpose"],
  [
    ["Auth", "authTables (6 tables)", "Standard Convex Auth: accounts, sessions, verificationCodes"],
    ["Users", "users", "Profile, tier, vulnerability score, onboarding state"],
    ["Work Tracking", "workSessions, timeBlocks, appUsage, complianceAlerts", "Session lifecycle, 5-min activity blocks, app usage, real-time alerts"],
    ["Evidence", "evidenceSessions, evidenceEvents, wcvmVerifications, evidenceMetadata", "Evidence collection pipeline, WCVM scoring, metadata"],
    ["Projects", "projects, milestoneSnapshots, milestoneAlerts, milestoneReports, scopeFormalizations, protectionPlans", "Project protection, milestones, scope changes, plans"],
    ["Clients", "clients, clientPolicies, clientCompanies, verificationRequests, clientVerificationResults, freelancerPublicProfiles, clientActivityLog", "Client management, policy tracking, verification flow, public profiles"],
    ["Disputes", "disputeReports, automatedDisputeReports", "Report generation and automation"],
    ["Platform", "platformConnections, platformImportedData, crossPlatformVerifications, platformComplianceChecks", "OAuth flow, data import, cross-platform verification"],
    ["Security", "auditTrail, consentManagement, complianceCertificates, dataLineage, consentAudits, extensionTokens", "Audit trail, GDPR consent, certificates, data lineage, extension tokens"],
    ["Network", "networkConnections, teamValidations, protectionAdvisorAlerts, policyIntelligence", "Social network, team validation, AI alerts, policy analysis"],
    ["Waitlist", "waitlistEntries, upgradeTriggers, upgradeConversions", "Waitlist with referrals, conversion tracking"],
  ]
));

bodyChildren.push(heading2("5.2 Backend Functions"));
bodyChildren.push(para("The backend defines 75+ queries, mutations, actions, and HTTP endpoints across 25+ function files:"));
bodyChildren.push(makeTable(
  ["Function File", "Type", "Key Functions", "Purpose"],
  [
    ["auth.ts", "Auth Config", "signIn, signOut, store", "Email OTP + Anonymous auth"],
    ["users.ts", "Q/M", "currentUser, updateProfile, completeOnboarding", "User profile CRUD, protection metrics"],
    ["workSessions.ts", "Q/M", "createSession, endSession, getCurrentSession", "Work session lifecycle"],
    ["timeBlocks.ts", "Q/M", "addTimeBlock, getSessionBlocks, calculateRejectedHours", "5-min blocks with auto-compliance"],
    ["evidence.ts", "Q/M", "startEvidenceSession, recordEvents, finalizeEvidenceSession, generateUniversalReport", "Evidence collection + universal dispute reports"],
    ["disputeReports.ts", "Q/M", "generateDisputeReport, getUserDisputeReports, getMonthlyUsage", "Report CRUD with free tier limit"],
    ["complianceAlerts.ts", "Q/M", "createAlert, getActiveAlerts, acknowledgeAlert", "Real-time compliance alerting"],
    ["extension.ts", "Q/M", "generateToken, revokeToken, validateToken", "Browser extension token pairing"],
    ["waitlist.ts", "Q/M", "addToWaitlist, getWaitlistCount, getReferralStats", "Waitlist with referral system"],
    ["clientAuth.ts", "Q/M", "registerClient, getClientProfile", "Client company registration"],
    ["projects/projectProtection.ts", "Q/M", "getMyProjects, addProject, getProjectProtectionScore, getProjectRiskHeatmap", "Full project protection suite"],
    ["clients/clientProtection.ts", "Q/M", "getMyClients, getClientTrustScore, getClientDisputeSimulation, getClientGapPrediction", "Client protection analytics"],
    ["evidence/library.ts", "Q", "getEvidenceLibraryData, getEvidenceTimeline", "Evidence library with multiple views"],
    ["evidence/analytics.ts", "Q", "calculateEvidenceHealthScore", "Health score, dispute success, gap prediction"],
    ["ai/disputePrediction.ts", "Q/M", "analyzeDisputeRisk, applyRecommendation", "Algorithmic dispute risk analysis"],
    ["security/crypto.ts", "Helpers", "generateUserIdHash, encryptData, generateJWT", "HMAC-SHA256, AES-256-GCM, JWT"],
    ["security/consent.ts", "Q/M", "grantConsent, revokeConsent, verifyConsent", "GDPR-style consent lifecycle"],
    ["security/audit.ts", "Q/M", "logOperation, getAuditTrail, verifyAuditIntegrity", "Immutable audit trail"],
    ["platforms/platformAuth.ts", "Q/M", "initiatePlatformConnection, completePlatformConnection, disconnectPlatform", "OAuth-like platform connection flow"],
    ["http.ts", "HTTP", "4 extension routes + AI route", "Extension API + GPT-4o-mini prediction"],
    ["seed.ts", "M", "seedCurrentUserData, seedDemoUsers, setUserTierForEmail", "Dev/seed data mutations"],
  ]
));

bodyChildren.push(heading2("5.3 HTTP Endpoints"));
bodyChildren.push(para("The backend exposes HTTP endpoints for the browser extension and AI features:"));
bodyChildren.push(makeTable(
  ["Route", "Method", "Purpose", "Auth"],
  [
    ["/api/extension/start", "POST", "Start evidence session from browser extension", "Extension token"],
    ["/api/extension/record", "POST", "Record evidence events (mouse, keyboard, URL, screenshots)", "Extension token"],
    ["/api/extension/finalize", "POST", "Finalize evidence session and generate summary", "Extension token"],
    ["/api/extension/validate", "POST", "Validate extension token (64-hex check)", "None"],
    ["/api/ai/predict", "POST", "AI dispute prediction via OpenAI GPT-4o-mini", "User token"],
  ]
));

bodyChildren.push(heading2("5.4 Security Architecture"));
bodyChildren.push(para("The backend implements a comprehensive security layer:"));
bodyChildren.push(bullet("User Identity Protection: HMAC-SHA256 hashing of user IDs for audit trails, ensuring PII is never stored in logs. User ID hashes are verified before any audit operation."));
bodyChildren.push(bullet("Data Encryption: AES-256-GCM encryption for sensitive data at rest, with encryption keys derived from application secrets. Decryption functions for authorized access."));
bodyChildren.push(bullet("JWT Authentication: JSON Web Token generation and verification for cross-service authentication, with signed payloads containing user ID and expiration."));
bodyChildren.push(bullet("Consent Management: GDPR-style consent lifecycle with grant, revoke, and auto-expiry. Consent types include PII, health, and financial data. Auto-revocation of expired consents runs as an internal mutation."));
bodyChildren.push(bullet("Audit Trail: Immutable audit trail logging all data operations with HMAC-SHA256 integrity verification. Audit entries include user hash, operation type, source platform, and data snapshots."));
bodyChildren.push(bullet("Extension Token Security: 64-character hex tokens with 30-day TTL, atomic rotation (revoke + generate in single transaction), and read-only validation for analytics queries."));
bodyChildren.push(bullet("Compliance Certificates: SHA-256 certificate hashes for data deletion, export, and audit operations, providing cryptographically verifiable compliance proof."));

// ===== 6. COMPONENT ARCHITECTURE =====
bodyChildren.push(heading1("6. Component Architecture"));
bodyChildren.push(heading2("6.1 Component Inventory"));
bodyChildren.push(makeTable(
  ["Directory", "File Count", "Purpose"],
  [
    ["components/ (root)", "28", "Core app components: sidebar, theme, modals, monitors, widgets"],
    ["components/landing/", "16", "Marketing landing page sections"],
    ["components/project-protection/", "46", "Project analysis with tier variants (Free/Starter/Pro/Expert)"],
    ["components/client-protection/", "5", "Client analysis: trust score, dispute sim, payment patterns"],
    ["components/evidence-library/", "8", "Evidence viewing: timeline, health, gaps, quality scorecard"],
    ["components/ui/", "46", "shadcn/ui primitives (Radix UI based)"],
    ["hooks/", "3", "Custom React hooks: auth, subscription tier, mobile detection"],
  ]
));

bodyChildren.push(heading2("6.2 Key Components"));
bodyChildren.push(heading3("6.2.1 CollapsibleSidebar"));
bodyChildren.push(para("The main navigation sidebar with expand/collapse animation via Framer Motion. When expanded (320px), it shows the Axia logo, profile section with avatar/name/tier, navigation sections (WORK, BILLING, INTEGRATIONS, ADMIN) with icon + label buttons, and a bottom section with the theme toggle and Work Timeline button. When collapsed (80px), it shows only icons. The sidebar state is persisted in localStorage (axia_sidebar_state, axia_sidebar_sections, axia_sidebar_scroll). The sidebar uses theme-aware CSS variables (bg-sidebar, text-sidebar-foreground, etc.) for proper dark/light mode support."));

bodyChildren.push(heading3("6.2.2 EvidenceCollector (Hook)"));
bodyChildren.push(para("The EvidenceCollector is technically a React hook (useEvidenceCollector) that implements the browser-side evidence collection pipeline. It buffers DOM events at controlled frequencies (mousemove at 4Hz, keyboard debounced at 100ms), auto-flushes every 5 seconds or when the buffer reaches 100 events, and seeds screenshot_ref markers every 10 minutes as placeholders for the future screenshot pipeline. The hook communicates with the Convex backend via HTTP endpoints (/api/extension/start, /api/extension/record, /api/extension/finalize). It returns the current collection status, event count, and control functions."));

bodyChildren.push(heading3("6.2.3 ComplianceStatusWidget"));
bodyChildren.push(para("A top-bar status banner that implements a loss-aversion conversion engine. It displays the current compliance status (active/at_risk/rejected) with animated visual indicators, a countdown timer for at-risk sessions, platform-specific loss amounts showing how much the freelancer is losing per week, and a prominent CTA to generate a dispute report when status is rejected. The widget uses 'darkPsychology' fields internally with scarcity, loss aversion, and social proof triggers to drive upgrade conversions."));

bodyChildren.push(heading3("6.2.4 WCVMVerificationBadge"));
bodyChildren.push(para("Displays the Work Context Verification Matrix score as a compact badge. Shows the context relevance score (0-100), matched client requirements with individual relevance scores, and identified context gaps with fix recommendations. The WCVM system cross-references collected evidence against client-specific requirements to produce relevance scores and cryptographic verification signatures."));

bodyChildren.push(heading2("6.3 Tier-Gating Pattern"));
bodyChildren.push(para("The most pervasive architectural pattern in the component layer is tier-gating. Nearly every feature component implements a three-state tier gate: Locked (Free/Starter) shows a blurred preview with an upgrade CTA overlay, Basic access (Pro) provides limited features with upgrade nudges, and Full access (Expert) unlocks the complete feature set. This pattern is implemented in RealTimeProtectionAdvisor, PersonalizedProtectionPlan, CrossPlatformVerification, CustomPolicyAnalyzer, and AIDisputePrediction. The project-protection module takes this further with separate component files per tier (e.g., MilestoneProtectionFree.tsx, MilestoneProtectionPro.tsx, MilestoneProtectionExpert.tsx)."));

// ===== 7. AUTH =====
bodyChildren.push(heading1("7. Authentication System"));
bodyChildren.push(para("The application uses Convex Auth (@convex-dev/auth) with two providers:"));
bodyChildren.push(bullet("Email OTP: The primary authentication method. Users enter their email, receive a 6-digit verification code, and enter it to authenticate. No password is required. The OTP flow is handled entirely by Convex Auth with built-in rate limiting and expiration."));
bodyChildren.push(bullet("Anonymous: A secondary provider that allows unauthenticated access for demo purposes. Some queries use a resolveUserId() helper that falls back to creating/finding a guest@axia.demo user."));
bodyChildren.push(para("The auth state is accessed via the useAuth() custom hook, which wraps useConvexAuth() and queries the current user profile. The hook returns { isLoading, isAuthenticated, user, signIn, signOut }. The signIn function accepts provider-specific parameters (e.g., 'email-otp' with FormData)."));
bodyChildren.push(para("Client authentication is handled separately through the clientAuth backend module, which provides registerClient and getClientProfile functions. Client sessions are identified by email stored in localStorage, not through Convex Auth."));
bodyChildren.push(para("The Owner Dashboard uses a separate authentication mechanism: a hardcoded password check (@@@@HHH$) with a 10-minute session timeout managed via local state. This is intentionally separate from the main auth system to prevent regular users from accessing admin features."));

// ===== 8. SUBSCRIPTION =====
bodyChildren.push(heading1("8. Subscription Tier System"));
bodyChildren.push(makeTable(
  ["Tier", "Price", "Dispute Reports", "Platforms", "Key Features"],
  [
    ["Free", "$0/mo", "1/month", "1", "Basic compliance, 2-pillar health dashboard, CSV export, 100 API req/day"],
    ["Starter", "$9/mo", "5/month", "2", "3-pillar dashboard, dispute simulation, JSON export, evidence gap prediction"],
    ["Pro", "$29/mo", "Unlimited", "3", "4-pillar + vulnerabilities, AI prediction, cross-platform verification, PDF export, 10K API req/day"],
    ["Expert", "$79/mo", "Unlimited", "Unlimited", "Full dashboard + business map, team validation, legal package export, predictions"],
  ]
));
bodyChildren.push(para("The subscription tier is managed client-side via the useSubscriptionTier hook, which reads/writes localStorage with cross-tab synchronization. Protection multipliers are applied per tier: Free=0.22, Starter=0.67, Pro=0.85, Expert=0.98. These multipliers affect protection scores, dispute success rates, and evidence quality assessments throughout the application. The tier system drives significant UI variation: different components, different feature visibility, and different data granularity at each level."));

// ===== 9. DATA FLOW =====
bodyChildren.push(heading1("9. Data Flow & Connectivity"));
bodyChildren.push(heading2("9.1 Evidence Collection Pipeline"));
bodyChildren.push(para("The core data flow of Axia is the evidence collection pipeline, which operates as follows:"));
bodyChildren.push(bullet("Step 1: The user starts a work session via the Dashboard 'Start Timer' button or the browser extension. This creates a workSession document and an evidenceSession document in Convex."));
bodyChildren.push(bullet("Step 2: During the session, the EvidenceCollector hook captures browser events (mousemove, keyboard, URL changes, visibility changes) at controlled frequencies and buffers them locally."));
bodyChildren.push(bullet("Step 3: Every 5 seconds (or when buffer reaches 100 events), the hook flushes the buffer to the Convex backend via the /api/extension/record HTTP endpoint, creating evidenceEvent documents."));
bodyChildren.push(bullet("Step 4: Simultaneously, the timeBlocks system records 5-minute activity blocks with auto-compliance scoring based on inactivity (>300s), non-work websites (competitor marketplaces), and missing activity."));
bodyChildren.push(bullet("Step 5: Compliance alerts are generated in real-time when risk patterns are detected (at_risk, payment_protection_risk, non_browser_work, timer_paused)."));
bodyChildren.push(bullet("Step 6: When the session ends, the evidence session is finalized, generating a summary with total events, activity density, and work-context scores."));
bodyChildren.push(bullet("Step 7: At any point, the user can generate a dispute report from the collected evidence, which adapts its format to the specific platform (Upwork, Fiverr, Toptal, Freelancer) with platform-specific requirements checking."));

bodyChildren.push(heading2("9.2 Platform Connection Flow"));
bodyChildren.push(para("Connecting a freelance platform follows an OAuth-like flow:"));
bodyChildren.push(bullet("Step 1: The user clicks 'Connect' on the Platform Integrations page, triggering the initiatePlatformConnection mutation which creates a pending connection record."));
bodyChildren.push(bullet("Step 2: A consent modal displays the permissions Axia needs (view work activity, manage time entries)."));
bodyChildren.push(bullet("Step 3: After user consent, the completePlatformConnection mutation stores the platform credentials (access token, refresh token, expiry)."));
bodyChildren.push(bullet("Step 4: An internal action (importPlatformData) fetches the user's data from the platform API (profile, work history, earnings, reviews)."));
bodyChildren.push(bullet("Step 5: The imported data is stored in platformImportedData documents and cross-referenced with evidence for compliance verification."));
bodyChildren.push(bullet("Step 6: Disconnection uses the disconnectPlatform mutation, which removes the connection and associated imported data."));

bodyChildren.push(heading2("9.3 WCVM Verification Flow"));
bodyChildren.push(para("The Work Context Verification Matrix (WCVM) enables client-side verification of freelancer work:"));
bodyChildren.push(bullet("Step 1: The client creates a verification request via the VerificationRequestSystem component, specifying the freelancer and requirements."));
bodyChildren.push(bullet("Step 2: The system retrieves the freelancer's WCVM verification data, which includes context relevance scores, matched requirements, and evidence gaps."));
bodyChildren.push(bullet("Step 3: A verification signature (cryptographic hash) is generated to ensure the verification data has not been tampered with."));
bodyChildren.push(bullet("Step 4: The client sees the WCVM score, verification matrix, and evidence summary in the WCVMVerificationDashboard."));
bodyChildren.push(bullet("Step 5: The freelancerPublicProfiles table provides a searchable directory of verified freelancers for clients."));

// ===== 10. CURRENT STATUS =====
bodyChildren.push(heading1("10. Current Implementation Status"));
bodyChildren.push(makeTable(
  ["Feature", "Status", "Notes"],
  [
    ["Landing Page", "Fully functional", "All sections render, waitlist form works, Convex connected"],
    ["Authentication", "Fully functional", "Email OTP + Anonymous auth, Convex Auth deployed"],
    ["Theme System", "Fully functional", "Dark/light toggle with zero-lag switching"],
    ["Sidebar Navigation", "Fully functional", "Expand/collapse with localStorage persistence"],
    ["Dashboard", "Demo mode", "Mock data for sessions, WCVM, alerts; EvidenceCollector hook active"],
    ["Projects", "Partially functional", "Convex queries for project CRUD, but detail views use mock data"],
    ["Clients", "Demo mode", "Mock client data with tier-gated analysis"],
    ["Time Tracking", "Demo mode", "Mock time entries, timer UI functional"],
    ["Evidence Library", "Partially functional", "Convex queries for evidence data, some mock fallbacks"],
    ["Invoices", "Demo mode", "Mock invoice data"],
    ["Reports", "Demo mode", "Mock dispute reports, free tier limit enforced"],
    ["Payment Patterns", "Demo mode", "Extensive mock data with animated charts"],
    ["Platform Integrations", "Simulated", "Connect/disconnect flow simulated with toast feedback"],
    ["Browser Extension", "Architected, not deployed", "HTTP endpoints exist, token system functional"],
    ["AI Predictions", "Partially functional", "HTTP endpoint routes to GPT-4o-mini, but most UI uses mock analysis"],
    ["Subscription Tiers", "Client-side only", "No Stripe integration, tier stored in localStorage"],
    ["Owner Dashboard", "Functional", "Waitlist queries live, revenue/compliance/heath features active"],
    ["Client Dashboard", "Partially functional", "Client auth works, WCVM views use mock data"],
    ["Security Layer", "Implemented", "Encryption, hashing, consent, audit trail all coded in Convex"],
    ["Waitlist + Referrals", "Fully functional", "Convex queries/mutations, position tracking, referral links"],
  ]
));

// ===== BUILD THE DOCUMENT =====
const bodySection = {
  properties: {
    page: {
      margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
      pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
    },
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Axia Technical Analysis Report", font: FONT_BODY, size: 16, color: COLOR_LIGHT, italics: true })],
      })],
    }),
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", font: FONT_BODY, size: 16, color: COLOR_LIGHT }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 16, color: COLOR_LIGHT }),
        ],
      })],
    }),
  },
  children: bodyChildren,
};

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT_BODY, size: 22 },
      },
    },
  },
  sections: [coverSection, tocSection, bodySection],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync("/home/z/my-project/download/Axia-Comprehensive-Technical-Analysis-Report.docx", buffer);
console.log("Report generated: /home/z/my-project/download/Axia-Comprehensive-Technical-Analysis-Report.docx");
