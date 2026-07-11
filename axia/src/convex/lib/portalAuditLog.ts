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
//
// RUNTIME: Web Crypto API (crypto.subtle) — works in Convex V8 runtime.
// ──────────────────────────────────────────────────────────────────────────────

import { MutationCtx } from "../_generated/server";
import { hashToken } from "./portalAuth";

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

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

// ponytail: hash IPs with a daily-rotating pepper so audit logs can't be
// reverse-engineered to identify clients via IP. Same-day correlation still
// works for forensic analysis; cross-day correlation requires the pepper.
async function hashIp(ip: string): Promise<string> {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const pepper = `${process.env.JWT_SIGNING_SECRET}:${day}`;
  const key = await importHmacKey(pepper);
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

  // Both hashToken and hashIp are now async (Web Crypto API)
  const [tokenHash, ipHash] = await Promise.all([
    hashToken(entry.token),
    entry.ip ? hashIp(entry.ip) : Promise.resolve(undefined),
  ]);

  await ctx.db.insert("portalAuditLog", {
    tokenHash,
    clientId: entry.clientId as any,
    workspaceId: entry.workspaceId as any,
    action: entry.action,
    targetDeliverableId: entry.targetDeliverableId,
    targetChangeOrderId: entry.targetChangeOrderId as any,
    targetInvoiceId: entry.targetInvoiceId as any,
    targetMessageId: entry.targetMessageId as any,
    result: safeResult,
    ipHash,
    userAgent: entry.userAgent?.slice(0, 512), // cap UA length
    timestamp: Date.now(),
  });
}
