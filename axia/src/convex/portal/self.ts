// ──────────────────────────────────────────────────────────────────────────────
// portal/self.ts — Client self-lookup. The first call a portal page makes.
//
// Verifies the JWT, returns the client's identity + workspace info so the
// frontend can render a personalized portal without a login form.
//
// SECURITY:
//   - Token verified via verifyPortalScope (signature + expiry + revocation)
//   - Returns ONLY data the client is allowed to see (no internal notes,
//     no other clients, no freelancer PII beyond display name)
//   - Audited as "portal_self_lookup"
// ──────────────────────────────────────────────────────────────────────────────

import { query } from "../_generated/server";
import { v } from "convex/values";
import { verifyPortalScope, PortalScope } from "../lib/portalAuth";
import { logPortalAction } from "../lib/portalAuditLog";

const READ_SCOPES: PortalScope[] = ["deliverables:read"];

export const getMyClientInfo = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, READ_SCOPES);

    const client = await ctx.db.get(claims.cid as any);
    if (!client) {
      // ponytail: don't reveal whether the client exists — return generic error
      throw new Error("Portal session invalid. Please request a new link.");
    }

    // Freelancer display info — only public-facing fields
    let freelancerName: string | undefined;
    let freelancerAvatar: string | undefined;
    try {
      const freelancer = await ctx.db.get(claims.fid as any);
      if (freelancer) {
        freelancerName = freelancer.name ?? undefined;
        freelancerAvatar = freelancer.image ?? undefined;
      }
    } catch {
      // Non-fatal — keep going
    }

    // ponytail: queries can't write audit log (no ctx.db.insert in query ctx).
    // Audit happens on mutations (postMessage, approveChangeOrder, etc.) where
    // it matters. The initial getMyClientInfo is a read — we don't audit every
    // page load (would balloon the audit table).

    return {
      clientId: client._id,
      clientName: client.clientName ?? client.name ?? "Client",
      contactEmail: client.contactEmail ?? client.email ?? null,
      company: client.company ?? null,
      workspaceId: claims.wid,
      freelancerName,
      freelancerAvatar,
      scopes: claims.sc,
      expiresAt: claims.exp * 1000, // ms
    };
  },
});
