// ponytail: NEW landing page — pixel-to-pixel port of the Next.js 16 export
// (axia-landing-page-export.tar.gz). The original was a Next.js app at
// src/app/page.tsx; this is the Vite + React 19 adaptation.
//
// Adaptations made (no visual changes):
// 1. Removed "use client" — Vite doesn't need it, all components are client-side.
// 2. Preserved the exact composition order from the original page.tsx.
// 3. Wrapped in a `.landing-page` scope class so the warm-paper-white brand
//    tokens only apply to this page — the authenticated app (dashboard,
//    projects, clients, etc.) keeps its existing slate-based theme + dark mode.
// 4. The lead form calls a Convex mutation (api.leads.createLead) instead of
//    the Next.js /api/leads route — the mutation lives in src/convex/leads.ts
//    and returns the same { ok, id, message } shape.
// 5. Fonts (Inter, Inter Tight) load via Google Fonts <link> in index.html;
//    Geist Mono was already installed via @fontsource/geist-mono.

import { SiteNav } from "@/components/site/nav";
import { Hero } from "@/components/site/hero";
import { TrustBand } from "@/components/site/trust-band";
import { CostComparison } from "@/components/site/cost-comparison";
import { ProofProblem } from "@/components/site/proof-problem";
import { TruthLayer } from "@/components/site/truth-layer";
import { TruthLayerDemo } from "@/components/site/truth-layer-demo";
import { ScopeDemo } from "@/components/site/scope-demo";
import { Features } from "@/components/site/features";
import { RevenueCalculator } from "@/components/site/calculator";
import { Workflow } from "@/components/site/workflow";
import { AgencyTypes } from "@/components/site/agency-types";
import { Comparison } from "@/components/site/comparison";
import { Testimonials } from "@/components/site/testimonials";
import { Pricing } from "@/components/site/pricing";
import { SecurityBadges } from "@/components/site/security-badges";
import { LeadForm } from "@/components/site/lead-form";
import { FAQ } from "@/components/site/faq";
import { FinalCTA } from "@/components/site/final-cta";
import { SiteFooter } from "@/components/site/footer";
import { BackToTop } from "@/components/site/back-to-top";
import { MobileStickyCTA } from "@/components/site/mobile-sticky-cta";
import { SectionDivider } from "@/components/site/divider";

export default function Landing() {
  return (
    <div className="landing-page bg-grain relative flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="flex-1">
        <Hero />

        {/* Trust band right after hero */}
        <TrustBand />

        {/* Who it's for — agencies, moved earlier per request */}
        <AgencyTypes />

        {/* Cost comparison — the core conversion hook */}
        <CostComparison />

        <ProofProblem />
        <SectionDivider variant="dot" className="max-w-7xl mx-auto px-4" />
        <ScopeDemo />
        <TruthLayer />
        <TruthLayerDemo />
        <SectionDivider variant="beam" className="max-w-5xl mx-auto" />
        <Features />
        <RevenueCalculator />
        <SectionDivider variant="dot" className="max-w-7xl mx-auto px-4" />
        <Workflow />
        <SectionDivider variant="beam" className="max-w-5xl mx-auto" />

        <Comparison />
        <Testimonials />
        <Pricing />
        <SecurityBadges />
        <LeadForm />
        <FAQ />
        <FinalCTA />
      </main>
      <SiteFooter />
      <BackToTop />
      <MobileStickyCTA />
    </div>
  );
}
