"use node";
// ──────────────────────────────────────────────────────────────────────────────
// lib/portalAuditLog.ts — Append-only audit log helper for portal actions.
//
// WHY SEPARATE FROM auditTrail:
//   auditTrail is user-facing (freelancer actions, signed in). portalAuditLog
//   is client-facing (token-based access). Mixing them creates a leak risk
//   where a freelancer could see client portal activity they shouldn't.
//
// NEVER LOG:
//   - Raw JWT tokens
//   - Client email addresses
//   - Payment card data
// ──────────────────────────────────────────────────────────────────────────────

import { MutationCtx } from "../_generated/server";
import { hashToken } from "./portalAuth";
import crypto from "crypto";

export interface PortalAuditEntry {
  token: string; // hashed internally, never stored raw
  clientId: string;
  workspaceId?: string;
  action: string;
  targetDeliverableId?: string;
  targetChangeOrderId?: string;
  targetInvoiceId?: string;
  targetMessageId?: string;
  result?: any;
  ip?: string; // hashed internally
  userAgent?: string;
}

export async function logPortalAction(ctx: MutationCtx, entry: PortalAuditEntry): Promise<void> {
  // ponytail: cap result size to prevent audit-log DoS via huge payloads
  let safeResult = entry.result;
  if (safeResult !== undefined) {
    try {
      const serialized = JSON.stringify(safeResult);
      if (serialized.length > 4096) {
        safeResult = {
          _truncated: true,
          _originalSize: serialized.length,
          preview: serialized.slice(0, 1024),
        };
      }
    } catch {
      safeResult = { _error: "unserializable_result" };
    }
  }

  await ctx.db.insert("portalAuditLog", {
    tokenHash: hashToken(entry.token),
    clientId: entry.clientId as any,
    workspaceId: entry.workspaceId as any,
    action: entry.action,
    targetDeliverableId: entry.targetDeliverableId,
    targetChangeOrderId: entry.targetChangeOrderId as any,
    targetInvoiceId: entry.targetInvoiceId as any,
    targetMessageId: entry.targetMessageId as any,
    result: safeResult,
    ipHash: entry.ip ? hashIp(entry.ip) : undefined,
    userAgent: entry.userAgent?.slice(0, 512), // cap UA length
    timestamp: Date.now(),
  });
}

// ponytail: hash IPs with a daily-rotating pepper so audit logs can't be
// reverse-engineered to identify clients via IP. Same-day correlation still
// works for forensic analysis; cross-day correlation requires the pepper.
function hashIp(ip: string): string {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const pepper = `${process.env.JWT_SIGNING_SECRET}:${day}`;
  return crypto.createHmac("sha256", pepper).update(ip).digest("hex");
}
