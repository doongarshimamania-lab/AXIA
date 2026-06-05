import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import Dashboard from "@/pages/Dashboard.tsx";

import Projects from "@/pages/Projects.tsx";
import { ProtectionValueDashboard } from "@/components/ProtectionValueDashboard.tsx";
import { PremiumNetwork } from "@/components/PremiumNetwork.tsx";
import TeamManagement from "@/pages/TeamManagement";
import { WorkspaceProvider } from "@/hooks/use-workspace";

import { ConvexReactClient, ConvexProvider } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Component, StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation, Outlet } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import OwnerDashboard from "./pages/OwnerDashboard.tsx";
import ClientDashboard from "./pages/ClientDashboard.tsx";
import ClientLogin from "./pages/ClientLogin.tsx";
import ClientSignup from "./pages/ClientSignup.tsx";
import ClientWorkspace from "./pages/ClientWorkspace.tsx";
import WaitlistSuccess from "./pages/WaitlistSuccess.tsx";
import OnboardingUserInformation from "./pages/OnboardingUserInformation.tsx";
import OnboardingSource from "./pages/OnboardingSource.tsx";
import { ProfileModal } from "@/components/ProfileModal";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import "./types/global.d.ts";
import TimeTracking from "./pages/TimeTracking.tsx";
import Tags from "./pages/Tags.tsx";
import Goals from "./pages/Goals.tsx";
import Invoices from "./pages/Invoices.tsx";
import InvoiceBuilder from "./pages/InvoiceBuilder.tsx";
import PaymentPatterns from "./pages/PaymentPatterns.tsx";
import Reports from "./pages/Reports.tsx";
import PlatformIntegrations from "./pages/PlatformIntegrations.tsx";
import EvidenceExport from "./pages/EvidenceExport.tsx";
import Subscription from "./pages/Subscription.tsx";
import HelpCenter from "./pages/HelpCenter.tsx";
import Pipeline from "./pages/Pipeline.tsx";
import Proposals from "./pages/Proposals.tsx";
import ProposalBuilder from "./pages/ProposalBuilder.tsx";

// The top-level error boundary has been replaced with per-route SectionErrorBoundary.
// Each page route is wrapped in its own SectionErrorBoundary so a crash on one page
// doesn't take down the entire app. A minimal top-level boundary remains for safety.

class TopLevelErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; errorKey: number }> {
  state = { hasError: false, errorKey: 0 };
  static getDerivedStateFromError() {
    return { hasError: true, errorKey: Date.now() };
  }
  componentDidCatch(error: Error) {
    console.error("[TopLevelErrorBoundary] Unhandled error:", error.message);
  }
  handleReset = () => {
    this.setState({ hasError: false, errorKey: this.state.errorKey + 1 });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background">
          <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">The application encountered an unexpected error. Please try again.</p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-sm bg-[#8B5CF6] text-white rounded-lg hover:bg-[#7C3AED] transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const FALLBACK_CONVEX_URL = "https://artful-civet-344.convex.cloud";
const convexUrlRaw = (import.meta.env.VITE_CONVEX_URL as string | undefined) || FALLBACK_CONVEX_URL;
// Resolve the Convex URL: if it contains __ORIGIN__, replace with the current origin
const convexUrl = convexUrlRaw
  ? convexUrlRaw.replace('__ORIGIN__', typeof window !== 'undefined' ? window.location.origin : '')
  : FALLBACK_CONVEX_URL;

// Patch fetch/WebSocket for proxy support
if (typeof window !== 'undefined' && convexUrl) {
  const convexOrigin = new URL(convexUrl).origin;
  const currentOrigin = window.location.origin;
  if (convexOrigin === currentOrigin) {
    const TRANSFORM_PORT = '3000';
    const origFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/query') || url.includes('/api/mutation') || url.includes('/api/action')) {
        const separator = url.includes('?') ? '&' : '?';
        const newUrl = url + separator + 'XTransformPort=' + TRANSFORM_PORT;
        return origFetch(newUrl, init);
      }
      return origFetch(input, init);
    };
    const OrigWebSocket = window.WebSocket;
    // @ts-ignore
    window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/query') || urlStr.includes('/api/mutation') || urlStr.includes('/api/sync')) {
        const separator = urlStr.includes('?') ? '&' : '?';
        const newUrl = urlStr + separator + 'XTransformPort=' + TRANSFORM_PORT;
        return new OrigWebSocket(newUrl, protocols);
      }
      return new OrigWebSocket(urlStr, protocols);
    } as any;
    window.WebSocket.CONNECTING = OrigWebSocket.CONNECTING;
    window.WebSocket.OPEN = OrigWebSocket.OPEN;
    window.WebSocket.CLOSING = OrigWebSocket.CLOSING;
    window.WebSocket.CLOSED = OrigWebSocket.CLOSED;
    window.WebSocket.prototype = OrigWebSocket.prototype;
  }
}

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

const prodConvexClient = convex;
const devConvexClient = convex;

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function DashboardLayout() {
  useEffect(() => {
    const savedState = localStorage.getItem("axia_sidebar_state");
    const isExpanded = savedState !== "collapsed";
    document.documentElement.style.setProperty('--sidebar-width', isExpanded ? '320px' : '80px');
  }, []);

  return (
    <div className="flex w-full min-h-screen">
      <CollapsibleSidebar />
      <div className="flex-1 min-h-screen bg-background" style={{ marginLeft: 'var(--sidebar-width, 320px)', transition: 'margin-left 0.3s ease-in-out' }}>
        <Outlet />
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <VlyToolbar />
    <ThemeProvider>
      <InstrumentationProvider>
        <ConvexProvider client={convex}>
          <ConvexAuthProvider client={convex}>
          <BrowserRouter>
            <RouteSyncer />
            <TopLevelErrorBoundary>
              <WorkspaceProvider>
                <ProfileModal />
                <Routes>
                  {/* Owner Dashboard - uses separate Convex clients */}
                  <Route path="/owner-dashboard" element={<SectionErrorBoundary name="Owner Dashboard"><OwnerDashboard prodConvex={prodConvexClient} devConvex={devConvexClient} /></SectionErrorBoundary>} />
                  <Route path="/owner" element={<SectionErrorBoundary name="Owner Dashboard"><OwnerDashboard prodConvex={prodConvexClient} devConvex={devConvexClient} /></SectionErrorBoundary>} />

                  {/* Public Routes (No Sidebar) */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/waitlist/success" element={<SectionErrorBoundary name="Waitlist"><WaitlistSuccess /></SectionErrorBoundary>} />
                  
                  {/* Onboarding Routes (No Sidebar) */}
                  <Route path="/onboarding-user-information" element={<SectionErrorBoundary name="Onboarding"><OnboardingUserInformation /></SectionErrorBoundary>} />
                  <Route path="/onboarding-source" element={<SectionErrorBoundary name="Onboarding"><OnboardingSource /></SectionErrorBoundary>} />
                  
                  {/* Client Portal Routes (No Sidebar) */}
                  <Route path="/client-dashboard" element={<SectionErrorBoundary name="Client Portal"><ClientDashboard /></SectionErrorBoundary>} />
                  <Route path="/client-login" element={<SectionErrorBoundary name="Client Login"><ClientLogin /></SectionErrorBoundary>} />
                  <Route path="/client-signup" element={<SectionErrorBoundary name="Client Signup"><ClientSignup /></SectionErrorBoundary>} />

                  {/* Client Workspace — Shareable link, no login required */}
                  <Route path="/workspace/:token" element={<SectionErrorBoundary name="Client Workspace"><ClientWorkspace /></SectionErrorBoundary>} />

                  {/* Dashboard Routes (With Sidebar) */}
                  <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<SectionErrorBoundary name="Dashboard"><Dashboard /></SectionErrorBoundary>} />
                    <Route path="/projects" element={<SectionErrorBoundary name="Projects"><Projects /></SectionErrorBoundary>} />
                    <Route path="/protection-value" element={<SectionErrorBoundary name="Protection Value"><ProtectionValueDashboard /></SectionErrorBoundary>} />
                    <Route path="/network" element={<SectionErrorBoundary name="Network"><PremiumNetwork /></SectionErrorBoundary>} />
                    <Route path="/teams" element={<SectionErrorBoundary name="Teams"><TeamManagement /></SectionErrorBoundary>} />
                    <Route path="/time-tracking" element={<SectionErrorBoundary name="Time Tracking"><TimeTracking /></SectionErrorBoundary>} />
                    <Route path="/tags" element={<SectionErrorBoundary name="Tags"><Tags /></SectionErrorBoundary>} />
                    <Route path="/goals" element={<SectionErrorBoundary name="Goals"><Goals /></SectionErrorBoundary>} />
                    <Route path="/invoices" element={<SectionErrorBoundary name="Invoices"><Invoices /></SectionErrorBoundary>} />
                    <Route path="/invoices/new" element={<SectionErrorBoundary name="Invoice Builder"><InvoiceBuilder /></SectionErrorBoundary>} />
                    <Route path="/payment-patterns" element={<SectionErrorBoundary name="Payment Patterns"><PaymentPatterns /></SectionErrorBoundary>} />
                    <Route path="/reports" element={<SectionErrorBoundary name="Reports"><Reports /></SectionErrorBoundary>} />
                    <Route path="/platform-integrations" element={<SectionErrorBoundary name="Integrations"><PlatformIntegrations /></SectionErrorBoundary>} />
                    <Route path="/evidence-export" element={<SectionErrorBoundary name="Evidence Export"><EvidenceExport /></SectionErrorBoundary>} />
                    <Route path="/subscription" element={<SectionErrorBoundary name="Subscription"><Subscription /></SectionErrorBoundary>} />
                    <Route path="/help-center" element={<SectionErrorBoundary name="Help Center"><HelpCenter /></SectionErrorBoundary>} />
                    <Route path="/pipeline" element={<SectionErrorBoundary name="Pipeline"><Pipeline /></SectionErrorBoundary>} />
                    <Route path="/proposals" element={<SectionErrorBoundary name="Proposals"><Proposals /></SectionErrorBoundary>} />
                    <Route path="/proposals/new" element={<SectionErrorBoundary name="Proposal Builder"><ProposalBuilder /></SectionErrorBoundary>} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </WorkspaceProvider>
            </TopLevelErrorBoundary>
            <Toaster />
          </BrowserRouter>
          </ConvexAuthProvider>
        </ConvexProvider>
      </InstrumentationProvider>
    </ThemeProvider>
  </StrictMode>,
);
