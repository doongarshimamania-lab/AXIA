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

export default crons;
