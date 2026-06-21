/**
 * Sentry + PostHog Monitoring Integration for Axia
 *
 * This module is a stub. The real implementation dynamically imports
 * @sentry/react and posthog-js only when env vars are set, so the build
 * doesn't fail when those optional deps aren't installed. Without env vars,
 * every function is a no-op — the app runs fine without monitoring.
 */

const ENVIRONMENT = import.meta.env.MODE || "development";

// Stub Sentry + PostHog so all imports continue to work without the packages
const Sentry = {
  init: () => {},
  captureException: () => {},
  captureMessage: () => {},
  setUser: () => {},
  startSpan: <T>(_opts: unknown, cb: () => T): T => cb(),
  SeverityLevel: { Info: "info" as const },
};
const posthog = {
  init: () => {},
  identify: () => {},
  reset: () => {},
  capture: () => {},
  isFeatureEnabled: (_flag: string) => false,
  getFeatureFlag: (_flag: string) => undefined,
};

type SeverityLevel = "info" | "warning" | "error" | "fatal";

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  // Lazy-load only if needed
  console.info("[Sentry] init skipped (no DSN in this build)");
}

export function initPostHog() {
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  console.info("[PostHog] init skipped (no key in this build)");
}

export function initMonitoring() {
  initSentry();
  initPostHog();
}

export function captureException(_error: unknown, _context?: Record<string, unknown>) {
  // No-op without Sentry
}

export function captureMessage(_message: string, _level: SeverityLevel = "info", _context?: Record<string, unknown>) {
  // No-op without Sentry
}

export function setUser(_user: { id: string; email?: string; name?: string; tier?: string }) {
  // No-op without Sentry/PostHog
}

export function clearUser() {
  // No-op
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (ENVIRONMENT === "development") {
    console.info(`[Analytics] ${eventName}`, properties);
  }
}

export function trackPageView(_path?: string) {
  // No-op
}

export function isFeatureEnabled(_flagKey: string, defaultValue = false): boolean {
  return defaultValue;
}

export function getFeatureFlagVariant(_flagKey: string): string | undefined {
  return undefined;
}

export function startSpan<T>(_name: string, callback: () => T): T {
  return callback();
}

export function reportQueryError(
  queryName: string,
  error: string,
  _args?: Record<string, unknown>
) {
  captureMessage(`Convex query error: ${queryName}`, "warning");
  trackEvent("convex_query_error", {
    queryName,
    error: error.substring(0, 200),
  });
}

export const AnalyticsEvents = {
  AUTH_SIGN_IN: "auth_sign_in",
  AUTH_SIGN_UP: "auth_sign_up",
  AUTH_SIGN_OUT: "auth_sign_out",
  AUTH_FAILED: "auth_failed",
  PAGE_VIEW: "page_view",
  SIDEBAR_TOGGLE: "sidebar_toggle",
  THEME_TOGGLE: "theme_toggle",
  CLIENT_CREATED: "client_created",
  PROJECT_CREATED: "project_created",
  INVOICE_CREATED: "invoice_created",
  INVOICE_SENT: "invoice_sent",
  PROPOSAL_CREATED: "proposal_created",
  PROPOSAL_SENT: "proposal_sent",
  DEAL_CREATED: "deal_created",
  DEAL_MOVED: "deal_moved",
  EVIDENCE_EXPORT: "evidence_export",
  EVIDENCE_VIEW: "evidence_view",
  SESSION_START: "session_start",
  SESSION_STOP: "session_stop",
  UPGRADE_CLICKED: "upgrade_clicked",
  SUBSCRIPTION_CHANGED: "subscription_changed",
  CONVEX_QUERY_ERROR: "convex_query_error",
  CONVEX_MUTATION_ERROR: "convex_mutation_error",
  PAGE_LOAD_TIMEOUT: "page_load_timeout",
  PAGE_CRASH: "page_crash",
  RECORD_SHARED: "record_shared",
  RECORD_UNSHARED: "record_unshared",
} as const;
