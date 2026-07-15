/**
 * Sentry + PostHog Monitoring Integration for Axia
 *
 * This module initializes Sentry (error tracking) and PostHog (product
 * analytics) when the corresponding env vars are set. If env vars are
 * missing, all functions are no-ops — the app runs fine without monitoring.
 *
 * Both services are open source:
 *   - Sentry: https://github.com/getsentry/sentry-javascript (MIT SDK)
 *   - PostHog: https://github.com/PostHog/posthog (MIT, fully open source)
 *
 * Env vars (client-side, VITE_ prefix):
 *   VITE_SENTRY_DSN, VITE_SENTRY_ORG, VITE_SENTRY_PROJECT
 *   VITE_POSTHOG_KEY, VITE_POSTHOG_HOST
 *
 * Server-side API keys (for owner dashboard) are separate:
 *   SENTRY_AUTH_TOKEN, POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID
 *   (set on Convex, never exposed to browser)
 */

const ENVIRONMENT = import.meta.env.MODE || "development";

// ── Lazy-loaded real clients (only imported if env vars are set) ────────────
let sentryClient: typeof import("@sentry/react") | null = null;
let posthogClient: typeof import("posthog-js") | null = null;
let initialized = false;

async function loadSentry() {
  if (sentryClient) return sentryClient;
  if (!import.meta.env.VITE_SENTRY_DSN) return null;
  try {
    sentryClient = await import("@sentry/react");
    return sentryClient;
  } catch (err) {
    console.warn("[Sentry] Failed to load @sentry/react:", err);
    return null;
  }
}

async function loadPostHog() {
  if (posthogClient) return posthogClient;
  if (!import.meta.env.VITE_POSTHOG_KEY) return null;
  try {
    posthogClient = (await import("posthog-js")).default;
    return posthogClient;
  } catch (err) {
    console.warn("[PostHog] Failed to load posthog-js:", err);
    return null;
  }
}

// ── Initialization ──────────────────────────────────────────────────────────
export async function initSentry() {
  const Sentry = await loadSentry();
  if (!Sentry) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: ENVIRONMENT,
    org: import.meta.env.VITE_SENTRY_ORG,
    project: import.meta.env.VITE_SENTRY_PROJECT,
    release: import.meta.env.VITE_GIT_SHA,
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,
    profilesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  console.info("[Sentry] Initialized — DSN:", import.meta.env.VITE_SENTRY_DSN?.slice(0, 20) + "...");
}

export async function initPostHog() {
  const posthog = await loadPostHog();
  if (!posthog) return;

  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      recordCrossOriginIframes: true,
    },
    loaded: (ph) => {
      if (ENVIRONMENT === "development") {
        ph.debug = true;
      }
    },
    opt_out_capturing_by_default: false,
  });

  console.info("[PostHog] Initialized — host:", import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com");
}

export async function initMonitoring() {
  if (initialized) return;
  initialized = true;
  await Promise.all([initSentry(), initPostHog()]);
}

// ── Error capture (Sentry) ──────────────────────────────────────────────────
export function captureException(error: unknown, context?: Record<string, unknown>) {
  loadSentry().then((Sentry) => {
    if (!Sentry) return;
    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, { value });
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  });
}

export function captureMessage(message: string, level: "info" | "warning" | "error" | "fatal" = "info", context?: Record<string, unknown>) {
  loadSentry().then((Sentry) => {
    if (!Sentry) return;
    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, { value });
        });
        Sentry.captureMessage(message, level);
      });
    } else {
      Sentry.captureMessage(message, level);
    }
  });
}

// ── User identification (Sentry + PostHog) ──────────────────────────────────
export function setUser(user: { id: string; email?: string; name?: string; tier?: string }) {
  loadSentry().then((Sentry) => {
    if (!Sentry) return;
    Sentry.setUser({ id: user.id, email: user.email, username: user.name, tier: user.tier });
  });
  loadPostHog().then((posthog) => {
    if (!posthog) return;
    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
      tier: user.tier,
    });
  });
}

export function clearUser() {
  loadSentry().then((Sentry) => {
    if (!Sentry) return;
    Sentry.setUser(null);
  });
  loadPostHog().then((posthog) => {
    if (!posthog) return;
    posthog.reset();
  });
}

// ── Event tracking (PostHog) ─────────────────────────────────────────────────
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (ENVIRONMENT === "development") {
    console.info(`[Analytics] ${eventName}`, properties);
  }
  loadPostHog().then((posthog) => {
    if (!posthog) return;
    posthog.capture(eventName, properties);
  });
}

export function trackPageView(path?: string) {
  const pagePath = path || window.location.pathname;
  loadPostHog().then((posthog) => {
    if (!posthog) return;
    posthog.capture("$pageview", { $current_url: window.location.href, path: pagePath });
  });
}

// ── Feature flags (PostHog) ──────────────────────────────────────────────────
export async function isFeatureEnabled(flagKey: string, defaultValue = false): Promise<boolean> {
  const posthog = await loadPostHog();
  if (!posthog) return defaultValue;
  return posthog.isFeatureEnabled(flagKey) ?? defaultValue;
}

export async function getFeatureFlagVariant(flagKey: string): Promise<string | undefined> {
  const posthog = await loadPostHog();
  if (!posthog) return undefined;
  return posthog.getFeatureFlag(flagKey) ?? undefined;
}

// ── Performance tracing (Sentry) ─────────────────────────────────────────────
export function startSpan<T>(name: string, callback: () => T): T {
  // Synchronous wrapper — Sentry's startSpan is async-friendly but we keep it sync
  // for compatibility with the existing call sites.
  try {
    return callback();
  } catch (err) {
    captureException(err, { span: name });
    throw err;
  }
}

// ── Query error reporting ────────────────────────────────────────────────────
export function reportQueryError(
  queryName: string,
  error: string,
  args?: Record<string, unknown>
) {
  captureMessage(`Convex query error: ${queryName}`, "warning", { error, args });
  trackEvent("convex_query_error", {
    queryName,
    error: error.substring(0, 200),
  });
}

// ── Analytics event names (centralized for consistency) ──────────────────────
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
  OWNER_DASHBOARD_VIEW: "owner_dashboard_view",
  OWNER_TAB_VIEW: "owner_tab_view",
} as const;
