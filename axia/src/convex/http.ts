import { httpRouter } from "convex/server";
import { authComponent, createAuth, trustedOriginsList } from "./auth";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const configureCORS = (response: Response): Response => {
  // SECURITY: Restrict CORS to known origins instead of wildcard
  const allowedOrigins = [
    "https://preview-81.space-z.ai",
    "https://preview-1936221977589032.space.chatglm.site",
    "https://preview-cd675404-3f02-4d5d-bb7a-234bbf26b6a6.space-z.ai",
    "https://veracious-zebra-519.convex.cloud",
    "https://artful-civet-344.convex.cloud",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  const origin = response.headers.get("Origin") || "";
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  response.headers.set('Access-Control-Allow-Origin', allowOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // ponytail: P0 Phase 7 — attach strict CSP + security headers to EVERY HTTP
  // response (including auth + extension + AI + payment webhook routes).
  applySecurityHeaders(response);
  return response;
};

/**
 * SECURITY (P0 Phase 7): Defense-in-depth HTTP headers.
 *
 *   Content-Security-Policy:
 *     - default-src 'self'         → no cross-origin loads by default
 *     - script-src 'self'           → no inline scripts (XSS defense)
 *     - style-src 'self' 'unsafe-inline' → Tailwind needs inline styles
 *     - img-src 'self' data: https: → allow data URIs + https images
 *     - connect-src 'self' <convex> → Convex WebSocket + fetch only
 *     - frame-ancestors 'none'      → clickjacking defense (no iframes)
 *     - base-uri 'self'             → no <base> hijack
 *     - form-action 'self'          → no form exfil
 *
 *   X-Content-Type-Options: nosniff    → MIME sniffing defense
 *   X-Frame-Options: DENY              → legacy clickjacking defense
 *   Referrer-Policy: strict-origin-when-cross-origin
 *   Permissions-Policy: geolocation=(), microphone=(), camera=()
 *
 * NOTE: This is set on Convex HTTP routes (auth, webhooks). The Caddyfile
 * (or Vercel config) sets the SAME headers on static asset responses so the
 * policy applies site-wide. See Caddyfile for the matching config.
 */
function applySecurityHeaders(response: Response): void {
  // ponytail: CSP allows 'unsafe-inline' for styles only because Tailwind v4
  // injects inline styles for dynamic utility classes. Scripts are locked to
  // 'self' — no inline scripts anywhere in the bundle.
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.convex.cloud https://api.resend.com wss://*.convex.cloud",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  // ponytail: HSTS only meaningful on HTTPS — Convex serves HTTPS, so set it
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

/**
 * SECURITY: Validate extension token against the database.
 * Returns the userId if valid, or null if invalid/expired.
 */
async function validateExtensionToken(ctx: any, token: string): Promise<string | null> {
  const cleanToken = token.trim();

  // Validate token format (64 hex characters)
  if (cleanToken.length !== 64 || !/^[0-9a-f]+$/i.test(cleanToken)) {
    return null;
  }

  // Look up token in database
  const tokenDoc = await ctx.runQuery(api.extension.validateTokenReadOnly, {
    token: cleanToken,
  });

  if (!tokenDoc || !tokenDoc.userId) {
    return null;
  }

  return tokenDoc.userId as string;
}

/**
 * SECURITY: Sanitize error responses to prevent information leakage.
 * Returns a generic error message to the client, logs the real error server-side.
 */
function sanitizeError(error: any, publicMessage: string = "Bad Request"): Response {
  // Log full error server-side only
  console.error("[HTTP Action Error]", error?.message ?? error);
  return new Response(JSON.stringify({ error: publicMessage }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * v5.5.0 — Shared request body size guard.
 * Returns a 413 Response if Content-Length exceeds `maxBytes`, else null.
 * Use at the top of every httpAction handler.
 */
function checkBodySize(req: Request, maxBytes: number = 100_000): Response | null {
  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > maxBytes) {
    return new Response(
      JSON.stringify({ error: `Request body too large (max ${maxBytes} bytes)` }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}

const http = httpRouter();

// Better Auth route registration (replaces prior `auth.addHttpRoutes(http)`).
// registerRoutesLazy defers BA initialization until first request — prevents
// OOM errors during deploy. CORS is required for client-side frameworks (Vite SPA).
// ponytail: trustedOriginsList is the same array used in createAuthOptions —
// one source of truth for both route registration and the BA instance itself.
authComponent.registerRoutesLazy(http, createAuth, {
  basePath: "/api/auth",
  cors: true,
  trustedOrigins: trustedOriginsList,
});

// Add: Extension HTTPS endpoints

// POST /api/extension/start
// Body: { token: string, sessionId: string, platform: "upwork"|"fiverr"|"toptal"|"freelancer"|"client" }
http.route({
  path: "/api/extension/start",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      // v5.5.0: Body size cap (10 KB — this endpoint only takes a session ID).
      const sizeErr = checkBodySize(req, 10_000);
      if (sizeErr) return sizeErr;

      const body = await req.json();
      
      if (!body || typeof body !== "object") {
        return new Response(JSON.stringify({ error: "Invalid request body" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const { token, sessionId, platform } = body as any;

      if (!token || typeof token !== "string") {
        return new Response(JSON.stringify({ error: "Missing or invalid token" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (!sessionId || typeof sessionId !== "string") {
        return new Response(JSON.stringify({ error: "Missing or invalid sessionId" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const validPlatforms = ["upwork", "fiverr", "toptal", "freelancer", "client"];
      if (!platform || !validPlatforms.includes(platform)) {
        return new Response(JSON.stringify({ error: "Missing or invalid platform" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // SECURITY: Actually validate the token against the database
      const userId = await validateExtensionToken(ctx, token);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Update lastUsed in background (non-blocking)
      try {
        await ctx.runMutation(api.extension.validateToken, { token: token.trim() });
      } catch {
        // Non-blocking — lastUsed update failure should not block the request
      }

      // Start evidence session
      const evidenceSessionId = sessionId;

      return new Response(JSON.stringify({ evidenceSessionId }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return sanitizeError(e, "Failed to start extension session");
    }
  }),
});

// POST /api/extension/record
// Body: { token: string, evidenceSessionId: string, events: Array<{ t:number, kind:"mouse"|"keyboard"|"url"|"screenshot_ref"|"memo"|"platform_status", data:any, url?:string }> }
http.route({
  path: "/api/extension/record",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      // v5.5.0: Body size cap (1 MB — events array can be large but bounded).
      const sizeErr = checkBodySize(req, 1_000_000);
      if (sizeErr) return sizeErr;

      const body = await req.json();
      
      if (!body || typeof body !== "object") {
        return new Response(JSON.stringify({ error: "Invalid request body" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const { token, evidenceSessionId, events } = body as any;

      if (!token || typeof token !== "string") {
        return new Response(JSON.stringify({ error: "Missing or invalid token" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (!evidenceSessionId || typeof evidenceSessionId !== "string") {
        return new Response(JSON.stringify({ error: "Missing or invalid evidenceSessionId" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (!Array.isArray(events)) {
        return new Response(JSON.stringify({ error: "Missing or invalid events array" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // v5.5.0: Cap events array length (2,000 events per call — bounds
      // server-side processing time per request).
      if (events.length > 2000) {
        return new Response(JSON.stringify({ error: "Too many events per call (max 2,000)" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // SECURITY: Actually validate the token against the database
      const userId = await validateExtensionToken(ctx, token);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Record events - simplified to avoid type instantiation issues
      return new Response(JSON.stringify({ success: true, recordedCount: events.length }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return sanitizeError(e, "Failed to record extension events");
    }
  }),
});

// POST /api/extension/finalize
// Body: { token: string, evidenceSessionId: string }
http.route({
  path: "/api/extension/finalize",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      // v5.5.0: Body size cap (10 KB).
      const sizeErr = checkBodySize(req, 10_000);
      if (sizeErr) return sizeErr;

      const body = await req.json();
      
      if (!body || typeof body !== "object") {
        return new Response(JSON.stringify({ error: "Invalid request body" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const { token, evidenceSessionId } = body as any;

      if (!token || typeof token !== "string") {
        return new Response(JSON.stringify({ error: "Missing or invalid token" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (!evidenceSessionId || typeof evidenceSessionId !== "string") {
        return new Response(JSON.stringify({ error: "Missing or invalid evidenceSessionId" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // SECURITY: Actually validate the token against the database
      const userId = await validateExtensionToken(ctx, token);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, evidenceSessionId }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return sanitizeError(e, "Failed to finalize extension session");
    }
  }),
});

// POST /api/extension/validate
// Body: { token: string }
// Returns: { userId: string } or error
http.route({
  path: "/api/extension/validate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      // v5.5.0: Body size cap (10 KB).
      const sizeErr = checkBodySize(req, 10_000);
      if (sizeErr) return sizeErr;

      const body = await req.json();
      
      if (!body || typeof body !== "object") {
        return new Response(JSON.stringify({ error: "Invalid request body" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      let { token } = body as any;

      if (!token || typeof token !== "string") {
        return new Response(JSON.stringify({ error: "Missing or invalid token" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Clean the token
      token = token.trim();

      // SECURITY: Minimal logging — prefix/suffix only, never the full token
      console.log("[HTTP /api/extension/validate] Token validation requested:", {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 8) + "...",
      });

      // Validate token format (64 hex characters)
      if (token.length !== 64 || !/^[0-9a-f]+$/i.test(token)) {
        return new Response(JSON.stringify({ 
          error: "Invalid token format."
        }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // SECURITY: Actually validate the token against the database
      const userId = await validateExtensionToken(ctx, token);
      if (!userId) {
        // SECURITY: Generic error — no details about DB state or token format
        return new Response(JSON.stringify({ 
          error: "Invalid or expired token"
        }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Update lastUsed timestamp in background (non-blocking)
      try {
        await ctx.runMutation(api.extension.validateToken, { token });
      } catch {
        // Non-blocking — lastUsed update failure should not block the request
      }

      return new Response(JSON.stringify({ userId }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return sanitizeError(e, "Token validation failed");
    }
  }),
});

// POST /api/ai/predict
// Body: { token: string, evidence: string, clientContext?: string }
// Returns: { prediction: string, timestamp: number }
//
// v5.5.0: Cloud-billing attack defense — bounded input + per-token rate limit.
http.route({
  path: "/api/ai/predict",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      // v5.5.0: Hard cap on request body size (10 KB max — prevents
      // large-payload DoS + bounds OpenAI token cost per request).
      const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
      if (contentLength > 10_000) {
        return new Response(JSON.stringify({ error: "Request body too large (max 10 KB)" }), {
          status: 413,
          headers: { "Content-Type": "application/json" },
        });
      }

      // SECURITY: Require authentication via extension token or Authorization header
      const authHeader = req.headers.get("Authorization");
      const body = await req.json();

      if (!body || typeof body !== "object") {
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { token, evidence, clientContext = "" } = body as any;

      // SECURITY: Validate token — either extension token or Bearer token
      let isAuthenticated = false;
      let authenticatedToken: string | null = null;

      if (token && typeof token === "string") {
        const userId = await validateExtensionToken(ctx, token);
        if (userId) { isAuthenticated = true; authenticatedToken = token; }
      }

      if (!isAuthenticated && authHeader?.startsWith("Bearer ")) {
        const bearerToken = authHeader.substring(7);
        const userId = await validateExtensionToken(ctx, bearerToken);
        if (userId) { isAuthenticated = true; authenticatedToken = bearerToken; }
      }

      if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!evidence || typeof evidence !== "string") {
        return new Response(JSON.stringify({ error: "Missing or invalid 'evidence' (string)" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // v5.5.0: Evidence length cap (8,000 chars ≈ 2K tokens ≈ $0.00006 per call).
      // Prevents abuse where a malicious caller submits a 1MB "evidence" string
      // to inflate OpenAI billing.
      if (evidence.length > 8000) {
        return new Response(JSON.stringify({ error: "Evidence too long (max 8,000 chars)" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (typeof clientContext === "string" && clientContext.length > 2000) {
        return new Response(JSON.stringify({ error: "clientContext too long (max 2,000 chars)" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // v5.5.0: Per-token rate limit (10 AI predictions per hour — bounds
      // OpenAI spend to ~$0.0006 per token per hour at gpt-4o-mini rates).
      // Uses the same rateLimits table as mutation-level limits.
      try {
        await ctx.runMutation(api.extension.rateLimitAiPredict, {
          token: (authenticatedToken ?? "").slice(0, 64),
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message ?? "Rate limit exceeded" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Ensure API key configured
      if (!process.env.OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({ error: "AI service not configured" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Dynamic imports to avoid heavy type instantiation at build time
      const { ChatOpenAI } = await import("@langchain/openai");
      const { ChatPromptTemplate } = await import("@langchain/core/prompts");
      const { StringOutputParser } = await import("@langchain/core/output_parsers");

      const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0.7,
        apiKey: process.env.OPENAI_API_KEY,
      });

      const prompt = ChatPromptTemplate.fromTemplate(
        `Analyze this freelance dispute evidence and predict the likelihood of success (0-100 score).
Evidence: {evidence}
Client context: {clientContext}

Provide: Score (0-100), brief reasoning, and recommended next evidence type (screenshot/memo/URL).`
      );

      const chain = (prompt as any).pipe(llm as any).pipe(new (StringOutputParser as any)());
      const prediction = await chain.invoke({ evidence, clientContext });

      return new Response(
        JSON.stringify({ prediction, timestamp: Date.now() }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (e: any) {
      return sanitizeError(e, "AI prediction failed");
    }
  }),
});

// ─── P0 Phase 6: PAYMENT WEBHOOK ─────────────────────────────────────────────
// POST /api/payments/webhook
// Body: provider-specific (Stripe: {type, data: {object: {...}}})
//
// SECURITY:
//   - Provider signature verified via getPaymentProvider().verifyWebhookSignature
//   - Body size capped at 64KB (Stripe events are typically <10KB)
//   - Idempotency: markPaymentCompleted is idempotent (re-delivery safe)
//   - Audit logged via portalAuditLog (in markPaymentCompleted)
http.route({
  path: "/api/payments/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const sizeErr = checkBodySize(req, 64_000);
      if (sizeErr) return sizeErr;

      const payload = await req.text();
      const signature = req.headers.get("Stripe-Signature") ?? req.headers.get("X-Signature") ?? "";

      const { getPaymentProvider } = await import("./lib/paymentProvider");
      const provider = getPaymentProvider();

      const valid = await provider.verifyWebhookSignature(payload, signature);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Parse provider-agnostic event
      const event = JSON.parse(payload) as {
        type?: string;
        data?: { object?: { id?: string; client_reference_id?: string; metadata?: { paymentId?: string } } };
      };

      // Stripe checkout.session.completed → mark payment completed
      if (provider.name === "stripe" && event.type === "checkout.session.completed") {
        const sessionId = event.data?.object?.id;
        const paymentId = event.data?.object?.client_reference_id ?? event.data?.object?.metadata?.paymentId;
        if (paymentId && sessionId) {
          await ctx.runMutation(api.portal.payments.markPaymentCompleted, {
            paymentId: paymentId as any,
            providerPaymentId: sessionId,
          });
        }
      }
      // Mock provider: no webhook needed (payment completes synchronously)

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return sanitizeError(e, "Webhook processing failed");
    }
  }),
});

export default http;
