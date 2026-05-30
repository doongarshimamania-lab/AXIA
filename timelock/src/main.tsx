import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import Dashboard from "@/pages/Dashboard.tsx";
import OnboardingUserInformation from "@/pages/OnboardingUserInformation.tsx";
import OnboardingSource from "@/pages/OnboardingSource.tsx";
import Clients from "@/pages/Clients.tsx";
import Projects from "@/pages/Projects.tsx";
import { ProtectionValueDashboard } from "@/components/ProtectionValueDashboard.tsx";
import { PremiumNetwork } from "@/components/PremiumNetwork.tsx";
import { Teams } from "@/components/Teams.tsx";
import EvidenceLibrary from "@/pages/EvidenceLibrary.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Component, StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation, Outlet } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import OwnerDashboard from "./pages/OwnerDashboard.tsx";
import ClientLogin from "./pages/ClientLogin.tsx";
import ClientSignup from "./pages/ClientSignup.tsx";
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
import PaymentPatterns from "./pages/PaymentPatterns.tsx";
import Reports from "./pages/Reports.tsx";
import PlatformIntegrations from "./pages/PlatformIntegrations.tsx";
import EvidenceExport from "./pages/EvidenceExport.tsx";
import Subscription from "./pages/Subscription.tsx";
import HelpCenter from "./pages/HelpCenter.tsx";

// Error Boundary to catch Convex/Auth errors and prevent app crash
// IMPORTANT: Never blanks the screen - always renders children even on error
// The safe useQuery wrapper handles query errors gracefully via throwOnError: false
// This boundary catches any remaining errors from Auth provider or other sources
class ConvexErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log once, don't spam
    console.warn("[ConvexErrorBoundary] Caught error (rendering continues):", error.message);
  }
  render() {
    // ALWAYS render children - never show a blank screen
    // The safe useQuery wrapper already handles Convex errors gracefully
    return this.props.children;
  }
}

const convexUrlRaw = import.meta.env.VITE_CONVEX_URL as string | undefined;
// Resolve the Convex URL: if it contains __ORIGIN__, replace with the current origin
// This allows the app to work when served through a proxy (e.g., Caddy preview)
const convexUrl = convexUrlRaw
  ? convexUrlRaw.replace('__ORIGIN__', typeof window !== 'undefined' ? window.location.origin : '')
  : undefined;
const convex = convexUrl ? new ConvexReactClient(convexUrl, {
  // Reduce reconnect attempts to prevent flickering
  unsavedChangesWarning: false,
}) : null;

// Explicit clients for owner dashboard - both point to the same deployment now
const prodConvexClient = convex || new ConvexReactClient(convexUrl || "https://artful-civet-344.convex.cloud");
const devConvexClient = convex || new ConvexReactClient(convexUrl || "https://artful-civet-344.convex.cloud");

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
  // Initialize sidebar width CSS variable
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

if (!convex) {
  root.render(
    <StrictMode>
      <VlyToolbar />
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-xl text-center">
          <img src="/logo.svg" alt="Axia" width={48} height={48} className="mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-[#1E293B] mb-2">Configure Convex URL</h1>
          <p className="text-[#475569] mb-4">
            The app can't reach Convex because VITE_CONVEX_URL isn't set.
          </p>
          <ol className="text-left text-[#64748B] list-decimal list-inside space-y-1 mb-6">
            <li>Open the API Keys tab.</li>
            <li>Set VITE_CONVEX_URL to your Convex deployment URL.</li>
            <li>Reload this page.</li>
          </ol>
          <div className="text-sm text-[#94A3B8]">
            Tip: If you don't have a Convex deployment yet, create one and copy its URL here.
          </div>
        </div>
      </div>
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <VlyToolbar />
      <ThemeProvider>
        <InstrumentationProvider>
          <BrowserRouter>
            <RouteSyncer />
            <Routes>
              {/* Owner Dashboard - Outside auth provider, uses separate Convex clients */}
              <Route path="/owner-dashboard" element={<OwnerDashboard prodConvex={prodConvexClient} devConvex={devConvexClient} />} />
              <Route path="/owner" element={<OwnerDashboard prodConvex={prodConvexClient} devConvex={devConvexClient} />} />

              {/* All other routes wrapped in ConvexAuthProvider */}
              <Route path="/*" element={
                <ConvexErrorBoundary>
                <ConvexAuthProvider client={convex}>
                  <ConvexErrorBoundary>
                  <ProfileModal />
                  </ConvexErrorBoundary>
                  <Routes>

                {/* Public Routes (No Sidebar) */}
                <Route path="/" element={<Landing />} />
                <Route path="/waitlist/success" element={<WaitlistSuccess />} />
                <Route path="/auth" element={<AuthPage redirectAfterAuth="/onboarding-user-information" />} />
                <Route path="/onboarding-user-information" element={<OnboardingUserInformation />} />
                <Route path="/onboarding-source" element={<OnboardingSource />} />
                <Route path="/client-login" element={<ClientLogin />} />
                <Route path="/client-signup" element={<ClientSignup />} />
                <Route path="/client-dashboard" element={<ClientDashboard />} />

                {/* Dashboard Routes (With Sidebar) */}
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/protection-value" element={<ProtectionValueDashboard />} />
                  <Route path="/network" element={<PremiumNetwork />} />
                  <Route path="/teams" element={<Teams />} />
                  <Route path="/evidence-library" element={<EvidenceLibrary />} />
                  <Route path="/time-tracking" element={<TimeTracking />} />
                  <Route path="/tags" element={<Tags />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/payment-patterns" element={<PaymentPatterns />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/platform-integrations" element={<PlatformIntegrations />} />
                  <Route path="/evidence-export" element={<EvidenceExport />} />
                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/help-center" element={<HelpCenter />} />
                </Route>

                    {/* Catch-all (No Sidebar) */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ConvexAuthProvider>
                </ConvexErrorBoundary>
              } />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </InstrumentationProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}