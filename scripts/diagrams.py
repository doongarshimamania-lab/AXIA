"""
Generate 4 PNG diagrams for the Axia Client Portal research PDF.
Uses Playwright + HTML/CSS (preferred by pdf skill for Report brief).

Diagrams:
  1. current_state.png    — Axia's /workspace/:token architecture today
  2. ideal_state.png      — Ideal-state architecture with new modules
  3. scope_creep_flow.png — Client approves a scope-creep change order (UX flow)
  4. roadmap_timeline.png — 12-week phased roadmap (horizontal timeline)

Run: python3 /home/z/my-project/scripts/diagrams.py
"""
import asyncio
import os
from playwright.async_api import async_playwright

OUT_DIR = "/home/z/my-project/research/diagrams"
os.makedirs(OUT_DIR, exist_ok=True)

# Shared CSS — clean, minimal, matches the report palette
BASE_CSS = """
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    background: #ffffff;
    color: #232320;
    padding: 32px;
  }
  .canvas { width: 1200px; }
  .node {
    background: #f0f0ef;
    border: 1.5px solid #cdc7b5;
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 13px;
    line-height: 1.4;
    color: #232320;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .node .title { font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #554f3c; }
  .node .sub { font-size: 11px; color: #908e87; }
  .node.accent {
    background: #e6f2ef;
    border-color: #2b7a6b;
  }
  .node.accent .title { color: #1f6353; }
  .node.gold {
    background: #faf5e6;
    border-color: #9f832d;
  }
  .node.gold .title { color: #7b6e1b; }
  .node.red {
    background: #fbeceb;
    border-color: #974a43;
  }
  .node.red .title { color: #6b342e; }
  .arrow {
    stroke: #908e87;
    stroke-width: 2;
    fill: none;
    marker-end: url(#arr);
  }
  .arrow.bold { stroke: #554f3c; stroke-width: 2.5; }
  .arrow.dashed { stroke-dasharray: 6,4; }
  text.label {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    fill: #554f3c;
    font-weight: 600;
  }
  text.small {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    fill: #908e87;
  }
  .layer-label {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    fill: #908e87;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .legend {
    margin-top: 24px;
    display: flex;
    gap: 20px;
    font-size: 11px;
    color: #554f3c;
  }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .legend-swatch { width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid; }
</style>
"""

DIAGRAM_1_HTML = f"""<!DOCTYPE html>
<html><head>{BASE_CSS}</head><body>
<div class="canvas" style="height:580px; position:relative;">
  <svg width="1200" height="540" style="position:absolute; top:0; left:0;">
    <defs>
      <marker id="arr" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#908e87"/>
      </marker>
    </defs>
    <!-- Layer labels -->
    <text x="20" y="80" class="layer-label">CLIENT</text>
    <text x="20" y="220" class="layer-label">FRONTEND</text>
    <text x="20" y="360" class="layer-label">BACKEND</text>
    <text x="20" y="490" class="layer-label">DATA</text>

    <!-- CLIENT row (y ~ 90-140) -->
    <foreignObject x="450" y="80" width="300" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node accent">
        <div class="title">Client Browser</div>
        <div class="sub">No login · opens /workspace/:token link</div>
      </div>
    </foreignObject>

    <!-- FRONTEND row (y ~ 230-300) -->
    <foreignObject x="450" y="220" width="300" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">ClientWorkspace.tsx</div>
        <div class="sub">React page · reads :token from URL · polls Convex</div>
      </div>
    </foreignObject>

    <!-- BACKEND row (y ~ 370-440) -->
    <foreignObject x="200" y="360" width="220" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">verifyClientWorkspaceToken</div>
        <div class="sub">Token → clientId lookup</div>
      </div>
    </foreignObject>
    <foreignObject x="480" y="360" width="240" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node gold">
        <div class="title">getClientProjects</div>
        <div class="sub">getClientProposals · getClientInvoices</div>
      </div>
    </foreignObject>
    <foreignObject x="780" y="360" width="220" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">getClientTeamMembers</div>
        <div class="sub">+ work proofs</div>
      </div>
    </foreignObject>

    <!-- DATA row (y ~ 500-560) -->
    <foreignObject x="320" y="490" width="220" height="60">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">clientWorkspaceTokens</div>
      </div>
    </foreignObject>
    <foreignObject x="580" y="490" width="220" height="60">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">projects / proposals / invoices</div>
      </div>
    </foreignObject>
    <foreignObject x="840" y="490" width="220" height="60">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">evidence / work proofs</div>
      </div>
    </foreignObject>

    <!-- Arrows -->
    <path class="arrow" d="M 600,160 L 600,220"/>
    <path class="arrow" d="M 600,300 L 600,360"/>
    <path class="arrow" d="M 600,360 L 410,360"/>
    <path class="arrow" d="M 600,360 L 780,360"/>
    <path class="arrow" d="M 310,440 L 410,490"/>
    <path class="arrow" d="M 600,440 L 670,490"/>
    <path class="arrow" d="M 890,440 L 920,490"/>
  </svg>
  <div class="legend">
    <div class="legend-item"><div class="legend-swatch" style="background:#e6f2ef; border-color:#2b7a6b;"></div>Client surface</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#faf5e6; border-color:#9f832d;"></div>Data fetcher</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#f0f0ef; border-color:#cdc7b5;"></div>Existing module</div>
  </div>
</div>
</body></html>"""

DIAGRAM_2_HTML = f"""<!DOCTYPE html>
<html><head>{BASE_CSS}</head><body>
<div class="canvas" style="height:680px; position:relative;">
  <svg width="1200" height="640" style="position:absolute; top:0; left:0;">
    <defs>
      <marker id="arr" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#908e87"/>
      </marker>
    </defs>
    <text x="20" y="80" class="layer-label">CLIENT</text>
    <text x="20" y="240" class="layer-label">FRONTEND</text>
    <text x="20" y="430" class="layer-label">BACKEND</text>
    <text x="20" y="580" class="layer-label">DATA</text>

    <!-- CLIENT row -->
    <foreignObject x="450" y="80" width="300" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node accent">
        <div class="title">Client Portal</div>
        <div class="sub">Token-scoped · read OR approval capabilities</div>
      </div>
    </foreignObject>

    <!-- FRONTEND row — 4 cards across -->
    <foreignObject x="60" y="220" width="240" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">DeliverableProgress</div>
        <div class="sub">NEW · per-deliverable view</div>
      </div>
    </foreignObject>
    <foreignObject x="340" y="220" width="240" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node gold">
        <div class="title">ApprovalSurface</div>
        <div class="sub">NEW · change-order sign-off</div>
      </div>
    </foreignObject>
    <foreignObject x="620" y="220" width="240" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">ClientCommentThread</div>
        <div class="sub">NEW · per-deliverable comments</div>
      </div>
    </foreignObject>
    <foreignObject x="900" y="220" width="240" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">EvidenceBundleViewer</div>
        <div class="sub">NEW · verified-work download</div>
      </div>
    </foreignObject>

    <!-- BACKEND row -->
    <foreignObject x="60" y="410" width="240" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">verifyScopedToken</div>
        <div class="sub">read vs approve scope</div>
      </div>
    </foreignObject>
    <foreignObject x="340" y="410" width="240" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node gold">
        <div class="title">ScopeCreepBridge</div>
        <div class="sub">NEW · flag → client card</div>
      </div>
    </foreignObject>
    <foreignObject x="620" y="410" width="240" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">NotificationFanout</div>
        <div class="sub">NEW · email + in-app + webhook</div>
      </div>
    </foreignObject>
    <foreignObject x="900" y="410" width="240" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">submitClientApproval</div>
        <div class="sub">NEW · mutation · audit-logged</div>
      </div>
    </foreignObject>

    <!-- DATA row -->
    <foreignObject x="200" y="560" width="240" height="60">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">clientApprovals</div>
      </div>
    </foreignObject>
    <foreignObject x="480" y="560" width="240" height="60">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">clientComments</div>
      </div>
    </foreignObject>
    <foreignObject x="760" y="560" width="240" height="60">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">scopeCreepEvents</div>
      </div>
    </foreignObject>

    <!-- Arrows from client portal to each frontend card -->
    <path class="arrow" d="M 600,160 L 180,220"/>
    <path class="arrow" d="M 600,160 L 460,220"/>
    <path class="arrow" d="M 600,160 L 740,220"/>
    <path class="arrow" d="M 600,160 L 1020,220"/>

    <!-- Each frontend → its backend -->
    <path class="arrow" d="M 180,300 L 180,410"/>
    <path class="arrow" d="M 460,300 L 460,410"/>
    <path class="arrow" d="M 740,300 L 740,410"/>
    <path class="arrow" d="M 1020,300 L 1020,410"/>

    <!-- Backend → data -->
    <path class="arrow" d="M 180,490 L 320,560"/>
    <path class="arrow" d="M 460,490 L 600,560"/>
    <path class="arrow" d="M 740,490 L 880,560"/>
    <path class="arrow dashed" d="M 880,560 L 460,410"/>
    <text x="640" y="500" class="small">scope-creep event triggers bridge</text>
  </svg>
  <div class="legend">
    <div class="legend-item"><div class="legend-swatch" style="background:#e6f2ef; border-color:#2b7a6b;"></div>Client surface</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#faf5e6; border-color:#9f832d;"></div>NEW module (P0)</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#f0f0ef; border-color:#cdc7b5;"></div>NEW module (P1)</div>
    <div class="legend-item"><div class="legend-swatch" style="background:transparent; border-color:#908e87; border-style:dashed;"></div>Event bridge</div>
  </div>
</div>
</body></html>"""

DIAGRAM_3_HTML = f"""<!DOCTYPE html>
<html><head>{BASE_CSS}</head><body>
<div class="canvas" style="height:780px; position:relative;">
  <svg width="1200" height="740" style="position:absolute; top:0; left:0;">
    <defs>
      <marker id="arr" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#908e87"/>
      </marker>
    </defs>

    <!-- Step 1: Freelancer side -->
    <text x="60" y="40" class="layer-label">FREELANCER SIDE</text>
    <foreignObject x="80" y="60" width="280" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">1. Axia detects scope creep</div>
        <div class="sub">Task added beyond contract → AI flag raised</div>
      </div>
    </foreignObject>
    <foreignObject x="80" y="180" width="280" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node gold">
        <div class="title">2. Change order drafted</div>
        <div class="sub">Auto-filled: hours, rate, total $, impact on timeline</div>
      </div>
    </foreignObject>
    <foreignObject x="80" y="300" width="280" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">3. ScopeCreepBridge fires</div>
        <div class="sub">Pushes card to client portal + email notification</div>
      </div>
    </foreignObject>

    <!-- Arrow down right side connecting step 3 to step 4 -->
    <path class="arrow bold" d="M 360,340 L 600,340"/>

    <!-- Step 4-7: Client side -->
    <text x="640" y="40" class="layer-label">CLIENT SIDE</text>
    <foreignObject x="640" y="60" width="380" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node accent">
        <div class="title">4. Client sees "Change order pending" card</div>
        <div class="sub">Top of portal · red badge · cannot miss</div>
      </div>
    </foreignObject>
    <foreignObject x="640" y="180" width="380" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">5. Reviews details</div>
        <div class="sub">What changed · why · cost · new ETA · supporting evidence</div>
      </div>
    </foreignObject>
    <foreignObject x="640" y="300" width="380" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node gold">
        <div class="title">6. Approve &amp; add to invoice</div>
        <div class="sub">OR "Reject" with comment · OR "Ask a question" thread</div>
      </div>
    </foreignObject>

    <!-- Arrows on client side -->
    <path class="arrow" d="M 830,140 L 830,180"/>
    <path class="arrow" d="M 830,260 L 830,300"/>

    <!-- Step 7-9: Back to freelancer -->
    <path class="arrow bold" d="M 640,340 L 400,460"/>

    <text x="60" y="440" class="layer-label">FREELANCER SIDE</text>
    <foreignObject x="80" y="460" width="280" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node">
        <div class="title">7. Approval received</div>
        <div class="sub">Real-time toast + audit log entry</div>
      </div>
    </foreignObject>
    <foreignObject x="80" y="580" width="280" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node gold">
        <div class="title">8. Invoice auto-updated</div>
        <div class="sub">Change order line item appended · total recalculated</div>
      </div>
    </foreignObject>
    <foreignObject x="640" y="580" width="380" height="80">
      <div xmlns="http://www.w3.org/1999/xhtml" class="node red">
        <div class="title">9. (If rejected) Negotiation thread</div>
        <div class="sub">Comment thread stays attached to the original scope-creep event</div>
      </div>
    </foreignObject>

    <path class="arrow" d="M 220,540 L 220,580"/>
    <path class="arrow dashed" d="M 360,620 L 640,620"/>
    <text x="400" y="610" class="small">if rejected →</text>

    <!-- Bottom annotation -->
    <text x="450" y="710" class="small" text-anchor="middle">
      The scope-creep flag → portal card → client approval → invoice update chain is the single highest-value loop in Axia.
    </text>
  </svg>
</div>
</body></html>"""

DIAGRAM_4_HTML = f"""<!DOCTYPE html>
<html><head>{BASE_CSS}</head><body>
<div class="canvas" style="height:420px; position:relative;">
  <svg width="1200" height="380" style="position:absolute; top:0; left:0;">
    <!-- Week axis -->
    <line x1="80" y1="200" x2="1140" y2="200" stroke="#908e87" stroke-width="1.5"/>
    <!-- Week ticks -->
    {''.join(f'<line x1="{80 + i*88.3}" y1="195" x2="{80 + i*88.3}" y2="205" stroke="#908e87" stroke-width="1"/><text x="{80 + i*88.3}" y="225" class="small" text-anchor="middle">W{i+1}</text>' for i in range(12))}

    <!-- Phase 1: weeks 1-3 -->
    <rect x="80" y="100" width="265" height="50" rx="6" fill="#e6f2ef" stroke="#2b7a6b" stroke-width="1.5"/>
    <text x="212" y="122" text-anchor="middle" font-family="Inter" font-size="14" font-weight="700" fill="#1f6353">Phase 1 · P0 Core</text>
    <text x="212" y="140" text-anchor="middle" font-family="Inter" font-size="10" fill="#554f3c">Deliverable progress · Change orders · Scope-creep bridge</text>

    <!-- Phase 2: weeks 4-6 -->
    <rect x="345" y="100" width="265" height="50" rx="6" fill="#faf5e6" stroke="#9f832d" stroke-width="1.5"/>
    <text x="477" y="122" text-anchor="middle" font-family="Inter" font-size="14" font-weight="700" fill="#7b6e1b">Phase 2 · P0 Billing</text>
    <text x="477" y="140" text-anchor="middle" font-family="Inter" font-size="10" fill="#554f3c">Pay-now · Email notifs · Notification center</text>

    <!-- Phase 3: weeks 7-9 -->
    <rect x="610" y="100" width="265" height="50" rx="6" fill="#f0f0ef" stroke="#cdc7b5" stroke-width="1.5"/>
    <text x="742" y="122" text-anchor="middle" font-family="Inter" font-size="14" font-weight="700" fill="#554f3c">Phase 3 · P1 Polish</text>
    <text x="742" y="140" text-anchor="middle" font-family="Inter" font-size="10" fill="#554f3c">Comments · File upload · Evidence · Mobile</text>

    <!-- Phase 4: weeks 10-12 -->
    <rect x="875" y="100" width="265" height="50" rx="6" fill="#fbeceb" stroke="#974a43" stroke-width="1.5"/>
    <text x="1007" y="122" text-anchor="middle" font-family="Inter" font-size="14" font-weight="700" fill="#6b342e">Phase 4 · P2 Premium</text>
    <text x="1007" y="140" text-anchor="middle" font-family="Inter" font-size="10" fill="#554f3c">White-label · SSO · AI weekly summary</text>

    <!-- Milestones -->
    <circle cx="345" cy="280" r="6" fill="#2b7a6b"/>
    <text x="345" y="305" class="small" text-anchor="middle">M1: Portal is source of truth</text>
    <circle cx="610" cy="280" r="6" fill="#9f832d"/>
    <text x="610" y="305" class="small" text-anchor="middle">M2: First paid invoice via portal</text>
    <circle cx="875" cy="280" r="6" fill="#554f3c"/>
    <text x="875" y="305" class="small" text-anchor="middle">M3: P1 feature-complete</text>
    <circle cx="1140" cy="280" r="6" fill="#974a43"/>
    <text x="1140" y="305" class="small" text-anchor="middle">M4: Scale-tier features GA</text>

    <!-- Risk callout -->
    <text x="610" y="355" class="small" text-anchor="middle" font-weight="600">
      Risk: Phase 1–2 are tightly coupled (approval surface needs invoice mutation). Plan integration test in week 3.
    </text>
  </svg>
</div>
</body></html>"""


async def render_diagrams():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(device_scale_factor=2, viewport={"width": 1280, "height": 900})
        for name, html in [
            ("current_state", DIAGRAM_1_HTML),
            ("ideal_state", DIAGRAM_2_HTML),
            ("scope_creep_flow", DIAGRAM_3_HTML),
            ("roadmap_timeline", DIAGRAM_4_HTML),
        ]:
            page = await ctx.new_page()
            await page.set_content(html, wait_until="networkidle")
            # Find the .canvas element and screenshot just that
            elem = await page.query_selector(".canvas")
            out_path = f"{OUT_DIR}/{name}.png"
            await elem.screenshot(path=out_path)
            print(f"  ✓ {out_path}")
            await page.close()
        await browser.close()


if __name__ == "__main__":
    print("Generating 4 diagrams...")
    asyncio.run(render_diagrams())
    print("Done.")
