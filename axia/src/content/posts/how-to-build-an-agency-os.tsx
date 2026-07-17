// src/content/posts/how-to-build-an-agency-os.tsx — blog post as TSX.
// ponytail: each post exports `frontmatter` + `Content` component.
//
// v7.3 SEO target: "how to build an agency os" — captures technical/evaluator
// traffic and demonstrates Axia's architecture authority. Global-first.

import { Link } from "react-router";

export const frontmatter = {
  slug: "how-to-build-an-agency-os",
  title: "How to Build an Agency OS: Architecture, Data Model, and Stack Choices",
  description: "A practical guide to building an agency operating system — what modules you need, how the data model fits together, and the tech stack decisions we made building Axia.",
  date: "2026-07-18",
  author: "Axia Engineering",
  category: "Engineering",
  keywords: [
    "how to build an agency os",
    "agency os architecture",
    "agency management software stack",
    "build agency software",
    "saas data model for agencies",
  ],
};

export function Content() {
  return (
    <>
      <p className="text-lg text-muted-foreground leading-relaxed">
        We built Axia as an agency OS from scratch. This post walks through the architecture, data model, and stack choices we made — both as a reference for engineers building similar systems and as a transparent look at how the product you use actually works under the hood.
      </p>

      <h2>What "Agency OS" Means Architecturally</h2>
      <p>
        An agency OS is not a single app — it's a unified data model with multiple UX surfaces on top. The key constraint: <strong>every record type (client, project, proposal, invoice, time entry, payment) lives in one database with native foreign-key relationships</strong>. This is what distinguishes an OS from a suite of integrated tools.
      </p>
      <p>
        If you're building one, your north star is: <em>can I answer any cross-functional business question with a single query, without joining across systems?</em> If yes, you have an OS. If no, you have a suite.
      </p>

      <h2>The Core Modules</h2>
      <p>
        A complete agency OS needs these modules. Each one is a sub-system with its own UX, but they all share the same data model:
      </p>
      <ol>
        <li><strong>Identity & Auth</strong> — multi-tenant workspaces, role-based access (owner/admin/member), OAuth + password + magic link + OTP.</li>
        <li><strong>CRM</strong> — clients, contacts, interaction history, custom fields.</li>
        <li><strong>Sales Pipeline</strong> — leads, deals, stages, probability, forecast.</li>
        <li><strong>Proposals</strong> — templated documents, e-sign, one-click convert to project.</li>
        <li><strong>Projects</strong> — milestones, tasks, deliverables, files, scope changes.</li>
        <li><strong>Time Tracking</strong> — timers on tasks, billable vs. non-billable, team capacity.</li>
        <li><strong>Invoicing</strong> — generate from milestones/time/fixed-fee, multi-currency, tax handling.</li>
        <li><strong>Payments</strong> — Stripe/Razorpay/Paddle integrations, auto-reminders, aging reports.</li>
        <li><strong>Analytics</strong> — real-time dashboards: revenue, utilization, margin, forecast.</li>
        <li><strong>Messaging</strong> — channels, DMs, @mentions on records (comments on proposals, projects, invoices).</li>
        <li><strong>Notifications</strong> — in-app + email, per-event-type opt-in/opt-out.</li>
        <li><strong>Audit Log</strong> — every admin action, billing event, and consent change, append-only.</li>
      </ol>

      <h2>The Data Model</h2>
      <p>
        Everything starts with the <strong>workspace</strong>. A workspace is a tenant — an agency or a solo freelancer. Every other record belongs to a workspace. Users can belong to multiple workspaces (workspace switcher in the sidebar).
      </p>
      <p>
        The high-level entity graph:
      </p>
      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`Workspace
  ├── Users (members)
  ├── Clients
  │     └── Projects
  │           ├── Milestones
  │           ├── Tasks → TimeEntries
  │           ├── Deliverables → Files
  │           └── ScopeChanges
  ├── Proposals
  │     └── (on accept) → creates Project + Invoice
  ├── Deals (pipeline)
  │     └── (on won) → creates Client + Project
  ├── Invoices
  │     └── Payments
  ├── Messages (channels + DMs)
  └── AuditLogs`}
      </pre>
      <p>
        The key relationships:
      </p>
      <ul>
        <li><strong>Client → Projects (1:N)</strong> — a client can have many projects.</li>
        <li><strong>Project → Proposal (N:1)</strong> — a project came from a proposal (or was created directly).</li>
        <li><strong>Project → Invoices (1:N)</strong> — a project can have many invoices (milestone-based billing).</li>
        <li><strong>Project → TimeEntries (1:N)</strong> — every hour logged against the project.</li>
        <li><strong>Invoice → Payments (1:N)</strong> — partial payments are first-class.</li>
        <li><strong>Deal → Client + Project (1:1)</strong> — when a deal is won, it spawns a client and a project.</li>
      </ul>
      <p>
        With this model, you can answer questions like <em>"What's our average project margin for clients acquired via Upwork in the last 90 days?"</em> with a single query — join projects → clients → time entries → invoices, filter by client.source = "upwork" and project.createdAt greater than 90 days ago.
      </p>

      <h2>The Tech Stack We Chose</h2>
      <p>
        There are many valid stacks for building an agency OS. Here's what we chose and why.
      </p>

      <h3>Backend: Convex</h3>
      <p>
        Convex is a reactive backend-as-a-service. You write TypeScript functions (queries, mutations, actions) and Convex handles the database, real-time subscriptions, and file storage. We chose it for three reasons:
      </p>
      <ul>
        <li><strong>Reactive by default</strong> — when a record changes on the backend, every client viewing it re-renders automatically. No webhooks to wire, no polling, no cache invalidation. For a real-time dashboard, this is huge.</li>
        <li><strong>Type-safe end-to-end</strong> — the schema is TypeScript, and the generated API client is typed. Refactor the schema → compile errors everywhere it's used. No drift.</li>
        <li><strong>Pay-per-use with sane free tier</strong> — for an early-stage SaaS, paying only for actual function calls + storage is much cheaper than a fixed-cost Postgres + Redis + Lambda setup.</li>
      </ul>
      <p>
        The trade-off: vendor lock-in. If we ever need to migrate off Convex, we'd rewrite the data layer. We accept this because the velocity gain in the early years is worth more than the theoretical migration cost.
      </p>

      <h3>Frontend: Vite + React + TypeScript</h3>
      <p>
        Plain Vite + React. No Next.js (we don't need SSR for a dashboard app — the marketing site is a SPA, and the dashboard is auth-gated). No Remix (no nested routing complexity needed). Tailwind CSS for styling — utility-first means designers and engineers can collaborate without a design-system sync step. shadcn/ui for components — copy-paste primitives, no library lock-in.
      </p>

      <h3>Auth: Better Auth</h3>
      <p>
        Better Auth is a framework-agnostic auth library that runs on top of your existing backend. We chose it over Clerk/Auth0 because:
      </p>
      <ul>
        <li><strong>No per-user pricing</strong> — auth should be a fixed cost, not a tax on growth.</li>
        <li><strong>Data lives in our database</strong> — the users table is in Convex, not in a vendor's silo. We can query it, join it, audit it.</li>
        <li><strong>Multi-method</strong> — password, Google, Microsoft, magic link, email OTP — all from one library.</li>
        <li><strong>Extensible</strong> — we added a custom <code>role</code> field (owner/admin/member) and a <code>requireOwner</code> guard at the Convex function level.</li>
      </ul>

      <h3>Payments: Paddle (for our billing) + Stripe/Razorpay (for invoice collection)</h3>
      <p>
        We use Paddle as the merchant of record for Axia's own subscription billing — they handle global tax compliance (VAT, GST, sales tax) so we don't have to. For agencies using Axia to collect invoices from their clients, we support Stripe (global), Razorpay (India), and Paddle (global) — the agency picks whichever processor they already use.
      </p>

      <h3>Infrastructure: Vercel + Convex Cloud</h3>
      <p>
        Vercel hosts the frontend + CDN. Convex Cloud hosts the backend + database + file storage. Both have generous free tiers and scale automatically. Total infrastructure cost at 1,000 users: ~$200/month. No DevOps team needed.
      </p>

      <h2>Key Architectural Decisions</h2>

      <h3>1. Multi-Tenant via Workspace, Not via Subdomain</h3>
      <p>
        Many SaaS apps isolate tenants via subdomain (<code>acme.myapp.com</code>). We chose workspace-based isolation instead: a user belongs to one or more workspaces, and every query/mutation checks the active workspace ID from the auth context. This lets a single user (e.g. a freelancer who's also a contractor for two agencies) belong to multiple workspaces without juggling accounts.
      </p>

      <h3>2. Owner Role Enforced at the Database Level</h3>
      <p>
        Admin endpoints (grant tier, see financials, view audit log) are gated by a <code>requireOwner(ctx)</code> guard that throws if the calling user's <code>role</code> field is not <code>"owner"</code>. This is enforced in the Convex function — not in the UI. Even if a malicious user reverse-engineers the API and calls the mutation directly, the backend rejects them. UI gating is for UX, not security.
      </p>

      <h3>3. Webhooks Verify Signatures</h3>
      <p>
        Every webhook (Paddle, Stripe, Razorpay) verifies the signature before processing. Paddle uses HMAC-SHA256 of <code>&lt;ts&gt;:&lt;payload&gt;</code> with a shared secret. Stripe uses signature-based verification with the webhook signing secret. Razorpay uses HMAC-SHA256 of <code>&lt;razorpay_order_id&gt;|&lt;razorpay_payment_id&gt;</code>. Unsigned or replay-attacked webhooks are rejected with 401. Webhook bodies are capped at 64 KB to prevent memory-exhaustion DoS.
      </p>

      <h3>4. Consent Audit Trail</h3>
      <p>
        Every signup (password OR OAuth) records a consent row with email, IP, user-agent, policy version, and SHA-256 hash of the policy HTML. This proves what the user agreed to at the time of signup. When the policy version bumps, the user is re-prompted on next sign-in and a new consent row is recorded. This is required for GDPR Art. 7(1) and India DPDP §18 compliance.
      </p>

      <h3>5. Real-Time Dashboard Cache</h3>
      <p>
        The owner dashboard calls upstream APIs (Sentry, PostHog, Vercel, Paddle) that have aggressive rate limits. To avoid 429s, we cache responses in a <code>dashboardCache</code> table with per-source TTLs (Sentry 30s, PostHog 60s, Vercel 60s, Paddle 300s). Reads are cache-first; writes happen in the background via Convex actions. If the upstream is down or rate-limited, we serve stale cache with a "data may be delayed" indicator. This pattern is generally useful for any SaaS dashboard that aggregates third-party data.
      </p>

      <h2>What We'd Do Differently</h2>
      <p>
        Hindsight is 20/20. A few things we'd change if we started over:
      </p>
      <ul>
        <li><strong>Single root-level file per domain</strong> — we ended up with both <code>clients.ts</code> and <code>clients/crud.ts</code>, both <code>proposals.ts</code> and <code>proposals/crud.ts</code>. The root-level files are legacy; the subfolder structure is the modern API. We should have refactored to one structure from day one.</li>
        <li><strong>No "debug" files in production</strong> — <code>debug.ts</code>, <code>seed.ts</code>, <code>adminSeed.ts</code> all shipped to production. They're admin-only and gated, but they add weight to the deployment. We should have a separate <code>convex/dev/</code> folder excluded from production builds.</li>
        <li><strong>Stronger typed ID brand</strong> — Convex gives you typed IDs (<code>Id&lt;"clients"&gt;</code>), but we'd add a branded type on top (e.g. <code>type ClientId = Id&lt;"clients"&gt; &amp; {'{ __brand: "client" }'}</code>) to prevent accidentally passing a project ID where a client ID is expected. This is the "branded type" pattern from the TypeScript community.</li>
      </ul>

      <h2>Conclusion</h2>
      <p>
        Building an agency OS is fundamentally about <strong>data model decisions</strong>. The UX is the easy part — once you have a unified schema where clients, projects, proposals, invoices, and time entries are natively related, the dashboards and workflows almost build themselves. The hard part is resisting the temptation to integrate separate tools (which is what HubSpot + Monday + Bonsai does) and instead building (or buying) one system with one database.
      </p>
      <p>
        If you're evaluating an agency OS rather than building one, <Link to="/auth?mode=signup">try Axia free</Link> — the architecture described in this post is what powers it. If you're building your own, we hope this post saved you some weekend afternoons of architecture decisions.
      </p>

      <hr />
      <p className="text-sm text-muted-foreground italic">Last updated July 2026. Axia is the agency OS built on Convex, Vite, React, and Better Auth. We're hiring engineers who like this kind of architecture — email hello@axia-bay.vercel.app.</p>
    </>
  );
}
