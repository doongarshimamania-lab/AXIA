/**
 * Analytics tracking wrapper for Axia.
 *
 * This module provides a clean, typed API for tracking user events to PostHog.
 * All tracking goes through PostHog (initialized in monitoring.ts).
 *
 * Usage:
 *   import { analytics } from "@/lib/analytics";
 *   analytics.track("invoice_created", { amount: 500, currency: "USD" });
 *   analytics.identify(user.id, { email: user.email, tier: "pro" });
 *   analytics.pageView("/dashboard");
 *
 * In development, events are logged to the console (via monitoring.ts).
 * In production, events are sent to PostHog.
 */

import {
  trackEvent,
  trackPageView,
  setUser,
  clearUser,
  AnalyticsEvents,
  captureException,
  isFeatureEnabled,
  getFeatureFlagVariant,
} from "@/lib/monitoring";

export const analytics = {
  // ── Event tracking ────────────────────────────────────────────────────────
  track: (event: string, properties?: Record<string, unknown>) => {
    trackEvent(event, properties);
  },

  // ── Page views ─────────────────────────────────────────────────────────────
  pageView: (path?: string) => {
    trackPageView(path);
  },

  // ── User identification ────────────────────────────────────────────────────
  identify: (userId: string, traits?: { email?: string; name?: string; tier?: string }) => {
    setUser({ id: userId, ...traits });
  },

  reset: () => {
    clearUser();
  },

  // ── Error reporting ────────────────────────────────────────────────────────
  error: (error: unknown, context?: Record<string, unknown>) => {
    captureException(error, context);
  },

  // ── Feature flags ──────────────────────────────────────────────────────────
  isFeatureEnabled: (flag: string, defaultValue = false) =>
    isFeatureEnabled(flag, defaultValue),

  getFeatureFlagVariant: (flag: string) =>
    getFeatureFlagVariant(flag),

  // ── Predefined events (typed) ──────────────────────────────────────────────
  events: AnalyticsEvents,
};

// ── Convenience: track key user actions with a single call ───────────────────
export function trackUserAction(action: string, properties?: Record<string, unknown>) {
  analytics.track(action, {
    ...properties,
    timestamp: Date.now(),
    url: window.location.pathname,
  });
}

// ── Auto page view tracking (call once in the router) ─────────────────────────
let lastPath = "";
export function autoTrackPageViews() {
  if (typeof window === "undefined") return;

  const track = () => {
    const path = window.location.pathname;
    if (path !== lastPath) {
      lastPath = path;
      analytics.pageView(path);
    }
  };

  // Track initial page
  track();

  // Track on navigation (pushState/replaceState + popstate)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function (...args) {
    originalPushState.apply(history, args);
    setTimeout(track, 0);
  };
  history.replaceState = function (...args) {
    originalReplaceState.apply(history, args);
    setTimeout(track, 0);
  };
  window.addEventListener("popstate", track);
}
