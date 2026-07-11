// convex/convex.config.ts — Convex app definition.
//
// Registers the Better Auth + Resend components used by the auth layer.
// Without this file, the @convex-dev/better-auth and @convex-dev/resend
// components are not loaded into the deployment and `components.betterAuth`
// / `components.resend` will be undefined in _generated/api.ts.
//
// See:
//   - https://labs.convex.dev/better-auth/getting-started
//   - https://labs.convex.dev/resend
//
// ponytail: this is the minimum registration — no extra config here, all
// Better Auth options live in convex/auth.ts and all Resend options live in
// convex/email.ts. Single responsibility.

import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import resend from "@convex-dev/resend/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(resend);

export default app;
