import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const configureCORS = (response: Response): Response => {
  // SECURITY: Restrict CORS to known origins instead of wildcard
  const allowedOrigins = [
    "https://preview-81.space-z.ai",
    "https://preview-1936221977589032.space.chatglm.site",
    "https://veracious-zebra-519.convex.cloud",
    "https://artful-civet-344.convex.cloud",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  const origin = response.headers.get("Origin") || "";
  // SECURITY: Don't fall back to an arbitrary origin — only allow explicitly listed origins.
  // If the origin isn't in the allowlist, reject the request by not setting CORS headers.
  const allowOrigin = allowedOrigins.includes(origin) ? origin : "";
  response.headers.set('Access-Control-Allow-Origin', allowOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
};

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

const http = httpRouter();

auth.addHttpRoutes(http);

// ═══════════════════════════════════════════════════════════
// Extension HTTPS Endpoints
// P0 FIX: All endpoints now actually persist data to the database
// ═══════════════════════════════════════════════════════════

// POST /api/extension/start
// Creates an evidenceSession record and links it to the work session
http.route({
  path: "/api/extension/start",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
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

      // P0 FIX: Actually create an evidenceSession record in the database
      const evidenceSessionId = await ctx.runMutation(api.evidence.extension.startEvidenceSession, {
        userId,
        sessionId,
        platform,
      });

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
// P0 FIX: Actually persists evidence events to the evidenceEvents table
http.route({
  path: "/api/extension/record",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
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

      // SECURITY: Actually validate the token against the database
      const userId = await validateExtensionToken(ctx, token);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // P0 FIX: Actually persist evidence events to the database via internal mutation
      // Validate event shape and sanitize before storage
      const validKinds = ["mouse", "keyboard", "url", "screenshot_ref", "memo", "platform_status"];
      const validEvents = events.filter((e: any) => 
        e && 
        typeof e.t === "number" && 
        typeof e.kind === "string" && 
        validKinds.includes(e.kind)
      );

      // Cap batch size to prevent abuse (max 500 events per request)
      const cappedEvents = validEvents.slice(0, 500);

      if (cappedEvents.length > 0) {
        const recordedCount = await ctx.runMutation(api.evidence.extension.recordEvidenceEvents, {
          evidenceSessionId,
          userId,
          events: cappedEvents.map((e: any) => ({
            t: e.t,
            kind: e.kind,
            data: typeof e.data === "string" ? e.data.substring(0, 10000) : JSON.stringify(e.data).substring(0, 10000),
            url: e.url ? String(e.url).substring(0, 2048) : undefined,
          })),
        });

        return new Response(JSON.stringify({ success: true, recordedCount }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, recordedCount: 0 }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return sanitizeError(e, "Failed to record extension events");
    }
  }),
});

// POST /api/extension/finalize
// P0 FIX: Actually finalizes the evidence session and triggers WCVM verification
http.route({
  path: "/api/extension/finalize",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
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

      // P0 FIX: Actually finalize the evidence session in the database
      const result = await ctx.runMutation(api.evidence.extension.finalizeEvidenceSession, {
        evidenceSessionId,
        userId,
      });

      return new Response(JSON.stringify({ 
        success: true, 
        evidenceSessionId,
        finalized: result?.finalized ?? false,
      }), { 
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
http.route({
  path: "/api/ai/predict",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
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
      
      if (token && typeof token === "string") {
        const userId = await validateExtensionToken(ctx, token);
        if (userId) isAuthenticated = true;
      }
      
      if (!isAuthenticated && authHeader?.startsWith("Bearer ")) {
        const bearerToken = authHeader.substring(7);
        const userId = await validateExtensionToken(ctx, bearerToken);
        if (userId) isAuthenticated = true;
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

export default http;
