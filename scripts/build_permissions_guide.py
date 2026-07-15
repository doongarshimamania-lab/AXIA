#!/usr/bin/env python3
"""
Generate AXIA-PERMISSIONS-GUIDE.pdf — how to grant tiers / roles / team membership.

Uses ReportLab. Output: /home/z/my-project/download/AXIA-PERMISSIONS-GUIDE.pdf
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem, Preformatted, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

FONT_DIR = "/usr/share/fonts"

# Register fonts
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# Try to register a mono font for code blocks
try:
    pdfmetrics.registerFont(TTFont('Mono', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
    MONO_FONT = 'Mono'
except Exception:
    MONO_FONT = 'Courier'

# Palette — emerald accent (matches the new Dev Team color)
PRIMARY = HexColor("#0f172a")
ACCENT = HexColor("#10b981")
MUTED = HexColor("#64748b")
BG_SOFT = HexColor("#f1f5f9")
BORDER = HexColor("#e2e8f0")
CODE_BG = HexColor("#f8fafc")
DANGER = HexColor("#dc2626")
WARN = HexColor("#f59e0b")

# Styles
styles = getSampleStyleSheet()
H1 = ParagraphStyle('H1', parent=styles['Heading1'], fontName='NotoSerifSC-Bold',
                    fontSize=22, leading=28, textColor=PRIMARY, spaceAfter=12, spaceBefore=18)
H2 = ParagraphStyle('H2', parent=styles['Heading2'], fontName='NotoSerifSC-Bold',
                    fontSize=16, leading=22, textColor=PRIMARY, spaceAfter=8, spaceBefore=14)
H3 = ParagraphStyle('H3', parent=styles['Heading3'], fontName='NotoSerifSC-Bold',
                    fontSize=12, leading=16, textColor=ACCENT, spaceAfter=4, spaceBefore=10)
BODY = ParagraphStyle('Body', parent=styles['Normal'], fontName='NotoSerifSC',
                      fontSize=10.5, leading=16, textColor=PRIMARY, spaceAfter=8, alignment=TA_LEFT)
MUTED_STYLE = ParagraphStyle('Muted', parent=BODY, textColor=MUTED, fontSize=9, leading=13)
CODE = ParagraphStyle('Code', parent=styles['Code'], fontName=MONO_FONT,
                      fontSize=8.5, leading=12, textColor=PRIMARY,
                      backColor=CODE_BG, borderColor=BORDER, borderWidth=0.5,
                      borderPadding=6, spaceAfter=8, spaceBefore=4, leftIndent=8, rightIndent=8)
CALLOUT = ParagraphStyle('Callout', parent=BODY, fontName='NotoSerifSC',
                         fontSize=10, leading=15, textColor=PRIMARY,
                         backColor=HexColor("#fef3c7"), borderColor=WARN,
                         borderWidth=0.5, borderPadding=8, spaceAfter=10, spaceBefore=4)
DANGER_CALLOUT = ParagraphStyle('Danger', parent=BODY, fontName='NotoSerifSC',
                                fontSize=10, leading=15, textColor=PRIMARY,
                                backColor=HexColor("#fee2e2"), borderColor=DANGER,
                                borderWidth=0.5, borderPadding=8, spaceAfter=10, spaceBefore=4)


def code_block(text: str) -> Preformatted:
    return Preformatted(text, CODE)


def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=8, spaceAfter=8)


def build_pdf():
    out_path = "/home/z/my-project/download/AXIA-PERMISSIONS-GUIDE.pdf"
    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=20*mm, bottomMargin=18*mm,
        title="AXIA Permissions & Grants Guide",
        author="Z.ai", subject="How to grant tiers, roles, and team membership in AXIA",
    )
    story = []

    # ─── Title block ─────────────────────────────────────────────────────────
    story.append(Paragraph("AXIA Permissions & Grants Guide", H1))
    story.append(Paragraph(
        "How to grant subscription tiers, workspace roles, and team membership "
        "to other people in your AXIA deployment.", MUTED_STYLE))
    story.append(Spacer(1, 6))
    story.append(hr())

    # ─── Section 1: What can be granted ──────────────────────────────────────
    story.append(Paragraph("1. What you can grant", H2))
    story.append(Paragraph(
        "AXIA has three independent permission axes. A single user can hold any "
        "combination of the three, and each axis is granted separately. "
        "Understanding the difference between them is essential before you start "
        "granting access — confusing a tier with a workspace role is the most "
        "common mistake new admins make.", BODY))
    story.append(Paragraph(
        "The three axes are: <b>subscription tier</b> (controls which features "
        "the user can access in the product), <b>workspace role</b> (controls "
        "what the user can do inside a specific workspace — owner, manager, or "
        "member), and <b>team membership</b> (controls which sub-team within a "
        "workspace the user belongs to — e.g., Dev Team, Design, Management). "
        "Granting a tier does not grant workspace access; granting workspace "
        "access does not put the user in a team; and adding a user to a team "
        "does not give them a workspace role.", BODY))

    grant_table = Table([
        ["Axis", "Values", "Granted by", "Scope"],
        ["Subscription tier", "free / starter / pro / expert / client",
         "adminGrants:grantTier", "Global (per user)"],
        ["Workspace role", "owner / manager / member",
         "adminGrants:grantWorkspaceRole", "Per workspace"],
        ["Team membership", "lead / member",
         "adminGrants:addToTeam", "Per team"],
    ], colWidths=[35*mm, 50*mm, 45*mm, 40*mm])
    grant_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor("#ffffff")),
        ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor("#ffffff"), BG_SOFT]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(grant_table)
    story.append(Spacer(1, 8))

    # ─── Section 2: Prerequisites ────────────────────────────────────────────
    story.append(Paragraph("2. Prerequisites", H2))
    story.append(Paragraph(
        "All grant operations run as Convex mutations via <code>npx convex run</code>. "
        "Before you can grant anything, three things must be true:", BODY))
    story.append(ListFlowable([
        ListItem(Paragraph(
            "<b>The user must already exist.</b> Grant mutations look up the "
            "user by email in the <code>users</code> table. If the user hasn't "
            "signed up yet, the mutation returns <code>{ ok: false, error: "
            "\"No user found with email ...\" }</code>. Have the person sign up "
            "at <code>/auth?mode=signup</code> first.", BODY)),
        ListItem(Paragraph(
            "<b>You must be logged in to Convex locally.</b> Run "
            "<code>npx convex login</code> once on your machine. The "
            "deployment you target is read from <code>.env</code> "
            "(<code>VITE_CONVEX_URL</code>).", BODY)),
        ListItem(Paragraph(
            "<b>The adminGrants.ts file must be deployed.</b> Run "
            "<code>npx convex deploy</code> from the project root after every "
            "change to <code>src/convex/adminGrants.ts</code>. The deploy "
            "pushes the mutations to your live Convex deployment.", BODY)),
    ], bulletType='bullet', leftIndent=12))
    story.append(Spacer(1, 6))

    # ─── Section 3: Grant a subscription tier ────────────────────────────────
    story.append(Paragraph("3. Grant a subscription tier", H2))
    story.append(Paragraph(
        "Tiers control which product features the user can access. AXIA has "
        "five tiers: <b>free</b> (default for new signups), <b>starter</b>, "
        "<b>pro</b>, <b>expert</b> (highest individual tier), and <b>client</b> "
        "(a special tier for clients accessing the client portal). Tiers are "
        "global — they apply across all of the user's workspaces, personal and "
        "team.", BODY))
    story.append(Paragraph(
        "To grant a tier, use <code>adminGrants:grantTier</code>:", H3))
    story.append(code_block(
        '# Grant the "pro" tier to marcus@axia.dev\n'
        'npx convex run adminGrants:grantTier \\\n'
        '  \'{"email":"marcus@axia.dev","tier":"pro"}\'\n\n'
        '# Grant the "expert" tier to yourself\n'
        'npx convex run adminGrants:upgradeSelfToExpert \\\n'
        '  \'{"email":"priya@axia.dev"}\'\n\n'
        '# Valid tier values: "free" | "starter" | "pro" | "expert" | "client"'
    ))
    story.append(Paragraph(
        "The mutation is idempotent: running it twice with the same arguments "
        "simply rewrites the same <code>subscriptionTier</code> field. It also "
        "stamps <code>tierUpgradedAt</code> with the current timestamp so you "
        "can audit when the upgrade happened. The return value is a JSON "
        "object with <code>ok</code>, <code>previousTier</code>, "
        "<code>newTier</code>, and <code>email</code> — save this to your "
        "audit log.", BODY))

    story.append(Paragraph(
        "<b>Security warning:</b> the current implementation does NOT verify "
        "that the caller is an admin — it relies on the Convex deployment "
        "being private (only someone with deploy access can run "
        "<code>npx convex run</code>). Before going to production, you must "
        "add a <code>requireAdmin(ctx)</code> check to each handler. The "
        "AXIA-SECURITY-AUDIT.pdf document covers this in finding SEC-ADMIN-1.",
        DANGER_CALLOUT))

    # ─── Section 4: Grant a workspace role ───────────────────────────────────
    story.append(Paragraph("4. Grant a workspace role", H2))
    story.append(Paragraph(
        "Workspace roles control what a user can do inside a specific "
        "workspace. There are three roles, in order of escalating privilege:", BODY))
    role_table = Table([
        ["Role", "Can do", "Cannot do"],
        ["member", "Read all workspace data; create/edit own records; "
         "comment on shared records.",
         "Delete records they didn't create; invite users; change settings."],
        ["manager", "Everything a member can do + invite/remove members; "
         "create teams; manage team membership; delete any record.",
         "Delete the workspace; transfer ownership; demote the owner."],
        ["owner", "Full control. There is exactly one owner per workspace.",
         "Nothing is blocked. Owner is set when the workspace is created."],
    ], colWidths=[22*mm, 75*mm, 75*mm])
    role_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor("#ffffff")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor("#ffffff"), BG_SOFT]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(role_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("To grant a workspace role:", H3))
    story.append(code_block(
        '# Make marcus@axia.dev a manager of the AXIA Team workspace\n'
        'npx convex run adminGrants:grantWorkspaceRole \\\n'
        '  \'{"email":"marcus@axia.dev","workspaceName":"AXIA Team","role":"manager"}\'\n\n'
        '# If you omit workspaceName, the first team workspace is used.\n'
        '# Valid role values: "owner" | "manager" | "member"'
    ))
    story.append(Paragraph(
        "If the user already has a <code>workspaceMembers</code> row in that "
        "workspace, the mutation patches the existing row's <code>role</code> "
        "and <code>status</code> (forcing status to <code>active</code>). If "
        "they don't, it inserts a new row with the requested role. There is no "
        "promotion-path restriction — you can promote a member directly to "
        "manager, or demote a manager to member. The one exception: "
        "transferring ownership requires the dedicated "
        "<code>permissions/transferOwnership</code> mutation because it also "
        "updates the <code>workspaces.ownerId</code> field and revokes the "
        "previous owner's row.", BODY))

    # ─── Section 5: Add to a team ────────────────────────────────────────────
    story.append(Paragraph("5. Add a user to a team", H2))
    story.append(Paragraph(
        "Teams are sub-groups inside a workspace. Each workspace starts with "
        "three default teams: <b>Dev Team</b> (engineering, emerald), "
        "<b>Design</b> (purple), and <b>Management</b> (orange, marked "
        "<code>isCrossTeam=true</code> so members see all data across teams). "
        "Adding a user to a team gives them access to that team's records "
        "(clients, projects, deals, etc.).", BODY))
    story.append(Paragraph("To add a user to a team:", H3))
    story.append(code_block(
        '# Add marcus@axia.dev to the Dev Team as a member\n'
        'npx convex run adminGrants:addToTeam \\\n'
        '  \'{"email":"marcus@axia.dev","teamName":"Dev Team","role":"member"}\'\n\n'
        '# Promote aisha@axia.dev to lead of the Dev Team\n'
        'npx convex run adminGrants:addToTeam \\\n'
        '  \'{"email":"aisha@axia.dev","teamName":"Dev Team","role":"lead"}\'\n\n'
        '# Omit role to add as "member" by default.'
    ))
    story.append(Paragraph(
        "The mutation looks up the team by name across all workspaces. If "
        "multiple teams share a name (rare but possible), it picks the first "
        "match — to be unambiguous, rename one of the teams first via "
        "<code>teams:updateTeam</code>. If the user is already in the team, "
        "the mutation either returns a no-op message (same role) or patches "
        "the role (different role).", BODY))

    # ─── Section 6: Common workflows ────────────────────────────────────────
    story.append(Paragraph("6. Common workflows", H2))

    story.append(Paragraph("6.1 Onboard a new team member", H3))
    story.append(Paragraph(
        "When a new teammate joins, you typically want to give them a tier, "
        "add them to the workspace, and add them to one or more teams — all "
        "three operations. Here's the full sequence for onboarding "
        "<code>newhire@axia.dev</code> as a pro-tier manager in the Dev Team:", BODY))
    story.append(code_block(
        '# Step 0: the user signs up at /auth?mode=signup first.\n\n'
        '# Step 1: grant pro tier\n'
        'npx convex run adminGrants:grantTier \\\n'
        '  \'{"email":"newhire@axia.dev","tier":"pro"}\'\n\n'
        '# Step 2: add to AXIA Team workspace as manager\n'
        'npx convex run adminGrants:grantWorkspaceRole \\\n'
        '  \'{"email":"newhire@axia.dev","workspaceName":"AXIA Team","role":"manager"}\'\n\n'
        '# Step 3: add to the Dev Team\n'
        'npx convex run adminGrants:addToTeam \\\n'
        '  \'{"email":"newhire@axia.dev","teamName":"Dev Team","role":"member"}\''
    ))

    story.append(Paragraph("6.2 Promote an existing member to lead", H3))
    story.append(Paragraph(
        "Marcus is currently a member of the Design team. Promote him to lead:", BODY))
    story.append(code_block(
        'npx convex run adminGrants:addToTeam \\\n'
        '  \'{"email":"marcus@axia.dev","teamName":"Design","role":"lead"}\''
    ))

    story.append(Paragraph("6.3 Demote a manager to member", H3))
    story.append(Paragraph(
        "If a manager steps down but should keep workspace access:", BODY))
    story.append(code_block(
        'npx convex run adminGrants:grantWorkspaceRole \\\n'
        '  \'{"email":"marcus@axia.dev","workspaceName":"AXIA Team","role":"member"}\''
    ))

    story.append(Paragraph("6.4 Revoke all access (offboarding)", H3))
    story.append(Paragraph(
        "There is no single \"revoke all\" mutation. To fully offboard a user, "
        "you must remove them from each team individually, demote them in the "
        "workspace, and optionally downgrade their tier. There is currently no "
        "mutation that deletes the <code>workspaceMembers</code> row directly — "
        "use <code>workspaces/members:removeMember</code> for that.", BODY))
    story.append(code_block(
        '# 1. Remove from each team they are in (run per team)\n'
        'npx convex run teams:removeTeamMember \\\n'
        '  \'{"teamId":"<team-id>","userId":"<user-id>"}\'\n\n'
        '# 2. Downgrade tier to free\n'
        'npx convex run adminGrants:grantTier \\\n'
        '  \'{"email":"offboarded@axia.dev","tier":"free"}\'\n\n'
        '# 3. (Optional) Remove from workspace entirely\n'
        'npx convex run workspaces/members:removeMember \\\n'
        '  \'{"workspaceId":"<ws-id>","userId":"<user-id>"}\''
    ))

    # ─── Section 7: Audit trail ──────────────────────────────────────────────
    story.append(Paragraph("7. Auditing who has what", H2))
    story.append(Paragraph(
        "To see every user in your deployment with their current tier, run:", BODY))
    story.append(code_block(
        'npx convex run adminListAll:listAllUsers \'{}\'\n\n'
        '# Returns: [{ _id, email, name, role, tier, onboardingComplete, isAnonymous }, ...]'
    ))
    story.append(Paragraph(
        "To see every team in a workspace and its members, run:", BODY))
    story.append(code_block(
        'npx convex run teams:getTeams \'{"workspaceId":"<ws-id>"}\'\n'
        'npx convex run teams:getTeamMembers \'{"teamId":"<team-id>"}\''
    ))
    story.append(Paragraph(
        "There is currently no single \"dump all permissions\" mutation. For "
        "a complete audit, you would need to (a) list all users, (b) list all "
        "workspaces, (c) for each workspace list all members, (d) for each "
        "workspace list all teams, (e) for each team list all memberships. "
        "This is a known gap — the security audit recommends adding a "
        "<code>adminListAll:dumpAllPermissions</code> mutation before "
        "production.", BODY))

    # ─── Section 8: Production hardening checklist ──────────────────────────
    story.append(Paragraph("8. Production hardening checklist", H2))
    story.append(Paragraph(
        "Before opening AXIA to paying customers, address every item below. "
        "Each item corresponds to a finding in the AXIA-SECURITY-AUDIT.pdf "
        "report.", BODY))
    story.append(ListFlowable([
        ListItem(Paragraph(
            "<b>Add <code>requireAdmin(ctx)</code> to every handler in "
            "adminGrants.ts.</b> Today any signed-in user could theoretically "
            "call these mutations (though Convex's private deployment flag "
            "blocks external callers). Define an admin role in the users "
            "table and check it at the top of each handler.", BODY)),
        ListItem(Paragraph(
            "<b>Move tier grants behind a billing webhook.</b> Tier changes "
            "should be triggered by Stripe (or equivalent) payment events, "
            "not by manual admin commands. The webhook verifies the Stripe "
            "signature and then calls the grant internally.", BODY)),
        ListItem(Paragraph(
            "<b>Audit-log every grant.</b> Every call to grantTier / "
            "grantWorkspaceRole / addToTeam should write a row to an "
            "<code>auditLog</code> table with: caller userId, target userId, "
            "action, before-value, after-value, timestamp. This is required "
            "for SOC 2 compliance.", BODY)),
        ListItem(Paragraph(
            "<b>Implement rate limiting on grant mutations.</b> A compromised "
            "admin account could otherwise mass-grant expert tier to "
            "thousands of users in seconds. Add the rate-limit helper from "
            "<code>security/rateLimit.ts</code>.", BODY)),
        ListItem(Paragraph(
            "<b>Two-person rule for tier downgrades.</b> Downgrading a user "
            "from expert to free (especially when the user has paid) should "
            "require confirmation from a second admin. This prevents a single "
            "rogue admin from lockout-extorting users.", BODY)),
        ListItem(Paragraph(
            "<b>Delete <code>adminListAll.ts</code> before production.</b> "
            "The file's own header comment says so. It exposes listAllUsers "
            "(with emails and tiers) and resetPassword (no auth check) — both "
            "are critical vulnerabilities if exposed publicly.", BODY)),
    ], bulletType='bullet', leftIndent=12))

    # ─── Section 9: Quick reference ──────────────────────────────────────────
    story.append(Paragraph("9. Quick reference card", H2))
    story.append(Paragraph(
        "Print this section and keep it next to your terminal.", BODY))
    story.append(code_block(
        '# ─── GRANTS ─────────────────────────────────────────────────────────\n'
        'npx convex run adminGrants:grantTier \\\n'
        '  \'{"email":"X","tier":"pro|expert|client|starter|free"}\'\n\n'
        'npx convex run adminGrants:grantWorkspaceRole \\\n'
        '  \'{"email":"X","workspaceName":"AXIA Team","role":"owner|manager|member"}\'\n\n'
        'npx convex run adminGrants:addToTeam \\\n'
        '  \'{"email":"X","teamName":"Dev Team","role":"lead|member"}\'\n\n'
        'npx convex run adminGrants:upgradeSelfToExpert \'{"email":"X"}\'\n\n'
        '# ─── AUDIT ──────────────────────────────────────────────────────────\n'
        'npx convex run adminListAll:listAllUsers \'{}\'\n'
        'npx convex run adminListAll:listAllAuthAccounts \'{}\'\n\n'
        '# ─── FIRST-TIME SETUP ───────────────────────────────────────────────\n'
        'npx convex deploy                # push adminGrants.ts to live\n'
        'bash scripts/admin-grants.sh    # rename Eng → Dev Team + upgrade self'
    ))

    # Footer
    story.append(Spacer(1, 12))
    story.append(hr())
    story.append(Paragraph(
        "Generated 2026-06-23. Companion document to AXIA-SECURITY-AUDIT.pdf. "
        "For the security rationale behind each grant's restrictions, see "
        "the audit report's sections SEC-ADMIN-1, SEC-IDOR-2, and SEC-MULTI-1.",
        MUTED_STYLE))

    doc.build(story)
    size_kb = os.path.getsize(out_path) / 1024
    print(f"OK  {out_path}  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    build_pdf()
