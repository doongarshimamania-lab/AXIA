import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { users } from "./tables/users";
import { complianceTables } from "./tables/compliance";
import { trackingTables } from "./tables/tracking";
import { evidenceTables } from "./tables/evidence";
import { projectTables } from "./tables/projects";
import { featureTables } from "./tables/features";

export default defineSchema({
  ...authTables,
  users,
  ...complianceTables,
  ...trackingTables,
  ...evidenceTables,
  ...projectTables,
  ...featureTables,
});