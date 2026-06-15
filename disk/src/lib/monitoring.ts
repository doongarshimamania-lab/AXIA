/**
 * Sentry + PostHog Monitoring Integration for Axia
 *
 * This module initializes:
 * - Sentry: Error tracking, performance monitoring, session replay
 * - PostHog: Product analytics, feature flags, user behavior tracking
 *
 * Both are lazy-initialized on first call to avoid blocking app startup.
 */

import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

// ── Configuration ──────────────────────────────────────────────────────────────

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "";
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
const ENVIRONMENT = import.meta.env.MODE || "development";
const RELEASE = import.meta.env.VITE_GIT_SHA || "dev";

let sentryInitialized = false;
let posthogInitialized = false;

// ── Sentry Initialization ──────────────────────────────────────────────────────

export function initSentry() {
  if (sentryInitialized || !SENTRY_DSN) {
    if (!SENTRY_DSN) {
      console.info("[Sentry] No VITE_SENTRY_DSN set — skipping Sentry initialization");
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,

    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === "production" ? 0.2 : 1.0,

    // Session Replay
    replaysSessionSampleRate: ENVIRONMENT === "production" ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    // Filter out noisy errors
    ignoreErrors: [
      "ResizeObserver loop completed with overscroll",
      "ResizeObserver loop limit exceeded",
      "Network request failed",
      "Failed to fetch",
      "user is not authenticated",
      "Not authenticated",
      "Convex query error",
      "WebSocket connection",
      "cancelled",
      "The user aborted a request",
      // Browser extension noise
      "Non-Error promise rejection captured",
    ],

    // Don't send errors from browser extensions
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
      Sentry.extraErrorDataIntegration(),
      Sentry.captureConsoleIntegration({
        levels: ["error"],
      }),
    ],

    // Attach stack traces
    attachStacktrace: true,

    // Send client reports
    sendClientReports: true,
  });

  sentryInitialized = true;
  console.info("[Sentry] Initialized in", ENVIRONMENT);
}

// ── PostHog Initialization ─────────────────────────────────────────────────────

export function initPostHog() {
  if (posthogInitialized || !POSTHOG_KEY) {
    if (!POSTHOG_KEY) {
      console.info("[PostHog] No VITE_POSTHOG_KEY set — skipping PostHog initialization");
    }
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    environment: ENVIRONMENT,
    release: RELEASE,

    // Privacy
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage",

    // Performance
    autocapture: true,
    disable_session_recording: ENVIRONMENT !== "production",

    // Respect Do Not Track
    respect_dnt: true,

    // Advanced
    loaded: (ph) => {
      if (ENVIRONMENT === "development") {
        // Debug mode in development
        ph.debug();
      }
    },
  });

  posthogInitialized = true;
  console.info("[PostHog] Initialized in", ENVIRONMENT);
}

// ── Combined Init (call once at app startup) ────────────────────────────────────

export function initMonitoring() {
  initSentry();
  initPostHog();
}

// ── Sentry Helpers ─────────────────────────────────────────────────────────────

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!sentryInitialized) return;
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info", context?: Record<string, unknown>) {
  if (!sentryInitialized) return;
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

export function setUser(user: { id: string; email?: string; name?: string; tier?: string }) {
  if (sentryInitialized) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
      tier: user.tier,
    });
  }
  if (posthogInitialized) {
    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
      tier: user.tier,
    });
  }
}

export function clearUser() {
  if (sentryInitialized) {
    Sentry.setUser(null);
  }
  if (posthogInitialized) {
    posthog.reset();
  }
}

// ── PostHog Analytics Helpers ──────────────────────────────────────────────────

export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!posthogInitialized) {
    // Always log in development for debugging
    if (ENVIRONMENT === "development") {
      console.info(`[Analytics] ${eventName}`, properties);
    }
    return;
  }
  posthog.capture(eventName, properties);
}

export function trackPageView(path?: string) {
  if (!posthogInitialized) return;
  posthog.capture("$pageview", {
    $current_url: path || window.location.href,
  });
}

// ── Feature Flags (PostHog) ────────────────────────────────────────────────────

export function isFeatureEnabled(flagKey: string, defaultValue = false): boolean {
  if (!posthogInitialized) return defaultValue;
  return posthog.isFeatureEnabled(flagKey) ?? defaultValue;
}

export function getFeatureFlagVariant(flagKey: string): string | undefined {
  if (!posthogInitialized) return undefined;
  return posthog.getFeatureFlag(flagKey) as string | undefined;
}

// ── Performance Tracking (Sentry) ───────────────────────────────────────────────

export function startSpan<T>(name: string, callback: () => T): T {
  if (!sentryInitialized) return callback();
  return Sentry.startSpan({ name }, callback);
}

// ── Convex Query Error Reporting ────────────────────────────────────────────────

export function reportQueryError(
  queryName: string,
  error: string,
  args?: Record<string, unknown>
) {
  captureMessage(`Convex query error: ${queryName}`, "warning", {
    queryName,
    error,
    args: args ? JSON.stringify(args).substring(0, 500) : undefined,
    url: window.location.href,
  });

  trackEvent("convex_query_error", {
    queryName,
    error: error.substring(0, 200),
  });
}

// ── Analytics Event Catalog ─────────────────────────────────────────────────────
// All events should use these constants for consistency

export const AnalyticsEvents = {
  // Auth
  AUTH_SIGN_IN: "auth_sign_in",
  AUTH_SIGN_UP: "auth_sign_up",
  AUTH_SIGN_OUT: "auth_sign_out",
  AUTH_FAILED: "auth_failed",

  // Navigation
  PAGE_VIEW: "page_view",
  SIDEBAR_TOGGLE: "sidebar_toggle",
  THEME_TOGGLE: "theme_toggle",

  // Core Actions
  CLIENT_CREATED: "client_created",
  PROJECT_CREATED: "project_created",
  INVOICE_CREATED: "invoice_created",
  INVOICE_SENT: "invoice_sent",
  PROPOSAL_CREATED: "proposal_created",
  PROPOSAL_SENT: "proposal_sent",
  DEAL_CREATED: "deal_created",
  DEAL_MOVED: "deal_moved",

  // Evidence
  EVIDENCE_EXPORT: "evidence_export",
  EVIDENCE_VIEW: "evidence_view",
  SESSION_START: "session_start",
  SESSION_STOP: "session_stop",

  // Subscription
  UPGRADE_CLICKED: "upgrade_clicked",
  SUBSCRIPTION_CHANGED: "subscription_changed",

  // Errors
  CONVEX_QUERY_ERROR: "convex_query_error",
  CONVEX_MUTATION_ERROR: "convex_mutation_error",
  PAGE_LOAD_TIMEOUT: "page_load_timeout",
  PAGE_CRASH: "page_crash",

  // Sharing
  RECORD_SHARED: "record_shared",
  RECORD_UNSHARED: "record_unshared",
} as const;
