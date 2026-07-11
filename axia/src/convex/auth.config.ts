// convex/auth.config.ts — Convex-side authentication provider config.
//
// This file tells Convex to trust JWTs issued by the Better Auth component.
// The component publishes a JWKS endpoint that Convex uses to verify token
// signatures. The `getAuthConfigProvider()` helper wires it up automatically.
//
// Replace the prior @convex-dev/auth config (which used opaque per-provider
// entries) — Better Auth handles all OAuth flows internally and only exposes
// the JWT layer to Convex.
//
// See: https://labs.convex.dev/better-auth/getting-started#add-convex-auth-config

import type { AuthConfig } from "convex/server";
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
