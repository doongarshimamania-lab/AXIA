import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import Dashboard from "@/pages/Dashboard.tsx";
import Clients from "@/pages/Clients.tsx";
import Projects from "@/pages/Projects.tsx";
import { ProtectionValueDashboard } from "@/components/ProtectionValueDashboard.tsx";
import { PremiumNetwork } from "@/components/PremiumNetwork.tsx";
import TeamManagement from "@/pages/TeamManagement";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import EvidenceLibrary from "@/pages/EvidenceLibrary.tsx";
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
import WaitlistSuccess from "./pages/WaitlistSuccess.tsx";
import { ProfileModal } from "@/components/ProfileModal";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";
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
import Messages from "./pages/Messages.tsx";

// Error Boundary to catch Convex errors and prevent app crash
class ConvexErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("[ConvexErrorBoundary] Caught error:", error.message, errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) {
      // Show a subtle error banner instead of crashing the whole page
      return (
        <div>
          <div style={{ padding: '12px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#991b1b', fontSize: '14px' }}>
            Something went wrong on this page. <button onClick={() => this.setState({ hasError: false, error: null })} style={{ textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: '#991b1b', font: 'inherit' }}>Try again</button>
          </div>
          {this.props.children}
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
            <ConvexErrorBoundary>
              <WorkspaceProvider>
                <ProfileModal />
                <Routes>
                  {/* Owner Dashboard - uses separate Convex clients */}
                  <Route path="/owner-dashboard" element={<OwnerDashboard prodConvex={prodConvexClient} devConvex={devConvexClient} />} />
                  <Route path="/owner" element={<OwnerDashboard prodConvex={prodConvexClient} devConvex={devConvexClient} />} />

                  {/* Public Routes (No Sidebar) */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/waitlist/success" element={<WaitlistSuccess />} />
                  <Route path="/client-dashboard" element={<ClientDashboard />} />

                  {/* Dashboard Routes (With Sidebar) */}
                  <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/protection-value" element={<ProtectionValueDashboard />} />
                    <Route path="/network" element={<PremiumNetwork />} />
                    <Route path="/teams" element={<TeamManagement />} />
                    <Route path="/evidence-library" element={<EvidenceLibrary />} />
                    <Route path="/time-tracking" element={<TimeTracking />} />
                    <Route path="/tags" element={<Tags />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/invoices/new" element={<InvoiceBuilder />} />
                    <Route path="/payment-patterns" element={<PaymentPatterns />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/platform-integrations" element={<PlatformIntegrations />} />
                    <Route path="/evidence-export" element={<EvidenceExport />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/help-center" element={<HelpCenter />} />
                    <Route path="/pipeline" element={<Pipeline />} />
                    <Route path="/proposals" element={<Proposals />} />
                    <Route path="/proposals/new" element={<ProposalBuilder />} />
                    <Route path="/messages" element={<Messages />} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </WorkspaceProvider>
            </ConvexErrorBoundary>
            <Toaster />
          </BrowserRouter>
          </ConvexAuthProvider>
        </ConvexProvider>
      </InstrumentationProvider>
    </ThemeProvider>
  </StrictMode>,
);
