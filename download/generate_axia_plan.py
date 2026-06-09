#!/usr/bin/env python3
"""
Axia Feature Implementation Master Plan - PDF Generator
Generates a comprehensive implementation plan for 7 missing features.
"""

import sys
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether,
    CondPageBreak, HRFlowable, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus.tableofcontents import TableOfContents

# ── Palette (from cascade) ──
ACCENT           = colors.HexColor('#6441cb')
ACCENT_SECONDARY = colors.HexColor('#3dcc85')
TEXT_PRIMARY      = colors.HexColor('#1a1917')
TEXT_MUTED        = colors.HexColor('#838179')
BG_PAGE           = colors.HexColor('#f6f6f5')
BG_SURFACE        = colors.HexColor('#ebeae9')
BG_CARD           = colors.HexColor('#e9e8e4')
TABLE_STRIPE      = colors.HexColor('#f3f3f2')
HEADER_FILL       = colors.HexColor('#766b49')
BORDER_COLOR      = colors.HexColor('#d1cab7')
ICON_COLOR        = colors.HexColor('#827039')
SUCCESS           = colors.HexColor('#497c5a')
WARNING           = colors.HexColor('#aa8844')
ERROR             = colors.HexColor('#974f49')
INFO              = colors.HexColor('#4c6d8e')

# ── Font Registration ──
pdfmetrics.registerFont(TTFont('LibSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LibSerif-Bold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LibSans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LibSans-Bold', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('LibSerif', normal='LibSerif', bold='LibSerif-Bold')
registerFontFamily('LibSans', normal='LibSans', bold='LibSans-Bold')

# ── Page Setup ──
PAGE_W, PAGE_H = A4
LEFT_M = 0.9 * inch
RIGHT_M = 0.9 * inch
TOP_M = 0.8 * inch
BOTTOM_M = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M

# ── Styles ──
styles = getSampleStyleSheet()

s_title = ParagraphStyle('DocTitle', fontName='LibSerif', fontSize=28, leading=36,
    textColor=ACCENT, spaceAfter=4, alignment=TA_LEFT)
s_subtitle = ParagraphStyle('DocSubtitle', fontName='LibSans', fontSize=14, leading=20,
    textColor=TEXT_MUTED, spaceAfter=20, alignment=TA_LEFT)
s_h1 = ParagraphStyle('H1', fontName='LibSerif', fontSize=20, leading=28,
    textColor=ACCENT, spaceBefore=24, spaceAfter=10)
s_h2 = ParagraphStyle('H2', fontName='LibSerif', fontSize=15, leading=22,
    textColor=HEADER_FILL, spaceBefore=16, spaceAfter=8)
s_h3 = ParagraphStyle('H3', fontName='LibSerif', fontSize=12, leading=18,
    textColor=ICON_COLOR, spaceBefore=12, spaceAfter=6)
s_body = ParagraphStyle('Body', fontName='LibSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=6)
s_body_left = ParagraphStyle('BodyLeft', fontName='LibSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=6)
s_bullet = ParagraphStyle('Bullet', fontName='LibSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, leftIndent=18, spaceAfter=3,
    bulletIndent=6)
s_caption = ParagraphStyle('Caption', fontName='LibSans', fontSize=9, leading=13,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=12)
s_header_cell = ParagraphStyle('HeaderCell', fontName='LibSerif', fontSize=10, leading=14,
    textColor=colors.white, alignment=TA_CENTER)
s_cell = ParagraphStyle('Cell', fontName='LibSerif', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT)
s_cell_center = ParagraphStyle('CellC', fontName='LibSerif', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER)
s_callout = ParagraphStyle('Callout', fontName='LibSerif', fontSize=11, leading=17,
    textColor=ACCENT, alignment=TA_LEFT, leftIndent=12, spaceBefore=6, spaceAfter=6,
    borderColor=ACCENT, borderWidth=0, borderPadding=0)
s_toc_h1 = ParagraphStyle('TOC1', fontName='LibSerif', fontSize=12, leading=20,
    leftIndent=20, textColor=TEXT_PRIMARY)
s_toc_h2 = ParagraphStyle('TOC2', fontName='LibSerif', fontSize=10.5, leading=18,
    leftIndent=40, textColor=TEXT_MUTED)

# ── Helpers ──
def h1(text):
    return Paragraph(f'<b>{text}</b>', s_h1)

def h2(text):
    return Paragraph(f'<b>{text}</b>', s_h2)

def h3(text):
    return Paragraph(f'<b>{text}</b>', s_h3)

def body(text):
    return Paragraph(text, s_body)

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', s_bullet)

def caption(text):
    return Paragraph(text, s_caption)

def spacer(h=12):
    return Spacer(1, h)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceAfter=12, spaceBefore=6)

def make_table(headers, rows, col_ratios=None):
    """Create a styled table with headers and rows."""
    available = CONTENT_W
    if col_ratios:
        cw = [r * available for r in col_ratios]
    else:
        cw = [available / len(headers)] * len(headers)

    data = [[Paragraph(f'<b>{h}</b>', s_header_cell) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), s_cell) for c in row])

    t = Table(data, colWidths=cw, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        bg = colors.white if i % 2 == 1 else TABLE_STRIPE
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def make_table_center(headers, rows, col_ratios=None):
    """Table with centered cells."""
    available = CONTENT_W
    if col_ratios:
        cw = [r * available for r in col_ratios]
    else:
        cw = [available / len(headers)] * len(headers)

    data = [[Paragraph(f'<b>{h}</b>', s_header_cell) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), s_cell_center) for c in row])

    t = Table(data, colWidths=cw, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        bg = colors.white if i % 2 == 1 else TABLE_STRIPE
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ── TOC Template ──
import hashlib

class TocDocTemplate:
    pass

from reportlab.platypus import SimpleDocTemplate

class AxiaDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph(f'<a name="{key}"/><b>{text}</b>', style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

# ── BUILD DOCUMENT ──
output_path = '/home/z/my-project/download/Axia_Feature_Implementation_Master_Plan.pdf'

doc = AxiaDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=LEFT_M,
    rightMargin=RIGHT_M,
    topMargin=TOP_M,
    bottomMargin=BOTTOM_M,
    title='Axia Feature Implementation Master Plan',
    author='Z.ai',
    creator='Z.ai',
    subject='Comprehensive implementation plan for 7 missing Axia features'
)

story = []

# ════════════════════════════════════════════════════
# COVER SECTION (inline, not separate)
# ════════════════════════════════════════════════════
story.append(Spacer(1, 80))
story.append(Paragraph('<b>Axia</b>', ParagraphStyle('CoverBrand', fontName='LibSerif',
    fontSize=42, leading=50, textColor=ACCENT, alignment=TA_LEFT)))
story.append(Spacer(1, 8))
story.append(Paragraph('<b>Feature Implementation Master Plan</b>', ParagraphStyle('CoverTitle',
    fontName='LibSerif', fontSize=24, leading=32, textColor=TEXT_PRIMARY, alignment=TA_LEFT)))
story.append(Spacer(1, 12))
story.append(HRFlowable(width="60%", thickness=2, color=ACCENT, spaceAfter=16, spaceBefore=0))
story.append(Paragraph('Building 7 Industry-Leading Features from the Ground Up', ParagraphStyle('CoverSub',
    fontName='LibSans', fontSize=14, leading=20, textColor=TEXT_MUTED, alignment=TA_LEFT)))
story.append(Spacer(1, 30))
story.append(Paragraph('Smart Proposals  |  CRM and Pipeline  |  Validated Billing  |  Automated Payment Reminders  |  Scope Creep Protection  |  Context Management  |  Instant Setup', ParagraphStyle('CoverFeats',
    fontName='LibSans', fontSize=10.5, leading=16, textColor=ICON_COLOR, alignment=TA_LEFT)))
story.append(Spacer(1, 60))
story.append(Paragraph('Version 1.0  |  May 2026  |  Confidential', ParagraphStyle('CoverMeta',
    fontName='LibSans', fontSize=10, leading=14, textColor=TEXT_MUTED, alignment=TA_LEFT)))
story.append(PageBreak())

# ════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ════════════════════════════════════════════════════
story.append(Paragraph('<b>Table of Contents</b>', ParagraphStyle('TOCTitle', fontName='LibSerif',
    fontSize=20, leading=28, textColor=ACCENT, spaceAfter=16)))
toc = TableOfContents()
toc.levelStyles = [s_toc_h1, s_toc_h2]
story.append(toc)
story.append(PageBreak())

# ════════════════════════════════════════════════════
# SECTION 1: EXECUTIVE SUMMARY
# ════════════════════════════════════════════════════
story.append(add_heading('1. Executive Summary', s_h1, 0))
story.append(body(
    'Axia is positioned as the first unified freelancer protection and business management platform, '
    'with the bold promise of replacing scattered tools like Google Docs, Trello, Stripe, Loom, and Slack '
    'with a single tab. The live website at axia-six.vercel.app markets seven key features that do not yet '
    'exist in the application code: Smart Proposals, CRM and Pipeline, Validated Billing, Automated Payment '
    'Reminders, Scope Creep Protection, Context Management, and Instant Setup. This document provides a '
    'comprehensive, research-backed implementation plan for each of these seven features, designed not just '
    'to match industry standards but to exceed them in ways that create genuine competitive advantage.'
))
story.append(spacer(6))
story.append(body(
    'The competitive landscape for freelancer tools is crowded but fragmented. HoneyBook excels at polished '
    'proposals for creatives but lacks project management depth. Bonsai offers strong invoicing but weak CRM. '
    'Dubsado has powerful automation but takes weeks to configure. Plutio bundles the most features but at a '
    'premium price. FreshBooks leads in accounting but offers no protection or evidence features. No single '
    'platform combines protection, business management, and AI-driven automation the way Axia promises to. '
    'This gap is our opportunity, but only if we deliver features that are not just present but exceptional.'
))
story.append(spacer(6))
story.append(body(
    'The plan is organized into four implementation phases spanning approximately 16 weeks. Phase 1 (Weeks 1-4) '
    'focuses on foundational infrastructure: pricing sync, server-side subscription enforcement, auth guards, '
    'and the Instant Setup onboarding wizard. Phase 2 (Weeks 5-8) delivers the Smart Proposals engine and '
    'CRM/Pipeline board. Phase 3 (Weeks 9-12) adds Validated Billing, Automated Payment Reminders, and '
    'Scope Creep Protection. Phase 4 (Weeks 13-16) completes Context Management and integrates all features '
    'into a cohesive, cross-connected experience. Each feature specification includes data schema additions, '
    'Convex backend functions, frontend components, competitor benchmarking, and specific innovations that '
    'differentiate Axia from every existing solution.'
))

# ════════════════════════════════════════════════════
# SECTION 2: CURRENT STATE ANALYSIS
# ════════════════════════════════════════════════════
story.append(add_heading('2. Current State Analysis', s_h1, 0))
story.append(body(
    'Before designing new features, it is essential to understand the existing codebase architecture, '
    'what has already been built (even partially), and what critical gaps exist in the current '
    'implementation. This analysis is based on a thorough examination of every file in the Axia project, '
    'including all 30+ Convex schema tables, 80+ backend functions, 16+ page routes, and 100+ UI components.'
))

story.append(add_heading('2.1 What Exists: Schema and Backend', s_h2, 1))
story.append(body(
    'The Convex schema is surprisingly rich, with 30+ tables already defined. Several of the features we need '
    'to build have partial or complete backend support that is simply not wired to the frontend. The '
    'automatedDisputeReports table already supports automation levels (manual, semi_automated, fully_automated), '
    'generated sections, and evidence attachment. The scopeFormalizations table has originalScope, newScope, '
    'impactAssessment (with timeImpact, budgetImpact, deliverableImpact), and clientAcknowledgment fields. '
    'The protectionPlans table supports personalized plans with custom rules and protection goals. The '
    'milestoneSnapshots and milestoneAlerts tables provide the foundation for milestone-based project tracking. '
    'The evidenceSessions, evidenceEvents, and wcvmVerifications tables form a complete evidence collection '
    'and verification pipeline. The clients table includes riskLevel, hourlyRate, and contractType, while '
    'clientPolicies supports per-client requirement tracking.'
))
story.append(spacer(6))
story.append(body(
    'However, the frontend tells a different story. Most pages use hardcoded mock data instead of real Convex '
    'queries. The Dashboard, Clients, Invoices, Reports, Payment Patterns, Time Tracking, Goals, and Tags '
    'pages all operate on local state with no real backend persistence. Only the Projects page and Evidence '
    'Library page attempt to use actual Convex queries. The subscription tier system is entirely client-side, '
    'stored in localStorage with the key axia_subscription_tier, meaning any user can set their tier to '
    '"expert" via browser devtools. There are no server-side auth guards protecting dashboard routes, and no '
    'Stripe integration for actual payment processing.'
))

story.append(add_heading('2.2 Critical Gaps Summary', s_h2, 1))
story.append(make_table(
    ['Gap', 'Severity', 'Impact', 'Phase'],
    [
        ['Pricing mismatch ($9/$29/$79 vs $7/$15/$49)', 'Critical', 'Legal/brand risk, user confusion', '1'],
        ['Subscription enforcement is localStorage only', 'Critical', 'Revenue leakage, no server enforcement', '1'],
        ['No auth guards on dashboard routes', 'High', 'Any unauthenticated user can access /dashboard', '1'],
        ['No Smart Proposals page/workflow', 'High', 'Major promised feature completely missing', '2'],
        ['No CRM/Pipeline view', 'High', 'No lead tracking, deal stages, or visual pipeline', '2'],
        ['Invoices not linked to work logs', 'Medium', 'Billing is not "validated" as promised', '3'],
        ['No automated reminder scheduling', 'Medium', 'Payment reminders are manual buttons only', '3'],
        ['Scope creep detection exists but hidden', 'Medium', 'Backend exists, frontend exposure minimal', '3'],
        ['No centralized communication hub', 'Medium', 'Context is scattered across features', '4'],
        ['Onboarding is 2-step, not "instant setup"', 'Low', 'Does not deliver 10-minute promise', '1'],
        ['80%+ of pages use mock data', 'High', 'No real data persistence for core workflows', '1-4'],
    ],
    [0.35, 0.12, 0.35, 0.08]
))
story.append(caption('Table 1: Critical Gaps in Current Axia Implementation'))

# ════════════════════════════════════════════════════
# SECTION 3: COMPETITOR LANDSCAPE
# ════════════════════════════════════════════════════
story.append(add_heading('3. Competitor Landscape Analysis', s_h1, 0))
story.append(body(
    'Understanding the competitive landscape is critical for positioning Axia as a category-defining product '
    'rather than a me-too clone. We examined the top 10 freelancer management platforms across six dimensions: '
    'proposals, CRM, billing, payment automation, scope protection, and communication. No existing platform '
    'combines all six, which is precisely the gap Axia must fill.'
))

story.append(add_heading('3.1 Feature Matrix: Axia vs. Competitors', s_h2, 1))
story.append(make_table_center(
    ['Feature', 'HoneyBook', 'Bonsai', 'Dubsado', 'Plutio', 'Axia (Planned)'],
    [
        ['AI Proposals', 'Basic', 'No', 'No', 'No', 'Full AI + Smart Follow-ups'],
        ['CRM Pipeline', 'Basic', 'No', 'Forms only', 'Kanban', 'AI-Powered Kanban + Scoring'],
        ['Validated Billing', 'No', 'Standard', 'No', 'No', 'Evidence-Linked Invoices'],
        ['Payment Reminders', 'Manual', 'Basic', 'Automated', 'Automated', 'Smart Escalation + AI Tone'],
        ['Scope Creep Detection', 'No', 'No', 'No', 'No', 'Auto-Detect + Change Orders'],
        ['Context Hub', 'No', 'No', 'No', 'No', 'Centralized + AI Summaries'],
        ['Instant Setup', 'Fast', 'Fast', 'Slow (weeks)', 'Medium', '10-Minute Guided Wizard'],
        ['Dispute Protection', 'No', 'No', 'No', 'No', 'Full Evidence + WCVM'],
        ['Price (Pro tier)', '$66/mo', '$32/mo', '$40/mo', '$19/mo', '$15/mo'],
    ],
    [0.18, 0.13, 0.13, 0.13, 0.13, 0.30]
))
story.append(caption('Table 2: Competitive Feature Matrix - Axia vs. Major Competitors'))

story.append(add_heading('3.2 Key Competitive Insights', s_h2, 1))
story.append(body(
    'Several critical insights emerged from the competitive analysis that directly shape our implementation '
    'strategy. First, HoneyBook and Bonsai have both proven that polished proposal experiences drive conversion, '
    'but neither uses AI to generate or follow up on proposals. Our research found that AI-powered proposal '
    'generation can cut creation time from hours to minutes while improving win rates, and no competitor has '
    'yet automated the follow-up sequence at Day 3, 7, and 14 intervals with intelligent tone adjustment. '
    'This represents a genuine blue ocean opportunity for Axia.'
))
story.append(spacer(6))
story.append(body(
    'Second, Plutio is the only competitor offering a visual Kanban pipeline, but it lacks AI-driven deal '
    'scoring and does not connect the pipeline to protection metrics. Axia can differentiate by making the '
    'pipeline not just a visual tool but an intelligent one that surfaces risk signals and protection gaps '
    'directly in the deal card. Third, the scope creep detection feature has no direct competitor. A Reddit '
    'post about a tool that "turns scope creep into paid change orders" received enthusiastic reception, '
    'and PMI 2025 research shows that 52% of all projects fail to meet original goals and 57% of agencies '
    'lose $1K-$5K monthly to scope creep. This is a massive pain point with zero dedicated solutions.'
))
story.append(spacer(6))
story.append(body(
    'Fourth, automated payment reminders exist in Plutio and Dubsado but follow a rigid template approach. '
    'Research from InfluenceFlow shows that Day 3 past-due reminders alone reduce late payments by 40%. '
    'However, no competitor uses AI to adjust reminder tone based on client relationship history, payment '
    'patterns, or project value. Axia can make reminders smarter by escalating tone from friendly to firm '
    'to direct based on context, not just time elapsed. Fifth, the Freelance Worker Protection Act (FWPA) '
    'in California (effective January 1, 2025) requires written contracts for freelance work over $250 and '
    'mandates payment within 30 days. This legal trend creates a natural market pull for Axia\'s protection '
    'features, and no competitor is positioned to capitalize on it.'
))

# ════════════════════════════════════════════════════
# SECTION 4: PHASE 1 - FOUNDATION (WEEKS 1-4)
# ════════════════════════════════════════════════════
story.append(add_heading('4. Phase 1: Foundation (Weeks 1-4)', s_h1, 0))
story.append(body(
    'Phase 1 establishes the critical infrastructure that all subsequent features depend on. Without pricing '
    'sync, server-side subscription enforcement, and auth guards, no feature can be properly tier-gated or '
    'monetized. Without real Convex queries replacing mock data, features will feel hollow. This phase '
    'prioritizes the highest-severity gaps and the Instant Setup onboarding wizard, which serves as the '
    'user\'s first experience with the platform.'
))

# 4.1 Pricing Sync
story.append(add_heading('4.1 Pricing Sync and Subscription Overhaul', s_h2, 1))
story.append(body(
    'The current app code defines subscription tiers at $9/$29/$79 per month, while the live website '
    'promises $7/$15/$49. This mismatch creates legal risk and user confusion. We must sync to the live '
    'website pricing ($7/$15/$49) and simultaneously implement server-side subscription enforcement to '
    'replace the current localStorage-only approach. The pricing overhaul includes updating the Subscription '
    'page component, the useSubscriptionTier hook, the Convex users table subscriptionTier field, and all '
    'tier-gating logic throughout the application.'
))
story.append(spacer(6))

story.append(h3('New Tier Structure'))
story.append(make_table_center(
    ['Tier', 'Monthly', 'Annual (20% off)', 'Key Unlocks'],
    [
        ['Free', '$0', '$0', '1 report/mo, basic compliance, 1 platform'],
        ['Starter', '$7', '$5.60', '5 reports/mo, evidence export, 2 platforms, Smart Proposals (basic)'],
        ['Pro', '$15', '$12', 'Unlimited reports, AI features, 5 platforms, CRM Pipeline, Payment Reminders'],
        ['Expert', '$49', '$39.20', 'Everything + Team features, Scope Creep AI, Context Hub, WCVM Badge'],
    ],
    [0.12, 0.12, 0.18, 0.58]
))
story.append(caption('Table 3: Revised Subscription Tier Pricing'))

story.append(h3('Server-Side Enforcement Architecture'))
story.append(body(
    'The current subscription tier stored in localStorage must be replaced with a Convex-backed system. '
    'Every tier-gated feature must verify the user\'s subscription level via a Convex query before granting '
    'access. The subscriptionTier field in the users table already exists but is not being read by the '
    'frontend. We need to create a getSubscriptionStatus Convex query that returns the user\'s active tier, '
    'expiry date, and feature flags. On the frontend, the useSubscriptionTier hook must be rewritten to '
    'fetch from Convex instead of localStorage, with a fallback to a cached value for offline use. Stripe '
    'integration should be deferred to a later phase, but the schema must support stripeCustomerId and '
    'stripeSubscriptionId fields to avoid a migration later.'
))

# 4.2 Auth Guards
story.append(add_heading('4.2 Auth Guards and Route Protection', s_h2, 1))
story.append(body(
    'Currently, any user can navigate directly to /dashboard or any other protected route without '
    'authentication. This is a critical security gap. We must implement route-level auth guards that check '
    'whether the user is authenticated via Convex Auth before rendering any dashboard page. The implementation '
    'should use a ProtectedRoute wrapper component that wraps all dashboard routes in the router configuration. '
    'This component will use the useConvexAuth hook to check authentication status and redirect to /auth if '
    'the user is not logged in. Additionally, Convex queries should include an identity check using ctx.auth '
    'to ensure that users can only access their own data, preventing cross-user data leaks.'
))
story.append(spacer(6))
story.append(body(
    'The ProtectedRoute component should also handle the loading state gracefully, showing a skeleton or '
    'spinner while the auth check is in progress. For anonymous users (those who signed in with the Anonymous '
    'provider), the component should redirect to the onboarding flow rather than the dashboard. The auth '
    'guard should also check the onboardingComplete field on the user record and redirect to the onboarding '
    'wizard if the user has not completed setup. This ensures that every user who reaches the dashboard has '
    'a complete profile and understands how to use the platform.'
))

# 4.3 Instant Setup
story.append(add_heading('4.3 Instant Setup: 10-Minute Onboarding Wizard', s_h2, 1))
story.append(body(
    'The live website promises users can be "working in under ten minutes," but the current onboarding is '
    'just two sparse steps: OnboardingUserInformation and OnboardingSource. This does not deliver on the '
    'promise. We must redesign the onboarding flow into a guided wizard that gets users to their first '
    'real outcome within 10 minutes. Research shows that the best SaaS onboarding compresses the first '
    'session into one real outcome, not a tour. Templates help when they are close to the actual job the '
    'user needs to do.'
))
story.append(spacer(6))

story.append(h3('Wizard Steps'))
story.append(make_table(
    ['Step', 'Title', 'Duration', 'Outcome', 'Data Captured'],
    [
        ['1', 'Welcome and Profession', '30s', 'Personalized experience path', 'profession, name'],
        ['2', 'Primary Platform', '20s', 'Platform-aware defaults', 'primaryPlatform, yearsExperience'],
        ['3', 'First Client Setup', '60s', 'Client record created in Convex', 'clientName, platform, hourlyRate'],
        ['4', 'First Project Setup', '60s', 'Project created with protection', 'projectName, type, protectionLevel'],
        ['5', 'Hourly Rate and Billing', '30s', 'Invoice template pre-configured', 'defaultHourlyRate, currency'],
        ['6', 'Chrome Extension Connect', '40s', 'Extension installed and linked', 'extensionToken generated'],
        ['7', 'Dashboard Walkthrough', '120s', 'User sees their first protection score', 'onboardingComplete = true'],
    ],
    [0.06, 0.20, 0.10, 0.30, 0.34]
))
story.append(caption('Table 4: Instant Setup Wizard Steps and Expected Durations'))

story.append(body(
    'Each step must save progress to Convex immediately so that users who abandon the wizard can resume '
    'where they left off. The wizard should use a progress bar showing percentage completion and estimated '
    'time remaining. Steps 3 and 4 are critical because they create real data in the system. By the time '
    'the user reaches Step 7, they should see their dashboard populated with their actual client, project, '
    'and a preliminary protection score calculated from their inputs. This creates an immediate "aha moment" '
    'that demonstrates value before the user has invested significant time.'
))
story.append(spacer(6))
story.append(body(
    'The profession selection in Step 1 is particularly important because it determines the template defaults '
    'for Steps 3-5. A graphic designer will get different proposal templates, invoice line items, and project '
    'types than a software developer or a copywriter. We should define profession-specific templates for at '
    'least the 15 professions listed on the live website: Graphic Designer, Web Developer, Copywriter, '
    'Photographer, Video Editor, UI/UX Designer, Marketing Consultant, SEO Specialist, Social Media Manager, '
    'Content Writer, Translator, Virtual Assistant, Bookkeeper, Illustrator, and App Developer.'
))

# ════════════════════════════════════════════════════
# SECTION 5: PHASE 2 - SMART PROPOSALS & CRM
# ════════════════════════════════════════════════════
story.append(add_heading('5. Phase 2: Smart Proposals and CRM Pipeline (Weeks 5-8)', s_h1, 0))

# 5.1 Smart Proposals
story.append(add_heading('5.1 Smart Proposals Engine', s_h2, 1))
story.append(body(
    'Smart Proposals is one of Axia\'s most compelling differentiators. No competitor currently offers AI-powered '
    'proposal generation combined with automated smart follow-ups at Day 3, 7, and 14 intervals. The closest '
    'comparable features are HoneyBook\'s proposal templates (manual, no AI) and Upwork\'s Uma AI (which only '
    'provides proposal insights, not full generation). Our implementation must go beyond both by offering '
    'auto-drafted proposals that include protection clauses, evidence requirements, and WCVM verification '
    'commitments, plus an intelligent follow-up system that adjusts tone based on client engagement signals.'
))

story.append(h3('5.1.1 Schema Additions'))
story.append(body(
    'The existing automatedDisputeReports table can be extended for proposals, but we need a dedicated '
    'proposals table to handle the full proposal lifecycle. The schema should support the following fields:'
))
story.append(make_table(
    ['Field', 'Type', 'Description'],
    [
        ['userId', 'id("users")', 'Owner of the proposal'],
        ['clientId', 'optional id("clients")', 'Linked client record'],
        ['projectId', 'optional id("projects")', 'Linked project record'],
        ['title', 'string', 'Proposal title'],
        ['status', 'string', 'draft | sent | viewed | accepted | rejected | expired'],
        ['content', 'object', 'Structured proposal content (sections, line items, terms)'],
        ['aiGeneratedSections', 'optional string[]', 'Sections auto-generated by AI'],
        ['protectionClauses', 'optional object[]', 'Built-in protection terms from Axia'],
        ['totalValue', 'optional number', 'Total proposal value'],
        ['currency', 'optional string', 'Currency code (USD, EUR, etc.)'],
        ['clientViewToken', 'optional string', 'Token for client-facing view link'],
        ['viewedAt', 'optional number', 'When client first opened the proposal'],
        ['acceptedAt', 'optional number', 'When client accepted'],
        ['rejectedAt', 'optional number', 'When client rejected'],
        ['followUpSchedule', 'optional object[]', 'Day 3/7/14 follow-up configuration'],
        ['followUpSent', 'optional number[]', 'Days on which follow-ups were sent'],
        ['evidenceRequirements', 'optional object[]', 'Required evidence for this proposal'],
        ['wcvmCommitment', 'optional boolean', 'Whether WCVM verification is included'],
        ['validUntil', 'optional number', 'Expiration timestamp'],
        ['createdAt', 'number', 'Creation timestamp'],
        ['updatedAt', 'optional number', 'Last update timestamp'],
    ],
    [0.22, 0.28, 0.50]
))
story.append(caption('Table 5: Proposals Table Schema'))

story.append(h3('5.1.2 AI Proposal Generation Flow'))
story.append(body(
    'The AI proposal generation flow must work in three stages. In Stage 1 (Auto-Draft), the user provides '
    'minimal inputs: client name, project description, and scope. The system uses the z-ai-web-dev-sdk '
    'chat completions API to generate a full proposal draft including: executive summary, scope of work, '
    'deliverables with timeline, pricing breakdown, protection clauses (leveraging Axia\'s unique protection '
    'positioning), and terms and conditions. The AI should be instructed to include Axia-specific language '
    'such as "All work sessions will be verified through Axia\'s Work Context Verification Model (WCVM)" '
    'and "Scope changes will be documented through formal change orders with mutual acknowledgment."'
))
story.append(spacer(6))
story.append(body(
    'In Stage 2 (Protection Enhancement), the system automatically adds protection clauses based on the '
    'client\'s risk profile. If the client has a high riskLevel, the proposal includes additional evidence '
    'requirements, more frequent milestone check-ins, and stronger payment terms. The system reads the '
    'client\'s dispute simulation data, payment patterns, and trust score to customize the protection level. '
    'This is something no competitor can do because no competitor has Axia\'s protection data infrastructure.'
))
story.append(spacer(6))
story.append(body(
    'In Stage 3 (Smart Follow-ups), once the proposal is sent, the system schedules automated follow-ups '
    'at Day 3, Day 7, and Day 14. These are not generic "did you see my proposal?" emails. Instead, each '
    'follow-up is context-aware: Day 3 checks if the client viewed the proposal (via clientViewToken tracking) '
    'and sends a gentle nudge with a specific question about a section. Day 7 offers to schedule a call or '
    'adjust the proposal scope. Day 14 creates urgency with a "this proposal expires in X days" message. '
    'The AI adjusts the tone of each follow-up based on whether the client has viewed the proposal, how much '
    'time they spent on each section (tracked via scroll depth), and their historical responsiveness.'
))

story.append(h3('5.1.3 Frontend Components'))
story.append(bullet('ProposalBuilder: Multi-step wizard for creating/editing proposals with AI assistance'))
story.append(bullet('ProposalPreview: Rich preview of the proposal as the client will see it'))
story.append(bullet('ProposalClientView: Client-facing page accessible via viewToken (no login required)'))
story.append(bullet('ProposalDashboard: List view of all proposals with status, value, and follow-up indicators'))
story.append(bullet('ProposalAnalytics: View tracking, engagement metrics, conversion funnel'))
story.append(bullet('FollowUpScheduler: Configure and preview the Day 3/7/14 follow-up sequence'))
story.append(bullet('ProtectionClauseEditor: Select and customize built-in protection clauses'))

story.append(h3('5.1.4 Key Innovations vs. Competitors'))
story.append(make_table(
    ['Capability', 'HoneyBook', 'Bonsai', 'Axia'],
    [
        ['AI-generated full proposal', 'No', 'No', 'Yes - from minimal inputs'],
        ['Protection clauses built-in', 'No', 'No', 'Yes - based on client risk profile'],
        ['WCVM commitment in proposal', 'No', 'No', 'Yes - unique differentiator'],
        ['Smart follow-up scheduling', 'No', 'No', 'Yes - Day 3/7/14 with AI tone'],
        ['Client engagement tracking', 'Basic (opened/clicked)', 'No', 'Full: views, scroll depth, time per section'],
        ['Proposal-to-project conversion', 'Manual', 'Manual', 'One-click: creates project with all protection settings'],
    ],
    [0.30, 0.18, 0.18, 0.34]
))
story.append(caption('Table 6: Smart Proposals Competitive Comparison'))

# 5.2 CRM & Pipeline
story.append(add_heading('5.2 CRM and Pipeline Board', s_h2, 1))
story.append(body(
    'The current Clients page has a list view and several analytical sub-components (Trust Score, Protection '
    'Score, Dispute Simulation, Payment Pattern, Policy Profile, Gap Prediction), but it lacks a visual '
    'pipeline board, deal stages, and lead tracking. Plutio is the only competitor with a Kanban pipeline, '
    'but it is purely visual with no intelligence. Axia must deliver a Kanban pipeline that is not just '
    'a board but an intelligent deal management system with AI-driven lead scoring, risk-aware stage gates, '
    'and automatic protection recommendations at each stage transition.'
))

story.append(h3('5.2.1 Schema Additions'))
story.append(make_table(
    ['Field', 'Type', 'Description'],
    [
        ['userId', 'id("users")', 'Owner of the pipeline'],
        ['clientId', 'optional id("clients")', 'Linked client'],
        ['proposalId', 'optional id("proposals")', 'Linked proposal'],
        ['stage', 'string', 'lead | qualified | proposal_sent | negotiation | won | lost'],
        ['dealValue', 'optional number', 'Estimated deal value'],
        ['probability', 'optional number', 'AI-estimated win probability (0-100)'],
        ['expectedCloseDate', 'optional number', 'Predicted close date'],
        ['lastActivityAt', 'optional number', 'Last interaction timestamp'],
        ['nextAction', 'optional object', 'Recommended next action with due date'],
        ['riskSignals', 'optional object[]', 'Detected risk indicators'],
        ['protectionReadiness', 'optional number', 'How ready the project is for Axia protection (0-100)'],
        ['contactHistory', 'optional object[]', 'Communication log entries'],
        ['source', 'optional string', 'How the lead was acquired'],
        ['notes', 'optional string', 'Free-form notes'],
        ['customFields', 'optional object', 'User-defined custom fields'],
        ['createdAt', 'number', 'Creation timestamp'],
        ['updatedAt', 'optional number', 'Last update timestamp'],
    ],
    [0.22, 0.28, 0.50]
))
story.append(caption('Table 7: Pipeline Deals Table Schema'))

story.append(h3('5.2.2 Pipeline Stage Definitions'))
story.append(body(
    'Each pipeline stage should have specific entry criteria, exit actions, and AI-driven recommendations. '
    'The Lead stage captures initial interest with minimal information. The Qualified stage requires a '
    'discovery call or detailed intake form completion, and the AI suggests next steps based on the client\'s '
    'profession and platform. The Proposal Sent stage is triggered when a Smart Proposal is created and sent, '
    'and the system automatically links the proposal\'s engagement tracking data. The Negotiation stage '
    'activates when the client responds to a proposal, and the AI suggests concession strategies and '
    'protection trade-offs. The Won stage triggers automatic project creation with all protection settings '
    'carried over from the proposal. The Lost stage captures loss reasons for future pipeline analytics.'
))

story.append(h3('5.2.3 AI-Driven Lead Scoring'))
story.append(body(
    'The most innovative aspect of Axia\'s CRM is the AI-driven lead scoring system. Unlike simple scoring '
    'models that weight a few factors, Axia can leverage its unique protection data to score leads based on '
    'factors that no competitor has access to. The scoring model considers: client payment history (from '
    'payment patterns), platform risk (from platform connections), profession-specific dispute rates (from '
    'aggregated anonymized data), proposal engagement signals (from view tracking), and communication '
    'responsiveness (from context hub data). The result is a probability score that is more accurate than '
    'any competitor\'s because it incorporates protection and dispute data that only Axia collects.'
))

story.append(h3('5.2.4 Frontend Components'))
story.append(bullet('PipelineBoard: Drag-and-drop Kanban board with stage columns'))
story.append(bullet('DealCard: Card component showing deal value, probability, risk signals, and next action'))
story.append(bullet('DealDetail: Full deal view with contact history, linked proposal, and protection readiness'))
story.append(bullet('LeadScoreBadge: Visual indicator of AI-estimated win probability'))
story.append(bullet('PipelineAnalytics: Conversion rates, average deal cycle, forecasted revenue'))
story.append(bullet('StageGateModal: Confirmation dialog when moving deals between stages with AI recommendations'))
story.append(bullet('PipelineSidebar: Filter by client, value range, stage, probability, risk level'))

# ════════════════════════════════════════════════════
# SECTION 6: PHASE 3 - BILLING, REMINDERS, SCOPE CREEP
# ════════════════════════════════════════════════════
story.append(add_heading('6. Phase 3: Validated Billing, Payment Reminders, and Scope Creep (Weeks 9-12)', s_h1, 0))

# 6.1 Validated Billing
story.append(add_heading('6.1 Validated Billing: Evidence-Linked Invoices', s_h2, 1))
story.append(body(
    'The current Invoices page has full CRUD with create dialog, send, mark as paid, PDF export, and '
    'line items. However, invoices are not linked to verified work logs, which means Axia cannot deliver '
    'on its promise of "validated billing." Validated billing means that every line item on an invoice can '
    'be traced back to a verified work session with evidence: timestamps, activity data, compliance status, '
    'and optionally WCVM verification. This creates an auditable chain from work performed to invoice issued '
    'to payment received, which is extraordinarily powerful in dispute scenarios.'
))

story.append(h3('6.1.1 Schema Additions'))
story.append(make_table(
    ['Field', 'Type', 'Description'],
    [
        ['userId', 'id("users")', 'Invoice owner'],
        ['clientId', 'id("clients")', 'Billed client'],
        ['projectId', 'optional id("projects")', 'Linked project'],
        ['invoiceNumber', 'string', 'Unique invoice number (auto-generated)'],
        ['status', 'string', 'draft | sent | viewed | paid | overdue | disputed'],
        ['issueDate', 'number', 'Invoice issue date'],
        ['dueDate', 'number', 'Payment due date'],
        ['lineItems', 'object[]', 'Line items with linked evidence'],
        ['lineItems[].workSessionId', 'optional id("workSessions")', 'Linked verified work session'],
        ['lineItems[].evidenceSessionId', 'optional id("evidenceSessions")', 'Linked evidence session'],
        ['lineItems[].wcvmVerificationId', 'optional id("wcvmVerifications")', 'Linked WCVM verification'],
        ['lineItems[].validationStatus', 'string', 'unvalidated | partially_validated | fully_validated'],
        ['lineItems[].complianceRate', 'optional number', 'Compliance rate of linked session'],
        ['lineItems[].verifiedHours', 'optional number', 'Hours verified by evidence'],
        ['totalValidatedHours', 'optional number', 'Sum of verified hours across all line items'],
        ['totalValidatedValue', 'optional number', 'Sum of validated line item values'],
        ['validationScore', 'optional number', 'Overall invoice validation score (0-100)'],
        ['reminderSchedule', 'optional object', 'Configured payment reminder schedule'],
        ['paidAt', 'optional number', 'When invoice was paid'],
        ['paymentMethod', 'optional string', 'How payment was received'],
        ['disputeStatus', 'optional string', 'none | threatened | active | resolved'],
        ['createdAt', 'number', 'Creation timestamp'],
    ],
    [0.28, 0.28, 0.44]
))
story.append(caption('Table 8: Invoices Table Schema with Validation Fields'))

story.append(h3('6.1.2 Validation Score Calculation'))
story.append(body(
    'Each invoice receives a validation score from 0 to 100 based on how much of the billed work has '
    'corroborating evidence. The calculation weights different evidence types: WCVM verification counts '
    'for 40% of the line item\'s validation score, screenshot evidence counts for 25%, activity data '
    '(mouse/keyboard) counts for 20%, and time block compliance status counts for 15%. An invoice where '
    'every line item links to a WCVM-verified session with full compliance would score 100. An invoice '
    'with no linked evidence would score 0. The validation score is prominently displayed on the invoice '
    'and can be shared with clients as proof of work performed, creating a powerful trust signal that no '
    'competitor can match.'
))

story.append(h3('6.1.3 Key Innovation: Dispute-Ready Invoices'))
story.append(body(
    'The most significant innovation is the "dispute-ready" invoice concept. When a client disputes an '
    'invoice, the freelancer can one-click generate a dispute report that includes the invoice, all linked '
    'evidence sessions, WCVM verifications, compliance data, and a summary of the validation score. This '
    'turns what would normally be a he-said-she-said situation into an evidence-backed defense. The dispute '
    'report is generated using the existing generateDisputeReport mutation but enhanced with invoice-specific '
    'evidence links. No competitor offers this because no competitor has the evidence infrastructure that '
    'Axia already has in its Convex backend.'
))

# 6.2 Automated Payment Reminders
story.append(add_heading('6.2 Automated Payment Reminders with Smart Escalation', s_h2, 1))
story.append(body(
    'Plutio and Dubsado both offer automated payment reminders at fixed intervals, but they use rigid '
    'templates that do not adapt to context. Research shows that Day 3 past-due reminders reduce late '
    'payments by 40%, and the standard practice is to send reminders at Day 3, Day 7, and Day 14 after '
    'the due date. However, the tone and content of these reminders matter enormously. A friendly reminder '
    'to a long-term client who always pays within 5 days is very different from a firm notice to a new '
    'client who has a history of late payments. Axia must deliver smart escalation that uses AI to adjust '
    'tone based on client context.'
))

story.append(h3('6.2.1 Schema Additions'))
story.append(make_table(
    ['Field', 'Type', 'Description'],
    [
        ['invoiceId', 'id("invoices")', 'Linked invoice'],
        ['userId', 'id("users")', 'Reminder owner'],
        ['clientId', 'id("clients")', 'Client being reminded'],
        ['schedule', 'object[]', 'Array of reminder steps with dayOffset, tone, template'],
        ['schedule[].dayOffset', 'number', 'Days after due date (-3 = pre-due, 0 = on due, 3 = 3 days late)'],
        ['schedule[].tone', 'string', 'friendly | professional | firm | urgent'],
        ['schedule[].template', 'string', 'AI-generated message template for this step'],
        ['schedule[].sentAt', 'optional number', 'When this reminder was sent'],
        ['schedule[].openedAt', 'optional number', 'When client opened the reminder'],
        ['schedule[].clientResponse', 'optional string', 'Any client response received'],
        ['currentStep', 'number', 'Which step in the schedule we are on'],
        ['escalationLevel', 'string', 'normal | escalated | final_notice | collections'],
        ['aiToneOverride', 'optional string', 'AI-recommended tone override based on client history'],
        ['autoEscalateAt', 'optional number', 'Timestamp for next auto-escalation'],
        ['createdAt', 'number', 'Creation timestamp'],
    ],
    [0.22, 0.28, 0.50]
))
story.append(caption('Table 9: Payment Reminders Table Schema'))

story.append(h3('6.2.2 Smart Escalation Logic'))
story.append(body(
    'The smart escalation system works in four levels. Level 1 (Normal) uses the configured schedule with '
    'AI-adjusted tone. If the client has a strong payment history, the tone stays friendly even at Day 14. '
    'If the client has a history of late payments, the tone escalates faster. Level 2 (Escalated) triggers '
    'when an invoice is more than 14 days overdue or when the client has not responded to two reminders. '
    'The AI generates a more direct message that references the validation score and evidence backing the '
    'invoice. Level 3 (Final Notice) triggers at 30 days overdue and includes a formal demand letter with '
    'references to the Freelance Worker Protection Act (for California clients) and the full evidence package. '
    'Level 4 (Collections) is a recommendation, not an automated action, suggesting the freelancer engage a '
    'collection agency and providing a pre-formatted collection package with all evidence.'
))
story.append(spacer(6))
story.append(body(
    'The AI tone override is the key differentiator. Before sending each reminder, the system evaluates the '
    'client\'s relationship context: payment history (on-time rate, average delay), project value (is this a '
    'high-value client worth being gentle with?), dispute history (has this client disputed invoices before?), '
    'communication responsiveness (do they respond to messages quickly?), and protection score (how well '
    'protected is this freelancer against this client?). Based on these factors, the AI recommends a tone '
    'that maximizes the chance of payment while preserving the client relationship where appropriate.'
))

# 6.3 Scope Creep Protection
story.append(add_heading('6.3 Scope Creep Protection with Auto-Detection', s_h2, 1))
story.append(body(
    'The scopeFormalizations table and detectScopeCreep query already exist in the Convex backend, but the '
    'frontend exposure is minimal (a FormalizeScopeChangeDialog component buried in the project protection '
    'score section). PMI 2025 research shows that 52% of all projects fail to meet original goals, 57% of '
    'agencies lose $1K-$5K monthly to scope creep, and projects are 35% more likely to exceed costs without '
    'change management. Scope creep is the number one unaddressed pain point for freelancers, and no '
    'dedicated tool exists in the market. This represents a massive opportunity for Axia.'
))

story.append(h3('6.3.1 Auto-Detection System'))
story.append(body(
    'The auto-detection system monitors three signal sources to identify scope creep as it happens. Signal '
    'Source 1 is Time Deviation: comparing actual hours worked against the original project estimate. If '
    'actual hours exceed the estimate by more than 20%, the system flags potential scope creep. Signal '
    'Source 2 is Task Divergence: analyzing time blocks and evidence events to detect work that falls outside '
    'the original project scope. For example, if a web development project starts showing evidence of design '
    'work that was not in the original scope, the system detects the deviation. Signal Source 3 is Communication '
    'Signals: scanning project communications (from the Context Hub) for phrases that indicate scope changes, '
    'such as "can you also," "while you are at it," "one more thing," and "could we add." The AI uses the '
    'z-ai-web-dev-sdk to analyze communication text and flag potential scope expansion requests.'
))

story.append(h3('6.3.2 One-Click Change Orders'))
story.append(body(
    'When scope creep is detected, the system presents a one-click change order dialog that pre-fills the '
    'detected change with: the original scope description, the detected deviation, the estimated time impact, '
    'the estimated budget impact, and a suggested additional fee. The freelancer can review, edit, and send '
    'the change order to the client for acknowledgment. The change order includes a client acknowledgment '
    'link (similar to proposal view links) that allows the client to approve or reject the change without '
    'logging into Axia. Approved changes automatically update the project scope, budget, and timeline, and '
    'the invoice is updated with the additional line item linked to the change order.'
))

story.append(h3('6.3.3 Frontend Components'))
story.append(bullet('ScopeMonitor: Real-time scope health indicator on project page (green/yellow/red)'))
story.append(bullet('ScopeDeviationAlert: Popup notification when scope creep is auto-detected'))
story.append(bullet('ChangeOrderDialog: Pre-filled change order form with AI impact assessment'))
story.append(bullet('ChangeOrderTimeline: Visual timeline of all scope changes with approval status'))
story.append(bullet('ScopeComparisonView: Side-by-side original vs. current scope with delta highlights'))
story.append(bullet('ClientApprovalPage: Client-facing page for approving/rejecting change orders'))

# ════════════════════════════════════════════════════
# SECTION 7: PHASE 4 - CONTEXT MANAGEMENT
# ════════════════════════════════════════════════════
story.append(add_heading('7. Phase 4: Context Management Hub (Weeks 13-16)', s_h1, 0))
story.append(body(
    'Context Management is the feature that ties everything together. Freelancers currently juggle Slack, '
    'email, WhatsApp, and platform messages to communicate with clients. Important context gets lost across '
    'channels, and when a dispute arises, there is no single source of truth for what was agreed upon. '
    'The Context Management Hub centralizes all project communication, decisions, and agreements in one '
    'place, with AI-generated summaries that make it easy to find any past conversation or decision.'
))

story.append(add_heading('7.1 Schema Additions', s_h2, 1))
story.append(make_table(
    ['Field', 'Type', 'Description'],
    [
        ['userId', 'id("users")', 'Hub owner'],
        ['projectId', 'id("projects")', 'Linked project'],
        ['clientId', 'id("clients")', 'Linked client'],
        ['channel', 'string', 'email | slack | whatsapp | platform_message | axia_chat | meeting_notes'],
        ['direction', 'string', 'inbound | outbound | internal'],
        ['subject', 'optional string', 'Subject or topic'],
        ['content', 'string', 'Full message content'],
        ['aiSummary', 'optional string', 'AI-generated summary of the message'],
        ['keyDecisions', 'optional string[]', 'Decisions extracted by AI'],
        ['actionItems', 'optional string[]', 'Action items extracted by AI'],
        ['scopeImplications', 'optional string[]', 'Potential scope changes detected by AI'],
        ['attachments', 'optional object[]', 'File attachments with metadata'],
        ['threadId', 'optional string', 'Thread/conversation ID for grouping'],
        ['timestamp', 'number', 'Message timestamp'],
        ['isFlagged', 'optional boolean', 'User-flagged as important'],
        ['linkedProposalId', 'optional id("proposals")', 'Linked proposal if applicable'],
        ['linkedInvoiceId', 'optional id("invoices")', 'Linked invoice if applicable'],
        ['linkedChangeOrderId', 'optional string', 'Linked change order if applicable'],
    ],
    [0.22, 0.28, 0.50]
))
story.append(caption('Table 10: Context Messages Table Schema'))

story.append(add_heading('7.2 AI-Powered Features', s_h2, 1))
story.append(body(
    'The Context Hub uses AI in three transformative ways. First, it provides Automatic Summarization: '
    'every message that enters the hub is processed by the z-ai-web-dev-sdk to generate a concise summary, '
    'extract key decisions, and identify action items. This means a freelancer can quickly scan the AI '
    'summaries instead of reading through hundreds of messages to find what was agreed upon. Second, it '
    'provides Scope Change Detection: the AI scans all inbound communications for language that suggests '
    'scope expansion and automatically links these to the Scope Creep Protection system. When a client says '
    '"can we also add a blog section," the AI flags it as a potential scope change and creates a pre-filled '
    'change order ready for the freelancer to review. Third, it provides Smart Linking: the AI identifies '
    'references to proposals, invoices, change orders, and work sessions within messages and automatically '
    'creates cross-references. This creates a navigable web of connections where clicking on a proposal '
    'shows all related communications, and clicking on a message shows the proposal it references.'
))

story.append(add_heading('7.3 Integration Points', s_h2, 1))
story.append(body(
    'The Context Hub integrates with every other feature in Axia. When a Smart Proposal is sent, the '
    'proposal content and client engagement data are automatically added to the Context Hub. When a Payment '
    'Reminder is sent or received, it is logged in the Context Hub with the linked invoice. When a scope '
    'change is detected, the originating communication is preserved as evidence. When a dispute report is '
    'generated, all Context Hub entries for the project are included as supporting evidence. This creates a '
    'comprehensive audit trail that connects every action to its context, making disputes dramatically easier '
    'to resolve in the freelancer\'s favor.'
))

story.append(add_heading('7.4 Frontend Components', s_h2, 1))
story.append(bullet('ContextHub: Main page with threaded message view, filters, and search'))
story.append(bullet('MessageThread: Grouped conversation view with AI summaries'))
story.append(bullet('AISummaryPanel: Collapsible panel showing AI-extracted decisions and action items'))
story.append(bullet('ScopeAlertBadge: Inline indicator when a message contains scope change language'))
story.append(bullet('QuickCapture: Button/extension to log a meeting note or verbal agreement'))
story.append(bullet('ContextTimeline: Visual timeline of all project events (messages, proposals, invoices, changes)'))
story.append(bullet('SmartSearch: Natural language search across all project context'))

# ════════════════════════════════════════════════════
# SECTION 8: TECHNICAL ARCHITECTURE
# ════════════════════════════════════════════════════
story.append(add_heading('8. Technical Architecture', s_h1, 0))

story.append(add_heading('8.1 Convex Backend Organization', s_h2, 1))
story.append(body(
    'The Convex backend must be reorganized to accommodate the new features while maintaining clean separation '
    'of concerns. The current structure under convex/ already uses subdirectories (projects/, clients/, '
    'platforms/, premium/, tiers/, protection/, evidence/, security/, ai/, audit/, network/, policies/, wcvm/). '
    'We need to add three new subdirectories: proposals/ (for Smart Proposals), pipeline/ (for CRM Pipeline), '
    'and context/ (for Context Management). The billing/ and reminders/ functions can extend the existing '
    'structure since invoices and payment patterns already have related code.'
))
story.append(spacer(6))

story.append(h3('New Convex Function Files'))
story.append(make_table(
    ['Directory', 'File', 'Key Functions'],
    [
        ['convex/proposals/', 'proposals.ts', 'createProposal, updateProposal, sendProposal, getMyProposals, getProposalByViewToken, trackProposalView'],
        ['convex/proposals/', 'aiGeneration.ts', 'generateProposalDraft, enhanceWithProtection, generateFollowUp'],
        ['convex/proposals/', 'followUps.ts', 'scheduleFollowUps, sendFollowUp, getFollowUpSchedule, updateFollowUpTone'],
        ['convex/pipeline/', 'deals.ts', 'createDeal, updateDealStage, getMyDeals, getPipelineStats, moveDeal'],
        ['convex/pipeline/', 'scoring.ts', 'calculateLeadScore, updateDealProbability, getRiskSignals'],
        ['convex/pipeline/', 'analytics.ts', 'getPipelineAnalytics, getConversionRates, getForecastedRevenue'],
        ['convex/billing/', 'validatedInvoices.ts', 'createValidatedInvoice, linkWorkSession, calculateValidationScore, getInvoiceEvidence'],
        ['convex/billing/', 'reminders.ts', 'createReminderSchedule, getNextReminder, markReminderSent, escalateReminder'],
        ['convex/billing/', 'smartEscalation.ts', 'calculateEscalationLevel, generateToneOverride, generateReminderContent'],
        ['convex/context/', 'messages.ts', 'addMessage, getProjectMessages, searchMessages, flagMessage'],
        ['convex/context/', 'aiProcessing.ts', 'summarizeMessage, extractDecisions, detectScopeLanguage, smartLink'],
        ['convex/context/', 'timeline.ts', 'getProjectTimeline, getLinkedEvents, getFullAuditTrail'],
    ],
    [0.18, 0.30, 0.52]
))
story.append(caption('Table 11: New Convex Function Files'))

story.append(add_heading('8.2 Frontend Route Additions', s_h2, 1))
story.append(body(
    'The sidebar navigation must be updated to include new routes for Smart Proposals and the CRM Pipeline, '
    'and the existing Invoices and Projects pages must be enhanced with validated billing and scope creep '
    'features. The Context Hub should appear as both a standalone page and an inline panel on project pages.'
))
story.append(spacer(6))
story.append(make_table(
    ['Route', 'Component', 'Sidebar Section', 'Status'],
    [
        ['/proposals', 'Proposals', 'WORK', 'New'],
        ['/pipeline', 'Pipeline', 'WORK', 'New'],
        ['/invoices', 'Invoices (enhanced)', 'BILLING', 'Enhanced'],
        ['/projects', 'Projects (enhanced)', 'WORK', 'Enhanced'],
        ['/context', 'Context Hub', 'WORK', 'New'],
        ['/onboarding', 'OnboardingWizard', 'N/A (public)', 'Rebuilt'],
    ],
    [0.20, 0.30, 0.25, 0.15]
))
story.append(caption('Table 12: Route Additions and Enhancements'))

story.append(add_heading('8.3 AI Integration Architecture', s_h2, 1))
story.append(body(
    'All AI features use the z-ai-web-dev-sdk, which must be called exclusively from Convex actions (not '
    'from the frontend). The AI integration follows a consistent pattern: the user triggers an action '
    '(e.g., "Generate Proposal"), the frontend calls a Convex mutation that creates a pending record, the '
    'mutation schedules a Convex action, the action calls the z-ai-web-dev-sdk chat completions API with '
    'a carefully crafted system prompt, and the action updates the pending record with the AI response. '
    'This pattern ensures that AI calls are server-side (as required by the SDK), non-blocking (the user '
    'sees a loading state), and auditable (every AI interaction is logged in Convex).'
))
story.append(spacer(6))
story.append(body(
    'The system prompts for each AI feature must be meticulously crafted. For Smart Proposals, the system '
    'prompt should instruct the AI to generate proposals that include Axia-specific protection clauses and '
    'WCVM commitments. For Payment Reminders, the system prompt should instruct the AI to adjust tone based '
    'on the client context provided. For Context Management, the system prompt should instruct the AI to '
    'extract decisions, action items, and scope change signals from communications. Each system prompt '
    'should be stored as a Convex constant so it can be updated without redeploying the frontend.'
))

# ════════════════════════════════════════════════════
# SECTION 9: IMPLEMENTATION TIMELINE
# ════════════════════════════════════════════════════
story.append(add_heading('9. Implementation Timeline', s_h1, 0))
story.append(body(
    'The following timeline assumes a single developer working full-time with occasional AI-assisted code '
    'generation. If multiple developers are available, phases can overlap. The timeline is structured to '
    'deliver user-visible value at the end of each phase, following an agile methodology where each phase '
    'produces a deployable increment.'
))

story.append(make_table(
    ['Week', 'Phase', 'Deliverables', 'User-Visible Outcome'],
    [
        ['1', 'Foundation', 'Pricing sync, server-side tiers', 'Correct pricing on subscription page'],
        ['2', 'Foundation', 'Auth guards, ProtectedRoute component', 'Dashboard protected from unauthenticated access'],
        ['3', 'Foundation', 'Onboarding wizard Steps 1-4', 'New users get profession-specific setup'],
        ['4', 'Foundation', 'Onboarding wizard Steps 5-7, progress tracking', 'Users reach dashboard with real data in 10 min'],
        ['5', 'Proposals + CRM', 'Proposals schema, AI generation backend', 'Proposal creation API functional'],
        ['6', 'Proposals + CRM', 'ProposalBuilder component, client view', 'Users can create and send proposals'],
        ['7', 'Proposals + CRM', 'Smart follow-ups engine, pipeline schema', 'Auto follow-ups scheduled, pipeline API ready'],
        ['8', 'Proposals + CRM', 'PipelineBoard, deal cards, scoring', 'Full Kanban pipeline with AI scoring'],
        ['9', 'Billing + Reminders', 'Validated invoice schema, linking logic', 'Invoices link to work sessions and evidence'],
        ['10', 'Billing + Reminders', 'Validation score, dispute-ready invoices', 'One-click dispute reports from invoices'],
        ['11', 'Billing + Reminders', 'Reminder scheduling, smart escalation', 'Automated reminders with AI tone adjustment'],
        ['12', 'Billing + Reminders', 'Scope creep auto-detection, change orders', 'Scope changes auto-detected and formalized'],
        ['13', 'Context', 'Context Hub schema, message ingestion', 'Messages stored with AI summaries'],
        ['14', 'Context', 'Smart linking, scope signal detection', 'Context linked across all features'],
        ['15', 'Context', 'Timeline view, smart search, integrations', 'Full audit trail and natural language search'],
        ['16', 'Integration', 'Cross-feature polish, testing, bug fixes', 'All features working together seamlessly'],
    ],
    [0.06, 0.18, 0.40, 0.36]
))
story.append(caption('Table 13: Week-by-Week Implementation Timeline'))

# ════════════════════════════════════════════════════
# SECTION 10: CONVEX SCHEMA MIGRATION
# ════════════════════════════════════════════════════
story.append(add_heading('10. Convex Schema Migration Summary', s_h1, 0))
story.append(body(
    'The following tables need to be added to the Convex schema. The existing tables (users, clients, '
    'projects, workSessions, evidenceSessions, scopeFormalizations, automatedDisputeReports) need field '
    'additions but no structural changes. All new tables follow the existing pattern of using optional '
    'fields with sensible defaults to maintain backward compatibility with existing data.'
))
story.append(spacer(6))
story.append(make_table_center(
    ['Table', 'Type', 'Phase', 'Key Purpose'],
    [
        ['proposals', 'New', '2', 'Smart Proposals lifecycle management'],
        ['pipelineDeals', 'New', '2', 'CRM Pipeline deal tracking and scoring'],
        ['invoices (enhanced)', 'Modified', '3', 'Validated billing with evidence links'],
        ['paymentReminders', 'New', '3', 'Automated reminder scheduling and tracking'],
        ['contextMessages', 'New', '4', 'Centralized communication hub'],
        ['changeOrders', 'New', '3', 'Scope creep change order tracking'],
        ['professionTemplates', 'New', '1', 'Profession-specific defaults for onboarding'],
        ['clientApprovalTokens', 'New', '2', 'Token-based client approval for proposals and change orders'],
    ],
    [0.28, 0.12, 0.10, 0.50]
))
story.append(caption('Table 14: Convex Schema Migration Summary'))

# ════════════════════════════════════════════════════
# SECTION 11: PRICING AND MONETIZATION
# ════════════════════════════════════════════════════
story.append(add_heading('11. Pricing and Monetization Strategy', s_h1, 0))
story.append(body(
    'The pricing must be synced to the live website ($7/$15/$49) and each feature must be strategically '
    'tier-gated to drive upgrades. The tier-gating strategy follows the principle of giving Free users '
    'enough value to become hooked while reserving the most powerful capabilities for paid tiers. Smart '
    'Proposals at the basic level (3 per month, no AI generation) should be available to Starter users, '
    'while unlimited AI-powered proposals with smart follow-ups should be Pro-only. The CRM Pipeline with '
    'basic Kanban should be available to Starter users, but AI-driven lead scoring and risk signals should '
    'be Pro-only. Validated Billing with manual evidence linking should be Starter, while auto-validation '
    'and dispute-ready invoices should be Pro. Automated Payment Reminders should be Pro-only as they '
    'represent significant value and server-side processing cost. Scope Creep Detection should be Expert-only '
    'as it requires the most sophisticated AI analysis. Context Management should be Expert-only as it '
    'involves the highest storage and processing costs.'
))
story.append(spacer(6))
story.append(make_table_center(
    ['Feature', 'Free', 'Starter ($7)', 'Pro ($15)', 'Expert ($49)'],
    [
        ['Smart Proposals', '1 (no AI)', '3/mo (no AI)', 'Unlimited + AI + Follow-ups', 'Unlimited + AI + Follow-ups'],
        ['CRM Pipeline', 'List only', 'Basic Kanban', 'AI Scoring + Risk Signals', 'Full + Custom Fields'],
        ['Validated Billing', 'No', 'Manual linking', 'Auto-validation + Dispute-ready', 'Full + WCVM Badge'],
        ['Payment Reminders', 'No', 'No', 'Smart Escalation', 'Smart Escalation + Legal Templates'],
        ['Scope Creep Detection', 'No', 'No', 'Manual change orders', 'AI Auto-detect + Change Orders'],
        ['Context Management', 'No', 'No', 'No', 'Full Hub + AI Summaries'],
        ['Instant Setup', 'Yes', 'Yes', 'Yes', 'Yes'],
    ],
    [0.20, 0.14, 0.18, 0.24, 0.24]
))
story.append(caption('Table 15: Feature Tier-Gating Strategy'))

# ════════════════════════════════════════════════════
# SECTION 12: RISK MITIGATION
# ════════════════════════════════════════════════════
story.append(add_heading('12. Risk Mitigation', s_h1, 0))
story.append(body(
    'Building seven major features in 16 weeks carries significant risk. The following mitigation strategies '
    'address the most critical risk factors identified during the planning process.'
))
story.append(spacer(6))

story.append(make_table(
    ['Risk', 'Probability', 'Impact', 'Mitigation Strategy'],
    [
        ['Scope creep in development', 'High', 'High', 'Strict phase gates: no new features until current phase is deployable'],
        ['AI API latency/cost', 'Medium', 'Medium', 'Cache AI responses, use streaming for long generations, implement rate limiting'],
        ['Convex function limits', 'Low', 'High', 'Batch operations, use internal actions for heavy processing, paginate queries'],
        ['Frontend complexity', 'Medium', 'Medium', 'Reuse shadcn/ui components, maintain component library, code review before merge'],
        ['Mock data migration', 'High', 'Medium', 'Replace mock data incrementally per page, not all at once; parallel mock + real data during transition'],
        ['Client approval flow security', 'Low', 'High', 'Use cryptographic tokens (uuid + hash), expire tokens after 30 days, validate on every request'],
        ['User adoption resistance', 'Medium', 'High', 'Gradual rollout with feature flags, opt-in beta for new features, feedback loops'],
    ],
    [0.22, 0.12, 0.10, 0.56]
))
story.append(caption('Table 16: Risk Assessment and Mitigation Strategies'))

story.append(body(
    'The most important mitigation is the phased delivery approach. Each phase produces a deployable increment, '
    'so even if the full 16-week plan is not completed, the features delivered in earlier phases are live '
    'and providing value. Phase 1 alone (pricing sync, auth guards, instant setup) significantly improves '
    'the user experience and eliminates the most critical gaps. Phase 2 (Smart Proposals + CRM) delivers '
    'the two most marketable features. If development stalls after Phase 2, Axia still has a compelling '
    'product that no competitor can match.'
))

# ════════════════════════════════════════════════════
# SECTION 13: SUCCESS METRICS
# ════════════════════════════════════════════════════
story.append(add_heading('13. Success Metrics', s_h1, 0))
story.append(body(
    'Each feature should be measured against specific success criteria to validate that the implementation '
    'meets or exceeds the intended goals. The following metrics provide a framework for evaluating feature '
    'success after deployment.'
))
story.append(spacer(6))
story.append(make_table(
    ['Feature', 'Primary Metric', 'Target', 'Secondary Metrics'],
    [
        ['Smart Proposals', 'Proposal creation time', 'Under 5 minutes (from 30+ min manual)', 'Conversion rate, follow-up response rate, AI draft acceptance rate'],
        ['CRM Pipeline', 'Deal movement frequency', 'Deals updated at least weekly', 'Pipeline velocity, forecast accuracy, lead score precision'],
        ['Validated Billing', 'Invoice validation score', 'Average score above 75', 'Dispute success rate for validated invoices, client trust improvement'],
        ['Payment Reminders', 'On-time payment rate', '40% improvement over baseline', 'Reminder open rate, payment after first reminder, escalation frequency'],
        ['Scope Creep Detection', 'Detection accuracy', '80% of scope changes auto-detected', 'Change order approval rate, revenue recovered from scope changes'],
        ['Context Management', 'Context retrieval time', 'Under 30 seconds to find any past decision', 'AI summary accuracy, cross-reference density, search satisfaction'],
        ['Instant Setup', 'Time to first value', 'Under 10 minutes', 'Onboarding completion rate, day-7 retention, profile completeness'],
    ],
    [0.16, 0.20, 0.24, 0.40]
))
story.append(caption('Table 17: Feature Success Metrics and Targets'))

# ════════════════════════════════════════════════════
# BUILD
# ════════════════════════════════════════════════════
doc.multiBuild(story)

print(f"PDF generated: {output_path}")
