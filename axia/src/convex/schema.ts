import { defineSchema } from "convex/server";
// ponytail: removed `authTables` import — Better Auth tables (user, session,
// account, verification) now live INSIDE the @convex-dev/better-auth Convex
// Component, not in our app schema. See convex/convex.config.ts.
import { users } from "./tables/users";
import { complianceTables } from "./tables/compliance";
import { trackingTables } from "./tables/tracking";
import { evidenceTables } from "./tables/evidence";
import { projectTables } from "./tables/projects";
import { featureTables } from "./tables/features";
import { pipelineTables } from "./tables/pipeline";
import { proposalTables } from "./tables/proposals";
import { billingTables } from "./tables/billing";
import { scopeTables } from "./tables/scope";
import { messagingTables } from "./tables/messaging";
import { tagTables } from "./tables/tags";
import { goalTables } from "./tables/goals";
import { workspaceTables } from "./tables/workspaces";
import { teamTables } from "./tables/teams";
import { customFieldTables } from "./tables/customFields";
import { notificationTables } from "./tables/notifications";
import { manualSendTables } from "./tables/manualSends";
import { leadTables } from "./tables/leads";
import { portalTables } from "./tables/portal";
import { ownerDashboardTables } from "./tables/ownerDashboard";

export default defineSchema({
  // ponytail: no authTables spread — Better Auth tables live in the component.
  users,
  ...workspaceTables,
  ...teamTables,
  ...complianceTables,
  ...trackingTables,
  ...evidenceTables,
  ...projectTables,
  ...featureTables,
  ...pipelineTables,
  ...proposalTables,
  ...billingTables,
  ...scopeTables,
  ...messagingTables,
  ...tagTables,
  ...goalTables,
  ...customFieldTables,
  ...notificationTables,
  ...manualSendTables,
  ...leadTables,
  ...portalTables,
  ...ownerDashboardTables,
});
