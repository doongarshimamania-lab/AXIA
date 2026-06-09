#!/usr/bin/env python3
"""
Axia Feature Implementation Master Plan — PDF Generator
Uses ReportLab with TocDocTemplate + multiBuild for auto-generated TOC.
All table cells use Paragraph() objects. All tables hAlign='CENTER'.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, Flowable, HRFlowable
)
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.platypus.frames import Frame
from reportlab.platypus.tableofcontents import TableOfContents

# ─── PATHS ───────────────────────────────────────────────────────────────────
OUTPUT = "/home/z/my-project/download/Axia_Feature_Implementation_Master_Plan.pdf"

# ─── FONTS ───────────────────────────────────────────────────────────────────
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont("LibSerif",      "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"))
pdfmetrics.registerFont(TTFont("LibSerif-Bold",  "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"))
pdfmetrics.registerFont(TTFont("LibSans",        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("LibSans-Bold",   "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"))

# ─── PALETTE ─────────────────────────────────────────────────────────────────
ACCENT       = HexColor("#6441cb")
HEADER_FILL  = HexColor("#766b49")
TEXT_PRIMARY  = HexColor("#1a1917")
TEXT_MUTED    = HexColor("#838179")
BG_SURFACE   = HexColor("#ebeae9")
TABLE_STRIPE = HexColor("#f3f3f2")
BORDER_COLOR = HexColor("#d1cab7")
ICON_COLOR   = HexColor("#827039")

# ─── PAGE SETUP ──────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN_L = 0.9 * inch
MARGIN_R = 0.9 * inch
MARGIN_T = 0.8 * inch
MARGIN_B = 0.8 * inch
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R
PAGE_H_USABLE = PAGE_H - MARGIN_T - MARGIN_B
SAFE_KEEP = PAGE_H_USABLE * 0.40  # 40% page height

# ─── STYLES ──────────────────────────────────────────────────────────────────
def make_styles():
    s = {}

    # Cover styles
    s["cover_title"] = ParagraphStyle(
        "cover_title", fontName="LibSerif-Bold", fontSize=42,
        leading=48, alignment=TA_CENTER, textColor=ACCENT, spaceAfter=8
    )
    s["cover_subtitle"] = ParagraphStyle(
        "cover_subtitle", fontName="LibSerif-Bold", fontSize=24,
        leading=30, alignment=TA_CENTER, textColor=TEXT_PRIMARY, spaceAfter=16
    )
    s["cover_tagline"] = ParagraphStyle(
        "cover_tagline", fontName="LibSans", fontSize=14,
        leading=20, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=12
    )
    s["cover_features"] = ParagraphStyle(
        "cover_features", fontName="LibSans", fontSize=11,
        leading=16, alignment=TA_CENTER, textColor=TEXT_PRIMARY, spaceAfter=6
    )
    s["cover_meta"] = ParagraphStyle(
        "cover_meta", fontName="LibSans", fontSize=10,
        leading=14, alignment=TA_CENTER, textColor=TEXT_MUTED
    )

    # TOC heading
    s["toc_heading"] = ParagraphStyle(
        "toc_heading", fontName="LibSerif-Bold", fontSize=22,
        leading=28, alignment=TA_LEFT, textColor=ACCENT, spaceBefore=0, spaceAfter=18
    )

    # Section headings (H1)
    s["h1"] = ParagraphStyle(
        "h1", fontName="LibSerif-Bold", fontSize=20,
        leading=26, alignment=TA_LEFT, textColor=ACCENT,
        spaceBefore=20, spaceAfter=10
    )

    # Sub-section headings (H2)
    s["h2"] = ParagraphStyle(
        "h2", fontName="LibSans-Bold", fontSize=14,
        leading=19, alignment=TA_LEFT, textColor=HEADER_FILL,
        spaceBefore=14, spaceAfter=8
    )

    # Sub-sub headings (H3)
    s["h3"] = ParagraphStyle(
        "h3", fontName="LibSans-Bold", fontSize=12,
        leading=16, alignment=TA_LEFT, textColor=ICON_COLOR,
        spaceBefore=10, spaceAfter=6
    )

    # Body text
    s["body"] = ParagraphStyle(
        "body", fontName="LibSans", fontSize=10.5,
        leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
        spaceBefore=3, spaceAfter=6
    )

    # Bullet
    s["bullet"] = ParagraphStyle(
        "bullet", fontName="LibSans", fontSize=10.5,
        leading=17, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
        leftIndent=18, bulletIndent=6, spaceBefore=2, spaceAfter=4,
        bulletFontName="LibSans", bulletFontSize=10.5
    )

    # Table header cell
    s["th"] = ParagraphStyle(
        "th", fontName="LibSans-Bold", fontSize=9.5,
        leading=13, alignment=TA_CENTER, textColor=white
    )

    # Table body cell
    s["td"] = ParagraphStyle(
        "td", fontName="LibSans", fontSize=9,
        leading=13, alignment=TA_LEFT, textColor=TEXT_PRIMARY
    )

    # Table body cell center
    s["td_center"] = ParagraphStyle(
        "td_center", fontName="LibSans", fontSize=9,
        leading=13, alignment=TA_CENTER, textColor=TEXT_PRIMARY
    )

    # Small/muted text
    s["small"] = ParagraphStyle(
        "small", fontName="LibSans", fontSize=9,
        leading=13, alignment=TA_LEFT, textColor=TEXT_MUTED
    )

    # Caption / label
    s["caption"] = ParagraphStyle(
        "caption", fontName="LibSans-Oblique", fontSize=9,
        leading=12, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceBefore=4, spaceAfter=10
    )
    # We don't have italic, fall back to regular
    s["caption"] = ParagraphStyle(
        "caption", fontName="LibSans", fontSize=9,
        leading=12, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceBefore=4, spaceAfter=10
    )

    return s


STY = make_styles()

# ─── TOC DOCUMENT TEMPLATE ──────────────────────────────────────────────────
class TocDocTemplate(BaseDocTemplate):
    """DocTemplate that fills in the TOC page count on the second pass."""

    def __init__(self, filename, **kwargs):
        BaseDocTemplate.__init__(self, filename, **kwargs)
        self.page_count_offset = 0  # pages before main content

    def afterFlowable(self, flowable):
        """Register TOC entries when headings are encountered."""
        if isinstance(flowable, Paragraph):
            style = flowable.style.name
            text = flowable.getPlainText()
            if style == "h1":
                self.notify("TOCEntry", (0, text, self.page))
            elif style == "h2":
                self.notify("TOCEntry", (1, text, self.page))


def build_pdf():
    """Build the complete PDF document."""

    # ── Create document ──
    doc = TocDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T,
        bottomMargin=MARGIN_B,
        title="Axia Feature Implementation Master Plan",
        author="Axia Team",
    )

    # Frames and page templates
    frame_main = Frame(MARGIN_L, MARGIN_B, CONTENT_W, PAGE_H_USABLE, id="main")

    def footer_callback(canvas, doc):
        """Draw page number footer (skip cover page)."""
        page_num = canvas.getPageNumber()
        if page_num <= 1:
            return  # no footer on cover
        canvas.saveState()
        canvas.setFont("LibSans", 8)
        canvas.setFillColor(TEXT_MUTED)
        canvas.drawCentredString(PAGE_W / 2, 0.45 * inch, f"— {page_num} —")
        canvas.restoreState()

    pt_main = PageTemplate(id="main", frames=[frame_main], onPage=footer_callback)
    doc.addPageTemplates([pt_main])

    # ── Helper functions ──
    def h1(text):
        return Paragraph(text, STY["h1"])

    def h2(text):
        return Paragraph(text, STY["h2"])

    def h3(text):
        return Paragraph(text, STY["h3"])

    def body(text):
        return Paragraph(text, STY["body"])

    def bullet(text):
        return Paragraph(text, STY["bullet"], bulletText="•")

    def sp(h=6):
        return Spacer(1, h)

    def safe_keep(elements):
        """Wrap elements in KeepTogether only if short enough."""
        from reportlab.platypus import KeepTogether as KT
        flow = []
        for e in elements:
            flow.append(e)
        return KT(flow, maxHeight=SAFE_KEEP)

    def make_table(data, col_widths=None, has_header=True):
        """Create a styled table with Paragraph cells, centered."""
        t = Table(data, colWidths=col_widths, hAlign="CENTER", repeatRows=1 if has_header else 0)
        style_cmds = [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ]
        if has_header:
            style_cmds += [
                ("BACKGROUND", (0, 0), (-1, 0), HEADER_FILL),
                ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ]
        # Stripe rows
        for i in range(1, len(data)):
            if i % 2 == 0:
                style_cmds.append(("BACKGROUND", (0, i), (-1, i), TABLE_STRIPE))
        t.setStyle(TableStyle(style_cmds))
        return t

    # ═══════════════════════════════════════════════════════════════════════════
    # BUILD STORY
    # ═══════════════════════════════════════════════════════════════════════════
    story = []

    # ── COVER PAGE ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 1.8 * inch))
    story.append(Paragraph("Axia", STY["cover_title"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Feature Implementation Master Plan", STY["cover_subtitle"]))
    story.append(Spacer(1, 16))
    # Accent line
    story.append(HRFlowable(width="60%", thickness=2, color=ACCENT, spaceBefore=4, spaceAfter=16, hAlign="CENTER"))
    story.append(Paragraph(
        "Building 7 Industry-Leading Features — Better Than Every Niche Tool That Solves Just One",
        STY["cover_tagline"]
    ))
    story.append(Spacer(1, 18))
    story.append(Paragraph(
        "Smart Proposals&nbsp;&nbsp;|&nbsp;&nbsp;CRM &amp; Pipeline&nbsp;&nbsp;|&nbsp;&nbsp;Validated Billing&nbsp;&nbsp;|&nbsp;&nbsp;"
        "Automated Payment Reminders&nbsp;&nbsp;|&nbsp;&nbsp;Scope Creep Protection&nbsp;&nbsp;|&nbsp;&nbsp;"
        "Context Management&nbsp;&nbsp;|&nbsp;&nbsp;Instant Setup",
        STY["cover_features"]
    ))
    story.append(Spacer(1, 36))
    story.append(Paragraph("Version 2.0&nbsp;&nbsp;|&nbsp;&nbsp;May 2026&nbsp;&nbsp;|&nbsp;&nbsp;Confidential", STY["cover_meta"]))
    story.append(PageBreak())

    # ── TABLE OF CONTENTS ─────────────────────────────────────────────────────
    story.append(Paragraph("Table of Contents", STY["toc_heading"]))
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle("TOC1", fontName="LibSans-Bold", fontSize=12, leading=20, leftIndent=0, textColor=TEXT_PRIMARY, spaceBefore=6),
        ParagraphStyle("TOC2", fontName="LibSans", fontSize=10.5, leading=17, leftIndent=24, textColor=TEXT_MUTED, spaceBefore=2),
    ]
    story.append(toc)
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 1: EXECUTIVE SUMMARY
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("1. Executive Summary"))
    story.append(body(
        "Axia's real competitors are not the large platforms like HoneyBook or Bonsai. "
        "The true competitive threat comes from a growing ecosystem of niche, single-purpose indie tools — "
        "built by freelancers on X, Reddit, Instagram, and LinkedIn who each solved ONE problem beautifully. "
        "These tools are lean, focused, and priced to convert. A freelancer who discovers StopScopeCreep.com "
        "at $14.99/month for scope creep protection, or Paidly for automated payment reminders, or Harlow "
        "at $19/month for proposals, will adopt that single tool and never look for an integrated alternative. "
        "Each of these niche players captures a slice of what Axia must own in its entirety."
    ))
    story.append(body(
        "The competitive reality is stark: tools like ScopePilot, ScopeStamp, ClearTimeline, and ScopeGuard "
        "each address scope creep from a different angle, and each has a devoted user base. Paidly claims it "
        "gets freelancers paid 47% faster. Memtime and ManicTime invisibly capture proof-of-work data for "
        "validated billing. Breakcold offers CRM with social selling that freelancers love. AI Context Flow "
        "provides cross-platform AI memory. None of these tools is trying to be a full platform — and that "
        "is precisely why they are dangerous. They do one thing exceptionally well, with no bloat, no learning "
        "curve, and a price tag that feels like a no-brainer."
    ))
    story.append(body(
        "Axia's strategy is to beat each of these single-purpose tools at their own game while offering the "
        "unique advantage of being unified. No freelancer should need to pay for seven separate subscriptions, "
        "manage seven different logins, and manually shuttle data between tools that were never designed to "
        "talk to each other. Axia collapses the entire niche-tool stack into one product at a fraction of "
        "the combined cost. This plan outlines four phases over sixteen weeks to build seven industry-leading "
        "features — each one better than the niche tool that currently owns that space, and all connected in "
        "ways that no single-purpose tool can ever match."
    ))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 2: THE REAL COMPETITIVE LANDSCAPE
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("2. The Real Competitive Landscape"))
    story.append(body(
        "This section represents the most critical competitive analysis in the entire plan. "
        "Each subsection maps the specific niche competitors Axia must outperform for a given feature area. "
        "These are not hypothetical competitors — they are real products with real users, pricing pages, and "
        "proven value propositions. Understanding each one is essential to designing features that don't just "
        "match the niche standard, but clearly surpass it. The goal is for any freelancer evaluating Axia "
        "against their current niche tool to conclude: 'Axia does everything [Tool X] does, plus six more "
        "things, and they all work together.'"
    ))

    # 2.1 Scope Creep
    story.append(h2("2.1 Scope Creep Niche Competitors"))
    story.append(body(
        "The scope creep niche has attracted more focused indie tools than any other feature area — a clear "
        "signal that this is the single biggest pain point for freelancers. Each competitor approaches the "
        "problem differently, and Axia must synthesize the best ideas from all of them while adding capabilities "
        "that none can match due to their single-purpose nature."
    ))
    story.append(bullet(
        "<b>StopScopeCreep.com</b> — Tracks revision counts, sends change requests that clients can approve "
        "in 60 seconds, and creates a paper trail for every modification. Built specifically for freelancers "
        "who have lost money to uncontrolled project expansion. Priced at $14.99/month. Claims that 72% of "
        "freelance projects experience scope creep, with an average cost overrun of 27%. This is the most "
        "direct competitor in the scope creep space and sets the benchmark for ease-of-use."
    ))
    story.append(bullet(
        "<b>ScopePilot</b> — A project scoping tool designed to prevent scope creep by defining clear project "
        "boundaries before work begins. Offers a $14.99/month Professional tier, a $29/month mid-tier, and a "
        "$99/month Team plan. Their core claim: 'At $14.99/mo, one prevented scope creep incident covers it.' "
        "This pricing argument is exactly what Axia must counter — Axia at $15/month gives scope creep "
        "protection plus six other features."
    ))
    story.append(bullet(
        "<b>ScopeStamp</b> — 'Turn scope creep into approved change orders.' Creates a free approval page with "
        "scope, price, and timeline impact details. Uses one-time pricing instead of monthly subscriptions. "
        "The key innovation is approval links for clients — a simple, shareable URL that clients click to "
        "formally approve changes. This frictionless approval flow is something Axia must replicate."
    ))
    story.append(bullet(
        "<b>ClearTimeline</b> — A Scope Change Tracker with immutable timestamps, approval requests with view "
        "tracking, and a complete audit trail. Offers a free tier with 3 entries, with paid plans for "
        "unlimited entries, PDF export, and complete view tracking history. The immutable timestamp concept "
        "is powerful for dispute resolution, and the view-tracking feature (knowing when a client has seen "
        "your request) is a trust-builder that Axia should incorporate."
    ))
    story.append(bullet(
        "<b>ScopeGuard</b> (from dev.to) — Generates a shareable scope agreement in 60 seconds. Freelancers "
        "fill in deliverables, price, timeline, and revision count, then share a link with the client. Also "
        "features a contract ambiguity detector that flags vague language. This pre-emptive approach — "
        "preventing scope creep before it starts by tightening the original agreement — is a valuable concept "
        "that Axia's proposal engine should integrate."
    ))
    story.append(bullet(
        "<b>ScopeStack</b> — Targeted at agencies rather than individual freelancers. Claims 90% time savings "
        "on Statements of Work and a 34% higher close rate. Transforms the proposal process by embedding "
        "accurate scoping directly into proposals. This is a higher-end tool, but the concept of linking "
        "scoping accuracy to proposal conversion rates is data that Axia can leverage in its own messaging."
    ))

    # 2.2 Proposals
    story.append(h2("2.2 Proposal Niche Competitors"))
    story.append(body(
        "The proposal niche is crowded with both established freelancer tools and a new wave of AI-powered "
        "generators. The key differentiator in this space is moving from static templates to intelligent, "
        "data-driven proposal creation that actively protects the freelancer — something no current tool does well."
    ))
    story.append(bullet(
        "<b>Harlow</b> — Solo plan at $19/month. Offers proposals and contracts with templates and e-sign "
        "capability. Combines client management and invoicing in one interface. The appeal is simplicity — "
        "freelancers don't need ten features, they need proposals that convert. Harlow's clean UX sets a "
        "bar that Axia must meet or exceed."
    ))
    story.append(bullet(
        "<b>Moxie</b> — An all-in-one platform for freelancers offering proposals, contracts, client management, "
        "invoicing, and time tracking. Marketed as 'by freelancers for freelancers.' Moxie's breadth is "
        "closer to Axia's vision, but its depth in any single area is limited by trying to cover everything. "
        "Axia's advantage is going deeper on each feature while maintaining integration."
    ))
    story.append(bullet(
        "<b>Indy</b> — CRM for freelancers with proposals, contracts, time tracking, invoices, and payments. "
        "Tagline: 'Manage your entire business.' Indy's strength is its CRM-first approach, which means "
        "proposals are contextually aware of client history. This is a feature Axia must replicate with "
        "even richer data."
    ))
    story.append(bullet(
        "<b>ScopeStack</b> — Proposal-to-SOW pipeline with accurate scoping built in. Prevents scope creep "
        "at the proposal stage rather than trying to contain it later. This upstream prevention approach "
        "is something Axia should incorporate: proposals that are scope-creep-resistant by design."
    ))
    story.append(bullet(
        "<b>LegittAI</b> — AI proposal generator that turns ideas into signed contracts. Offers a free AI "
        "generator. Represents the new wave of AI-powered proposal tools that reduce the writing burden "
        "to near zero. Axia must match this AI generation capability while adding protection clauses that "
        "generic AI tools don't think to include."
    ))
    story.append(bullet(
        "<b>Taskade</b> — AI Freelance Proposal Generator. Free to use. Part of a broader productivity "
        "platform, but the free proposal generator is a customer acquisition tool that draws freelancers "
        "in. Various other indie AI proposal generators have launched on Reddit and X as micro-SaaS products, "
        "each competing on simplicity and price (often free)."
    ))

    # 2.3 Payment Reminders
    story.append(h2("2.3 Payment Reminders Niche Competitors"))
    story.append(body(
        "Payment reminder tools exist because freelancers hate chasing money. The psychological burden of "
        "following up on invoices is enormous, and these tools remove that emotional friction. Axia must not "
        "only automate reminders but also bring intelligence to tone, timing, and escalation that no niche "
        "tool can match because they lack client relationship context."
    ))
    story.append(bullet(
        "<b>Paidly</b> — Automates invoice payment reminders with a compelling claim: 'Get paid 47% faster.' "
        "Free to start, specifically built for freelancers and agencies. Paidly's value proposition is "
        "simple and powerful — if you send more reminders, you get paid faster. This is the benchmark "
        "Axia must beat, and the 47% figure is a target to reference in marketing."
    ))
    story.append(bullet(
        "<b>Payntra</b> — AI invoicing and reminder tool built for freelancers who hate cluttered dashboards. "
        "Launched on Facebook groups and gained traction through community-driven marketing. Payntra's AI "
        "approach to reminders — presumably adjusting tone and timing based on context — is the direction "
        "Axia should go, but with far richer data powering the AI decisions."
    ))
    story.append(bullet(
        "<b>Plutio</b> — Offers automated payment reminders at Day 1, Day 7, and Day 14 overdue intervals. "
        "This interval-based approach is standard across most reminder tools. Axia's differentiation must be "
        "moving beyond fixed intervals to smart, context-aware timing that considers the client's payment "
        "history, relationship status, and current project context."
    ))
    story.append(bullet(
        "<b>Invoicera</b> — Features an automated reminder function for payment follow-ups. Part of a broader "
        "invoicing platform. The reminder feature is functional but not differentiated — another example of "
        "a tool that does reminders adequately but without the intelligence that Axia can bring."
    ))
    story.append(bullet(
        "<b>Micro-SaaS tools on Reddit</b> — Various micro-SaaS tools have been launched specifically for "
        "automated invoice chasing, often as weekend projects by freelancers who needed the tool themselves. "
        "These tools are typically free or very cheap, with minimal features but exactly the functionality "
        "their creators needed. They represent the long tail of competition that Axia must be aware of."
    ))

    # 2.4 Validated Billing
    story.append(h2("2.4 Validated Billing / Evidence Niche Competitors"))
    story.append(body(
        "Validated billing is about proving that the hours you billed were actually worked. This is "
        "particularly important for freelancers who bill hourly and face skeptical clients who question "
        "invoice amounts. The niche tools in this space focus on passive, invisible time capture — recording "
        "what happened without requiring the freelancer to manually start and stop timers."
    ))
    story.append(bullet(
        "<b>Memtime</b> — Captures computer activities automatically as proof of hours worked. Solves the "
        "'no way to prove hours' problem that plagues hourly freelancers. Records everything invisibly — "
        "the freelancer doesn't need to remember to start a timer. This passive capture is the gold "
        "standard for evidence-based billing, and Axia must offer equivalent or superior functionality."
    ))
    story.append(bullet(
        "<b>ManicTime</b> — Automatic time tracking for accurate billing. Captures work automatically so "
        "every hour is accounted for and every invoice is accurate. Similar to Memtime in its passive "
        "tracking approach, ManicTime's focus is on billing accuracy rather than client-facing proof. "
        "Axia must combine both: internal accuracy AND external proof that clients can verify."
    ))
    story.append(bullet(
        "<b>Harvest</b> — Combines time tracking with invoicing and includes a scope creep cost calculator. "
        "The Track-to-Invoice flow is seamless and widely used. Harvest's scope creep cost calculator is "
        "a clever feature that quantifies the cost of scope changes — this data-driven approach to "
        "demonstrating the value of scope management is something Axia should incorporate."
    ))
    story.append(bullet(
        "<b>Toggl Track</b> — Time tracking with billing export capabilities. Extremely popular in freelancer "
        "communities for its simplicity and reliability. While Toggl is not niche in the same way as the "
        "other tools listed here, its billing export feature is used by freelancers specifically for "
        "validated invoicing, and it sets the UX standard for frictionless time capture."
    ))
    story.append(bullet(
        "<b>Clientary</b> — Invoicing and time tracking for freelancers. Combines the two workflows into "
        "one interface so that time entries flow directly into invoices. This integration between tracking "
        "and billing is table stakes for Axia — the real differentiator must be the validation layer that "
        "adds proof and confidence to every invoice line item."
    ))

    # 2.5 CRM / Pipeline
    story.append(h2("2.5 CRM / Pipeline Niche Competitors"))
    story.append(body(
        "CRM tools for freelancers have evolved from simple contact managers to lightweight pipeline systems. "
        "The best ones understand that freelancers don't need Salesforce — they need a simple way to track "
        "leads, remember client details, and know what to follow up on. Axia's CRM must match the simplicity "
        "of these tools while adding the unique dimension of protection intelligence that no niche CRM can offer."
    ))
    story.append(bullet(
        "<b>Breakcold</b> — CRM for solopreneurs with social selling capabilities. Combines pipeline management "
        "with LinkedIn integration, allowing freelancers to track social interactions alongside traditional "
        "CRM data. Breakcold's insight is that freelancers sell through relationships, not cold calls — and "
        "social selling is the primary channel. Axia must support this workflow natively."
    ))
    story.append(bullet(
        "<b>folk CRM</b> — Positioned as the top sales tool for solopreneurs. Focuses on simple contact "
        "management and outreach. folk's strength is its minimal learning curve — you can be productive in "
        "minutes. This is the UX standard Axia must meet for CRM onboarding."
    ))
    story.append(bullet(
        "<b>Indy</b> — Rated as the best CRM for freelancers by multiple review sites. Combines proposals, "
        "contracts, and invoices within the CRM context. Indy's advantage is that client history flows "
        "through every interaction — a proposal isn't a standalone document but part of an ongoing client "
        "relationship. Axia must replicate this contextual awareness with even richer data."
    ))
    story.append(bullet(
        "<b>DashCRM</b> — AI-powered sales pipeline for small businesses. Features lead tracking and "
        "automation. The AI component — presumably lead scoring and next-action suggestions — is the "
        "direction Axia should take, but powered by protection data (dispute history, payment patterns, "
        "risk scores) that no niche CRM has access to."
    ))
    story.append(bullet(
        "<b>Taskip</b> — CRM with client portal for agencies and freelancers. The client portal concept "
        "is notable because it gives clients a self-service window into project status, invoices, and "
        "communications. Axia should consider a similar feature as part of its Context Hub."
    ))
    story.append(bullet(
        "<b>Flowlu</b> — CRM combined with project management for solopreneurs. Blends the sales pipeline "
        "with project execution so that winning a deal automatically creates a project workspace. This "
        "pipeline-to-project flow is something Axia should implement as a one-click conversion."
    ))

    # 2.6 Context Management
    story.append(h2("2.6 Context Management Niche Competitors"))
    story.append(body(
        "Context management is the newest and least crowded feature area — which makes it both an opportunity "
        "and a risk. The tools that exist are either AI-focused (cross-platform memory) or workflow-focused "
        "(all-in-one consolidation), but none combine both approaches with deep integration into proposals, "
        "billing, and scope management. Axia's Context Hub can own this space by being the connective tissue "
        "between all other features."
    ))
    story.append(bullet(
        "<b>AI Context Flow</b> (Plurality.network) — Provides universal AI memory across ChatGPT, Claude, "
        "and Gemini. Enables cross-platform context maintenance so that conversations started in one AI tool "
        "can be continued in another. Available on AppSumo. The insight here is that freelancers are using "
        "multiple AI tools and losing context between them. Axia must offer equivalent cross-platform memory "
        "while tying it to business workflows."
    ))
    story.append(bullet(
        "<b>WorkLane</b> (worklane.co.in) — Proposal and invoice automation for Indian freelancers. Replaces "
        "CRM, website, booking, inbox, and follow-up tools with a single application. Tagline: 'All your "
        "business tools in one app.' This is Axia's closest conceptual competitor — a unified tool that "
        "collapses multiple niche subscriptions. However, WorkLane's execution is limited to the Indian "
        "market and lacks the protection features Axia offers."
    ))
    story.append(bullet(
        "<b>Worklane.cloud</b> — Replaces CRM, website, booking page, inbox, and follow-up tools. One login, "
        "one bill. Similar to WorkLane but with a broader geographic focus. The 'one login, one bill' "
        "messaging is exactly what Axia should emphasize — it's the core value proposition of platform "
        "consolidation."
    ))
    story.append(bullet(
        "<b>Notion templates and Slack integrations</b> — Various Notion templates and Slack integrations "
        "serve as DIY context management for freelancers who piece together their own systems. These "
        "aren't competitors in the traditional sense, but they represent the behavior Axia must replace — "
        "the tendency of freelancers to build fragile, manual context systems instead of adopting a "
        "purpose-built solution."
    ))

    # 2.7 Onboarding / Instant Setup
    story.append(h2("2.7 Onboarding / Instant Setup Niche Competitors"))
    story.append(body(
        "This is the one feature area where there is no dedicated competitor — and that is exactly the "
        "opportunity. No niche tool promises '10 minutes to first value' because niche tools are inherently "
        "simple and don't require significant onboarding. But as Axia integrates seven feature areas, the "
        "onboarding experience becomes critical. If setup takes an hour, freelancers will bounce before "
        "experiencing the value. Axia's Instant Setup Wizard must be a competitive advantage in itself: "
        "demonstrating that a unified tool can be faster to start using than even a single-purpose niche app."
    ))
    story.append(body(
        "The closest competitors in this space are Moxie, which claims easy setup, and Harlow, which has "
        "structured onboarding flows. However, neither has made onboarding speed a core differentiator or "
        "published a specific time-to-value metric. Axia should own this positioning: 'From sign-up to "
        "first protected proposal in under 10 minutes.' This promise is believable because the Instant "
        "Setup Wizard handles all configuration in seven streamlined steps, and it is defensible because "
        "no competitor has the integration depth to set up multiple features simultaneously."
    ))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 3: PRIMARY COMPETITOR DEEP-DIVE TABLE
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("3. Primary Competitor Deep-Dive"))
    story.append(body(
        "The following table provides a comprehensive comparison of each Axia feature area against its "
        "primary niche competitor. For each feature, we identify the strongest competitor, their pricing, "
        "their key innovation, what they are missing, and Axia's specific answer. This analysis forms the "
        "foundation for every design decision in the implementation plan — each feature must be clearly "
        "superior to the niche alternative, not merely equivalent."
    ))
    story.append(sp(8))

    # Competitor deep-dive table
    cw3 = [CONTENT_W * f for f in [0.14, 0.16, 0.10, 0.20, 0.20, 0.20]]
    deep_dive_data = [
        [
            Paragraph("Feature", STY["th"]),
            Paragraph("Primary Competitor", STY["th"]),
            Paragraph("Their Price", STY["th"]),
            Paragraph("Their Key Innovation", STY["th"]),
            Paragraph("What They're Missing", STY["th"]),
            Paragraph("Axia's Answer", STY["th"]),
        ],
        [
            Paragraph("Smart Proposals", STY["td"]),
            Paragraph("Harlow", STY["td"]),
            Paragraph("$19/mo", STY["td_center"]),
            Paragraph("Clean templates + e-sign + client management in one flow", STY["td"]),
            Paragraph("No AI generation, no protection clauses, no client engagement tracking", STY["td"]),
            Paragraph("AI generation with built-in protection clauses, smart follow-ups at Day 3/7/14, client engagement tracking, one-click proposal-to-project conversion", STY["td"]),
        ],
        [
            Paragraph("CRM &amp; Pipeline", STY["td"]),
            Paragraph("Breakcold", STY["td"]),
            Paragraph("$15/mo", STY["td_center"]),
            Paragraph("Social selling + LinkedIn integration for solopreneurs", STY["td"]),
            Paragraph("No protection data, no risk scoring, no dispute history context", STY["td"]),
            Paragraph("AI lead scoring using Axia's unique protection data — dispute history, payment patterns, risk scores that no niche CRM has access to", STY["td"]),
        ],
        [
            Paragraph("Validated Billing", STY["td"]),
            Paragraph("Memtime", STY["td"]),
            Paragraph("$17/mo", STY["td_center"]),
            Paragraph("Invisible automatic activity capture as proof of hours", STY["td"]),
            Paragraph("No work context verification, no validation scoring, no invoice integration", STY["td"]),
            Paragraph("Work Context Verification Model (WCVM), evidence capture (screenshots, activity data), validation score 0-100 on every invoice line item", STY["td"]),
        ],
        [
            Paragraph("Payment Reminders", STY["td"]),
            Paragraph("Paidly", STY["td"]),
            Paragraph("Free start", STY["td_center"]),
            Paragraph("'Get paid 47% faster' — automated reminder sequences", STY["td"]),
            Paragraph("No client relationship context, no smart tone escalation, no risk profiles", STY["td"]),
            Paragraph("Smart tone escalation using client relationship data, risk profiles, payment history, and dispute data that no niche tool has access to", STY["td"]),
        ],
        [
            Paragraph("Scope Creep Protection", STY["td"]),
            Paragraph("StopScopeCreep", STY["td"]),
            Paragraph("$14.99/mo", STY["td_center"]),
            Paragraph("60-second change requests with client approval, paper trail", STY["td"]),
            Paragraph("Manual initiation only, no auto-detection, no link back to original proposal", STY["td"]),
            Paragraph("AUTO-DETECTION from time deviations, task divergence, and communication signals; links scope changes to original proposal and contract", STY["td"]),
        ],
        [
            Paragraph("Context Management", STY["td"]),
            Paragraph("AI Context Flow", STY["td"]),
            Paragraph("AppSumo", STY["td_center"]),
            Paragraph("Universal AI memory across ChatGPT, Claude, Gemini", STY["td"]),
            Paragraph("No business workflow integration, no scope change detection, no proposal/invoice linking", STY["td"]),
            Paragraph("AI extracts decisions, detects scope change signals, auto-links to proposals, invoices, and change orders — cross-feature integration", STY["td"]),
        ],
        [
            Paragraph("Instant Setup", STY["td"]),
            Paragraph("None", STY["td"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("No dedicated competitor exists — this is a market gap", STY["td"]),
            Paragraph("N/A — no one has claimed this space", STY["td"]),
            Paragraph("7-step wizard totaling ~5 minutes, simultaneous multi-feature configuration, '10 minutes to first value' promise", STY["td"]),
        ],
    ]
    story.append(make_table(deep_dive_data, col_widths=cw3))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 4: PHASE 1 - FOUNDATION (WEEKS 1-4)
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("4. Phase 1 — Foundation (Weeks 1-4)"))
    story.append(body(
        "Phase 1 establishes the foundational infrastructure that all subsequent features depend on. "
        "This phase is critical because it sets the pricing architecture, authentication system, and "
        "onboarding experience that will define how users perceive Axia from their very first interaction. "
        "The pricing sync is particularly urgent because niche tools like ScopePilot charge $14.99/month "
        "for scope creep protection alone — Axia at the $15/month Pro tier must clearly communicate that "
        "it delivers scope creep protection plus proposals, CRM, billing, reminders, context management, "
        "and instant setup for the same price. This 'stack collapse' value proposition only works if the "
        "pricing architecture is perfectly aligned from day one."
    ))

    story.append(h2("4.1 Pricing Sync ($7 / $15 / $49)"))
    story.append(body(
        "The three-tier pricing model must be synchronized across the Convex backend, the frontend "
        "subscription management pages, and the Stripe integration. The Starter tier at $7/month provides "
        "basic proposals and CRM — enough to hook users but limited enough to drive upgrades. The Pro tier "
        "at $15/month is the flagship offering: all seven features at a price that undercuts a single niche "
        "tool like ScopePilot ($14.99) or Harlow ($19). The Business tier at $49/month targets agencies "
        "with team features, advanced analytics, and priority support. This pricing architecture is the "
        "foundation of Axia's competitive strategy — every feature must justify the tier it sits in, and "
        "the value gap between tiers must be compelling enough to drive natural upgrade paths."
    ))

    # Pricing table
    cw_price = [CONTENT_W * f for f in [0.25, 0.25, 0.25, 0.25]]
    pricing_data = [
        [
            Paragraph("Tier", STY["th"]),
            Paragraph("Price", STY["th"]),
            Paragraph("Key Features", STY["th"]),
            Paragraph("Target User", STY["th"]),
        ],
        [
            Paragraph("Starter", STY["td"]),
            Paragraph("$7/mo", STY["td_center"]),
            Paragraph("Basic proposals, CRM, instant setup", STY["td"]),
            Paragraph("New freelancers testing the waters", STY["td"]),
        ],
        [
            Paragraph("Pro", STY["td"]),
            Paragraph("$15/mo", STY["td_center"]),
            Paragraph("All 7 features — cheaper than one niche tool", STY["td"]),
            Paragraph("Active freelancers (core market)", STY["td"]),
        ],
        [
            Paragraph("Business", STY["td"]),
            Paragraph("$49/mo", STY["td_center"]),
            Paragraph("Team features, analytics, priority support", STY["td"]),
            Paragraph("Agencies and studios", STY["td"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(pricing_data, col_widths=cw_price))

    story.append(h2("4.2 Auth Guards"))
    story.append(body(
        "Authentication guards protect every API route and ensure that users can only access features "
        "available on their subscribed tier. The guard system must be implemented as middleware in the "
        "Convex backend, checking subscription status before executing any function. This is not just a "
        "security measure — it is the enforcement mechanism for the pricing strategy. If auth guards are "
        "lax or inconsistent, the tiered value proposition breaks down because users can access premium "
        "features without paying. The guard system must check: (1) is the user authenticated, (2) is their "
        "subscription active, (3) does their tier include the requested feature, and (4) have they exceeded "
        "any usage limits for their tier. Each check must return a clear error code that the frontend can "
        "use to prompt upgrade flows rather than dead-end error messages."
    ))

    story.append(h2("4.3 Instant Setup Wizard"))
    story.append(body(
        "The Instant Setup Wizard is a seven-step onboarding flow that takes approximately five minutes to "
        "complete. This is a competitive advantage that no niche tool can claim — because niche tools only "
        "do one thing, their setup is inherently simple, but they also can't configure multiple features "
        "simultaneously. Axia's wizard configures all seven features in one pass, which is actually faster "
        "than setting up a single niche tool because the wizard leverages shared data across steps. The seven "
        "steps are: (1) Business Profile — name, industry, currency; (2) Client Import — paste or upload "
        "client list; (3) Service Catalog — define offerings and pricing; (4) Proposal Template — choose "
        "and customize a starting template; (5) Billing Preferences — hourly vs. project, payment terms; "
        "(6) Reminder Schedule — configure reminder timing and tone; (7) Scope Defaults — set revision "
        "limits and change order policies. Each step pre-fills smart defaults so that the user is confirming "
        "rather than creating from scratch."
    ))

    # Wizard steps table
    cw_wiz = [CONTENT_W * f for f in [0.06, 0.20, 0.40, 0.34]]
    wiz_data = [
        [
            Paragraph("#", STY["th"]),
            Paragraph("Step", STY["th"]),
            Paragraph("What It Collects", STY["th"]),
            Paragraph("Smart Default", STY["th"]),
        ],
        [
            Paragraph("1", STY["td_center"]),
            Paragraph("Business Profile", STY["td"]),
            Paragraph("Name, industry, currency, timezone", STY["td"]),
            Paragraph("Industry-specific templates auto-selected", STY["td"]),
        ],
        [
            Paragraph("2", STY["td_center"]),
            Paragraph("Client Import", STY["td"]),
            Paragraph("Client names, emails, project types", STY["td"]),
            Paragraph("CSV upload or manual paste accepted", STY["td"]),
        ],
        [
            Paragraph("3", STY["td_center"]),
            Paragraph("Service Catalog", STY["td"]),
            Paragraph("Service names, prices, descriptions", STY["td"]),
            Paragraph("Industry-specific service suggestions", STY["td"]),
        ],
        [
            Paragraph("4", STY["td_center"]),
            Paragraph("Proposal Template", STY["td"]),
            Paragraph("Template selection and customization", STY["td"]),
            Paragraph("Best-converting template pre-selected", STY["td"]),
        ],
        [
            Paragraph("5", STY["td_center"]),
            Paragraph("Billing Preferences", STY["td"]),
            Paragraph("Hourly/project, rate, payment terms", STY["td"]),
            Paragraph("Industry-standard rates and terms", STY["td"]),
        ],
        [
            Paragraph("6", STY["td_center"]),
            Paragraph("Reminder Schedule", STY["td"]),
            Paragraph("Reminder timing, tone, escalation rules", STY["td"]),
            Paragraph("Proven Day 1/3/7/14 schedule", STY["td"]),
        ],
        [
            Paragraph("7", STY["td_center"]),
            Paragraph("Scope Defaults", STY["td"]),
            Paragraph("Revision limits, change order policies", STY["td"]),
            Paragraph("2-revision default with auto-change-order", STY["td"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(wiz_data, col_widths=cw_wiz))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 5: PHASE 2 - SMART PROPOSALS & CRM (WEEKS 5-8)
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("5. Phase 2 — Smart Proposals &amp; CRM (Weeks 5-8)"))
    story.append(body(
        "Phase 2 delivers the two features that serve as the top of the freelancer workflow funnel: "
        "proposals and CRM. Proposals are the first client-facing artifact a freelancer creates, and "
        "CRM is the system that tracks every prospect from first contact to signed contract. These features "
        "must be best-in-class not just to match niche competitors, but to create a data foundation that "
        "powers all downstream features. The proposal data feeds into scope creep protection; the CRM data "
        "feeds into payment reminder intelligence and context management. This interconnectedness is Axia's "
        "unfair advantage — a advantage that no single-purpose tool can replicate."
    ))

    story.append(h2("5.1 Smart Proposals Engine"))
    story.append(body(
        "The Smart Proposals Engine must beat Harlow's clean templates, Indy's integrated proposals, "
        "ScopeStack's scoping accuracy, and LegittAI's AI generation. Each competitor has a strength, "
        "but none combines all four. Axia's proposal engine will offer: (1) AI generation with built-in "
        "protection clauses that address scope boundaries, revision limits, and change order procedures — "
        "clauses that generic AI generators don't include; (2) Smart follow-ups at Day 3, Day 7, and Day "
        "14 after sending a proposal, with tone adjusted based on the client's engagement level; (3) Client "
        "engagement tracking similar to ClearTimeline's view tracking but applied to proposals — know when "
        "the client opens the proposal, which sections they spend the most time on, and whether they "
        "forwarded it internally; (4) One-click proposal-to-project conversion that carries all protection "
        "settings (revision limits, scope boundaries, change order policies) into the active project."
    ))
    story.append(body(
        "The AI generation component is particularly critical. LegittAI and Taskade offer free AI proposal "
        "generation, but their output is generic — a well-structured proposal that says nothing about scope "
        "boundaries or revision limits. Axia's AI will generate proposals that are scope-creep-resistant "
        "by design, including specific language about what is and isn't included, how changes will be "
        "handled, and what the revision process looks like. This isn't just a writing tool — it's a "
        "protection tool that happens to write proposals. The AI will draw from the user's Service Catalog "
        "(configured during Instant Setup) and their Scope Defaults to ensure every proposal is internally "
        "consistent with the freelancer's actual policies."
    ))

    # Proposals comparison table
    cw_prop = [CONTENT_W * f for f in [0.18, 0.14, 0.14, 0.14, 0.14, 0.26]]
    prop_data = [
        [
            Paragraph("Capability", STY["th"]),
            Paragraph("Harlow", STY["th"]),
            Paragraph("Indy", STY["th"]),
            Paragraph("ScopeStack", STY["th"]),
            Paragraph("LegittAI", STY["th"]),
            Paragraph("Axia", STY["th"]),
        ],
        [
            Paragraph("Template Library", STY["td"]),
            Paragraph("✓", STY["td_center"]),
            Paragraph("✓", STY["td_center"]),
            Paragraph("✓", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("✓ (industry-specific)", STY["td_center"]),
        ],
        [
            Paragraph("AI Generation", STY["td"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("Partial", STY["td_center"]),
            Paragraph("✓", STY["td_center"]),
            Paragraph("✓ (with protection)", STY["td_center"]),
        ],
        [
            Paragraph("E-Sign", STY["td"]),
            Paragraph("✓", STY["td_center"]),
            Paragraph("✓", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("✓", STY["td_center"]),
            Paragraph("✓", STY["td_center"]),
        ],
        [
            Paragraph("Engagement Tracking", STY["td"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("✓ (view tracking)", STY["td_center"]),
        ],
        [
            Paragraph("Smart Follow-ups", STY["td"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("✓ (Day 3/7/14)", STY["td_center"]),
        ],
        [
            Paragraph("Protection Clauses", STY["td"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("✓ (scoping)", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("✓ (auto-included)", STY["td_center"]),
        ],
        [
            Paragraph("One-Click Convert", STY["td"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("Partial", STY["td_center"]),
            Paragraph("✓", STY["td_center"]),
            Paragraph("—", STY["td_center"]),
            Paragraph("✓ (full settings)", STY["td_center"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(prop_data, col_widths=cw_prop))

    story.append(h2("5.2 CRM Pipeline"))
    story.append(body(
        "The CRM Pipeline must beat Breakcold's social selling, Indy's freelancer CRM, and folk's "
        "minimalist simplicity. The key differentiator is AI lead scoring powered by Axia's unique "
        "protection data — dispute history, payment patterns, and risk scores. No niche CRM has access "
        "to this data because no niche CRM also handles proposals, billing, and scope management. This "
        "means Axia can tell a freelancer not just 'this lead is warm' but 'this lead has a history of "
        "late payments and scope disputes with similar projects — proceed with enhanced protection clauses.' "
        "This intelligence transforms the CRM from a passive tracking tool into an active protection advisor."
    ))
    story.append(body(
        "The pipeline visualization will use a Kanban-style board with stages: Lead, Qualified, Proposal "
        "Sent, Negotiation, Won, Lost. Each card displays key information: client name, estimated value, "
        "protection score (a composite metric based on available risk data), and next action. Drag-and-drop "
        "between stages triggers automated workflows — moving a card to 'Proposal Sent' auto-creates a "
        "proposal draft, moving to 'Won' triggers the proposal-to-project conversion. The CRM also supports "
        "social selling integrations similar to Breakcold, allowing freelancers to log LinkedIn interactions "
        "and social touchpoints alongside traditional CRM data."
    ))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 6: PHASE 3 - BILLING, REMINDERS, SCOPE CREEP (WEEKS 9-12)
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("6. Phase 3 — Billing, Reminders &amp; Scope Creep (Weeks 9-12)"))
    story.append(body(
        "Phase 3 delivers the three features that directly protect a freelancer's revenue: validated "
        "billing, automated payment reminders, and scope creep protection. These are the features where "
        "the niche competition is fiercest and where Axia's integrated advantage is most powerful. Each "
        "feature individually must be better than the niche alternative, but the real magic is in their "
        "interconnection: scope changes affect billing, billing evidence supports payment reminders, and "
        "reminder intelligence draws on the full client relationship context. No combination of niche tools "
        "can replicate this because no combination of niche tools shares data."
    ))

    story.append(h2("6.1 Validated Billing"))
    story.append(body(
        "Validated Billing must beat Memtime's automatic proof-of-work and ManicTime's accurate billing. "
        "Both tools capture time passively and invisibly, which is the gold standard — Axia must match this "
        "capability. But Axia goes further with the Work Context Verification Model (WCVM), which doesn't "
        "just track that time was spent, but verifies what work was being done. WCVM captures screenshots "
        "(with privacy controls), activity data (application usage, document edits, communication patterns), "
        "and work context (which project, which task, which deliverable). Every invoice line item receives "
        "a validation score from 0 to 100 that represents the confidence level of the billed hours."
    ))
    story.append(body(
        "The validation score is calculated from multiple signals: (1) Application activity — was the "
        "freelancer actively using tools relevant to the billed project? (2) Document edits — were files "
        "associated with the project being modified? (3) Communication patterns — were project-related "
        "messages being sent? (4) Time consistency — do the logged hours align with the activity data? "
        "A score of 90+ means 'fully validated — strong evidence for every billed hour.' A score below "
        "50 means 'partial evidence — consider adding manual notes before sending.' This scoring system "
        "is something neither Memtime nor ManicTime offers, and it transforms the freelancer-client "
        "dynamic from 'trust me, I worked those hours' to 'here is objective evidence supporting every "
        "line item on this invoice.'"
    ))

    story.append(h2("6.2 Automated Payment Reminders"))
    story.append(body(
        "Automated Payment Reminders must beat Paidly's '47% faster' claim and Payntra's AI approach. "
        "The baseline is clear: Paidly proves that automated reminders work, and the 47% figure is the "
        "benchmark Axia must reference and surpass. But Axia's advantage is smart tone escalation using "
        "client relationship data that no niche tool has access to. Paidly sends the same reminder "
        "sequence to every client — it doesn't know if this client has been late before, whether they "
        "have outstanding disputes, or whether the relationship is worth preserving at the cost of firm "
        "reminders."
    ))
    story.append(body(
        "Axia's reminder engine uses a multi-dimensional client profile: (1) Payment history — has this "
        "client paid on time before? Late payers get earlier and firmer reminders. (2) Relationship value — "
        "is this a high-value recurring client or a one-off project? High-value clients get gentler tones. "
        "(3) Dispute history — are there active scope disputes? If so, reminders acknowledge the dispute "
        "and suggest resolution before payment. (4) Current project status — is work ongoing? Active "
        "projects allow for softer reminders since the freelancer has ongoing leverage. This intelligence "
        "means that Axia doesn't just send reminders — it sends the right reminder to the right client "
        "at the right time with the right tone. The result should be faster than Paidly's 47% "
        "improvement because Axia's reminders are more contextually appropriate and less likely to "
        "damage client relationships."
    ))

    story.append(h2("6.3 Scope Creep Protection"))
    story.append(body(
        "Scope Creep Protection is the most competitive feature area — with six niche competitors each "
        "approaching the problem differently. Axia must synthesize the best ideas from all of them while "
        "adding one capability that none can match: AUTO-DETECTION. Every existing niche tool requires "
        "the freelancer to manually initiate a change request — they must notice that scope is creeping "
        "and then take action. This is a fundamental limitation because freelancers often don't realize "
        "scope is creeping until they're already doing unpaid work. Axia's auto-detection engine monitors "
        "three signal categories: (1) Time deviations — if task completion times diverge significantly "
        "from the original estimate, scope may have expanded. (2) Task divergence — if new tasks appear "
        "that weren't in the original project plan, scope is expanding. (3) Communication signals — if "
        "client messages contain language associated with scope expansion ('can you also...', 'one more "
        "thing...', 'while you're at it...'), the system flags it."
    ))
    story.append(body(
        "When auto-detection triggers, Axia generates a change request that pre-fills the scope change "
        "details, timeline impact, and price adjustment — similar to ScopeStamp's approval pages but "
        "initiated by the system rather than the freelancer. The change request links back to the original "
        "proposal and contract, showing exactly where the agreed scope ends and the new scope begins. "
        "This linkage is something no niche tool can offer because no niche tool also handles proposals "
        "and contracts. The approval flow supports ScopeStamp-style client approval links with ClearTimeline-"
        "style view tracking, so the freelancer knows when the client has seen the change request. "
        "Immutable timestamps (borrowing from ClearTimeline's approach) create an auditable record of "
        "every scope modification. The result is a scope creep protection system that doesn't just respond "
        "to creep — it anticipates and prevents it."
    ))

    # Scope creep competitors table
    cw_sc = [CONTENT_W * f for f in [0.16, 0.12, 0.18, 0.18, 0.36]]
    sc_data = [
        [
            Paragraph("Competitor", STY["th"]),
            Paragraph("Price", STY["th"]),
            Paragraph("Key Feature", STY["th"]),
            Paragraph("Limitation", STY["th"]),
            Paragraph("Axia Advantage", STY["th"]),
        ],
        [
            Paragraph("StopScopeCreep", STY["td"]),
            Paragraph("$14.99/mo", STY["td_center"]),
            Paragraph("60-sec change requests", STY["td"]),
            Paragraph("Manual initiation only", STY["td"]),
            Paragraph("Auto-detection + manual", STY["td"]),
        ],
        [
            Paragraph("ScopePilot", STY["td"]),
            Paragraph("$14.99/mo", STY["td_center"]),
            Paragraph("Boundary definition", STY["td"]),
            Paragraph("Pre-only, no mid-project", STY["td"]),
            Paragraph("Pre + mid + post protection", STY["td"]),
        ],
        [
            Paragraph("ScopeStamp", STY["td"]),
            Paragraph("One-time", STY["td_center"]),
            Paragraph("Approval links", STY["td"]),
            Paragraph("No detection, manual only", STY["td"]),
            Paragraph("Approval links + auto-detect", STY["td"]),
        ],
        [
            Paragraph("ClearTimeline", STY["td"]),
            Paragraph("Free+", STY["td_center"]),
            Paragraph("Immutable timestamps", STY["td"]),
            Paragraph("Tracking only, no prevention", STY["td"]),
            Paragraph("Timestamps + prevention", STY["td"]),
        ],
        [
            Paragraph("ScopeGuard", STY["td"]),
            Paragraph("Free", STY["td_center"]),
            Paragraph("Scope agreements", STY["td"]),
            Paragraph("No ongoing monitoring", STY["td"]),
            Paragraph("Agreements + monitoring", STY["td"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(sc_data, col_widths=cw_sc))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 7: PHASE 4 - CONTEXT MANAGEMENT (WEEKS 13-16)
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("7. Phase 4 — Context Management (Weeks 13-16)"))
    story.append(body(
        "Context Management is the final and most integrative feature — the connective tissue that links "
        "all other features into a cohesive experience. The primary competitor is AI Context Flow, which "
        "provides universal AI memory across ChatGPT, Claude, and Gemini. The secondary competitor is "
        "WorkLane, which consolidates CRM, website, booking, inbox, and follow-ups into one application. "
        "Axia's Context Hub must beat both approaches by combining cross-platform AI memory with deep "
        "business workflow integration."
    ))

    story.append(h2("7.1 Context Hub"))
    story.append(body(
        "The Context Hub is a centralized communication and decision repository that ingests messages from "
        "email, Slack, WhatsApp, and other channels, then uses AI to extract decisions, detect scope change "
        "signals, and auto-link everything to the relevant proposals, invoices, and change orders. This is "
        "where Axia's integrated advantage reaches its full expression: no context tool has this level of "
        "cross-feature integration because no context tool also handles proposals, billing, and scope "
        "management."
    ))
    story.append(body(
        "The AI extraction engine processes every incoming message through three analysis layers: (1) Decision "
        "extraction — identifies explicit and implicit decisions made in conversations ('let's go with option "
        "B', 'I'll need that by Friday', 'add a blog section to the website'). Each extracted decision is "
        "tagged with the relevant project and stored as a decision record. (2) Scope change signal detection "
        "— identifies language that indicates potential scope changes ('can you also...', 'one more thing...', "
        "'while you're at it...', 'I was thinking we could add...'). These signals feed directly into the "
        "Scope Creep Protection engine, triggering auto-detection alerts. (3) Action item extraction — "
        "identifies commitments and deadlines from conversations and creates linked tasks. The result is a "
        "context hub that doesn't just store conversations — it actively processes them into structured data "
        "that powers every other feature in Axia."
    ))
    story.append(body(
        "The Context Hub also serves as the unified inbox for all client communications. Instead of checking "
        "email for client messages, Slack for team updates, and WhatsApp for quick questions, freelancers "
        "see everything in one chronological feed organized by client and project. This consolidation "
        "addresses the same pain point as WorkLane's 'one login, one bill' promise, but with deeper "
        "integration into Axia's protection features. When a freelancer views a client's context feed, "
        "they see not just messages but also linked proposals, invoices, change orders, and scope alerts — "
        "the complete picture of their relationship with that client."
    ))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 8: TECHNICAL ARCHITECTURE
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("8. Technical Architecture"))
    story.append(body(
        "The technical architecture is designed around Convex as the reactive backend, with function "
        "organization that mirrors the feature structure. Each feature area gets its own function file, "
        "and shared utilities are extracted into common modules. The AI integration layer uses a provider-"
        "agnostic approach that can call OpenAI, Anthropic, or local models depending on the task and "
        "cost requirements. This architecture must support real-time updates (for CRM pipeline changes, "
        "scope creep alerts, and payment reminder triggers), offline-capable clients (for freelancers "
        "working without internet), and scalable AI processing (for batch proposal generation, context "
        "extraction, and scope change detection)."
    ))

    story.append(h2("8.1 Convex Backend Organization"))
    # Backend structure table
    cw_backend = [CONTENT_W * f for f in [0.30, 0.35, 0.35]]
    backend_data = [
        [
            Paragraph("Function File", STY["th"]),
            Paragraph("Responsibilities", STY["th"]),
            Paragraph("Key Competitor Reference", STY["th"]),
        ],
        [
            Paragraph("proposals.ts", STY["td"]),
            Paragraph("CRUD proposals, AI generation, template management, engagement tracking, follow-up scheduling", STY["td"]),
            Paragraph("Harlow (templates), LegittAI (AI gen), ScopeStack (scoping)", STY["td"]),
        ],
        [
            Paragraph("crm.ts", STY["td"]),
            Paragraph("Pipeline stages, lead scoring, client profiles, social integrations", STY["td"]),
            Paragraph("Breakcold (social), Indy (CRM), folk (simplicity)", STY["td"]),
        ],
        [
            Paragraph("billing.ts", STY["td"]),
            Paragraph("Time tracking, WCVM validation scoring, invoice generation, evidence capture", STY["td"]),
            Paragraph("Memtime (auto capture), ManicTime (accuracy)", STY["td"]),
        ],
        [
            Paragraph("reminders.ts", STY["td"]),
            Paragraph("Reminder scheduling, smart tone escalation, client risk profiles, send tracking", STY["td"]),
            Paragraph("Paidly (automation), Payntra (AI tone)", STY["td"]),
        ],
        [
            Paragraph("scopeCreep.ts", STY["td"]),
            Paragraph("Auto-detection engine, change order management, approval flows, immutable audit trail", STY["td"]),
            Paragraph("StopScopeCreep, ScopeStamp, ClearTimeline, ScopeGuard", STY["td"]),
        ],
        [
            Paragraph("context.ts", STY["td"]),
            Paragraph("Message ingestion, AI extraction, decision records, scope signal detection, cross-linking", STY["td"]),
            Paragraph("AI Context Flow (memory), WorkLane (consolidation)", STY["td"]),
        ],
        [
            Paragraph("setup.ts", STY["td"]),
            Paragraph("Wizard steps, smart defaults, multi-feature configuration, onboarding analytics", STY["td"]),
            Paragraph("No direct competitor (market gap)", STY["td"]),
        ],
        [
            Paragraph("shared/ai.ts", STY["td"]),
            Paragraph("Provider-agnostic AI calls, prompt templates, response parsing, cost optimization", STY["td"]),
            Paragraph("Internal infrastructure", STY["td"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(backend_data, col_widths=cw_backend))

    story.append(h2("8.2 AI Integration Architecture"))
    story.append(body(
        "The AI integration layer uses a provider-agnostic approach with three tiers of AI usage. Tier 1 "
        "(Lightweight) uses fast, cheap models for simple tasks like extracting action items, detecting "
        "scope change signals, and generating reminder text. Tier 2 (Standard) uses capable models for "
        "proposal generation, lead scoring, and context extraction. Tier 3 (Premium) uses the most capable "
        "models for complex tasks like contract ambiguity detection, sophisticated scope change analysis, "
        "and multi-dimensional client risk assessment. Each tier has cost controls to ensure that AI "
        "expenses scale with revenue rather than user count."
    ))

    # AI tiers table
    cw_ai = [CONTENT_W * f for f in [0.14, 0.16, 0.28, 0.22, 0.20]]
    ai_data = [
        [
            Paragraph("Tier", STY["th"]),
            Paragraph("Model Type", STY["th"]),
            Paragraph("Use Cases", STY["th"]),
            Paragraph("Latency Target", STY["th"]),
            Paragraph("Cost Control", STY["td_center"]),
        ],
        [
            Paragraph("Lightweight", STY["td"]),
            Paragraph("Fast/cheap", STY["td_center"]),
            Paragraph("Action items, scope signals, reminder text", STY["td"]),
            Paragraph("< 500ms", STY["td_center"]),
            Paragraph("Per-request budget", STY["td_center"]),
        ],
        [
            Paragraph("Standard", STY["td"]),
            Paragraph("Capable", STY["td_center"]),
            Paragraph("Proposal gen, lead scoring, context extraction", STY["td"]),
            Paragraph("< 3s", STY["td_center"]),
            Paragraph("Per-feature budget", STY["td_center"]),
        ],
        [
            Paragraph("Premium", STY["td"]),
            Paragraph("Most capable", STY["td_center"]),
            Paragraph("Ambiguity detection, scope analysis, risk assessment", STY["td"]),
            Paragraph("< 10s", STY["td_center"]),
            Paragraph("Per-user monthly cap", STY["td_center"]),
        ],
    ]
    # Fix header for last column
    ai_data[0][-1] = Paragraph("Cost Control", STY["th"])
    story.append(sp(6))
    story.append(make_table(ai_data, col_widths=cw_ai))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 9: IMPLEMENTATION TIMELINE
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("9. Implementation Timeline"))
    story.append(body(
        "The 16-week implementation timeline is structured in four phases, each delivering a coherent set "
        "of features that can be tested and validated independently. This phased approach reduces risk by "
        "ensuring that each feature is built on a solid foundation, and it allows for course correction "
        "if competitive conditions change — for example, if a niche competitor ships a feature that "
        "overlaps with an upcoming Axia feature, the plan can be adjusted to accelerate that feature's "
        "delivery. The timeline accounts for the competitive urgency of each feature: scope creep protection "
        "has the most niche competitors and is prioritized in Phase 3, while context management has the "
        "fewest competitors and is scheduled for Phase 4."
    ))

    # Timeline table
    cw_time = [CONTENT_W * f for f in [0.10, 0.14, 0.34, 0.22, 0.20]]
    time_data = [
        [
            Paragraph("Phase", STY["th"]),
            Paragraph("Weeks", STY["th"]),
            Paragraph("Deliverables", STY["th"]),
            Paragraph("Key Competitive Target", STY["th"]),
            Paragraph("Success Metric", STY["th"]),
        ],
        [
            Paragraph("1", STY["td_center"]),
            Paragraph("1–4", STY["td_center"]),
            Paragraph("Pricing sync, auth guards, instant setup wizard", STY["td"]),
            Paragraph("No niche competitor (market gap)", STY["td"]),
            Paragraph("< 5 min onboarding", STY["td"]),
        ],
        [
            Paragraph("2", STY["td_center"]),
            Paragraph("5–8", STY["td_center"]),
            Paragraph("Smart proposals engine, CRM pipeline with AI lead scoring", STY["td"]),
            Paragraph("Harlow, Breakcold, Indy", STY["td"]),
            Paragraph("> 60% proposal open rate", STY["td"]),
        ],
        [
            Paragraph("3", STY["td_center"]),
            Paragraph("9–12", STY["td_center"]),
            Paragraph("Validated billing, payment reminders, scope creep protection with auto-detection", STY["td"]),
            Paragraph("Memtime, Paidly, StopScopeCreep", STY["td"]),
            Paragraph("> 50% faster payments", STY["td"]),
        ],
        [
            Paragraph("4", STY["td_center"]),
            Paragraph("13–16", STY["td_center"]),
            Paragraph("Context hub with AI extraction and cross-feature linking", STY["td"]),
            Paragraph("AI Context Flow, WorkLane", STY["td"]),
            Paragraph("> 80% context capture rate", STY["td"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(time_data, col_widths=cw_time))

    story.append(h2("9.1 Weekly Breakdown — Phase 1"))
    story.append(body(
        "Week 1: Pricing model implementation in Convex — tier definitions, feature flags, Stripe webhook "
        "handlers. Week 2: Auth guard middleware — subscription checks, feature access verification, usage "
        "limit enforcement. Week 3: Instant Setup Wizard frontend — seven-step form, smart default "
        "generation, multi-feature configuration. Week 4: Wizard backend — data persistence, configuration "
        "validation, onboarding analytics. Testing against the '5 minutes to first value' target."
    ))
    story.append(h2("9.2 Weekly Breakdown — Phase 2"))
    story.append(body(
        "Week 5: Proposal data model and template system — Convex schema, template storage, version "
        "management. Week 6: AI proposal generation — prompt engineering, protection clause injection, "
        "Service Catalog integration. Week 7: Proposal engagement tracking and smart follow-ups — open "
        "tracking, section heatmaps, Day 3/7/14 reminder scheduling. Week 8: CRM pipeline — Kanban "
        "board, AI lead scoring with protection data, proposal-to-project one-click conversion."
    ))
    story.append(h2("9.3 Weekly Breakdown — Phase 3"))
    story.append(body(
        "Week 9: Validated billing data model and WCVM scoring — time capture, activity tracking, "
        "validation score calculation. Week 10: Invoice generation with validation scores — evidence "
        "packaging, client-facing validation display, PDF export. Week 11: Payment reminder engine — "
        "smart tone escalation, client risk profiles, scheduling system. Week 12: Scope creep protection "
        "— auto-detection engine, change order management, approval flows with view tracking and immutable "
        "timestamps."
    ))
    story.append(h2("9.4 Weekly Breakdown — Phase 4"))
    story.append(body(
        "Week 13: Context Hub data model and message ingestion — email/Slack/WhatsApp connectors, "
        "chronological feed by client and project. Week 14: AI extraction engine — decision extraction, "
        "scope change signal detection, action item identification. Week 15: Cross-feature linking — "
        "auto-link decisions to proposals and invoices, feed scope signals to creep protection, create "
        "tasks from action items. Week 16: Polish, testing, and launch — performance optimization, "
        "competitive benchmarking against AI Context Flow and WorkLane, documentation."
    ))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 10: CONVEX SCHEMA MIGRATION SUMMARY
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("10. Convex Schema Migration Summary"))
    story.append(body(
        "The Convex schema must be extended to support all seven feature areas while maintaining backward "
        "compatibility with existing data. The migration strategy uses additive changes only — new tables "
        "and fields are added, but existing structures are never removed or renamed during the migration "
        "process. This approach ensures zero downtime and allows for incremental feature rollouts. The "
        "following tables summarize the new schema additions organized by feature area."
    ))

    story.append(h2("10.1 New Tables"))
    cw_schema = [CONTENT_W * f for f in [0.22, 0.28, 0.50]]
    schema_data = [
        [
            Paragraph("Table", STY["th"]),
            Paragraph("Feature", STY["th"]),
            Paragraph("Key Fields", STY["th"]),
        ],
        [
            Paragraph("proposals", STY["td"]),
            Paragraph("Smart Proposals", STY["td"]),
            Paragraph("title, clientId, templateId, status, protectionClauses, engagementData, followUpSchedule, aiGeneratedContent, validationScore", STY["td"]),
        ],
        [
            Paragraph("proposalTemplates", STY["td"]),
            Paragraph("Smart Proposals", STY["td"]),
            Paragraph("name, industry, sections, protectionDefaults, usageCount, conversionRate", STY["td"]),
        ],
        [
            Paragraph("pipelineStages", STY["td"]),
            Paragraph("CRM Pipeline", STY["td"]),
            Paragraph("name, order, color, autoActions, probabilityWeight", STY["td"]),
        ],
        [
            Paragraph("leads", STY["td"]),
            Paragraph("CRM Pipeline", STY["td"]),
            Paragraph("clientId, stageId, estimatedValue, protectionScore, aiRiskScore, nextAction, socialData", STY["td"]),
        ],
        [
            Paragraph("timeEntries", STY["td"]),
            Paragraph("Validated Billing", STY["td"]),
            Paragraph("projectId, startTime, endTime, activityData, wcvmScore, evidenceRefs, screenshots, taskTag", STY["td"]),
        ],
        [
            Paragraph("invoices", STY["td"]),
            Paragraph("Validated Billing", STY["td"]),
            Paragraph("clientId, projectId, lineItems, validationScoreAvg, evidencePackage, status, dueDate", STY["td"]),
        ],
        [
            Paragraph("reminderSchedules", STY["td"]),
            Paragraph("Payment Reminders", STY["td"]),
            Paragraph("invoiceId, clientId, scheduleTemplate, toneProfile, escalationRules, sendLog", STY["td"]),
        ],
        [
            Paragraph("scopeChanges", STY["td"]),
            Paragraph("Scope Creep", STY["td"]),
            Paragraph("projectId, detectionMethod, description, timelineImpact, priceImpact, approvalStatus, clientApprovalRef, immutableTimestamp", STY["td"]),
        ],
        [
            Paragraph("contextMessages", STY["td"]),
            Paragraph("Context Hub", STY["td"]),
            Paragraph("clientId, projectId, source, content, extractedDecisions, scopeSignals, actionItems, linkedEntities", STY["td"]),
        ],
        [
            Paragraph("setupProgress", STY["td"]),
            Paragraph("Instant Setup", STY["td"]),
            Paragraph("userId, currentStep, completedSteps, smartDefaults, completedAt", STY["td"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(schema_data, col_widths=cw_schema))

    story.append(h2("10.2 Modified Tables"))
    story.append(body(
        "Existing tables require field additions to support cross-feature data flow. The clients table "
        "needs paymentHistory, disputeHistory, and riskScore fields for the CRM and reminder features. "
        "The projects table needs scopeBoundaries, revisionCount, and changeOrderPolicy fields for scope "
        "creep protection. The users table needs subscriptionTier, onboardingCompleted, and setupPreferences "
        "fields for the pricing and setup features. All modifications are additive — no existing fields "
        "are changed or removed."
    ))

    # Modified tables
    cw_mod = [CONTENT_W * f for f in [0.22, 0.78]]
    mod_data = [
        [
            Paragraph("Table", STY["th"]),
            Paragraph("New Fields", STY["th"]),
        ],
        [
            Paragraph("clients", STY["td"]),
            Paragraph("paymentHistory, disputeHistory, riskScore, communicationPreference, socialProfiles, lastPaymentDate, avgPaymentDelay", STY["td"]),
        ],
        [
            Paragraph("projects", STY["td"]),
            Paragraph("scopeBoundaries, revisionCount, changeOrderPolicy, originalProposalRef, scopeChangeCount, creepAlertSettings", STY["td"]),
        ],
        [
            Paragraph("users", STY["td"]),
            Paragraph("subscriptionTier, onboardingCompleted, setupPreferences, serviceCatalog, billingPreferences, reminderPreferences, scopeDefaults", STY["td"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(mod_data, col_widths=cw_mod))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 11: PRICING STRATEGY
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("11. Pricing Strategy"))
    story.append(body(
        "The pricing strategy is built on a single powerful insight: Axia at the $15/month Pro tier is "
        "cheaper than ScopePilot alone ($14.99/month) or Harlow alone ($19/month), while delivering "
        "seven times the value. This is the 'stack collapse' value proposition — freelancers are currently "
        "paying for multiple niche tools that each solve one problem, and Axia replaces the entire stack "
        "at the price of a single tool. The following cost comparison table makes this argument undeniable "
        "by showing what a typical freelancer currently pays for niche tools that cover the same feature "
        "areas as Axia's Pro tier."
    ))

    story.append(h2("11.1 Stack Collapse Cost Comparison"))
    # Cost comparison table
    cw_cost = [CONTENT_W * f for f in [0.30, 0.22, 0.22, 0.26]]
    cost_data = [
        [
            Paragraph("Niche Tool", STY["th"]),
            Paragraph("Feature Area", STY["th"]),
            Paragraph("Monthly Cost", STY["th"]),
            Paragraph("Axia Pro Includes?", STY["th"]),
        ],
        [
            Paragraph("StopScopeCreep", STY["td"]),
            Paragraph("Scope Creep", STY["td_center"]),
            Paragraph("$14.99", STY["td_center"]),
            Paragraph("✓ (with auto-detection)", STY["td_center"]),
        ],
        [
            Paragraph("Harlow", STY["td"]),
            Paragraph("Proposals", STY["td_center"]),
            Paragraph("$19.00", STY["td_center"]),
            Paragraph("✓ (with AI + tracking)", STY["td_center"]),
        ],
        [
            Paragraph("Breakcold", STY["td"]),
            Paragraph("CRM", STY["td_center"]),
            Paragraph("$15.00", STY["td_center"]),
            Paragraph("✓ (with risk scoring)", STY["td_center"]),
        ],
        [
            Paragraph("Memtime", STY["td"]),
            Paragraph("Validated Billing", STY["td_center"]),
            Paragraph("$17.00", STY["td_center"]),
            Paragraph("✓ (with WCVM)", STY["td_center"]),
        ],
        [
            Paragraph("Paidly", STY["td"]),
            Paragraph("Payment Reminders", STY["td_center"]),
            Paragraph("$9.00", STY["td_center"]),
            Paragraph("✓ (with smart tone)", STY["td_center"]),
        ],
        [
            Paragraph("AI Context Flow", STY["td"]),
            Paragraph("Context Mgmt", STY["td_center"]),
            Paragraph("$12.00", STY["td_center"]),
            Paragraph("✓ (with cross-linking)", STY["td_center"]),
        ],
        [
            Paragraph("Total Niche Stack", STY["td"]),
            Paragraph("All 6 Areas", STY["td_center"]),
            Paragraph("$86.99", STY["td_center"]),
            Paragraph("Axia Pro: $15.00", STY["td_center"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(cost_data, col_widths=cw_cost))

    story.append(h2("11.2 Value Perception Framework"))
    story.append(body(
        "The value perception framework ensures that freelancers immediately understand the stack collapse "
        "savings. Every pricing page visitor should see: (1) The total cost of the niche tool stack ($86.99/"
        "month) versus Axia Pro ($15/month) — an 83% savings. (2) The integration advantage — Axia's "
        "features share data and trigger each other automatically, while niche tools require manual data "
        "transfer. (3) The time savings — one login, one interface, one learning curve instead of seven. "
        "This framework isn't just a pricing page argument; it should inform every marketing message, every "
        "demo, and every onboarding conversation. The question Axia answers isn't 'should I use a tool for "
        "scope creep?' but 'should I pay $14.99 for scope creep alone, or $15 for scope creep plus six "
        "other features that all work together?'"
    ))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 12: RISK MITIGATION
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("12. Risk Mitigation"))
    story.append(body(
        "Every feature launch carries risk — from technical implementation challenges to competitive "
        "responses. The following risk matrix identifies the primary risks for each phase, their likelihood "
        "and impact, and specific mitigation strategies. The most significant new risk in the updated "
        "competitive landscape is that a niche competitor could ship a feature that overlaps with an "
        "upcoming Axia feature before Axia launches it. This risk is mitigated by prioritizing the most "
        "competitive features (scope creep protection) and by ensuring that each Axia feature includes at "
        "least one capability that no niche tool can easily replicate (auto-detection, cross-feature "
        "integration, or protection-data-powered intelligence)."
    ))

    cw_risk = [CONTENT_W * f for f in [0.24, 0.08, 0.08, 0.30, 0.30]]
    risk_data = [
        [
            Paragraph("Risk", STY["th"]),
            Paragraph("Likelihood", STY["th"]),
            Paragraph("Impact", STY["th"]),
            Paragraph("Mitigation", STY["th"]),
            Paragraph("Contingency", STY["th"]),
        ],
        [
            Paragraph("Niche competitor ships key feature faster", STY["td"]),
            Paragraph("High", STY["td_center"]),
            Paragraph("Medium", STY["td_center"]),
            Paragraph("Ship Phase 3 scope creep (most competitive) first if needed; ensure each feature has one unique capability", STY["td"]),
            Paragraph("Accelerate Phase 3 timeline by reducing Phase 2 scope to must-have features only", STY["td"]),
        ],
        [
            Paragraph("AI costs exceed projections", STY["td"]),
            Paragraph("Medium", STY["td_center"]),
            Paragraph("High", STY["td_center"]),
            Paragraph("Tiered AI usage with per-request budgets; cache common AI outputs; use lightweight models for simple tasks", STY["td"]),
            Paragraph("Implement usage caps on AI features for lower tiers; introduce AI credit system", STY["td"]),
        ],
        [
            Paragraph("Low onboarding completion rate", STY["td"]),
            Paragraph("Medium", STY["td_center"]),
            Paragraph("High", STY["td_center"]),
            Paragraph("Seven-step wizard with smart defaults; track drop-off at each step; A/B test defaults", STY["td"]),
            Paragraph("Reduce wizard to 4 essential steps; make remaining steps optional post-onboarding", STY["td"]),
        ],
        [
            Paragraph("Scope creep auto-detection false positives", STY["td"]),
            Paragraph("Medium", STY["td_center"]),
            Paragraph("Medium", STY["td_center"]),
            Paragraph("Start with conservative detection thresholds; require freelancer confirmation before sending change requests", STY["td"]),
            Paragraph("Add sensitivity slider per project; disable auto-detection and use manual mode", STY["td"]),
        ],
        [
            Paragraph("Freelancers resist context ingestion", STY["td"]),
            Paragraph("Low", STY["td_center"]),
            Paragraph("Medium", STY["td_center"]),
            Paragraph("Opt-in rather than automatic; clear privacy controls; show immediate value from first ingested message", STY["td"]),
            Paragraph("Make Context Hub a separate add-on; focus on other features first", STY["td"]),
        ],
        [
            Paragraph("Niche tools add integration features", STY["td"]),
            Paragraph("Low", STY["td_center"]),
            Paragraph("High", STY["td_center"]),
            Paragraph("Axia's integration is deep (shared data model), not superficial (API calls); hard to replicate", STY["td"]),
            Paragraph("Double down on cross-feature intelligence that requires shared data to function", STY["td"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(risk_data, col_widths=cw_risk))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 13: SUCCESS METRICS
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(h1("13. Success Metrics"))
    story.append(body(
        "Success metrics are calibrated against niche competitor benchmarks where available. Paidly claims "
        "47% faster payments — Axia must exceed 50% to credibly claim superiority. ScopeStack claims 34% "
        "higher close rates — Axia's proposal engine must demonstrate 35%+ improvement. StopScopeCreep "
        "claims 72% of projects experience scope creep — Axia's auto-detection must reduce scope creep "
        "impact by at least 40% for users who follow system recommendations. These are not aspirational "
        "targets; they are the minimum thresholds needed to credibly position Axia as better than each "
        "niche alternative."
    ))

    cw_met = [CONTENT_W * f for f in [0.22, 0.20, 0.20, 0.18, 0.20]]
    met_data = [
        [
            Paragraph("Metric", STY["th"]),
            Paragraph("Baseline", STY["th"]),
            Paragraph("Competitor Benchmark", STY["th"]),
            Paragraph("Axia Target", STY["th"]),
            Paragraph("Measurement", STY["th"]),
        ],
        [
            Paragraph("Onboarding Time", STY["td"]),
            Paragraph("N/A (new)", STY["td_center"]),
            Paragraph("No competitor", STY["td_center"]),
            Paragraph("< 5 minutes", STY["td_center"]),
            Paragraph("Setup wizard analytics", STY["td"]),
        ],
        [
            Paragraph("Proposal Open Rate", STY["td"]),
            Paragraph("~40% industry", STY["td_center"]),
            Paragraph("Harlow: ~50%", STY["td_center"]),
            Paragraph("> 60%", STY["td_center"]),
            Paragraph("Engagement tracking", STY["td"]),
        ],
        [
            Paragraph("Close Rate", STY["td"]),
            Paragraph("~25% industry", STY["td_center"]),
            Paragraph("ScopeStack: +34%", STY["td_center"]),
            Paragraph("> 35% uplift", STY["td_center"]),
            Paragraph("Proposal-to-project conversion", STY["td"]),
        ],
        [
            Paragraph("Payment Speed", STY["td"]),
            Paragraph("~30 days", STY["td_center"]),
            Paragraph("Paidly: 47% faster", STY["td_center"]),
            Paragraph("> 50% faster", STY["td_center"]),
            Paragraph("Invoice-to-payment time", STY["td"]),
        ],
        [
            Paragraph("Scope Creep Impact", STY["td"]),
            Paragraph("27% overrun avg", STY["td_center"]),
            Paragraph("StopScopeCreep: reduces", STY["td_center"]),
            Paragraph("< 40% of baseline", STY["td_center"]),
            Paragraph("Change order rate vs. project cost", STY["td"]),
        ],
        [
            Paragraph("Invoice Validation Score", STY["td"]),
            Paragraph("N/A (new)", STY["td_center"]),
            Paragraph("Memtime: proof only", STY["td_center"]),
            Paragraph("Avg > 85/100", STY["td_center"]),
            Paragraph("WCVM scoring on invoices", STY["td"]),
        ],
        [
            Paragraph("Context Capture Rate", STY["td"]),
            Paragraph("N/A (new)", STY["td_center"]),
            Paragraph("AI Context Flow: partial", STY["td_center"]),
            Paragraph("> 80%", STY["td_center"]),
            Paragraph("Decisions extracted vs. total", STY["td"]),
        ],
        [
            Paragraph("Stack Collapse Ratio", STY["td"]),
            Paragraph("~$87/mo niche", STY["td_center"]),
            Paragraph("7 tools at $87", STY["td_center"]),
            Paragraph("1 tool at $15", STY["td_center"]),
            Paragraph("Pricing page calculator", STY["td"]),
        ],
    ]
    story.append(sp(6))
    story.append(make_table(met_data, col_widths=cw_met))

    story.append(body(
        "These metrics will be tracked continuously through the Convex analytics layer and reported in "
        "a weekly dashboard. Each metric has a red/yellow/green threshold: green means Axia is meeting "
        "or exceeding the target, yellow means within 10% of target, and red means more than 10% below "
        "target. Any metric that stays red for two consecutive weeks triggers a review and potential "
        "adjustment to the feature design or implementation approach. The ultimate success metric is "
        "churn rate: if freelancers are canceling their niche tool subscriptions to switch to Axia, the "
        "product is working. This can be measured directly by tracking which competitors users mention "
        "in their onboarding survey and whether they report canceling those subscriptions after 30 days."
    ))

    # ── BUILD ────────────────────────────────────────────────────────────────
    doc.multiBuild(story)
    print(f"PDF generated successfully: {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
