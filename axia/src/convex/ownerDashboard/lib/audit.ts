// convex/ownerDashboard/lib/audit.ts — Audit logging for owner dashboard.
//
// Every owner dashboard access, tab view, upstream API call, alert dismissal,
// and export is logged to the auditLog table. This is both for the audit log
// tab (Tab 6) and for security forensics.

import { MutationCtx, QueryCtx } from "../../_generated/server";

export interface AuditEntry {
  actorUserId?: string;
  actorEmail?: string;
  action: string;
  tab?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  latencyMs?: number;
  status?: "success" | "error" | "rate_limited";
}

/**
 * Write an audit log entry. Non-blocking — if it fails, we log to console
 * but don't throw (don't want audit logging to break the dashboard).
 *
 * Must be called from a MutationCtx. For queries/actions, the caller should
 * pass through a mutation or use the action's ctx.db.
 */
export async function writeAuditLog(
  ctx: MutationCtx,
  entry: AuditEntry
): Promise<void> {
  try {
    await ctx.db.insert("auditLog", {
      ts: Date.now(),
      actorUserId: entry.actorUserId as any,
      actorEmail: entry.actorEmail,
      action: entry.action,
      tab: entry.tab,
      details: entry.details,
      ip: entry.ip,
      userAgent: entry.userAgent,
      latencyMs: entry.latencyMs,
      status: entry.status ?? "success",
    });
  } catch (err) {
    console.error("[auditLog] Failed to write entry:", err);
  }
}

/**
 * Query the audit log with optional filters. Returns most-recent-first.
 */
export async function queryAuditLog(
  ctx: QueryCtx,
  opts: {
    limit?: number;
    actionPrefix?: string;
    sinceTs?: number;
  } = {}
) {
  const { limit = 50, actionPrefix, sinceTs } = opts;

  let q = ctx.db.query("auditLog").withIndex("by_ts");
  if (sinceTs) {
    q = q.range(([gte]) => [gte(sinceTs)]);
  }
  let results = await q.order("desc").take(limit * 2); // over-fetch for filtering

  if (actionPrefix) {
    results = results.filter((r) => r.action.startsWith(actionPrefix));
  }

  return results.slice(0, limit);
}
