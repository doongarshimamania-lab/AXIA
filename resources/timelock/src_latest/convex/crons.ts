// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every hour: find proposal follow-ups whose scheduledAt has passed.
// Flips them from "scheduled" → "due" and creates an in-app notification
// prompting the user to actually deliver the follow-up manually.
// (This used to fake-flip the status to "sent" — that was a bug.)
crons.interval(
  "process due proposal follow-ups",
  { hours: 1 },
  internal.proposals.crud.processDueFollowUps,
  {}
);

// Every hour: same pattern for payment reminders on invoices.
crons.interval(
  "process due payment reminders",
  { hours: 1 },
  internal.invoices.processDueReminders,
  {}
);

// Daily at 9am UTC: scan for proposal/invoice drafts older than 7 days
// that haven't been sent yet. Creates a "send_reminder" notification
// prompting the user to actually deliver them.
crons.cron(
  "remindAboutStaleDrafts",
  "0 9 * * *",
  internal.notifications.remindAboutStaleDrafts,
  {}
);

// Process recurring invoices daily at 6am UTC
crons.cron(
  "processRecurringInvoices",
  "0 6 * * *",
  internal.invoices.processRecurringInvoices,
  {}
);

export default crons;
