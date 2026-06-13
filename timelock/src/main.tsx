import { Toaster } from "@/components/ui/sonner";
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
import { NotificationCenter } from "@/components/NotificationCenter";
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
import Auth from "./pages/Auth.tsx";
import Scope from "./pages/Scope.tsx";
import AccountSettings from "./pages/AccountSettings.tsx";
import EvidenceLibrary from "./pages/EvidenceLibrary.tsx";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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

const FALLBACK_CONVEX_URL = "https://veracious-zebra-519.convex.cloud";
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
    Object.defineProperty(window.WebSocket, 'CONNECTING', { value: OrigWebSocket.CONNECTING, configurable: true });
    Object.defineProperty(window.WebSocket, 'OPEN', { value: OrigWebSocket.OPEN, configurable: true });
    Object.defineProperty(window.WebSocket, 'CLOSING', { value: OrigWebSocket.CLOSING, configurable: true });
    Object.defineProperty(window.WebSocket, 'CLOSED', { value: OrigWebSocket.CLOSED, configurable: true });
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

// ─── Mobile Header with hamburger menu ──────────────────────────────────
function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-background border-b border-border flex items-center justify-between px-4 z-[9998] md:hidden">
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 6V12C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 12V6L12 2Z" fill="#8B5CF6"/>
          <path d="M12 8V12L15 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="font-[Space_Grotesk] font-semibold text-base text-foreground">Axia</span>
      </div>
      <div className="flex items-center gap-1">
        <NotificationCenter />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <CollapsibleSidebar />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function DashboardLayout() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      document.documentElement.style.setProperty('--sidebar-width', '0px');
    } else {
      const savedState = localStorage.getItem("axia_sidebar_state");
      const isExpanded = savedState !== "collapsed";
      document.documentElement.style.setProperty('--sidebar-width', isExpanded ? '280px' : '64px');
    }
  }, [isMobile]);

  return (
    <div className="flex w-full min-h-screen">
      <CollapsibleSidebar />
      {/* Mobile header with hamburger */}
      {isMobile && <MobileHeader />}
      <div className="flex-1 min-h-screen bg-background pt-14 md:pt-0 relative" style={{ marginLeft: isMobile ? 0 : 'var(--sidebar-width, 280px)', transition: 'margin-left 0.3s ease-in-out' }}>
        {/* Notification bell — fixed top-right, inline with page headers */}
        {!isMobile && (
          <div className="absolute top-5 right-6 z-50">
            <NotificationCenter />
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
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
                  <Route path="/auth" element={<Auth redirectAfterAuth="/dashboard" />} />

                  {/* Dashboard Routes (With Sidebar + Auth Guard) */}
                  <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
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
                    <Route path="/scope" element={<Scope />} />
                    <Route path="/account-settings" element={<AccountSettings />} />
                    {/* Legacy redirects — these pages are now consolidated */}
                    <Route path="/evidence-export" element={<EvidenceLibrary />} />
                    <Route path="/platform-integrations" element={<AccountSettings />} />
                    <Route path="/subscription" element={<AccountSettings />} />
                    <Route path="/help-center" element={<AccountSettings />} />
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
