import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
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

export default defineSchema({
  ...authTables,
  users,
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
});
