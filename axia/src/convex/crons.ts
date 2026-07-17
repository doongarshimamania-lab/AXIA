// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process due proposal follow-ups every hour
// This finds follow-ups scheduled for Day 3/7/14 that are now due and marks them as "sent"
crons.interval(
  "process due proposal follow-ups",
  { hours: 1 },
  internal.proposals.crud.processDueFollowUps,
  {}
);

// Process due payment reminders every hour
// This finds reminders scheduled for Day 3/7/14 after invoice sent that are now due
crons.interval(
  "process due payment reminders",
  { hours: 1 },
  internal.invoices.processDueReminders,
  {}
);

// Process recurring invoices daily at 6am UTC
crons.cron(
  "processRecurringInvoices",
  "0 6 * * *",
  internal.invoices.processRecurringInvoices,
  {}
);

// Daily 9am UTC — scan for stale draft proposals/invoices (>7 days old) and
// create "send_reminder" notifications prompting the user to actually send them.
// This replaces the old fake-send behavior: instead of silently flipping DB
// status, we surface an actionable in-app notification.
crons.cron(
  "remindAboutStaleDrafts",
  "0 9 * * *",
  internal.notifications.remindAboutStaleDrafts,
  {}
);

// Daily 3am UTC — evict expired dashboardCache rows (older than 7 days past
// their expiresAt). Without this, the dashboardCache table grows unbounded.
// See ownerDashboard/mutations.ts → _evictExpiredCacheRows for details.
crons.cron(
  "evictExpiredDashboardCache",
  "0 3 * * *",
  internal.ownerDashboard.mutations._evictExpiredCacheRows,
  {}
);

export default crons;
