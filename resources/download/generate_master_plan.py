#!/usr/bin/env python3
"""
Axia Complete Feature Master Plan - Competitive Analysis & Implementation Guide
Generated with ReportLab
"""

import os, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Font Registration ──
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif-Bold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'))
registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerif-Bold')
registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')

# ── Palette ──
ACCENT       = colors.HexColor('#4d2cb0')
TEXT_PRIMARY  = colors.HexColor('#252421')
TEXT_MUTED    = colors.HexColor('#8f8c84')
BG_SURFACE   = colors.HexColor('#dfdbd2')
BG_PAGE      = colors.HexColor('#edece9')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ── Page Setup ──
PAGE_W, PAGE_H = A4
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
TOP_M = 0.8 * inch
BOTTOM_M = 0.8 * inch
AVAILABLE_W = PAGE_W - LEFT_M - RIGHT_M

# ── Styles ──
styles = getSampleStyleSheet()

h1_style = ParagraphStyle('H1', fontName='LiberationSerif', fontSize=22, leading=28,
    textColor=ACCENT, spaceBefore=18, spaceAfter=12, alignment=TA_LEFT)
h2_style = ParagraphStyle('H2', fontName='LiberationSerif', fontSize=16, leading=22,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8, alignment=TA_LEFT)
h3_style = ParagraphStyle('H3', fontName='LiberationSerif', fontSize=13, leading=18,
    textColor=ACCENT, spaceBefore=10, spaceAfter=6, alignment=TA_LEFT)
body_style = ParagraphStyle('Body', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6, alignment=TA_JUSTIFY)
body_left = ParagraphStyle('BodyLeft', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6, alignment=TA_LEFT)
bullet_style = ParagraphStyle('Bullet', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=2, leftIndent=24, bulletIndent=12,
    alignment=TA_LEFT)
callout_style = ParagraphStyle('Callout', fontName='LiberationSerif', fontSize=11, leading=18,
    textColor=ACCENT, spaceBefore=6, spaceAfter=6, leftIndent=18, borderPadding=6,
    alignment=TA_LEFT)
caption_style = ParagraphStyle('Caption', fontName='LiberationSerif', fontSize=9, leading=13,
    textColor=TEXT_MUTED, spaceBefore=3, spaceAfter=6, alignment=TA_CENTER)
header_cell_style = ParagraphStyle('HeaderCell', fontName='LiberationSerif', fontSize=10,
    textColor=colors.white, alignment=TA_CENTER, leading=14)
cell_style = ParagraphStyle('Cell', fontName='LiberationSerif', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, leading=13, wordWrap='CJK')
cell_center = ParagraphStyle('CellCenter', fontName='LiberationSerif', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, leading=13)
cell_bold = ParagraphStyle('CellBold', fontName='LiberationSerif', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, leading=13)
small_style = ParagraphStyle('Small', fontName='LiberationSerif', fontSize=9, leading=13,
    textColor=TEXT_MUTED, spaceBefore=0, spaceAfter=4, alignment=TA_LEFT)

# ── Helper Functions ──
def P(text, style=body_style):
    return Paragraph(text, style)

def H1(text):
    return Paragraph(f'<b>{text}</b>', h1_style)

def H2(text):
    return Paragraph(f'<b>{text}</b>', h2_style)

def H3(text):
    return Paragraph(f'<b>{text}</b>', h3_style)

def Bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', bullet_style)

def make_table(headers, rows, col_ratios=None):
    """Create a styled table with headers and rows."""
    data = [[P(f'<b>{h}</b>', header_cell_style) for h in headers]]
    for row in rows:
        data.append([P(str(c), cell_style) if not isinstance(c, Paragraph) else c for c in row])
    
    if col_ratios:
        col_widths = [r * AVAILABLE_W for r in col_ratios]
    else:
        col_widths = None
    
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ── TOC Template ──
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def H1_TOC(text):
    return add_heading(f'<b>{text}</b>', h1_style, level=0)

def H2_TOC(text):
    return add_heading(f'<b>{text}</b>', h2_style, level=1)

H1_ORPHAN = (PAGE_H - TOP_M - BOTTOM_M) * 0.15

def section_break():
    return CondPageBreak(H1_ORPHAN)

# ── Build Document ──
output_path = '/home/z/my-project/download/Axia_Complete_Feature_Master_Plan.pdf'
doc = TocDocTemplate(output_path, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOTTOM_M,
    title='Axia Complete Feature Master Plan',
    author='Z.ai', creator='Z.ai',
    subject='Competitive analysis, feature specifications, and cost projections for Axia')

story = []

# ═══════════════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════════════
story.append(Paragraph('<b>Table of Contents</b>', ParagraphStyle('TOCTitle',
    fontName='LiberationSerif', fontSize=24, leading=30, textColor=ACCENT,
    spaceBefore=24, spaceAfter=18, alignment=TA_LEFT)))
story.append(Spacer(1, 12))

toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle('TOC1', fontName='LiberationSerif', fontSize=13, leading=22,
        leftIndent=20, textColor=TEXT_PRIMARY),
    ParagraphStyle('TOC2', fontName='LiberationSerif', fontSize=11, leading=18,
        leftIndent=44, textColor=TEXT_MUTED),
]
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════
# 1. EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════
story.append(H1_TOC('1. Executive Summary'))
story.append(P('Axia is a freelancer and agency protection platform built on the promise of "1 Tab. Zero chaos." Unlike established SaaS brands such as HoneyBook, Bonsai, or Dubsado, our primary competitors are niche indie tools built by solo developers and small teams, each solving one specific problem exceptionally well. These fragmented tools dominate conversations on X (Twitter), Reddit, Instagram, and LinkedIn, where freelancers recommend single-purpose solutions for proposals, scope creep protection, billing, and payment reminders.'))
story.append(Spacer(1, 6))
story.append(P('This master plan provides a complete competitive analysis of these primary competitors, defines what Axia must build for each of its seven core features, calculates the running costs at scale, and establishes a clear path to building a product where each feature is better than the best single-purpose tool available. The key insight from our research is that while these niche tools excel at one thing, they all suffer from the same fatal flaw: fragmentation. Freelancers juggle five to eight different tools, none of which talk to each other. Axia eliminates this fragmentation by combining every feature into one cohesive workflow where proposals flow into contracts, contracts define scope, scope protection generates change orders, validated work logs feed into invoices, and invoices trigger smart reminders.'))
story.append(Spacer(1, 6))
story.append(P('Our research covered 56 niche competitor tools across all seven feature categories. We found three category-creating opportunities where no adequate tool exists: Validated Billing for knowledge workers, behavior-adaptive payment reminders, and per-project context centralization. We also found that StopScopeCreep.com, the user-flagged primary competitor, is currently offline with a 521 server error, presenting an immediate market capture opportunity for displaced users.'))

story.append(Spacer(1, 12))
story.append(H2('Key Strategic Findings'))
story.append(Bullet('<b>Validated Billing is a category creator</b> - No tool links invoices to verified proof of work for knowledge workers. Hubstaff does screenshots (surveillance model) and Nektyd does field service (wrong market). This is Axia\'s killer differentiator.'))
story.append(Bullet('<b>Smart follow-up sequences are completely absent</b> - No proposal tool offers Day 3/7/14 engagement-aware follow-up sequences. This is the single biggest gap in the proposals market.'))
story.append(Bullet('<b>Scope creep tools are fragmented and immature</b> - Seven niche tools exist, all launched 2024-2026. StopScopeCreep is offline. EasyScope and ScopeAuditor lead but have significant limitations. Auto-detection of scope creep from communications is an unclaimed territory.'))
story.append(Bullet('<b>Payment reminders are primitive</b> - No tool adapts reminders based on client payment behavior, escalates across channels (email to SMS to WhatsApp), or auto-stops reminders when payment is detected.'))
story.append(Bullet('<b>Context management for freelancers does not exist</b> - No tool centralizes all client communication (email, WhatsApp, Slack, files, notes) into one per-project view for freelancers.'))
story.append(Bullet('<b>No AI is required for launch</b> - Every feature can be built with rule-based logic, templates, and smart automation. AI can be added later as a premium enhancement.'))

# ═══════════════════════════════════════════════
# 2. COMPETITIVE LANDSCAPE OVERVIEW
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('2. Competitive Landscape Overview'))
story.append(P('The freelancer tool market is split into two tiers of competition. Secondary competitors are established SaaS platforms like HoneyBook ($19-79/mo), Bonsai ($17-32/mo), Dubsado ($28-44/mo), and Plutio ($19-99/mo). These are all-in-one platforms that do many things adequately but nothing exceptionally. Primary competitors are the focus of this plan: indie builders who solve one specific problem and dominate niche conversations on social media. These are the tools freelancers actually recommend to each other, and they are the benchmark Axia must beat feature-by-feature.'))
story.append(Spacer(1, 8))

story.append(H2_TOC('2.1 Primary vs. Secondary Competition'))
story.append(make_table(
    ['Dimension', 'Primary Competitors (Indie)', 'Secondary Competitors (SaaS)'],
    [
        ['Market Position', 'Niche single-purpose tools', 'All-in-one platforms'],
        ['Marketing Channel', 'X, Reddit, Instagram, LinkedIn', 'Paid ads, SEO, content marketing'],
        ['Price Range', '$0-29/mo', '$17-99/mo'],
        ['Feature Depth', 'Deep in one area, nothing else', 'Broad but shallow everywhere'],
        ['User Loyalty', 'High (word-of-mouth driven)', 'Moderate (switching cost driven)'],
        ['Key Weakness', 'Fragmentation (5-8 tools needed)', 'Nothing exceptional, generic UX'],
        ['Axia Strategy', 'Beat each at their own game', 'Outperform with depth + integration'],
    ],
    [0.18, 0.41, 0.41]
))
story.append(P('Table 1: Primary vs. Secondary Competitive Landscape', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('2.2 Research Coverage Summary'))
story.append(make_table(
    ['Feature Category', 'Tools Researched', 'Category Leaders', 'Market Gap Level'],
    [
        ['Smart Proposals', '12', 'Proposify, Better Proposals, Nusii', 'HIGH - No smart follow-ups'],
        ['CRM and Pipeline', '10', 'Moxie, Plutio, Folk', 'MODERATE - Crowded but generic'],
        ['Validated Billing', '9', 'Bonsai, Harvest, Hubstaff', 'CRITICAL - Category creator'],
        ['Payment Reminders', '15', 'AutoRemind.ai, ChaseAI, Invoice Chase', 'HIGH - No adaptive behavior'],
        ['Scope Creep Protection', '10', 'EasyScope, ScopeAuditor, ScopePilot', 'HIGH - No auto-detection'],
        ['Context Management', '10', 'Missive, Noium, Plutio', 'CRITICAL - No freelancer tool'],
        ['Instant Setup', '8', 'Indy, Bonsai, Moxie', 'MODERATE - Onboarding is basic'],
    ],
    [0.22, 0.14, 0.36, 0.28]
))
story.append(P('Table 2: Research Coverage by Feature Category (56 total tools analyzed)', caption_style))

# ═══════════════════════════════════════════════
# 3. FEATURE 1: SMART PROPOSALS
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('3. Feature 1: Smart Proposals'))
story.append(P('Smart Proposals is the front door of Axia. It is the first feature freelancers interact with and the one that sets the tone for the entire platform. The goal is to build a proposal system that not only matches the best dedicated proposal tools but surpasses them by integrating proposals into the full Axia workflow: proposal to contract to scope definition to invoicing, all without leaving the tab. The critical differentiator is smart follow-up sequences that no competitor currently offers.'))

story.append(H2_TOC('3.1 Competitor Analysis'))
story.append(P('We researched 12 niche proposal tools. The market splits into two groups: dedicated proposal platforms (Proposify, Better Proposals, Nusii, Prospero, Propovo) that offer deep proposal features but nothing else, and all-in-one tools (Bonsai, Worklane, Indy, Moxie) that include proposals alongside other features but with less depth. The following table summarizes the key competitors:'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Tool', 'Price', 'Killer Feature', 'Fatal Gap'],
    [
        ['Proposify', '$29/mo', 'Proposal analytics + content library', 'No follow-ups, no invoicing flow'],
        ['Better Proposals', '$19/mo', 'Beautiful templates + e-signatures', 'No smart follow-ups, standalone only'],
        ['Nusii', '$29/mo', 'Creative agency focus + client portal', 'No follow-up automation'],
        ['Prospero', '$8/mo', 'Budget-friendly proposal builder', 'Limited templates, no analytics'],
        ['Propovo', '$7/mo', 'Cheapest dedicated proposal tool', 'Basic features, no integrations'],
        ['Worklane', 'Free (5 clients)', 'India-first freelancer OS + AI drafts', 'Limited global reach, basic proposals'],
        ['Bonsai', '$17/mo', 'Seamless proposal-to-invoice flow', 'Follow-ups are basic, no analytics'],
        ['Moxie', '$12/mo', 'All-in-one with CRM integration', 'Proposals are shallow vs. dedicated tools'],
    ],
    [0.16, 0.12, 0.36, 0.36]
))
story.append(P('Table 3: Smart Proposals - Primary Competitor Landscape', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('3.2 Critical Market Gap: Smart Follow-Up Sequences'))
story.append(P('No proposal tool on the market offers intelligent, engagement-aware follow-up sequences. Current tools either send no follow-ups at all or offer basic one-time reminders. None analyze whether the client opened the proposal, which sections they viewed, or how much time they spent. This is the single biggest opportunity for Axia to create a feature that has no equivalent in any competitor. A freelancer who sends a proposal and gets no response currently has to manually track when to follow up, what to say, and how to escalate. Axia automates this entire sequence based on client engagement signals.'))
story.append(Spacer(1, 6))
story.append(P('The follow-up sequence should work as follows: When a proposal is sent, the system tracks whether the client opens it. If the client has not opened it by Day 3, a gentle nudge email is sent with a different subject line. If opened but not signed by Day 7, a value-reinforcement email is sent highlighting key benefits. If still unsigned by Day 14, a final-attempt email is sent with a subtle urgency cue. Each email is pre-drafted based on the proposal content, so the freelancer only needs to click "Send" or let it auto-send. This alone would save freelancers an estimated 2-3 hours per week in manual follow-up management.'))

story.append(H2_TOC('3.3 What We Build'))
story.append(make_table(
    ['Feature', 'Description', 'Beats Which Competitor', 'Priority'],
    [
        ['Proposal Builder', 'Drag-and-drop editor with reusable sections, rich text, image embedding, pricing tables, and custom branding', 'Propovo, Prospero', 'P0'],
        ['Template Library', '20+ industry-specific templates (web design, consulting, marketing, development) with one-click customization', 'Better Proposals, Nusii', 'P0'],
        ['E-Signatures', 'Legally binding electronic signatures integrated directly into proposal acceptance flow, no third-party redirect', 'Proposify ($29/mo)', 'P0'],
        ['Client Viewing Analytics', 'Track when client opens proposal, which sections they view, time spent per section, and device used', 'Proposify (their killer feature)', 'P0'],
        ['Smart Follow-Ups Day 3/7/14', 'Auto-generated follow-up emails based on engagement: not opened by Day 3, opened but not signed by Day 7, final attempt Day 14', 'NO COMPETITOR OFFERS THIS', 'P0'],
        ['Proposal-to-Contract Flow', 'One-click convert accepted proposal into a binding contract with scope, deliverables, and payment terms pre-filled', 'Bonsai (basic version)', 'P1'],
        ['Proposal Status Dashboard', 'Visual pipeline showing all proposals by status: Draft, Sent, Viewed, Signed, Expired, Declined', 'Moxie (basic version)', 'P1'],
        ['Proposal Versioning', 'Track all revisions with diff view, client can see what changed between versions', 'None offer this well', 'P2'],
        ['Proposal Chat', 'Inline commenting on proposals so clients can ask questions without emailing separately', 'None offer this', 'P2'],
    ],
    [0.18, 0.38, 0.26, 0.08]
))
story.append(P('Table 4: Smart Proposals - Feature Build Plan', caption_style))

story.append(H2_TOC('3.4 Customer Value'))
story.append(P('For freelancers, proposals are the highest-stakes documents they create. A proposal that gets ignored is lost revenue. Current tools help create proposals but abandon the freelancer after sending. Axia stays with them through the entire close cycle. The smart follow-up sequence alone addresses the number-one pain point freelancers report: clients ghosting after receiving proposals. By automating the follow-up cadence and making it engagement-aware, Axia transforms proposals from a one-shot gamble into a systematic closing process. Freelancers using Axia will close more deals, close them faster, and never lose a deal to poor follow-up timing again. The per-section analytics also help freelancers understand which parts of their proposals resonate and which need improvement, enabling data-driven proposal optimization over time.'))

# ═══════════════════════════════════════════════
# 4. FEATURE 2: CRM & PIPELINE
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('4. Feature 2: CRM and Pipeline'))
story.append(P('The CRM and Pipeline feature transforms Axia from a document tool into a business operating system. While the proposal feature handles the front end of the sales cycle, the pipeline manages the entire journey from lead to repeat client. The key insight from our research is that the freelancer CRM space is surprisingly crowded, but every tool treats CRM as a contact database with basic deal stages. None offer a truly visual, workflow-driven pipeline that integrates with proposals, scope protection, and billing. Axia\'s pipeline must be the connective tissue that ties every other feature together.'))

story.append(H2_TOC('4.1 Competitor Analysis'))
story.append(make_table(
    ['Tool', 'Price', 'Killer Feature', 'Fatal Gap'],
    [
        ['Moxie', '$12/mo', 'All-in-one with customizable pipeline + CRM', 'No validated billing, weak scope protection'],
        ['Plutio', '$19/mo', 'Flat-rate pricing + client portal', 'Client limits on tiers, shallow proposals'],
        ['HoneyBook', '$19/mo', 'Beautiful UI + new Kanban board', 'Expensive, creative-professionals only'],
        ['Dubsado', '$28/mo', 'Powerful workflow automation', 'Dated UI, steep learning curve'],
        ['Attio', '$29/user/mo', 'Notion-like flexibility + AI-native', 'Per-seat pricing, no freelancer features'],
        ['Folk', '$24/user/mo', 'LinkedIn integration + lightweight CRM', 'No invoicing, no proposals, per-seat pricing'],
        ['Indy', '$12/mo', 'Affordable all-in-one', 'No pipeline view, basic CRM'],
    ],
    [0.14, 0.14, 0.36, 0.36]
))
story.append(P('Table 5: CRM and Pipeline - Primary Competitor Landscape', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('4.2 What We Build'))
story.append(make_table(
    ['Feature', 'Description', 'Beats Which Competitor', 'Priority'],
    [
        ['Visual Pipeline Board', 'Kanban-style drag-and-drop board with customizable stages (Lead, Qualified, Proposal Sent, Negotiation, Won, Lost) with deal value and probability', 'Moxie, HoneyBook', 'P0'],
        ['Contact Management', 'Rich client profiles with contact info, company, notes, communication history, all linked deals and projects, and custom fields', 'Indy, Folk', 'P0'],
        ['Deal Tracking', 'Track deal value, probability, expected close date, assigned proposals, and activity timeline per deal', 'Moxie (basic version)', 'P0'],
        ['Pipeline Analytics', 'Conversion rates by stage, average deal cycle time, revenue forecast, win/loss analysis by source', 'None offer freelancer-specific analytics', 'P1'],
        ['Lead Capture Form', 'Embeddable form for website that auto-creates leads in pipeline with source tracking', 'Dubsado (has this)', 'P1'],
        ['Pipeline-to-Proposal', 'One-click create proposal from any deal in pipeline with client and deal details pre-filled', 'Bonsai (basic version)', 'P1'],
        ['Client Portal', 'Branded portal where clients view proposals, approve scope changes, download invoices, and communicate', 'Plutio (their killer feature)', 'P2'],
        ['Activity Timeline', 'Chronological log of all interactions with a client: emails sent, proposals viewed, invoices paid, scope changes', 'None offer unified timeline', 'P2'],
    ],
    [0.18, 0.38, 0.26, 0.08]
))
story.append(P('Table 6: CRM and Pipeline - Feature Build Plan', caption_style))

story.append(H2_TOC('4.3 Customer Value'))
story.append(P('Most freelancers manage their pipeline in spreadsheets, sticky notes, or their inbox. They lose track of warm leads, forget to follow up with qualified prospects, and have no visibility into their revenue forecast. A visual pipeline board transforms their sales process from reactive chaos into proactive revenue management. By integrating the pipeline with proposals and billing, Axia ensures that every deal in the pipeline is connected to real documents and real money, not just a name in a database. The pipeline analytics feature alone addresses a critical gap: freelancers cannot answer basic questions like "What is my close rate?" or "How long does my average deal take?" because no tool gives them these insights in a freelancer-friendly format. Axia makes revenue predictable for the first time.'))

# ═══════════════════════════════════════════════
# 5. FEATURE 3: VALIDATED BILLING
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('5. Feature 3: Validated Billing'))
story.append(P('Validated Billing is Axia\'s category-creating feature. No tool on the market currently links invoices to verified proof of work for knowledge workers and digital freelancers. This feature alone has the potential to define an entirely new product category. The concept is simple but powerful: every invoice line item is backed by evidence of the work done, whether that is tracked time sessions, completed task records, delivered milestones, or attached deliverables. When a client questions an invoice, the freelancer does not need to scramble for proof. It is already attached.'))

story.append(H2_TOC('5.1 Competitor Analysis'))
story.append(make_table(
    ['Tool', 'Price', 'Time-to-Invoice', 'Proof of Work', 'Gap'],
    [
        ['Bonsai', '$17/mo', 'Yes (manual entries)', 'None', 'No verification'],
        ['FreshBooks', '$7/mo', 'Yes (manual entries)', 'None', 'No verification'],
        ['Harvest', '$12/user/mo', 'Yes (core feature)', 'None', 'Time only, no proof'],
        ['Invoice Ninja', 'Free / $10/mo', 'Yes (basic)', 'None', 'No verification'],
        ['Wave', 'Free', 'No time tracking', 'None', 'Pure invoicing'],
        ['Clockify', 'Free / $4/user/mo', 'Yes', 'None', 'No verification'],
        ['Hubstaff', '$7/user/mo', 'Yes', 'Screenshots + activity', 'Surveillance model, not trust'],
        ['Nektyd', 'Custom', 'Yes', 'GPS + photos + timestamps', 'Field service only, wrong market'],
    ],
    [0.14, 0.14, 0.18, 0.24, 0.30]
))
story.append(P('Table 7: Validated Billing - Competitor Landscape', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('5.2 The Category Creation Opportunity'))
story.append(P('The spectrum of invoicing tools today runs from basic invoice generators (Wave, InvoicePlane) that produce documents with no connection to actual work, through time-to-invoice tools (Bonsai, FreshBooks, Harvest) that convert manually entered time into invoice line items but with no verification that the time was actually spent, to surveillance tools (Hubstaff) that take screenshots and track activity as proof of work but in an adversarial employer-employee dynamic, to field service tools (Nektyd) that implement true invoice defense with GPS, timestamps, and photos but for physical work like landscaping and HVAC. Axia occupies the unique position of validated billing for digital knowledge work, where the proof is not screenshots or GPS coordinates but task completions, milestone deliveries, code commits, tracked work sessions, and attached deliverables. The freelancer chooses to attach proof, making it a trust-building mechanism rather than a surveillance tool.'))
story.append(Spacer(1, 6))
story.append(P('The messaging should be direct and compelling: "Your invoices are not just numbers. They are backed by proof of work your clients can verify." No freelancer tool can claim this today. Nektyd uses the phrase "invoice defense records," which is powerful language that Axia can adapt for the digital work context. The framing matters enormously: this is not about monitoring or surveillance, it is about building trust and eliminating disputes before they start.'))

story.append(H2_TOC('5.3 What We Build'))
story.append(make_table(
    ['Feature', 'Description', 'Beats Which Competitor', 'Priority'],
    [
        ['Invoice Builder', 'Professional invoice editor with line items, taxes, discounts, due dates, and custom branding. Auto-numbering and sequential IDs', 'Wave, Invoice Ninja', 'P0'],
        ['Work Log Linking', 'Each invoice line item can be linked to verified work logs: tracked time sessions, completed tasks, delivered milestones. Client sees what work backs each charge', 'NO COMPETITOR OFFERS THIS', 'P0'],
        ['Milestone-Based Invoicing', 'Create invoices tied to project milestones. Invoice auto-generated when milestone is marked complete, with proof attached', 'Bonsai (basic milestones)', 'P0'],
        ['Invoice Defense View', 'Client-facing view showing invoice line items expandable to reveal attached proof: time logs, task completions, deliverable files', 'Nektyd (field service only)', 'P0'],
        ['Recurring Invoices', 'Automated recurring invoices for retainer clients with configurable frequency and auto-send', 'FreshBooks, Bonsai', 'P1'],
        ['Multi-Currency', 'Support for 50+ currencies with live exchange rates for international freelancers', 'Wave (limited)', 'P1'],
        ['Late Fee Automation', 'Automatically add late fees to overdue invoices based on configurable rules (percentage or flat fee)', 'FreshBooks (has this)', 'P1'],
        ['Payment Processing', 'Stripe integration for online payments directly from invoice. Clients pay with card, bank transfer, or local methods', 'Bonsai, Wave', 'P1'],
        ['Expense Tracking', 'Link project expenses to invoices. Receipt upload, categorization, and tax-deductible flagging', 'FreshBooks (has this)', 'P2'],
        ['Financial Reports', 'Revenue by client, revenue by project, outstanding balance, average payment time, tax summaries', 'FreshBooks, Harvest', 'P2'],
    ],
    [0.18, 0.38, 0.26, 0.08]
))
story.append(P('Table 8: Validated Billing - Feature Build Plan', caption_style))

story.append(H2_TOC('5.4 Customer Value'))
story.append(P('Validated Billing directly addresses the number-one financial pain point for freelancers: clients disputing invoices because they cannot see the connection between what they are paying for and the work that was done. Research shows that 37% of freelancers have experienced payment disputes, and the average freelancer loses 12% of annual revenue to scope creep and unpaid work. By attaching proof of work to every invoice line item, Axia eliminates the ambiguity that leads to disputes. Clients who can see the evidence are less likely to question charges, more likely to pay on time, and more likely to trust the freelancer for future engagements. This feature also differentiates Axia in the most powerful way possible: it creates a new category. When freelancers search for "invoice defense" or "proof of work invoicing," there is no competitor in the digital knowledge work space. Axia owns that search intent entirely.'))

# ═══════════════════════════════════════════════
# 6. FEATURE 4: AUTOMATED PAYMENT REMINDERS
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('6. Feature 4: Automated Payment Reminders'))
story.append(P('Late payments are the silent killer of freelance businesses. Research indicates that 60% of freelancers have experienced late payments, with the average invoice paid 14 days past due. Current reminder tools are primitive: they send the same generic email on a fixed schedule, with no intelligence about the client\'s payment behavior, no channel escalation, and no automatic detection of payment receipt. Axia\'s payment reminders will be the smartest in the market, adapting to each client\'s behavior and escalating across channels as urgency increases.'))

story.append(H2_TOC('6.1 Competitor Analysis'))
story.append(P('We researched 15 tools across established platforms and indie builders. The key finding is that no tool offers behavior-adaptive reminders or automated channel escalation. The closest competitors are AutoRemind.ai (AI tone escalation but not invoice-specific) and Invoice Chase (WhatsApp + SMS + Email but manual tap-to-send). Boundix offers 3/7/14 day escalation by tone but via email only and with no payment detection.'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Tool', 'Price', 'Channels', 'Adaptive', 'Payment Detection', 'Key Gap'],
    [
        ['AutoRemind.ai', 'Free / $9/mo', 'Email + Slack + Teams', 'AI tone escalation', 'No', 'Not invoice-specific'],
        ['ChaseAI', '$29/mo', 'Email', 'AI reads invoices', 'No', 'Expensive, no SMS/WhatsApp'],
        ['Invoice Chase', '$9/mo', 'WhatsApp + SMS + Email', '4 auto-tone levels', 'No', 'Manual tap-to-send'],
        ['Boundix', 'Free / $12/mo', 'Email', '3/7/14 day tones', 'No', 'Email only, basic'],
        ['Bonsai', '$17/mo', 'Email', 'Fixed schedule', 'Manual', 'No intelligence'],
        ['FreshBooks', '$7/mo', 'Email', 'Fixed schedule', 'Manual', 'No intelligence'],
        ['Zoho Invoice', 'Free / $15/mo', 'Email + SMS + WhatsApp', 'Custom schedule', 'Manual', 'Not adaptive'],
    ],
    [0.14, 0.12, 0.18, 0.18, 0.12, 0.26]
))
story.append(P('Table 9: Payment Reminders - Competitor Landscape', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('6.2 What We Build'))
story.append(make_table(
    ['Feature', 'Description', 'Beats Which Competitor', 'Priority'],
    [
        ['Smart Reminder Schedule', 'Auto-generate Day 3/7/14 reminder sequence for every overdue invoice. Schedule adapts based on client payment history (e.g., skip Day 3 for clients who always pay on Day 14)', 'NO COMPETITOR OFFERS THIS', 'P0'],
        ['Channel Escalation', 'Day 3: Email (friendly). Day 7: Email + SMS (firm). Day 14: Email + SMS + WhatsApp (final notice). Automated escalation across channels as urgency increases', 'NO COMPETITOR OFFERS THIS', 'P0'],
        ['Payment Auto-Detection', 'Connect Stripe/PayPal webhook. When payment is received, all pending reminders are automatically cancelled. No more "thanks for paying" after a reminder', 'NO COMPETITOR OFFERS THIS', 'P0'],
        ['Tone Templates', 'Three pre-written tone levels: Friendly (Day 3), Professional (Day 7), Firm (Day 14). Each includes invoice details, amount due, and payment link. Freelancer can customize or use as-is', 'Boundix (basic version)', 'P0'],
        ['Payment Link in Reminder', 'Every reminder includes a one-click payment link so clients can pay directly from the reminder email or message', 'Bonsai, FreshBooks', 'P1'],
        ['Client Payment Behavior Profile', 'Track average payment time per client. Show "This client typically pays in 12 days" so freelancers know what to expect', 'None offer this', 'P1'],
        ['Manual Override', 'Freelancer can pause, edit, or cancel any scheduled reminder. Can also send a custom one-off reminder outside the schedule', 'Most tools offer this', 'P1'],
        ['Reminder Analytics', 'Track reminder open rates, click-through rates on payment links, and average time-to-payment after reminders. Shows which tone/channel works best per client', 'None offer this', 'P2'],
    ],
    [0.18, 0.38, 0.26, 0.08]
))
story.append(P('Table 10: Payment Reminders - Feature Build Plan', caption_style))

story.append(H2_TOC('6.3 Customer Value'))
story.append(P('Chasing payments is the most demoralizing part of freelancing. It is uncomfortable, time-consuming, and damages client relationships when done poorly. Axia automates the entire process with intelligence: the system knows when to be friendly and when to be firm, knows which channel to use for each stage, and knows to stop sending reminders the moment payment arrives. The behavior-adaptive scheduling is particularly powerful because it treats different clients differently. A client who always pays within two weeks does not need a Day 3 nudge, but a client who has been late three times needs firmer reminders sooner. This level of personalization does not exist in any tool today, and it transforms payment collection from a dreaded chore into an automated, professional process that protects cash flow without burning bridges.'))

# ═══════════════════════════════════════════════
# 7. FEATURE 5: SCOPE CREEP PROTECTION
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('7. Feature 5: Scope Creep Protection'))
story.append(P('Scope creep is the single biggest revenue leak for freelancers and agencies. Studies show that 52% of all projects experience scope creep, and the average freelancer loses $29,952 per year to unpaid out-of-scope work. The niche scope creep tool market is surprisingly active with seven direct competitors, but the space is fragmented, immature, and every tool launched between 2024 and 2026. Critically, StopScopeCreep.com, the competitor specifically flagged by the user, is currently offline with a 521 server error, potentially leaving its users without a solution.'))

story.append(H2_TOC('7.1 Competitor Analysis'))
story.append(make_table(
    ['Tool', 'Price', 'AI Detection', 'Change Orders', 'Client Portal', 'Key Gap'],
    [
        ['StopScopeCreep', 'Unknown (OFFLINE)', 'Semi-auto (revision tracking)', 'Yes (60-sec approval)', 'Yes', 'WEBSITE IS DOWN - users orphaned'],
        ['EasyScope', 'Free / $9/mo', 'Yes (AI claims)', 'Yes (automated)', 'Yes', 'AI details vague, free tier limited'],
        ['ScopeAuditor', 'Free / $16/mo', 'Yes (paste-based triage)', 'Yes (Revenue Engine)', 'No', 'Manual paste, no passive monitoring'],
        ['ScopePilot', '$14.99/mo', 'Coming soon', 'Yes (auto on limit breach)', 'Yes', 'AI not yet live, one pricing tier'],
        ['Boundix', 'Free / $12/mo', 'No (rule-based)', 'Yes (auto on breach)', 'Yes', 'No AI, 2 project free limit'],
        ['Assentia', 'Free / paid', 'No (manual comparison)', 'Yes (AI generator)', 'Yes', 'Scope is secondary to feedback'],
        ['TryApprove', 'Free / $29/mo', 'No', 'No', 'Yes (white-label)', 'No scope detection at all'],
    ],
    [0.14, 0.16, 0.16, 0.14, 0.12, 0.28]
))
story.append(P('Table 11: Scope Creep Protection - Competitor Landscape', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('7.2 The Auto-Detection Opportunity'))
story.append(P('No tool on the market offers true passive, real-time scope creep detection from communications. EasyScope claims AI detection but the implementation details are vague and likely keyword-based. ScopeAuditor requires manual paste of client messages into a triage engine. ScopePilot\'s AI is listed as "coming soon." Every other tool relies on revision limit tracking, which is reactive rather than proactive. The opportunity for Axia is to build a system that monitors client communications (initially within Axia\'s own context management system, and later via integrations) and flags potential scope creep before the freelancer commits to the extra work. However, since we are not building AI features initially, the first version will use rule-based detection that tracks revision counts against defined limits, compares incoming requests against the agreed scope document, and auto-generates change orders when boundaries are exceeded.'))

story.append(H2_TOC('7.3 What We Build'))
story.append(make_table(
    ['Feature', 'Description', 'Beats Which Competitor', 'Priority'],
    [
        ['Scope Definition', 'Define project scope with deliverables, revision limits per deliverable, exclusions, and assumptions. Links directly to accepted proposal and contract', 'StopScopeCreep, ScopePilot', 'P0'],
        ['Revision Tracking', 'Track every revision request per deliverable. Dashboard shows green/amber/red status based on remaining revisions. Visual indicator when approaching limit', 'ScopePilot (has this)', 'P0'],
        ['Auto Change Orders', 'When revision limit is exceeded or request falls outside scope, auto-generate a priced change order with description, cost impact, and timeline impact. Client approves in one click', 'EasyScope, ScopePilot', 'P0'],
        ['Scope Comparison', 'Side-by-side view of agreed scope vs. new client request. Freelancer marks each request as "In Scope" or "Out of Scope" with one click', 'ScopeAuditor (manual paste version)', 'P0'],
        ['Cost Impact Calculator', 'Show the cost and timeline impact of "small requests" before the freelancer agrees. Turns vague requests into concrete hours, dollars, and deadline shifts', 'EasyScope (has this)', 'P1'],
        ['Change Order Approval Link', 'Client receives a magic link (no login needed) to view and approve change orders. One-click approve or request modification', 'StopScopeCreep (60-sec approval)', 'P1'],
        ['Scope Change History', 'Complete audit trail of all scope changes, change orders, and approvals. Legally defensible record of what was agreed', 'All basic competitors', 'P1'],
        ['Retainer Hour Tracking', 'For retainer clients, track hours against retainer allocation. Auto-generate change order when retainer hours are exceeded', 'EasyScope (has this)', 'P2'],
        ['Scope Template Library', 'Pre-built scope templates by industry (web design, marketing, consulting) with common deliverables, revision limits, and exclusions', 'None offer this', 'P2'],
    ],
    [0.18, 0.38, 0.26, 0.08]
))
story.append(P('Table 12: Scope Creep Protection - Feature Build Plan', caption_style))

story.append(H2_TOC('7.4 Customer Value'))
story.append(P('Scope creep protection addresses the most insidious form of revenue loss because it happens gradually and often with the freelancer\'s unwitting cooperation. Each "small request" seems reasonable in isolation, but over the course of a project, these requests can add up to 20-30% more work for zero additional pay. Axia makes scope creep visible and manageable by defining clear boundaries upfront, tracking every deviation, and providing a frictionless mechanism for converting out-of-scope requests into paid change orders. The cost impact calculator is particularly valuable because it removes the emotional difficulty of saying no to clients. Instead of the freelancer having to push back verbally, the tool shows the client in concrete terms what their request costs in time and money, making the conversation objective rather than adversarial. Freelancers using Axia will never again do free work out of awkwardness or poor scope documentation.'))

# ═══════════════════════════════════════════════
# 8. FEATURE 6: CONTEXT MANAGEMENT
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('8. Feature 6: Context Management'))
story.append(P('Context Management is the feature that eliminates the most frustrating aspect of freelancer life: searching through emails, Slack messages, WhatsApp chats, and file folders to find that one thing a client said three weeks ago. No tool on the market centralizes all client communication into a single per-project view for freelancers. The closest tools are team-focused platforms like Missive ($14-26/user/mo) and Front ($25-229/user/mo) that unify inboxes for teams, but they are priced for enterprises and organized around inbox management rather than project context. Axia\'s context management will give every project its own communication hub where all messages, files, notes, and decisions live together.'))

story.append(H2_TOC('8.1 Competitor Analysis'))
story.append(make_table(
    ['Tool', 'Price', 'Email', 'Chat', 'Files', 'Per-Project View', 'Auto-Centralize', 'Key Gap'],
    [
        ['Missive', '$14/user/mo', 'Yes', 'Slack + WhatsApp', 'No', 'Inbox-level only', 'Partial', 'Team-focused, not freelancer'],
        ['Front', '$25/user/mo', 'Yes', 'Slack + Teams', 'No', 'Inbox-level only', 'Partial', 'Enterprise pricing'],
        ['Noium', 'Custom', 'Yes', 'Yes', 'Yes', 'Per-client workspace', 'Yes (closest)', 'Built for accounting firms'],
        ['Plutio', '$19/mo', 'Auto-sort', 'No', 'Yes', 'Per-client timeline', 'Partial', 'Email only, no chat'],
        ['Notion', 'Free / $8/mo', 'No', 'No', 'Yes', 'Manual setup', 'No', 'Requires manual organization'],
        ['Indy', '$12/mo', 'No', 'No', 'Yes', 'Project portal', 'No', 'No email/chat integration'],
    ],
    [0.10, 0.12, 0.08, 0.10, 0.08, 0.16, 0.14, 0.22]
))
story.append(P('Table 13: Context Management - Competitor Landscape', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('8.2 What We Build (Without AI)'))
story.append(P('Since we are not using AI or AI API keys at launch, context management will rely on manual organization, smart routing rules, and structured communication rather than AI-powered summarization. The initial version provides a centralized hub where freelancers manually link communications to projects, with smart defaults that reduce friction. Future AI enhancements (phase 2) will add auto-routing, summarization, and intelligent suggestions.'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Feature', 'Description', 'Beats Which Competitor', 'Priority'],
    [
        ['Project Communication Hub', 'Every project has a dedicated communication tab showing all linked messages, notes, files, and decisions in chronological order. Single source of truth per project', 'None offer freelancer-specific hub', 'P0'],
        ['Notes and Decisions', 'Rich text notes per project with decision logging. Mark entries as "Decision" to create a searchable decision log. Tag team members or clients', 'Notion (manual setup required)', 'P0'],
        ['File Management', 'Upload and organize files per project. Version tracking, file previews, and link to relevant deliverables or invoices', 'Indy (basic file storage)', 'P0'],
        ['Email Forwarding Address', 'Each project gets a unique forwarding address. Freelancer forwards client emails to this address and they auto-attach to the project timeline', 'Missive (inbox-level only)', 'P1'],
        ['Message Templates', 'Pre-built templates for common client communications: project kickoff, status update, delivery notification, revision request, scope change notification', 'None offer project-specific templates', 'P1'],
        ['Communication Timeline', 'Chronological timeline of all project activity: proposals sent, scope changes, invoices, notes, files uploaded, decisions made', 'Plutio (per-client timeline)', 'P1'],
        ['Quick Capture', 'Mobile-friendly quick note capture. Snap a photo of a whiteboard, record a voice memo, or type a quick note and assign it to a project', 'None offer this', 'P2'],
        ['Client-Facing Updates', 'Send structured project updates to clients directly from the context hub. Client receives a clean email with progress, notes, and any action items', 'None offer this', 'P2'],
    ],
    [0.18, 0.38, 0.26, 0.08]
))
story.append(P('Table 14: Context Management - Feature Build Plan', caption_style))

story.append(H2_TOC('8.3 Customer Value'))
story.append(P('The average freelancer spends 2.5 hours per week searching for information across emails, chat apps, and file folders. Context Management eliminates this waste by giving every project its own single source of truth. When a client asks "What did we decide about the homepage redesign?", the freelancer does not need to scroll through three weeks of email threads. The decision is logged in the project hub, searchable, and connected to the relevant scope document and proposal. The email forwarding feature is particularly powerful because it requires minimal behavior change: freelancers already receive client emails, they just forward them to the project address and the system does the rest. This is the kind of invisible automation that makes a tool feel magical without requiring the freelancer to learn new workflows.'))

# ═══════════════════════════════════════════════
# 9. FEATURE 7: INSTANT SETUP
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('9. Feature 7: Instant Setup'))
story.append(P('Instant Setup is the feature that determines whether a freelancer becomes a user or bounces. The promise of Axia is "1 Tab. Zero chaos," and that promise must be fulfilled from the first interaction. If onboarding takes more than 10 minutes, the promise is broken. Current competitors range from Indy\'s quick 3-step setup to Dubsado\'s notorious 2-hour configuration process. Axia must achieve the fastest time-to-value of any freelancer tool on the market while still capturing enough information to make every feature work immediately.'))

story.append(H2_TOC('9.1 Competitor Analysis'))
story.append(make_table(
    ['Tool', 'Setup Time', 'Onboarding Flow', 'First Value Moment'],
    [
        ['Indy', '2-3 minutes', 'Name, email, industry, done', 'Create first proposal'],
        ['Bonsai', '5-7 minutes', 'Name, industry, business type, template selection', 'Send first proposal'],
        ['Moxie', '5-10 minutes', 'Business profile, client import, pipeline setup', 'See pipeline populated'],
        ['HoneyBook', '15-30 minutes', 'Extensive business profile, template customization, automations setup', 'First automation runs'],
        ['Dubsado', '1-2 hours', 'Forms, workflows, templates, automations all manual', 'First workflow executes'],
        ['Plutio', '10-15 minutes', 'Workspace setup, invite team, create first project', 'First project created'],
    ],
    [0.14, 0.14, 0.36, 0.36]
))
story.append(P('Table 15: Instant Setup - Competitor Landscape', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('9.2 What We Build'))
story.append(make_table(
    ['Feature', 'Description', 'Beats Which Competitor', 'Priority'],
    [
        ['3-Step Onboarding', 'Step 1: Name and email (auto-filled from auth). Step 2: Industry selection (pre-populates templates, scope templates, and proposal templates). Step 3: First project name and client email. Dashboard loads immediately', 'Indy (similar speed but no customization)', 'P0'],
        ['Industry Smart Defaults', 'Based on industry selection, auto-populate: proposal templates, scope templates, default hourly rate, invoice terms, reminder schedule, and pipeline stages', 'Bonsai (basic version)', 'P0'],
        ['Template Pre-Loading', 'Upon signup, user gets 3 proposal templates, 3 scope templates, 3 invoice templates, and 5 reminder templates specific to their industry. No blank screens', 'None offer industry-specific pre-loading', 'P0'],
        ['Guided First Action', 'After onboarding, a non-intrusive guide suggests the highest-value first action: "Create your first proposal" or "Add your first client" based on industry', 'Moxie (basic version)', 'P1'],
        ['Demo Data Toggle', 'Toggle to fill the dashboard with realistic demo data so the user sees how a mature account looks. Can be turned off when ready for real data', 'None offer this well', 'P1'],
        ['Client Import', 'CSV import or manual entry for existing clients. Auto-create pipeline deals for imported clients', 'HoneyBook (has this)', 'P1'],
        ['Progressive Disclosure', 'Advanced features (recurring invoices, custom fields, webhooks) are hidden until the user has completed basic setup. Prevents overwhelm', 'None implement this well', 'P2'],
    ],
    [0.18, 0.38, 0.26, 0.08]
))
story.append(P('Table 16: Instant Setup - Feature Build Plan', caption_style))

story.append(H2_TOC('9.3 Customer Value'))
story.append(P('The single biggest reason freelancers abandon SaaS tools is the time investment required before seeing value. If a freelancer cannot create something useful within the first five minutes, they leave and never return. Axia\'s instant setup ensures that every new user lands on a populated dashboard with industry-specific templates, a pre-configured pipeline, and a clear next action within three clicks. The industry smart defaults are the secret weapon: a web designer signing up gets different templates, rates, and pipeline stages than a marketing consultant, making the tool feel custom-built rather than generic. This personalization without effort is what makes the difference between a tool that feels like it was made for you and a tool that feels like it was made for everyone.'))

# ═══════════════════════════════════════════════
# 10. INTEGRATION ARCHITECTURE
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('10. Integration Architecture: How Features Connect'))
story.append(P('The single most powerful aspect of Axia is not any individual feature but the way all features connect into a single workflow. This is the "1 Tab" promise: every feature is accessible from one interface, and data flows between features automatically. When a proposal is accepted, it creates a contract and defines the project scope. When scope is defined, revision tracking begins automatically. When a revision exceeds the limit, a change order is generated. When a change order is approved, the invoice is updated. When the invoice is sent, the reminder schedule starts. When payment is received, reminders stop. This chain of automation eliminates the manual data entry and tool-switching that costs freelancers hours every week.'))
story.append(Spacer(1, 8))

story.append(make_table(
    ['Workflow Step', 'From Feature', 'To Feature', 'What Flows', 'Automation Level'],
    [
        ['1. Lead enters pipeline', 'CRM/Pipeline', 'Smart Proposals', 'Client name, email, deal details', 'Manual trigger'],
        ['2. Proposal created', 'Smart Proposals', 'CRM/Pipeline', 'Proposal status updates deal stage', 'Auto'],
        ['3. Proposal accepted', 'Smart Proposals', 'Scope Protection', 'Deliverables, pricing, timeline become scope definition', 'Auto'],
        ['4. Proposal accepted', 'Smart Proposals', 'Validated Billing', 'Payment schedule becomes invoice milestones', 'Auto'],
        ['5. Scope change requested', 'Scope Protection', 'Validated Billing', 'Approved change order updates invoice', 'Auto'],
        ['6. Work logged', 'Time Tracking', 'Validated Billing', 'Work sessions attach to invoice line items', 'Auto'],
        ['7. Invoice sent', 'Validated Billing', 'Payment Reminders', 'Reminder schedule starts based on due date', 'Auto'],
        ['8. Payment received', 'Payment Reminders', 'Validated Billing', 'Invoice marked paid, reminders cancelled', 'Auto (via Stripe webhook)'],
        ['9. Any communication', 'Context Management', 'All Features', 'Messages, notes, decisions linked to relevant project', 'Manual + rules'],
    ],
    [0.14, 0.16, 0.16, 0.30, 0.14]
))
story.append(P('Table 17: Feature Integration Workflow', caption_style))
story.append(Spacer(1, 8))

story.append(P('This integration architecture is Axia\'s deepest competitive moat. No single-purpose tool can replicate it because they only have one feature. No all-in-one platform replicates it because their features were built separately and bolted together. Axia is designed from the ground up as a connected system where every feature naturally feeds the next, creating a compounding efficiency advantage that grows with every project a freelancer manages.'))

# ═══════════════════════════════════════════════
# 11. COST ANALYSIS
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('11. Running Cost Analysis'))
story.append(P('Understanding the cost structure at different scales is critical for pricing decisions and financial planning. This section provides detailed cost projections for running Axia at 100, 1,000, and 5,000 users. All costs are based on current pricing for the infrastructure services Axia uses, with Convex as the primary backend, Resend for email delivery, Stripe for payment processing, and Cloudflare R2 for file storage.'))

story.append(H2_TOC('11.1 Infrastructure Cost per Service'))
story.append(make_table(
    ['Service', 'Free Tier', 'Paid Pricing', 'What Scales', 'Notes'],
    [
        ['Convex (Backend)', '500K function calls/mo, 1GB storage', '$25/mo Pro: 10M calls, 10GB; $100/mo Team', 'Function calls, storage, bandwidth', 'Primary backend for all features'],
        ['Resend (Email)', '3,000 emails/mo', '$20/mo for 50K emails, then $0.40/1K', 'Emails sent (reminders, proposals, notifications)', 'Smart follow-ups are email-heavy'],
        ['Stripe (Payments)', 'No monthly fee', '2.9% + $0.30 per transaction', 'Transaction volume', 'Only when users process payments'],
        ['Cloudflare R2 (Storage)', '10GB free', '$0.015/GB/mo storage, $0.36/M writes', 'File uploads (proposals, deliverables)', 'S3-compatible, no egress fees'],
        ['Twilio (SMS)', 'No free tier', '$0.0079/SMS (US), varies by country', 'SMS reminders (Day 7+ escalation)', 'Only for paid tier users'],
        ['WhatsApp Business API', 'No free tier', '$0.005-0.09/conversation depending on country', 'WhatsApp reminders (Day 14)', 'Only for premium users, highest urgency'],
        ['Domain + SSL', '~$12/yr', 'Included', 'Fixed cost', 'Negligible at scale'],
    ],
    [0.14, 0.20, 0.24, 0.20, 0.22]
))
story.append(P('Table 18: Infrastructure Service Pricing', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('11.2 Cost Projections by User Count'))
story.append(P('The following projections assume average per-user monthly activity based on typical freelancer behavior: 4 proposals sent, 6 invoices generated, 3 payment reminder sequences triggered, 2 scope change events, and moderate file uploads. These are conservative estimates based on user research data.'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Cost Category', '100 Users/mo', '1,000 Users/mo', '5,000 Users/mo'],
    [
        ['Convex (Backend)', '$25 (Pro plan)', '$100 (Team plan)', '$300-500 (scale plan)'],
        ['Resend (Email)', '$0 (free tier covers)', '$40-80', '$300-600'],
        ['Stripe (Processing)', '$0 (revenue share)', '$0 (revenue share)', '$0 (revenue share)'],
        ['Cloudflare R2 (Storage)', '$0 (free tier)', '$15-30', '$75-150'],
        ['Twilio (SMS)', '$0 (not enabled yet)', '$50-80', '$300-500'],
        ['WhatsApp API', '$0 (not enabled yet)', '$20-40', '$150-300'],
        ['Monitoring/Logging', '$0 (Convex included)', '$10', '$30-50'],
        ['Total Infrastructure', '$25/mo', '$235-340/mo', '$855-2,100/mo'],
        ['Cost Per User', '$0.25/mo', '$0.24-0.34/mo', '$0.17-0.42/mo'],
    ],
    [0.24, 0.24, 0.26, 0.26]
))
story.append(P('Table 19: Monthly Infrastructure Cost Projections', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('11.3 Revenue Projections'))
story.append(P('Axia\'s pricing model uses three tiers: Starter at $7/mo, Professional at $15/mo, and Agency at $49/mo. Based on typical SaaS conversion rates (15% free-to-paid, 70% on lowest tier, 20% on middle, 10% on highest), the revenue projections are as follows:'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Revenue Metric', '100 Users', '1,000 Users', '5,000 Users'],
    [
        ['Free Users (85%)', '85', '850', '4,250'],
        ['Paid Users (15%)', '15', '150', '750'],
        ['Starter ($7/mo, 70% of paid)', '$74/mo', '$735/mo', '$3,675/mo'],
        ['Professional ($15/mo, 20% of paid)', '$45/mo', '$450/mo', '$2,250/mo'],
        ['Agency ($49/mo, 10% of paid)', '$74/mo', '$735/mo', '$3,675/mo'],
        ['Total MRR', '$193/mo', '$1,920/mo', '$9,600/mo'],
        ['Infrastructure Cost', '$25/mo', '$288/mo', '$1,478/mo'],
        ['Gross Margin', '87%', '85%', '85%'],
        ['Net per month (before labor)', '$168/mo', '$1,632/mo', '$8,122/mo'],
    ],
    [0.28, 0.24, 0.24, 0.24]
))
story.append(P('Table 20: Revenue Projections and Gross Margin', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('11.4 Feature-by-Feature Cost Breakdown'))
story.append(P('Each feature has a different cost profile based on its infrastructure requirements. The following table breaks down the marginal cost per user per feature at 1,000 users. This helps prioritize development order based on cost efficiency: features with low cost and high value should be built first.'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Feature', 'Primary Cost Driver', 'Cost/User/mo at 1K Users', 'Revenue Contribution', 'Cost Efficiency'],
    [
        ['Smart Proposals', 'Resend emails (follow-ups)', '$0.04', 'High (first value moment)', 'Excellent'],
        ['CRM and Pipeline', 'Convex function calls', '$0.06', 'High (retention driver)', 'Excellent'],
        ['Validated Billing', 'Convex storage + R2 files', '$0.05', 'Critical (core differentiator)', 'Excellent'],
        ['Payment Reminders', 'Resend + Twilio + WhatsApp', '$0.10', 'High (protects revenue)', 'Good'],
        ['Scope Creep Protection', 'Convex function calls + R2', '$0.04', 'High (prevents revenue loss)', 'Excellent'],
        ['Context Management', 'R2 storage + Convex queries', '$0.05', 'Moderate (convenience)', 'Good'],
        ['Instant Setup', 'Convex function calls (one-time)', '$0.001', 'Critical (conversion)', 'Outstanding'],
    ],
    [0.16, 0.24, 0.18, 0.22, 0.14]
))
story.append(P('Table 21: Feature Cost Efficiency at 1,000 Users', caption_style))
story.append(Spacer(1, 8))

story.append(P('The cost analysis reveals an extremely favorable unit economics picture. At 1,000 users, the cost per user is approximately $0.24-0.34 per month while the average revenue per paid user is approximately $12.80 per month. This gives Axia an 85% gross margin before labor costs, which is exceptional for a SaaS product. The most cost-efficient features are Instant Setup (nearly free, drives conversion), Smart Proposals, and Scope Creep Protection (both under $0.05/user/mo). Payment Reminders are the most expensive feature per user due to SMS and WhatsApp costs, but they also protect revenue directly by reducing late payments. Stripe processing fees are a pass-through and do not affect gross margin since they scale proportionally with transaction volume.'))

# ═══════════════════════════════════════════════
# 12. IMPLEMENTATION ROADMAP
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('12. Implementation Roadmap'))
story.append(P('The implementation is organized into four phases, each building on the previous one and delivering a coherent, usable product increment. The phases are designed so that each phase results in a product that freelancers can actually use and pay for, rather than waiting for all features to be complete before generating revenue. Phase 1 delivers the minimum viable product that fulfills the core promise. Phase 2 adds the protective features. Phase 3 adds the revenue acceleration features. Phase 4 adds the premium differentiators.'))
story.append(Spacer(1, 8))

story.append(make_table(
    ['Phase', 'Features', 'Duration', 'Deliverable', 'Users Can...'],
    [
        ['Phase 1: Foundation', 'Instant Setup, CRM/Pipeline, Smart Proposals (basic)', '4-5 weeks', 'MVP that freelancers can sign up and use immediately', 'Sign up in 3 min, create proposals, track deals'],
        ['Phase 2: Protection', 'Scope Creep Protection, Validated Billing, Payment Reminders (email only)', '4-5 weeks', 'Full protection suite that prevents revenue loss', 'Define scope, auto-generate change orders, send validated invoices, get email reminders'],
        ['Phase 3: Acceleration', 'Smart Follow-Ups (Day 3/7/14), SMS reminders, Context Management, Proposal analytics', '3-4 weeks', 'Revenue acceleration features that increase close rates and speed up payments', 'Auto-follow up on proposals, escalate reminders to SMS, centralize project comms'],
        ['Phase 4: Premium', 'WhatsApp reminders, Client portal, Financial reports, API access, Integrations', '3-4 weeks', 'Premium features that justify higher pricing tiers and reduce churn', 'Use WhatsApp reminders, give clients a portal, access reports and integrations'],
    ],
    [0.12, 0.24, 0.10, 0.26, 0.28]
))
story.append(P('Table 22: Implementation Roadmap by Phase', caption_style))
story.append(Spacer(1, 8))

story.append(H2_TOC('12.1 Convex Schema Additions'))
story.append(P('Each new feature requires additional Convex tables. The following schema additions are needed beyond the existing 30+ tables in the current Axia Convex schema. These tables are designed to support the integration architecture described in Section 10, with foreign key relationships that enable automatic data flow between features.'))
story.append(Spacer(1, 6))

schema_rows = [
    ['proposals', 'projectId, clientId, title, content (JSON), templateId, status (draft/sent/viewed/signed/expired/declined), version, createdBy, createdAt, sentAt, viewedAt, signedAt, expiresAt', 'P0'],
    ['proposalTemplates', 'name, industry, content (JSON), isDefault, createdBy', 'P0'],
    ['proposalFollowUps', 'proposalId, sequenceDay (3/7/14), status (pending/sent/skipped), emailContent, sentAt, openedAt', 'P0'],
    ['proposalViewEvents', 'proposalId, sectionId, viewedAt, durationSeconds, device', 'P1'],
    ['deals', 'pipelineId, clientId, title, value, probability, stage, expectedCloseDate, proposalId, createdBy, createdAt', 'P0'],
    ['pipelineStages', 'name, order, color, isDefault, createdBy', 'P0'],
    ['invoices', 'projectId, clientId, proposalId, invoiceNumber, lineItems (JSON), subtotal, tax, total, currency, status (draft/sent/paid/overdue/cancelled), dueDate, paidAt, stripePaymentIntentId', 'P0'],
    ['invoiceWorkLinks', 'invoiceId, lineItemIndex, workSessionId, taskId, milestoneId, deliverableUrl, description', 'P0'],
    ['paymentReminders', 'invoiceId, sequenceDay, channel (email/sms/whatsapp), tone (friendly/professional/firm), status (scheduled/sent/cancelled), sentAt, content', 'P0'],
    ['clientPaymentProfiles', 'clientId, averagePaymentDays, onTimeRate, lastPaymentDate, preferredChannel, reminderPreference', 'P1'],
    ['scopeDefinitions', 'projectId, proposalId, deliverables (JSON), revisionLimits (JSON), exclusions (JSON), assumptions (JSON), clientApprovedAt', 'P0'],
    ['scopeChangeOrders', 'scopeDefinitionId, requestedBy, description, costImpact, timelineImpact, status (pending/approved/rejected), clientApprovedAt, clientApprovalLink', 'P0'],
    ['scopeRevisionEvents', 'scopeDefinitionId, deliverableId, revisionNumber, requestedAt, description, isOutOfScope', 'P0'],
    ['projectContexts', 'projectId, type (note/decision/file/email/message), content, createdBy, createdAt, metadata (JSON)', 'P0'],
    ['contextEmailAddresses', 'projectId, emailAddress, forwardingRuleId', 'P1'],
]
story.append(make_table(
    ['Table Name', 'Key Fields', 'Phase'],
    schema_rows,
    [0.18, 0.70, 0.08]
))
story.append(P('Table 23: Convex Schema Additions Required', caption_style))

# ═══════════════════════════════════════════════
# 13. NO-AI STRATEGY
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('13. No-AI Strategy: How to Win Without AI'))
story.append(P('A critical constraint for the current phase is that Axia will not use any AI features, AI API keys, or machine learning models. This is actually an advantage, not a limitation. Many indie competitors claim AI features that are either keyword-matching dressed up as intelligence or shallow wrappers around ChatGPT that add cost without reliability. By building without AI, Axia delivers deterministic, reliable features that work the same way every time, at a fraction of the cost. The following table shows how each feature achieves its goals using rule-based logic, templates, and smart automation instead of AI.'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Feature', 'What Competitors Use AI For', 'How Axia Does It Without AI', 'Advantage'],
    [
        ['Smart Proposals', 'AI auto-draft proposals (Worklane, Pendown)', 'Template library with industry-specific content. Section-based builder with pre-written blocks. Smart variable insertion from CRM data', 'More reliable, no hallucinated content, no API cost'],
        ['Proposal Follow-Ups', 'None (no competitor does this)', 'Rule-based Day 3/7/14 schedule. Template-based email content with proposal-specific variables. Engagement-aware routing using view tracking events', 'First to market, deterministic behavior'],
        ['Scope Creep Detection', 'AI triage (ScopeAuditor), AI detection (EasyScope)', 'Revision count tracking against defined limits. Manual scope comparison tool with one-click in/out marking. Auto-change-order generation on limit breach', 'No false positives from AI, freelancer stays in control'],
        ['Payment Reminders', 'AI tone generation (AutoRemind)', 'Pre-written tone templates (Friendly/Professional/Firm). Behavior-adaptive scheduling using payment history statistics. Channel escalation rules based on overdue days', 'Consistent tone, no weird AI phrasing, no API cost'],
        ['Context Management', 'AI summarization (future)', 'Manual note-taking with structured decision logging. Email forwarding with auto-tagging by project address. Chronological timeline with type filtering', 'More accurate, no AI hallucination in summaries'],
        ['Validated Billing', 'None (no competitor does this)', 'Direct linking of work sessions, tasks, and milestones to invoice line items. Client-facing expandable proof view. Stripe webhook payment detection', 'Category creator, no AI needed for core value'],
    ],
    [0.14, 0.24, 0.34, 0.28]
))
story.append(P('Table 24: No-AI Implementation Strategy', caption_style))
story.append(Spacer(1, 8))

story.append(P('The no-AI approach also has a significant cost advantage. At 1,000 users, AI-powered features using OpenAI\'s API would add approximately $0.10-0.30 per user per month in API costs, depending on usage. At 5,000 users, this translates to $500-1,500 per month in API costs alone. Axia\'s rule-based approach costs nearly zero for these features, preserving the 85% gross margin. When AI is eventually added in a future phase, it will be as a premium upsell feature that generates additional revenue rather than a cost center that erodes margins.'))

# ═══════════════════════════════════════════════
# 14. COMPETITIVE POSITIONING SUMMARY
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('14. Competitive Positioning Summary'))
story.append(P('The following matrix shows how Axia compares against the best niche competitor for each feature. The goal is not to match but to exceed each competitor at their own specialty while providing the integration advantage that no single-purpose tool can offer.'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Feature', 'Best Niche Competitor', 'Their Best Feature', 'Axia\'s Advantage', 'Axia Integration Bonus'],
    [
        ['Smart Proposals', 'Better Proposals ($19/mo)', 'Beautiful templates + e-signatures', 'Smart follow-ups Day 3/7/14 (nobody has this) + proposal-to-contract-to-scope flow', 'Proposal auto-creates scope definition and pipeline deal'],
        ['CRM and Pipeline', 'Moxie ($12/mo)', 'All-in-one with customizable pipeline', 'Integrated with proposals, billing, and scope. No data silos', 'Pipeline deal auto-populates from proposal acceptance'],
        ['Validated Billing', 'Hubstaff ($7/user/mo)', 'Screenshots as proof of work', 'Trust-based proof (not surveillance). Work logs + tasks + milestones, not screenshots', 'Invoice auto-updates when change orders are approved'],
        ['Payment Reminders', 'Invoice Chase ($9/mo)', 'WhatsApp + SMS + Email channels', 'Behavior-adaptive scheduling + payment auto-detection + channel escalation', 'Reminders auto-stop when Stripe detects payment'],
        ['Scope Creep', 'EasyScope ($9/mo)', 'AI scope detection + cost simulator', 'Full integration with proposals, contracts, and billing. Change orders update invoices', 'Approved change orders automatically update invoice amounts'],
        ['Context Management', 'Noium (custom pricing)', 'Per-client workspace centralization', 'Built for freelancers, not accounting firms. Email forwarding + notes + decisions in one place', 'All context linked to project, proposal, and invoice'],
        ['Instant Setup', 'Indy (Free/$12/mo)', '2-3 minute setup', 'Industry smart defaults + template pre-loading. 3-step onboarding with personalized dashboard', 'Templates auto-populated from industry, no blank screens'],
    ],
    [0.12, 0.14, 0.18, 0.30, 0.26]
))
story.append(P('Table 25: Axia vs. Best Niche Competitor per Feature', caption_style))
story.append(Spacer(1, 8))

story.append(P('The pattern is clear: Axia matches or exceeds the best niche competitor in every feature category, and adds an integration bonus that no single-purpose tool can replicate. This dual advantage is the core of Axia\'s competitive positioning: depth in each feature plus connectivity between all features. The messaging should be simple and direct: "Every feature is better than the best single-purpose tool. And they all work together."'))

# ═══════════════════════════════════════════════
# 15. PRICING STRATEGY
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('15. Pricing Strategy'))
story.append(P('Pricing must balance three goals: undercutting the total cost of fragmented tools (which averages $40-80/mo when combined), maintaining healthy gross margins (target 85%), and creating clear upgrade incentives between tiers. The current live site pricing of $7/$15/$49 is well-positioned for the market. This section validates that pricing against competitor benchmarks and cost structure.'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Tier', 'Price', 'Target User', 'Key Features', 'Competitor Benchmark'],
    [
        ['Starter', '$7/mo', 'Solo freelancer starting out', '3 proposals/mo, CRM with 25 contacts, basic invoicing, email reminders, 1 project scope', 'Cheaper than EasyScope ($9), Indy ($12), Moxie ($12)'],
        ['Professional', '$15/mo', 'Established freelancer', 'Unlimited proposals, full CRM, validated billing with proof, email + SMS reminders, unlimited scope projects, context hub', 'Cheaper than Proposify ($29), Better Proposals ($19), ScopeAuditor ($16)'],
        ['Agency', '$49/mo', 'Small agency (2-5 people)', 'Everything in Pro + team members, client portal, WhatsApp reminders, financial reports, API access, priority support', 'Cheaper than HoneyBook ($79), Dubsado ($44/mo), Plutio ($49)'],
    ],
    [0.10, 0.08, 0.16, 0.36, 0.30]
))
story.append(P('Table 26: Pricing Tier Strategy', caption_style))
story.append(Spacer(1, 8))

story.append(P('The total cost of fragmented tools for a freelancer using the best single-purpose tool in each category would be approximately: Proposify ($29) + Moxie ($12) + EasyScope ($9) + Invoice Chase ($9) + Notion ($8) = $67/month. Axia Professional at $15/month replaces all of these at 78% less cost, with the added benefit of full integration. This is the core value proposition: better than each individual tool, cheaper than the combined cost, and everything works together. The Starter tier at $7 is intentionally priced below every dedicated competitor to serve as a low-risk entry point. The Agency tier at $49 is priced to match Plutio\'s base plan while offering significantly more depth in scope protection and validated billing.'))

# ═══════════════════════════════════════════════
# 16. TOTAL COST SUMMARY
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('16. Total Cost Summary and Financial Projections'))
story.append(P('This section consolidates all cost data into a single financial model showing the path from launch to 5,000 users. The model assumes a 12-month timeline with steady growth, phased feature rollout, and escalating marketing spend. Labor costs are excluded since they depend on team composition, but infrastructure costs are fully accounted for.'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Metric', 'Month 1-3 (Launch)', 'Month 4-6 (Growth)', 'Month 7-9 (Scale)', 'Month 10-12 (Mature)'],
    [
        ['Total Users', '100-300', '300-1,000', '1,000-3,000', '3,000-5,000'],
        ['Paid Users', '15-45', '45-150', '150-450', '450-750'],
        ['Monthly Revenue', '$193-580', '$580-1,920', '$1,920-5,760', '$5,760-9,600'],
        ['Infrastructure Cost', '$25-50', '$50-300', '$300-800', '$800-2,100'],
        ['SMS/WhatsApp Cost', '$0', '$20-80', '$80-300', '$300-800'],
        ['Email Cost', '$0-10', '$10-50', '$50-200', '$200-600'],
        ['Gross Margin', '85-90%', '82-88%', '80-86%', '78-85%'],
        ['Cumulative Revenue', '$1,160', '$6,300', '$28,000', '$82,000'],
        ['Cumulative Infra Cost', '$130', '$800', '$4,200', '$16,000'],
        ['Cumulative Net (pre-labor)', '$1,030', '$5,500', '$23,800', '$66,000'],
    ],
    [0.22, 0.20, 0.20, 0.20, 0.20]
))
story.append(P('Table 27: 12-Month Financial Projection', caption_style))
story.append(Spacer(1, 8))

story.append(P('The financial model shows that Axia reaches profitability (infrastructure costs covered by revenue) within the first month of operation at even 100 users, thanks to the extremely low per-user infrastructure cost of approximately $0.25 per month. By month 12 at 5,000 users, the cumulative net revenue before labor costs exceeds $66,000, with monthly recurring revenue of approximately $9,600 against infrastructure costs of approximately $2,100. The gross margin remains above 78% throughout, which is well within the healthy range for SaaS businesses. The key financial risk is not infrastructure cost but customer acquisition cost (CAC), which is not modeled here because it depends entirely on marketing strategy. However, the low price point ($7 starter tier) and the word-of-mouth nature of the freelancer community suggest that organic acquisition channels (X, Reddit, ProductHunt, referral programs) can keep CAC low.'))

# ═══════════════════════════════════════════════
# 17. RISKS AND MITIGATIONS
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('17. Risks and Mitigations'))
story.append(make_table(
    ['Risk', 'Likelihood', 'Impact', 'Mitigation'],
    [
        ['StopScopeCreep comes back online and captures SEO traffic', 'Medium', 'Low', 'Already behind in features; Axia offers more. Target their keywords with migration content'],
        ['EasyScope adds smart follow-ups to proposals', 'Medium', 'Medium', 'First-mover advantage: ship Day 3/7/14 follow-ups before they do. Patent-pending workflow design'],
        ['Bonsai or HoneyBook acquire a niche scope creep tool', 'Low', 'High', 'Integration advantage: Axia\'s features are built together, not bolted on. Better UX in unified product'],
        ['Convex pricing changes increase costs significantly', 'Low', 'Medium', 'Multi-cloud strategy: Convex for real-time, R2 for storage. Migration path to self-hosted if needed'],
        ['SMS/WhatsApp costs scale faster than revenue', 'Medium', 'Low', 'SMS/WhatsApp only on Professional and Agency tiers. Email-first reminders keep base cost low'],
        ['Freelancers resist "validated billing" as too surveillance-like', 'Medium', 'High', 'Messaging: trust-building, not monitoring. Freelancer CHOOSES to attach proof. Compare to Hubstaff (forced screenshots)'],
        ['Feature scope creep within Axia itself delays launch', 'High', 'High', 'Strict P0/P1/P2 prioritization. Ship P0 features only for Phase 1. No feature additions without removing another'],
        ['Pricing pressure from free tools (Wave, Clockify)', 'Medium', 'Medium', 'Axia\'s integration value justifies paid tier. Free tools do not offer proposals, scope protection, or validated billing'],
    ],
    [0.24, 0.12, 0.10, 0.54]
))
story.append(P('Table 28: Risk Assessment and Mitigations', caption_style))

# ═══════════════════════════════════════════════
# 18. SUCCESS METRICS
# ═══════════════════════════════════════════════
story.append(section_break())
story.append(H1_TOC('18. Success Metrics'))
story.append(P('Each feature must be measured against specific success criteria that reflect whether it actually delivers results to freelancers and agencies, rather than just existing as a scoreboard. The following metrics define what "better than the best niche competitor" looks like in measurable terms.'))
story.append(Spacer(1, 6))

story.append(make_table(
    ['Feature', 'Primary Metric', 'Target (6 months)', 'How We Measure'],
    [
        ['Smart Proposals', 'Proposal close rate', '40% (industry avg: 25-30%)', 'Signed proposals / total proposals sent'],
        ['CRM and Pipeline', 'Pipeline velocity improvement', '30% faster deal cycle vs. spreadsheet', 'Average days from lead to closed-won'],
        ['Validated Billing', 'Invoice dispute rate', '<5% (industry avg: 15-20%)', 'Disputed invoices / total invoices sent'],
        ['Payment Reminders', 'Average payment time', '<7 days past due (industry avg: 14 days)', 'Average days between invoice due date and payment receipt'],
        ['Scope Creep Protection', 'Unpaid scope change rate', '<5% (industry avg: 20-30%)', 'Unapproved out-of-scope hours / total hours worked'],
        ['Context Management', 'Time to find project information', '<30 seconds (industry avg: 5-10 min)', 'User self-reported via in-app survey after search'],
        ['Instant Setup', 'Time to first value', '<5 minutes from signup to first action', 'Time between account creation and first proposal/client/project created'],
    ],
    [0.14, 0.18, 0.26, 0.42]
))
story.append(P('Table 29: Feature Success Metrics and Targets', caption_style))
story.append(Spacer(1, 8))

story.append(P('These metrics are deliberately ambitious. They represent what "industry-leading" actually looks like in quantifiable terms. If Axia achieves a 40% proposal close rate (compared to the 25-30% industry average), it means freelancers are closing significantly more deals using Axia than with any other tool. If the invoice dispute rate drops below 5% (compared to the 15-20% industry average), it means validated billing is working as intended and clients are paying without questioning charges because the proof is attached. These are the metrics that will define Axia\'s success or failure, and they should be tracked continuously from day one.'))

# ═══════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════
doc.multiBuild(story)
print(f"PDF generated: {output_path}")

import os
size_kb = os.path.getsize(output_path) / 1024
print(f"File size: {size_kb:.0f} KB")
