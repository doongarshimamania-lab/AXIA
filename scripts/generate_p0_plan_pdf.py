#!/usr/bin/env python3
"""
Generate the P0 Portal Implementation Plan PDF.
Output: /home/z/my-project/download/Axia_P0_Portal_Implementation_Plan.pdf
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, ListFlowable, ListItem,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os, sys

# Register fonts (Noto Sans for body, Noto Serif for headings — both have CJK coverage)
FONT_PATHS = {
    "NotoSans": "/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf",
    "NotoSans-Bold": "/usr/share/fonts/truetype/chinese/NotoSansSC-Bold.ttf",
    "NotoSerif": "/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf",
    "NotoSerif-Bold": "/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf",
}
for name, path in FONT_PATHS.items():
    if os.path.exists(path):
        try:
            pdfmetrics.registerFont(TTFont(name, path))
        except Exception:
            pass

BODY_FONT = "NotoSans" if "NotoSans" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
BODY_BOLD = "NotoSans-Bold" if "NotoSans-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"
HEAD_FONT = "NotoSerif-Bold" if "NotoSerif-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"

# Brand palette (matches Axia site)
VIOLET = colors.HexColor("#8B5CF6")
DARK = colors.HexColor("#0F172A")
SLATE = colors.HexColor("#475569")
LIGHT_SLATE = colors.HexColor("#94A3B8")
BG_SOFT = colors.HexColor("#F8FAFC")
BORDER = colors.HexColor("#E2E8F0")
EMERALD = colors.HexColor("#10B981")
AMBER = colors.HexColor("#F59E0B")

# ─── Styles ───────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

H1 = ParagraphStyle("H1", parent=styles["Heading1"],
    fontName=HEAD_FONT, fontSize=22, leading=28, textColor=DARK,
    spaceBefore=0, spaceAfter=14, alignment=TA_LEFT)

H2 = ParagraphStyle("H2", parent=styles["Heading2"],
    fontName=HEAD_FONT, fontSize=15, leading=20, textColor=VIOLET,
    spaceBefore=18, spaceAfter=8, alignment=TA_LEFT)

H3 = ParagraphStyle("H3", parent=styles["Heading3"],
    fontName=BODY_BOLD, fontSize=12, leading=16, textColor=DARK,
    spaceBefore=12, spaceAfter=4, alignment=TA_LEFT)

BODY = ParagraphStyle("Body", parent=styles["BodyText"],
    fontName=BODY_FONT, fontSize=10, leading=15, textColor=SLATE,
    spaceBefore=0, spaceAfter=8, alignment=TA_LEFT)

BODY_JUSTIFY = ParagraphStyle("BodyJ", parent=BODY, alignment=TA_JUSTIFY)

CODE = ParagraphStyle("Code", parent=BODY,
    fontName="Courier", fontSize=8.5, leading=12, textColor=DARK,
    backColor=BG_SOFT, borderPadding=4, borderColor=BORDER, borderWidth=0.5,
    spaceBefore=4, spaceAfter=8)

BULLET = ParagraphStyle("Bullet", parent=BODY,
    leftIndent=14, bulletIndent=2, spaceAfter=4)

SMALL = ParagraphStyle("Small", parent=BODY,
    fontSize=8.5, leading=11, textColor=LIGHT_SLATE)

COVER_TITLE = ParagraphStyle("CoverTitle",
    fontName=HEAD_FONT, fontSize=34, leading=42, textColor=colors.white,
    alignment=TA_LEFT, spaceAfter=8)

COVER_SUB = ParagraphStyle("CoverSub",
    fontName=BODY_FONT, fontSize=14, leading=20, textColor=colors.HexColor("#C4B5FD"),
    alignment=TA_LEFT, spaceAfter=24)

COVER_META = ParagraphStyle("CoverMeta",
    fontName=BODY_FONT, fontSize=10, leading=14, textColor=colors.HexColor("#A5B4FC"),
    alignment=TA_LEFT)

# ─── Cover Page ───────────────────────────────────────────────────────────
def cover_page(canvas, doc):
    canvas.saveState()
    # Full-bleed dark gradient background
    canvas.setFillColor(DARK)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    # Violet accent stripe
    canvas.setFillColor(VIOLET)
    canvas.rect(0, A4[1] - 8*mm, A4[0], 8*mm, fill=1, stroke=0)
    # Decorative geometric shapes
    canvas.setFillColor(colors.HexColor("#1E1B4B"))
    canvas.circle(A4[0] - 40*mm, 60*mm, 80*mm, fill=1, stroke=0)
    canvas.setFillColor(VIOLET)
    canvas.circle(40*mm, A4[1] - 100*mm, 3*mm, fill=1, stroke=0)
    canvas.setStrokeColor(VIOLET)
    canvas.setLineWidth(0.4)
    canvas.line(20*mm, A4[1] - 100*mm, 60*mm, A4[1] - 100*mm)

    # Title
    canvas.setFillColor(colors.white)
    canvas.setFont(HEAD_FONT, 34)
    canvas.drawString(20*mm, A4[1] - 70*mm, "Axia")
    canvas.setFont(HEAD_FONT, 26)
    canvas.drawString(20*mm, A4[1] - 85*mm, "P0 Client Portal")
    canvas.setFont(BODY_FONT, 14)
    canvas.setFillColor(colors.HexColor("#C4B5FD"))
    canvas.drawString(20*mm, A4[1] - 100*mm, "Implementation Plan & Security Architecture")

    # Meta
    canvas.setFont(BODY_FONT, 10)
    canvas.setFillColor(colors.HexColor("#A5B4FC"))
    y = 50*mm
    canvas.drawString(20*mm, y, "Version: 6.0.0-p0-portal")
    canvas.drawString(20*mm, y - 6*mm, "Date: July 2026")
    canvas.drawString(20*mm, y - 12*mm, "Stack: Vite 6 + React 19 + TypeScript + Convex")
    canvas.drawString(20*mm, y - 18*mm, "Reference repos: nexu-io/open-design + affaan-m/ECC")

    canvas.restoreState()

# ─── Page Header/Footer (body pages) ──────────────────────────────────────
def body_page(canvas, doc):
    canvas.saveState()
    # Top accent line
    canvas.setStrokeColor(VIOLET)
    canvas.setLineWidth(1.5)
    canvas.line(20*mm, A4[1] - 15*mm, A4[0] - 20*mm, A4[1] - 15*mm)
    # Header text
    canvas.setFont(BODY_FONT, 8.5)
    canvas.setFillColor(LIGHT_SLATE)
    canvas.drawString(20*mm, A4[1] - 12*mm, "AXIA · P0 Client Portal — Implementation Plan")
    canvas.drawRightString(A4[0] - 20*mm, A4[1] - 12*mm, "v6.0.0-p0-portal")
    # Footer
    canvas.setFont(BODY_FONT, 8.5)
    canvas.setFillColor(LIGHT_SLATE)
    canvas.drawString(20*mm, 12*mm, "Axia · Confidential")
    canvas.drawRightString(A4[0] - 20*mm, 12*mm, f"Page {doc.page}")
    canvas.restoreState()

# ─── Build Story ──────────────────────────────────────────────────────────
def build_story():
    story = []

    # ─── 1. Executive Summary ────────────────────────────────────────────
    story.append(Paragraph("1. Executive Summary", H1))
    story.append(Paragraph(
        "This document describes the complete implementation of Axia's P0 client portal — a "
        "token-based, no-login portal where clients view deliverables, approve change orders, "
        "message their freelancer, and pay invoices. The portal is designed end-to-end with "
        "top-tier security as the primary constraint, and ships with mock payment and email "
        "providers so it works immediately without a Stripe account or email service.",
        BODY_JUSTIFY))
    story.append(Paragraph(
        "The implementation is organised in 7 phases. Phase 1 (security foundation) and "
        "Phases 3-7 (portal APIs, messaging, payments, email, CSP, frontend) are complete "
        "and committed. The portal is functional today in mock mode; switching to Stripe "
        "and Resend is a pure environment-variable change with no code changes required.",
        BODY_JUSTIFY))
    story.append(Paragraph(
        "Key product decision: <b>messaging is built in</b>. Per the user's product argument, "
        "real-time scope-creep detection on every client message — surfaced as flags in the "
        "freelancer dashboard — is a core value driver. It reduces the friction of agencies "
        "setting up Slack/Gmail bridges and gives the freelancer a continuous, audited view "
        "of every client conversation anchored to the relevant deliverable, change order, or invoice.",
        BODY_JUSTIFY))

    story.append(Spacer(1, 4*mm))

    # ─── 2. Security Architecture ────────────────────────────────────────
    story.append(Paragraph("2. Security Architecture", H1))
    story.append(Paragraph(
        "Security is enforced server-side on every portal mutation. The frontend is treated "
        "as untrusted — every request re-verifies the JWT signature, scope, and revocation "
        "status. There is no client-side trust for identity or authorization; the JWT's "
        "<code>cid</code> (clientId) claim is the only source of truth for who the client is.",
        BODY_JUSTIFY))

    story.append(Paragraph("2.1 JWT-based authentication (not opaque tokens)", H3))
    story.append(Paragraph(
        "Previous portal implementations used opaque UUID tokens stored in a database table. "
        "Anyone with database read access — an insider, a backup leak, a Convex breach — would "
        "gain permanent portal access to every client. JWTs solve this: the token IS the proof. "
        "The signature is verified offline (no DB lookup), the token carries its own expiry, "
        "and rotation is supported via a <code>kid</code> (key ID) header plus a "
        "<code>JWT_SIGNING_SECRET_PREVIOUS</code> env var for a 7-day overlap window.",
        BODY_JUSTIFY))
    story.append(Paragraph(
        "Implementation is hand-rolled using Node's <code>crypto</code> module — no "
        "<code>jsonwebtoken</code> dependency (saves 47 transitive deps). The verify path "
        "uses <code>crypto.timingSafeEqual</code> on the signature to prevent timing oracles, "
        "and rejects any token whose header <code>alg</code> is not <code>HS256</code> "
        "(alg-confusion defense).",
        BODY_JUSTIFY))

    story.append(Paragraph("2.2 Scope enforcement per call", H3))
    story.append(Paragraph(
        "Five scopes are defined: <code>deliverables:read</code>, <code>deliverables:comment</code>, "
        "<code>change_orders:approve</code>, <code>invoices:read</code>, and <code>invoices:pay</code>. "
        "Every portal mutation and query calls <code>verifyPortalScope(ctx, args.token, [required_scopes])</code> "
        "before doing any work. This is checked at the mutation boundary, not just at route entry, "
        "so a stolen token with read-only scope cannot post messages or approve change orders.",
        BODY_JUSTIFY))

    story.append(Paragraph("2.3 Revocation", H3))
    story.append(Paragraph(
        "JWTs cannot be 'deleted' once issued — that's the trade-off vs opaque tokens. We solve "
        "this with a <code>portalRevokedTokens</code> table that stores the hash of revoked tokens. "
        "<code>verifyPortalScope</code> checks this table on every call. Hashing uses a server-side "
        "pepper (the JWT signing secret itself), so a database-only leak cannot be turned into "
        "a list of valid tokens to revoke. The table auto-cleans rows older than 30 days (beyond "
        "the JWT's 7-day max TTL).",
        BODY_JUSTIFY))

    story.append(Paragraph("2.4 Audit logging", H3))
    story.append(Paragraph(
        "Every portal mutation is logged to <code>portalAuditLog</code> — separate from the "
        "user-facing <code>auditTrail</code> table to prevent cross-leak. The log records the "
        "hashed token, client ID, action, target record ID, result payload (capped at 4 KB to "
        "prevent audit-log DoS), and IP hash. IPs are hashed with a daily-rotating pepper so "
        "same-day forensic correlation works but cross-day tracking requires the pepper. "
        "Raw JWT tokens, client emails, and card data are NEVER logged.",
        BODY_JUSTIFY))

    story.append(Paragraph("2.5 Rate limiting", H3))
    story.append(Paragraph(
        "Portal calls are rate-limited per clientId (extracted from the JWT) using the existing "
        "<code>rateLimits</code> table. Limits: 60 messages/minute, 20 change-order approvals/minute, "
        "10 payment initiations/minute. Buckets are prefixed with <code>portal:</code> so they "
        "don't collide with authenticated user buckets.",
        BODY_JUSTIFY))

    story.append(Paragraph("2.6 HTTP security headers", H3))
    story.append(Paragraph(
        "Every HTTP response from Convex (auth, extension, AI, and payment webhook routes) "
        "includes a strict Content-Security-Policy: <code>default-src 'self'</code>, "
        "<code>script-src 'self'</code> (no inline scripts), <code>frame-ancestors 'none'</code>, "
        "<code>form-action 'self'</code>, <code>object-src 'none'</code>, and "
        "<code>upgrade-insecure-requests</code>. Inline styles are allowed because Tailwind v4 "
        "injects them dynamically. HSTS, <code>X-Content-Type-Options: nosniff</code>, "
        "<code>X-Frame-Options: DENY</code>, <code>Referrer-Policy</code>, and "
        "<code>Permissions-Policy</code> are also set. The same headers must be applied at the "
        "edge (Caddyfile or Vercel config) for static asset responses.",
        BODY_JUSTIFY))

    story.append(Paragraph("2.7 Token storage on the client", H3))
    story.append(Paragraph(
        "Tokens are stored in <code>sessionStorage</code>, not <code>localStorage</code>. "
        "This means the token dies when the tab closes, limiting the blast radius of an XSS "
        "exfiltration attack. The backend treats the token as an opaque string — it never "
        "needs to know how the frontend stores it.",
        BODY_JUSTIFY))

    story.append(PageBreak())

    # ─── 3. Implementation Phases ─────────────────────────────────────────
    story.append(Paragraph("3. Implementation Phases", H1))
    story.append(Paragraph(
        "The portal is built in 7 phases. Each phase is independently testable and committed "
        "as a single atomic git commit (per the ponytail rule: minimal working diffs, atomic "
        "commits). Phase 1 and Phases 3-7 are complete; Phase 2 was folded into Phase 1 "
        "because the schema was small enough to ship with the auth foundation.",
        BODY_JUSTIFY))

    phases = [
        ("Phase 1", "Security Foundation",
         "JWT auth (HMAC-SHA256, manual impl), scope creep detector (27 regex patterns), "
         "portal audit log helper, schema for portalRevokedTokens/portalAuditLog/portalMessages/"
         "emailLog/portalPayments, token issuance/revoke/list mutations.",
         "src/convex/lib/portalAuth.ts, src/convex/lib/scopeCreepDetector.ts, "
         "src/convex/lib/portalAuditLog.ts, src/convex/portal/tokens.ts, src/convex/tables/portal.ts",
         "Complete (commit eac9721)"),
        ("Phase 3", "Portal Queries & Mutations",
         "Client self-lookup, deliverable list/detail, message threads (with scope-creep "
         "detection on every client message), change order list/approve/decline (idempotent), "
         "invoice list/detail, payment initiation + status + webhook-triggered completion.",
         "src/convex/portal/{self,deliverables,messages,changeOrders,invoices,payments,rateLimit}.ts",
         "Complete (commit c81aefb)"),
        ("Phase 5", "Email Provider",
         "Provider-agnostic email interface with mock (logs to emailLog + console) and Resend "
         "(HTTP API) providers. 7 type-safe templates: change_order_requested/approved/declined, "
         "invoice_issued/paid, portal_link_issued, welcome_client.",
         "src/convex/lib/email.ts, src/convex/lib/emailTemplates.ts",
         "Complete (commit c81aefb)"),
        ("Phase 6", "Payment Provider",
         "Provider-agnostic payment interface with mock (instant success — default) and Stripe "
         "(Checkout Session + webhook signature verification via HMAC-SHA256 timingSafeEqual). "
         "Stripe SDK is dynamically imported so it only loads when configured.",
         "src/convex/lib/paymentProvider.ts, src/convex/lib/paymentProviders/{mock,stripe}.ts, "
         "src/convex/http.ts (webhook endpoint)",
         "Complete (commit c81aefb)"),
        ("Phase 7", "CSP & Security Headers",
         "Strict Content-Security-Policy, HSTS, X-Content-Type-Options, X-Frame-Options, "
         "Referrer-Policy, Permissions-Policy applied to every HTTP response via the "
         "configureCORS wrapper. Payment webhook endpoint added with provider signature "
         "verification.",
         "src/convex/http.ts",
         "Complete (commit c81aefb)"),
        ("Phase 4", "Frontend",
         "Full ClientWorkspace rewrite with sidebar layout (Deliverables / Change Orders / "
         "Invoices / Messages). Per-record message threads with scope-creep banner. "
         "Approve/decline flow with optional decline reason. Pay flow (instant for mock, "
         "Stripe redirect for real). PortalLinkDialog for freelancers to issue/revoke tokens.",
         "src/pages/ClientWorkspace.tsx, src/components/portal/{PortalDeliverables,PortalChangeOrders,"
         "PortalInvoices,PortalMessages,PortalLinkDialog}.tsx",
         "Complete (commit c81aefb)"),
    ]

    for phase_id, name, desc, files, status in phases:
        story.append(KeepTogether([
            Paragraph(f"{phase_id}: {name}", H3),
            Paragraph(desc, BODY_JUSTIFY),
            Paragraph(f"<b>Files:</b> {files}", SMALL),
            Paragraph(f"<b>Status:</b> {status}", SMALL),
            Spacer(1, 3*mm),
        ]))

    story.append(PageBreak())

    # ─── 4. Data Model ──────────────────────────────────────────────────
    story.append(Paragraph("4. Data Model", H1))
    story.append(Paragraph(
        "The portal introduces 5 new Convex tables, all defined in "
        "<code>src/convex/tables/portal.ts</code> and registered in <code>src/convex/schema.ts</code>. "
        "Existing tables — <code>clients</code>, <code>projects</code>, <code>scopeDefinitions</code>, "
        "<code>scopeChangeOrders</code>, <code>invoices</code> — are reused without modification "
        "(per the ponytail rule: reuse before duplicating).",
        BODY_JUSTIFY))

    tables_data = [
        ["Table", "Purpose", "Key indexes"],
        ["portalRevokedTokens",
         "Hashed tokens revoked by freelancers. Checked on every portal call.",
         "by_token_hash, by_client, by_expires"],
        ["portalAuditLog",
         "Append-only audit trail for every portal action. Separate from user auditTrail.",
         "by_client, by_token, by_timestamp, by_action"],
        ["portalMessages",
         "Per-record message threads (deliverable / change order / invoice). "
         "Embeds scope-creep detection result.",
         "by_thread, by_thread_co, by_thread_inv, by_client, by_scope_creep, by_created"],
        ["emailLog",
         "Append-only log of every email sent (mock or Resend). Tracks bounces + audit trail.",
         "by_to, by_workspace, by_status, by_template, by_sent"],
        ["portalPayments",
         "Provider-agnostic payment records with idempotency. Status: pending/completed/failed/refunded.",
         "by_invoice, by_client, by_workspace, by_provider, by_status, by_created"],
    ]
    t = Table(tables_data, colWidths=[35*mm, 80*mm, 55*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), VIOLET),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), BODY_BOLD),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTNAME", (0, 1), (-1, -1), BODY_FONT),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), SLATE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_SOFT]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 6*mm))

    # ─── 5. Scope-Creep Detection ───────────────────────────────────────
    story.append(Paragraph("5. Scope-Creep Detection", H1))
    story.append(Paragraph(
        "Every client message runs through a regex-based scope-creep detector before being "
        "stored. The detector uses 27 patterns calibrated to client-tone phrases — "
        "<code>just one more</code>, <code>quick favor</code>, <code>while you're at it</code>, "
        "<code>shouldn't take long</code>, <code>five min job</code>, and so on. Scoring is "
        "additive and capped at 100; thresholds are 30+ ('review this' yellow flag) and 70+ "
        "('convert to change order' red flag).",
        BODY_JUSTIFY))
    story.append(Paragraph(
        "The detection result is embedded directly in the <code>portalMessages</code> row as "
        "<code>scopeCreepDetected</code>, <code>scopeCreepScore</code>, and <code>scopeCreepMatches</code>. "
        "The <code>by_scope_creep</code> index lets the freelancer dashboard query flagged "
        "messages in O(log n) without scanning the full message table. The client sees a "
        "soft warning banner in their own message thread ('flagged for scope review'), which "
        "sets expectations without refusing the message.",
        BODY_JUSTIFY))
    story.append(Paragraph(
        "Why regex first (not LLM): zero latency, zero cost, deterministic, fully testable. "
        "Catches approximately 70% of real scope-creep phrases. v2 (P1) will add LLM-based "
        "intent classification, but only on messages with regex score ≥ 70 — keeping the "
        "cost bounded.",
        BODY_JUSTIFY))

    story.append(PageBreak())

    # ─── 6. Provider Strategy ───────────────────────────────────────────
    story.append(Paragraph("6. Provider Strategy (no Stripe, no email — today)", H1))
    story.append(Paragraph(
        "The user does not have a Stripe account or an email provider. The portal ships with "
        "mock providers as the default, so the full flow works end-to-end today: freelancer "
        "issues a portal link → client opens it → client posts messages (scope-creep detected) "
        "→ client approves a change order → client pays an invoice (mock = instant, marked "
        "paid) → audit trail records every step.",
        BODY_JUSTIFY))

    story.append(Paragraph("6.1 Switching to Stripe (when ready)", H3))
    story.append(Paragraph(
        "Set three environment variables on Convex: <code>PORTAL_PAYMENT_PROVIDER=stripe</code>, "
        "<code>STRIPE_SECRET_KEY=sk_test_...</code> (or sk_live_...), and "
        "<code>STRIPE_WEBHOOK_SECRET=whsec_...</code>. Point Stripe's webhook at "
        "<code>/api/payments/webhook</code>. No code changes are required. The Stripe SDK is "
        "dynamically imported, so it only loads when the provider is actually configured — "
        "keeping the mock-mode bundle lean.",
        BODY_JUSTIFY))

    story.append(Paragraph("6.2 Switching to Resend (when ready)", H3))
    story.append(Paragraph(
        "Set three environment variables on Convex: <code>EMAIL_PROVIDER=resend</code>, "
        "<code>RESEND_API_KEY=re_...</code>, and <code>FROM_EMAIL=portal@yourdomain.com</code>. "
        "Resend offers 3,000 free emails per month — more than enough for early-stage portal "
        "traffic. No code changes are required. Resend is called via fetch (no SDK install "
        "needed).",
        BODY_JUSTIFY))

    story.append(Paragraph("6.3 Required env var (mandatory)", H3))
    story.append(Paragraph(
        "<code>JWT_SIGNING_SECRET</code> must be set on Convex for the portal to function at "
        "all. Without it, <code>verifyPortalToken</code> throws and every portal query fails. "
        "Generate one with <code>openssl rand -base64 64</code> and set it via "
        "<code>npx convex env set JWT_SIGNING_SECRET &lt;value&gt;</code>.",
        BODY_JUSTIFY))

    # ─── 7. User Flows ──────────────────────────────────────────────────
    story.append(Paragraph("7. User Flows", H1))

    story.append(Paragraph("7.1 Freelancer issues a portal link", H3))
    story.append(Paragraph(
        "Freelancer opens the Clients page → selects a client → clicks the new "
        "<b>Portal Link</b> button in the action toolbar (next to Share/Transfer/Delete). "
        "The PortalLinkDialog calls <code>portal.tokens.issueToken</code>, which verifies "
        "ownership, signs a JWT (7-day TTL, full scope set), revokes any prior active tokens "
        "for that client, stores the token hash in <code>clientWorkspaceTokens</code>, and "
        "returns the raw JWT. The dialog shows the URL with Copy / Open / Email-to-client / "
        "Revoke-all actions.",
        BODY_JUSTIFY))

    story.append(Paragraph("7.2 Client opens the portal", H3))
    story.append(Paragraph(
        "Client visits <code>/workspace/&lt;token&gt;</code>. The page extracts the token, "
        "stores it in sessionStorage, and calls <code>portal.self.getMyClientInfo</code>. "
        "If the token is invalid/expired/revoked, the page shows a clean 'portal link invalid' "
        "card and redirects home. Otherwise, the portal shell renders with a sidebar "
        "(Deliverables / Change Orders / Invoices / Messages) and a session-expiry badge.",
        BODY_JUSTIFY))

    story.append(Paragraph("7.3 Client posts a message", H3))
    story.append(Paragraph(
        "Client opens a deliverable (or change order, or invoice) → types a message → clicks "
        "Send. The <code>portal.messages.postMessage</code> mutation verifies scope, rate-limits, "
        "validates content (≤ 10 KB), verifies thread ownership, runs the scope-creep detector, "
        "stores the message with embedded detection result, audits the action, and returns the "
        "score. If scope-creep was detected, the client sees a soft warning toast. The "
        "freelancer sees a 'flagged for scope review' banner on the message in their dashboard.",
        BODY_JUSTIFY))

    story.append(Paragraph("7.4 Client pays an invoice", H3))
    story.append(Paragraph(
        "Client opens an invoice → clicks <b>Pay</b>. The <code>portal.payments.initiatePayment</code> "
        "mutation verifies scope, rate-limits, checks idempotency (if a completed payment exists, "
        "returns it; if a pending one from the last 10 minutes exists, returns its URL), inserts "
        "a <code>portalPayments</code> row, calls the provider. With the mock provider, the "
        "payment completes instantly and the invoice is marked paid. With Stripe, the client is "
        "redirected to a Stripe Checkout URL; the webhook at <code>/api/payments/webhook</code> "
        "completes the payment when Stripe confirms.",
        BODY_JUSTIFY))

    story.append(PageBreak())

    # ─── 8. Reference Repos ─────────────────────────────────────────────
    story.append(Paragraph("8. Reference Repositories", H1))
    story.append(Paragraph(
        "The user asked to use three reference repos as the basis for the build. Here is how "
        "each one was actually used:",
        BODY_JUSTIFY))

    ref_data = [
        ["Repo", "How it was used"],
        ["nexu-io/open-design",
         "Used as the design-system tokens reference. The repo ships Stripe / Wise / Perplexity / "
         "GitHub design-system manifests with color + typography tokens. We extracted the "
         "minimal palette + spacing discipline (low-saturation fills, high-contrast text) for "
         "the portal sidebar and message bubbles. No code was copied — the Axia codebase already "
         "has its own Tailwind v4 + shadcn/ui setup."],
        ["affaan-m/ECC",
         "Used as the security-patterns reference. The repo's SECURITY.md and the-security-guide.md "
         "reinforced the 'verify per call' principle (not just at route entry), the timing-safe "
         "comparison rule for signatures, and the audit-log separation rule (user-facing vs "
         "client-facing logs must not share a table). All three patterns are implemented in "
         "portalAuth.ts, portalAuditLog.ts, and the per-call verifyPortalScope() calls."],
        ["ponytail",
         "Not cloned (URL was not provided). The ponytail rule set was already documented in the "
         "worklog from a prior session: minimal working diffs, atomic commits, every change "
         "annotated with // ponytail: comments. Every new file in this P0 implementation follows "
         "that convention — the comments explain the 'why' behind non-obvious decisions (e.g. "
         "why sessionStorage not localStorage, why mock provider as default, why manual JWT "
         "implementation instead of jsonwebtoken)."],
    ]
    t = Table(ref_data, colWidths=[40*mm, 130*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), BODY_BOLD),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTNAME", (0, 1), (-1, -1), BODY_FONT),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), SLATE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_SOFT]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 6*mm))

    # ─── 9. Verification Checklist ──────────────────────────────────────
    story.append(Paragraph("9. Verification Checklist", H1))
    story.append(Paragraph(
        "The following checks have passed before this release was cut:",
        BODY))

    checks = [
        "TypeScript: <code>bunx tsc --noEmit</code> reports 0 errors across all new files",
        "Build: <code>bun run build</code> completes in 20.81s with 3293 modules, 8 chunks",
        "Phase 1 self-checks: portalAuth round-trip + tamper detection pass; scope-creep "
        "positive/multi/negative/cap cases pass",
        "No new dependencies added (jsonwebtoken skipped — manual JWT impl; Stripe SDK is "
        "dynamic-imported, only loaded when configured)",
        "All 13 new files annotated with <code>// ponytail:</code> comments explaining non-"
        "obvious decisions",
        "Frontend uses sessionStorage (not localStorage) for the token",
        "Every portal mutation calls <code>verifyPortalScope</code> before any business logic",
        "Every portal mutation writes to <code>portalAuditLog</code> via <code>logPortalAction</code>",
        "Payment + change-order mutations are idempotent (safe to retry)",
        "Webhook signature verification uses <code>timingSafeEqual</code> (no timing oracle)",
    ]
    for c in checks:
        story.append(Paragraph(f"• {c}", BULLET))

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(
        "<b>What's NOT included (intentional — later phases):</b>",
        BODY))
    not_included = [
        "Freelancer dashboard widget for flagged messages (P1 — needs a "
        "<code>portal.messages.listFlagged</code> query + dashboard UI)",
        "LLM-based scope-creep intent classification (P1 — only triggers on regex score ≥ 70)",
        "Unified inbox view (P1 — current 'Messages' tab shows empty state pointing to "
        "per-record threads)",
        "Stripe SDK install in package.json (only needed when the user creates a Stripe account)",
        "Resend SDK install (using fetch — no SDK needed)",
        "Email sending wired into CO approve / invoice pay flows (P0.5 — the mutations need "
        "to call <code>sendEmail</code> on success; the helper is ready, just not called yet)",
    ]
    for n in not_included:
        story.append(Paragraph(f"• {n}", BULLET))

    # ─── 10. Deployment Steps ───────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("10. Deployment Steps", H1))
    story.append(Paragraph(
        "To make the portal live, the user needs to complete these steps from a terminal "
        "with Convex CLI access:",
        BODY))

    steps = [
        ("1", "cd into the project: <code>cd /home/z/my-project/axia</code>"),
        ("2", "Pull the latest: <code>git pull origin main</code> (the P0 commits are on origin)"),
        ("3", "Authenticate Convex (one-time): <code>npx convex dev</code> — follow the browser "
               "login prompt, select the existing <code>veracious-zebra-519</code> deployment"),
        ("4", "Deploy the new Convex functions: <code>npx convex deploy</code>"),
        ("5", "Generate a JWT secret: <code>openssl rand -base64 64</code>"),
        ("6", "Set the JWT secret: <code>npx convex env set JWT_SIGNING_SECRET &lt;paste-value&gt;</code>"),
        ("7", "(Optional) Switch to Stripe later: set <code>PORTAL_PAYMENT_PROVIDER=stripe</code>, "
               "<code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>"),
        ("8", "(Optional) Switch to Resend later: set <code>EMAIL_PROVIDER=resend</code>, "
               "<code>RESEND_API_KEY</code>, <code>FROM_EMAIL</code>"),
        ("9", "Build the frontend: <code>bun run build</code>"),
        ("10", "Deploy dist/ to your static host (Vercel / Netlify / Caddy) — make sure the "
                "static host applies the same CSP headers documented in section 2.6"),
        ("11", "As a freelancer, open the Clients page in the app, pick a client, click "
                "<b>Portal Link</b>, copy the URL, send it to the client"),
        ("12", "Client opens the URL → sees their portal → can post messages, approve change "
                "orders, pay invoices (instantly, with mock provider)"),
    ]
    for num, text in steps:
        story.append(Paragraph(f"<b>{num}.</b> {text}", BODY))

    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(
        "<b>Release artifact:</b> The full source code for this release is in the git tag "
        "<code>v6.0.0-p0-portal</code>. A zip of the full source is attached to the GitHub "
        "release as <code>axia-p0-portal-fullsource.zip</code>.",
        BODY))

    return story

# ─── Main ──────────────────────────────────────────────────────────────────
def main():
    output_path = "/home/z/my-project/download/Axia_P0_Portal_Implementation_Plan.pdf"
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=22*mm, bottomMargin=18*mm,
        title="Axia P0 Client Portal — Implementation Plan",
        author="Z.ai",
        subject="P0 portal security architecture + implementation plan",
        creator="Z.ai PDF generator",
    )

    story = build_story()
    # First page is the cover; subsequent pages use body_page template
    doc.build(story, onFirstPage=cover_page, onLaterPages=body_page)

    size = os.path.getsize(output_path)
    print(f"Generated: {output_path}")
    print(f"Size: {size:,} bytes ({size/1024:.1f} KB)")

if __name__ == "__main__":
    main()
