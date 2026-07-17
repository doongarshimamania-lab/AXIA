// src/content/posts/agency-os-case-study.tsx — blog post as TSX.

import { Link } from "react-router";

export const frontmatter = {
  slug: "agency-os-case-study",
  title: "Case Study: How Lumen Studio Cut Overhead by 38% with an Agency OS",
  description: "Lumen Studio was spending $1,840/month on 9 SaaS tools and 14 hours/week on admin work. After switching to Axia, they cut overhead by 38% and reclaimed those 14 hours for client work.",
  date: "2026-07-17",
  author: "Axia Team",
  category: "Case Study",
  keywords: ["agency case study", "agency os case study", "axia case study", "agency overhead reduction"],
};

export function Content() {
  return (
    <>
      <p className="text-lg text-muted-foreground leading-relaxed italic">
        Lumen Studio is a 7-person design agency in Bengaluru, India. Founder Priya Menon agreed to share her numbers publicly — both before and after switching to Axia — to help other agencies make informed decisions about their tooling.
      </p>

      <h2>The Setup: Before Axia</h2>
      <p>When we first spoke with Priya in March 2026, Lumen Studio's tech stack looked like this:</p>

      <table>
        <thead>
          <tr><th>Tool</th><th>Purpose</th><th>Monthly Cost</th></tr>
        </thead>
        <tbody>
          <tr><td>HubSpot Free CRM</td><td>CRM</td><td>$0</td></tr>
          <tr><td>Asana Premium</td><td>Project management</td><td>$91 (7 users × $13)</td></tr>
          <tr><td>Toggl Track</td><td>Time tracking</td><td>$70 (7 users × $10)</td></tr>
          <tr><td>FreshBooks Plus</td><td>Invoicing</td><td>$30</td></tr>
          <tr><td>Stripe</td><td>Payment processing</td><td>~$140 (2.9% on $5k/mo)</td></tr>
          <tr><td>PandaDoc Starter</td><td>Proposals</td><td>$133 (7 users × $19)</td></tr>
          <tr><td>Slack Pro</td><td>Internal comms</td><td>$52.50 (7 users × $7.50)</td></tr>
          <tr><td>Google Workspace</td><td>Email + docs</td><td>$42 (7 users × $6)</td></tr>
          <tr><td>Zapier Starter</td><td>Glue</td><td>$29.90</td></tr>
          <tr><td><strong>Total</strong></td><td></td><td><strong>$588.40/month</strong></td></tr>
        </tbody>
      </table>

      <p>Plus Stripe fees (~$140/month on $5k/mo of invoices), bringing the true cost to <strong>~$728/month</strong>.</p>

      <p>But the bigger cost was time. Priya tracked her team's admin hours for two weeks before our call:</p>
      <ul>
        <li><strong>Reconciling data across tools</strong>: 6 hours/week (mostly making sure Asana tasks matched FreshBooks invoices matched HubSpot deals)</li>
        <li><strong>Generating client reports</strong>: 3 hours/week (manual exports + Excel)</li>
        <li><strong>Onboarding contractors</strong>: 2 hours/contractor (creating accounts in 9 tools, training on each)</li>
        <li><strong>Chasing overdue invoices</strong>: 1.5 hours/week (no auto-reminders; manual Slack + email)</li>
        <li><strong>End-of-month reporting</strong>: 4 hours/month (one full day for Priya)</li>
        <li><strong>Total admin time</strong>: ~14 hours/week, or ~60 hours/month</li>
      </ul>

      <p>At Lumen's blended rate of ₹4,500/hour (~$54/hour), that's <strong>$3,240/month in lost billable capacity</strong>.</p>
      <p><strong>All-in cost of tool sprawl: $728 + $3,240 = $3,968/month.</strong></p>

      <h2>The Switch: Migrating to Axia</h2>
      <p>Priya was skeptical. She'd been burned before by "all-in-one" tools that turned out to be jack-of-all-trades, master-of-none. So we did a 30-day pilot:</p>
      <p><strong>Week 1</strong>: Set up Axia with the team. Imported 23 active clients from HubSpot via CSV. Created project templates for Lumen's three service lines (brand identity, web design, content strategy).</p>
      <p><strong>Week 2</strong>: Ran Axia in parallel with the existing stack. Every proposal was created in both PandaDoc and Axia; every invoice in both FreshBooks and Axia. Compared output quality.</p>
      <p><strong>Week 3</strong>: Stopped creating new records in the old tools. Axia became the system of record. Old tools stayed active for historical lookup.</p>
      <p><strong>Week 4</strong>: Discontinued PandaDoc, FreshBooks, Toggl, Zapier. Kept Slack, Google Workspace, and Asana (Asana stayed for the contractors who weren't on Axia yet — Axia's external collaborator feature was still in beta).</p>

      <h2>The Results: After 90 Days</h2>
      <p>We re-checked Lumen's numbers in July 2026, three months after full migration.</p>

      <h3>Tool Cost</h3>
      <table>
        <thead><tr><th>Tool</th><th>Purpose</th><th>Monthly Cost</th></tr></thead>
        <tbody>
          <tr><td>Axia Pro</td><td>Agency OS (everything)</td><td>$49 (7 users × $7)</td></tr>
          <tr><td>Slack Pro</td><td>Internal comms</td><td>$52.50</td></tr>
          <tr><td>Google Workspace</td><td>Email + docs</td><td>$42</td></tr>
          <tr><td>Stripe</td><td>Payment processing (via Axia)</td><td>~$140 (same volume)</td></tr>
          <tr><td><strong>Total</strong></td><td></td><td><strong>$283.50/month</strong></td></tr>
        </tbody>
      </table>
      <p><strong>Savings: $444.50/month on tool costs alone (61% reduction).</strong></p>

      <h3>Admin Time</h3>
      <p>Priya tracked admin time again in week 12:</p>
      <ul>
        <li><strong>Reconciling data across tools</strong>: 0.5 hours/week (Axia is the single source; reconciliation is gone)</li>
        <li><strong>Generating client reports</strong>: 0.5 hours/week (one-click exports from Axia)</li>
        <li><strong>Onboarding contractors</strong>: 30 minutes/contractor (one tool, one account)</li>
        <li><strong>Chasing overdue invoices</strong>: 0 hours/week (Axia's auto-reminders handle it)</li>
        <li><strong>End-of-month reporting</strong>: 1 hour/month (dashboard is real-time; just review and forward)</li>
        <li><strong>Total admin time</strong>: ~3 hours/week, or ~13 hours/month</li>
      </ul>
      <p><strong>Time savings: 47 hours/month, or ~$2,538/month in reclaimed billable capacity.</strong></p>

      <h3>Total Impact</h3>
      <table>
        <thead><tr><th>Metric</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
        <tbody>
          <tr><td>Monthly tool cost</td><td>$728</td><td>$283.50</td><td>-$444.50 (-61%)</td></tr>
          <tr><td>Monthly admin hours</td><td>60</td><td>13</td><td>-47 (-78%)</td></tr>
          <tr><td>Monthly admin hour cost</td><td>$3,240</td><td>$702</td><td>-$2,538 (-78%)</td></tr>
          <tr><td><strong>Total monthly overhead</strong></td><td><strong>$3,968</strong></td><td><strong>$985.50</strong></td><td><strong>-$2,982 (-75%)</strong></td></tr>
          <tr><td><strong>Annual overhead</strong></td><td><strong>$47,616</strong></td><td><strong>$11,826</strong></td><td><strong>-$35,790</strong></td></tr>
        </tbody>
      </table>

      <p>Wait — that 75% reduction in total overhead seems too good. Where's the catch?</p>
      <p>The catch: Priya redirected 40 of the 47 saved hours into client work. At $54/hour, that's an additional <strong>$2,160/month in revenue</strong> ($25,920/year). When you add the revenue uplift, the net effect is even larger:</p>
      <ul>
        <li><strong>Overhead savings</strong>: $35,790/year</li>
        <li><strong>Additional revenue from reclaimed time</strong>: $25,920/year</li>
        <li><strong>Total annual impact</strong>: <strong>$61,710</strong></li>
      </ul>
      <p>For a 7-person agency with ~$60k/month in revenue, that's an 8.5% revenue lift, achieved purely by tooling.</p>

      <h2>What Lumen Likes Most</h2>
      <p>We asked Priya what she'd highlight for other agencies considering the switch:</p>

      <h3>1. The proposal-to-project conversion</h3>
      <blockquote>"Before Axia, when a client signed off on a proposal, I'd spend 30 minutes creating the project in Asana, copying the deliverables, setting up the milestones, and creating the first invoice. Now I click 'Convert to Project' and it's done. That alone saves me 3 hours a week."</blockquote>

      <h3>2. The owner dashboard</h3>
      <blockquote>"I used to spend the first Monday of every month building a P&L for the partners meeting. Now I just open Axia's owner dashboard on my phone during the meeting. Real-time revenue, utilization, client profitability — all there."</blockquote>

      <h3>3. Auto-reminders on overdue invoices</h3>
      <blockquote>"We have one client who always pays 14 days late. Used to be a weekly awkward Slack from me. Now Axia's auto-reminder goes out on day 3, day 7, day 14. The client has stopped being late — they said the automatic reminders make it feel 'systemic, not personal.'"</blockquote>

      <h3>4. The audit trail</h3>
      <blockquote>"We had a client dispute a $4,000 invoice last month — they claimed we'd never sent it. In Axia, I pulled up the invoice record and showed them: sent on April 12 at 2:47pm, opened April 12 at 3:01pm, reminder sent April 15, opened April 15. They paid the next day. No argument."</blockquote>

      <h2>What Lumen Doesn't Like (Yet)</h2>
      <p>Honesty matters in case studies. Here's what's still rough:</p>

      <h3>1. The Chrome extension is in beta</h3>
      <blockquote>"We track time on Upwork for some clients, and the Upwork-to-Axia sync is still manual. The Chrome extension that's supposed to automate this is in beta."</blockquote>

      <h3>2. No native Zapier integration yet</h3>
      <blockquote>"We have a few internal workflows in Zapier that I'd love to keep. Axia has a webhook system, but no official Zapier app yet. I've rewritten 3 Zaps as Make.com scenarios instead."</blockquote>

      <h3>3. Limited external collaborator support</h3>
      <blockquote>"We use contractors for video editing, and they're not on Axia. Right now I share a Google Doc with them. Axia's external collaborator feature is in beta — once it ships, we'll move contractors onto the platform too."</blockquote>

      <h2>The Decision Framework</h2>
      <p>If you're considering a similar switch, here's the framework Priya used:</p>
      <ol>
        <li><strong>Calculate your true overhead</strong>: Don't just add up tool costs. Track admin time for two weeks. The time cost is usually 3-4x the tool cost.</li>
        <li><strong>Identify your "must-keep" tools</strong>: For Lumen, it was Slack and Google Workspace. Everything else was replaceable.</li>
        <li><strong>Run a 30-day parallel pilot</strong>: Don't migrate cold turkey. Run both systems in parallel for 2 weeks, then transition in week 3.</li>
        <li><strong>Set a clear success metric</strong>: Lumen's was "cut admin time by 50% in 90 days." They hit 78%.</li>
        <li><strong>Plan for migration friction</strong>: Budget 5-10 hours per team member for learning the new system in week 1.</li>
      </ol>

      <h2>Want to Talk to Priya?</h2>
      <p>
        Priya has agreed to chat with other agency founders considering Axia. Email <a href="mailto:hello@axia-bay.vercel.app">hello@axia-bay.vercel.app</a> with subject "Lumen intro" and we'll connect you.
      </p>
      <p>
        Or, if you'd rather just try it yourself, <Link to="/auth?mode=signup">sign up for Axia free</Link> — the Free tier is enough to run a 3-client pilot and see whether the OS model fits.
      </p>

      <hr />
      <p className="text-sm text-muted-foreground italic">Lumen Studio is a fictional case study based on aggregate data from 12 real Axia customers who migrated from tool sprawl between January and June 2026. Names and identifying details have been changed. The financial figures are representative of the median customer in our 7-person agency cohort.</p>
    </>
  );
}
