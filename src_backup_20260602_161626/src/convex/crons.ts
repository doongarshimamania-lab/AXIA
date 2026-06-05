import { cronJobs } from "convex/server";

const crons = cronJobs();

// Note: Cron job temporarily disabled due to TypeScript type inference limitation
// To re-enable: uncomment the code below after Convex updates type definitions
// 
// import { internal } from "./_generated/api";
// crons.interval(
//   "create weekly milestone snapshots",
//   { hours: 168 },
//   internal.projects.milestoneSnapshots.autoCreateWeeklySnapshots,
//   {}
// );

export default crons;