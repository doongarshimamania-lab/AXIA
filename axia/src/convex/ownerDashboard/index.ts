// convex/ownerDashboard/index.ts — Barrel export for the owner dashboard API.
//
// Frontend imports:
//   import { api } from "@/convex/_generated/api";
//   api.ownerDashboard.queries.getOverview
//   api.ownerDashboard.fetchers.fetchSentry
//   api.ownerDashboard.mutations.getUsersTab

export * as queries from "./queries";
export * as actions from "./actions";
export * as fetchers from "./fetchers";
export * as mutations from "./mutations";
