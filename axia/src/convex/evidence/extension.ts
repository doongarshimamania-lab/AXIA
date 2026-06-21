// @ts-nocheck
/**
 * Evidence Extension API — P0 Fix
 *
 * This module provides the internal mutations called by the HTTP endpoints
 * in http.ts. These are the mutations that actually persist evidence data
 * to the database, closing the data loss bug where the extension sent
 * events that were acknowledged but never stored.
 *
 * Three operations:
 * 1. startEvidenceSession — Creates an evidenceSession record when recording starts
 * 2. recordEvidenceEvents — Batch-inserts evidence events into evidenceEvents table
 * 3. finalizeEvidenceSession — Marks session as finalized and triggers downstream computation
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

// ── Start Evidence Session ────────────────────────────────────────────────────
// Called by /api/extension/start to create an evidenceSession record

export const startEvidenceSession = internalMutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, { userId, sessionId, platform }) => {
    const now = Date.now();

    // Check if an active evidence session already exists for this sessionId
    const existing = await ctx.db
      .query("evidenceSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId as any))
      .first();

    if (existing && existing.status === "active") {
      // Session already active — return existing ID
      return existing._id;
    }

    // Create new evidence session
    const evidenceSessionId = await ctx.db.insert("evidenceSessions", {
      userId: userId as any,
      sessionId: sessionId as any,
      platform,
      startTime: now,
      status: "active",
      workspaceId: undefined,
      teamId: undefined,
    });

    console.log("[Evidence Extension] Started evidence session:", {
      evidenceSessionId,
      sessionId,
      platform,
      userId: userId.substring(0, 8) + "...",
    });

    return evidenceSessionId;
  },
});

// ── Record Evidence Events ────────────────────────────────────────────────────
// Called by /api/extension/record to batch-insert events

export const recordEvidenceEvents = internalMutation({
  args: {
    evidenceSessionId: v.string(),
    userId: v.string(),
    events: v.array(v.object({
      t: v.number(),
      kind: v.string(),
      data: v.string(),
      url: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { evidenceSessionId, userId, events }) => {
    // Verify the evidence session exists and belongs to this user
    const session = await ctx.db.get(evidenceSessionId as any);
    if (!session) {
      console.warn("[Evidence Extension] Session not found:", evidenceSessionId);
      return 0;
    }

    if (session.userId !== (userId as any)) {
      console.warn("[Evidence Extension] User mismatch for session:", {
        sessionUser: session.userId,
        requestUser: userId.substring(0, 8) + "...",
      });
      return 0;
    }

    if (session.status !== "active") {
      console.warn("[Evidence Extension] Session not active:", evidenceSessionId, session.status);
      return 0;
    }

    // Batch insert evidence events
    let inserted = 0;
    for (const event of events) {
      try {
        await ctx.db.insert("evidenceEvents", {
          evidenceSessionId: session._id,
          t: event.t,
          kind: event.kind,
          data: event.data,
          url: event.url,
          workspaceId: session.workspaceId,
        });
        inserted++;
      } catch (err) {
        console.error("[Evidence Extension] Failed to insert event:", err);
      }
    }

    if (inserted > 0) {
      console.log("[Evidence Extension] Recorded events:", {
        sessionId: evidenceSessionId,
        count: inserted,
        kinds: [...new Set(events.map(e => e.kind))],
      });
    }

    return inserted;
  },
});

// ── Finalize Evidence Session ─────────────────────────────────────────────────
// Called by /api/extension/finalize to mark session as complete
// Triggers downstream: evidence metadata computation, WCVM verification

export const finalizeEvidenceSession = internalMutation({
  args: {
    evidenceSessionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { evidenceSessionId, userId }) => {
    const session = await ctx.db.get(evidenceSessionId as any);
    if (!session) {
      console.warn("[Evidence Extension] Session not found for finalize:", evidenceSessionId);
      return { finalized: false, reason: "not_found" };
    }

    if (session.userId !== (userId as any)) {
      console.warn("[Evidence Extension] User mismatch for finalize:", evidenceSessionId);
      return { finalized: false, reason: "unauthorized" };
    }

    if (session.status === "finalized") {
      return { finalized: true, reason: "already_finalized" };
    }

    const now = Date.now();

    // Mark evidence session as finalized
    await ctx.db.patch(session._id, {
      status: "finalized",
      endTime: now,
    });

    // Compute evidence metadata for the finalized session
    const events = await ctx.db
      .query("evidenceEvents")
      .withIndex("by_session_and_time", (q) =>
        q.eq("evidenceSessionId", session._id)
      )
      .collect();

    // Calculate summary metrics
    const urlEvents = events.filter(e => e.kind === "url");
    const mouseEvents = events.filter(e => e.kind === "mouse");
    const keyboardEvents = events.filter(e => e.kind === "keyboard");
    const screenshotEvents = events.filter(e => e.kind === "screenshot_ref");
    const memoEvents = events.filter(e => e.kind === "memo");

    const sessionDuration = now - session.startTime;
    const activityDensity = sessionDuration > 0
      ? (mouseEvents.length + keyboardEvents.length) / (sessionDuration / 60000)
      : 0;

    const workDomains = [
      "github.com", "gitlab.com", "figma.com", "notion.so",
      "trello.com", "asana.com", "slack.com", "zoom.us",
      "upwork.com", "fiverr.com", "toptal.com", "freelancer.com",
    ];
    const workSites = urlEvents.filter(e =>
      workDomains.some(d => (e.url || "").includes(d))
    ).length;
    const workRelevance = urlEvents.length > 0 ? workSites / urlEvents.length : 0;

    // Determine compliance status
    let complianceStatus: "compliant" | "at_risk" | "rejected" = "compliant";
    if (activityDensity < 1 || workRelevance < 0.3) {
      complianceStatus = "at_risk";
    }
    if (activityDensity < 0.5 && workRelevance < 0.1) {
      complianceStatus = "rejected";
    }

    const contextScore = Math.round(
      Math.min(activityDensity * 10, 100) * 0.4 +
      workRelevance * 100 * 0.3 +
      Math.min(screenshotEvents.length * 10, 100) * 0.15 +
      Math.min(memoEvents.length * 20, 100) * 0.15
    );

    // Store evidence metadata
    await ctx.db.insert("evidenceMetadata", {
      evidenceId: session._id, // Use evidenceSessionId as the evidence ID
      userId: session.userId,
      sessionId: session.sessionId,
      evidenceSessionId: session._id,
      contextScore,
      complianceStatus,
      workRelevance,
      activityDensity: Math.round(activityDensity * 10) / 10,
      timestamp: now,
      workspaceId: session.workspaceId,
    });

    // If compliance is at risk, create a compliance alert
    if (complianceStatus === "at_risk" || complianceStatus === "rejected") {
      try {
        await ctx.db.insert("complianceAlerts", {
          userId: session.userId,
          alertType: complianceStatus === "rejected" ? "session_rejected" : "low_activity",
          message: complianceStatus === "rejected"
            ? `Work session rejected: very low activity (${Math.round(activityDensity)} events/min) and minimal work context (${Math.round(workRelevance * 100)}% relevance)`
            : `Work session at risk: low activity density (${Math.round(activityDensity)} events/min) or low work relevance (${Math.round(workRelevance * 100)}%)`,
          acknowledged: false,
          timestamp: now,
          workspaceId: session.workspaceId,
        });
      } catch (err) {
        console.error("[Evidence Extension] Failed to create compliance alert:", err);
      }
    }

    console.log("[Evidence Extension] Finalized session:", {
      evidenceSessionId,
      eventCount: events.length,
      duration: Math.round(sessionDuration / 60000) + "min",
      contextScore,
      complianceStatus,
    });

    return { finalized: true, reason: "success" };
  },
});
