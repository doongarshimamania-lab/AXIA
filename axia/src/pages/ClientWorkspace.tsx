// ──────────────────────────────────────────────────────────────────────────────
// pages/ClientWorkspace.tsx — Token-based client portal (no login).
//
// URL: /workspace/:token
// The :token is a JWT signed by the freelancer (lib/portalAuth.ts).
//
// STORAGE:
//   Token is stored in sessionStorage (NOT localStorage) — dies on tab close,
//   limits XSS exfil blast radius. Backend treats token as opaque string.
//
// LAYOUT:
//   - Left sidebar: Deliverables / Change Orders / Invoices / Messages
//   - Main area: renders the active section
//   - Top bar: client name + freelancer avatar + "Session expires in X" badge
//
// SECURITY:
//   - Every backend call sends the token; backend verifies scope per-call
//   - No client-side trust: we never show data the backend didn't return
//   - Logout = clear sessionStorage + redirect
//   - Session expiry = auto-redirect with toast
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import {
  FolderKanban,
  FileText,
  Receipt,
  MessageSquare,
  ShieldCheck,
  LogOut,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PortalDeliverables } from "@/components/portal/PortalDeliverables";
import { PortalChangeOrders } from "@/components/portal/PortalChangeOrders";
import { PortalInvoices } from "@/components/portal/PortalInvoices";
import { PortalMessages } from "@/components/portal/PortalMessages";

type Tab = "deliverables" | "change_orders" | "invoices" | "messages";

export default function ClientWorkspace() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // ponytail: sessionStorage (not localStorage) — token dies on tab close
  const [activeTab, setActiveTab] = useState<Tab>("deliverables");
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    try {
      sessionStorage.setItem("axia_portal_token", token);
    } catch {
      // sessionStorage might be disabled (private mode) — token is in URL, that's fine
    }
    setTokenChecked(true);
  }, [token, navigate]);

  if (!tokenChecked || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return <PortalShell token={token} activeTab={activeTab} onTabChange={setActiveTab} onLogout={() => {
    try { sessionStorage.removeItem("axia_portal_token"); } catch {}
    navigate("/");
  }} />;
}

// ─── Portal Shell ─────────────────────────────────────────────────────────────

function PortalShell({
  token,
  activeTab,
  onTabChange,
  onLogout,
}: {
  token: string;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  onLogout: () => void;
}) {
  const clientInfo = useQuery(api.portal.self.getMyClientInfo, { token });
  const navigate = useNavigate();

  // ponytail: handle expired / invalid token
  useEffect(() => {
    if (clientInfo === null) {
      // query succeeded but returned null — invalid client
      toast.error("Your portal link is no longer valid.");
      setTimeout(() => navigate("/"), 2000);
    }
  }, [clientInfo, navigate]);

  if (clientInfo === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" />
          <p className="text-sm text-slate-500">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (clientInfo === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold">Portal link invalid</h2>
            <p className="text-sm text-slate-500">
              This link has expired or been revoked. Please request a new link from your freelancer.
            </p>
            <Button onClick={() => navigate("/")} variant="outline">Back to Axia</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiresInMs = clientInfo.expiresAt - Date.now();
  const expiresInDays = Math.floor(expiresInMs / (24 * 60 * 60 * 1000));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Axia Portal</span>
          </div>
        </div>

        <div className="p-4 border-b border-slate-200">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Signed in as</p>
          <p className="font-medium text-slate-900 text-sm truncate">{clientInfo.clientName}</p>
          {clientInfo.company && (
            <p className="text-xs text-slate-500 truncate">{clientInfo.company}</p>
          )}
          {clientInfo.freelancerName && (
            <p className="text-xs text-slate-400 mt-2 truncate">
              Working with {clientInfo.freelancerName}
            </p>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavButton
            active={activeTab === "deliverables"}
            onClick={() => onTabChange("deliverables")}
            icon={<FolderKanban className="h-4 w-4" />}
            label="Deliverables"
          />
          <NavButton
            active={activeTab === "change_orders"}
            onClick={() => onTabChange("change_orders")}
            icon={<FileText className="h-4 w-4" />}
            label="Change Orders"
          />
          <NavButton
            active={activeTab === "invoices"}
            onClick={() => onTabChange("invoices")}
            icon={<Receipt className="h-4 w-4" />}
            label="Invoices"
          />
          <NavButton
            active={activeTab === "messages"}
            onClick={() => onTabChange("messages")}
            icon={<MessageSquare className="h-4 w-4" />}
            label="Messages"
          />
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            <span>Session expires in {expiresInDays}d</span>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={onLogout}>
            <LogOut className="h-3 w-3 mr-2" /> Exit portal
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-10">
          {activeTab === "deliverables" && <PortalDeliverables token={token} />}
          {activeTab === "change_orders" && <PortalChangeOrders token={token} />}
          {activeTab === "invoices" && <PortalInvoices token={token} />}
          {activeTab === "messages" && <PortalMessages token={token} />}
        </div>
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-violet-50 text-violet-700 font-medium"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
