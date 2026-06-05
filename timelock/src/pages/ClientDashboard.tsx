import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, CheckCircle, FileText, DollarSign, Clock,
  LayoutDashboard, FolderKanban, ThumbsUp, ThumbsDown,
  Shield, Loader2, AlertCircle, ExternalLink, Link2,
  Eye, Activity, BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { FreelancerDirectoryView } from "@/components/FreelancerDirectoryView";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const INVOICE_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-600" },
  sent: { label: "Sent", className: "bg-amber-500/10 text-amber-600" },
  viewed: { label: "Viewed", className: "bg-blue-500/10 text-blue-600" },
  overdue: { label: "Overdue", className: "bg-red-500/10 text-red-600" },
  draft: { label: "Draft", className: "bg-slate-500/10 text-slate-600" },
  partial: { label: "Partial", className: "bg-purple-500/10 text-purple-600" },
  cancelled: { label: "Cancelled", className: "bg-slate-500/10 text-slate-600" },
};

const PROPOSAL_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  signed: { label: "Signed", className: "bg-emerald-500/10 text-emerald-600" },
  sent: { label: "Sent", className: "bg-amber-500/10 text-amber-600" },
  viewed: { label: "Viewed", className: "bg-blue-500/10 text-blue-600" },
  draft: { label: "Draft", className: "bg-slate-500/10 text-slate-600" },
  declined: { label: "Declined", className: "bg-red-500/10 text-red-600" },
  expired: { label: "Expired", className: "bg-slate-500/10 text-slate-600" },
};

const PROJECT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-600" },
  archived: { label: "Archived", className: "bg-slate-500/10 text-slate-600" },
};

const PROOF_TYPE_LABELS: Record<string, string> = {
  time_entry: "Time Entry",
  task_completion: "Task Completion",
  milestone_delivery: "Milestone Delivery",
  deliverable_file: "Deliverable File",
  deliverable_url: "Deliverable URL",
  expense_record: "Expense Record",
};

// ─── Mock Data (fallback when Convex returns empty) ─────────────────────────

const MOCK_INVOICES = [
  { _id: "mock_inv_1", invoiceNumber: "INV-001", status: "paid", total: 2500, currency: "USD", issueDate: Date.now() - 30 * 86400000, dueDate: Date.now() - 15 * 86400000, clientName: "Acme Corp", clientEmail: "", hasValidatedBilling: true, notes: "Website redesign project", proofCount: 5 },
  { _id: "mock_inv_2", invoiceNumber: "INV-002", status: "sent", total: 1800, currency: "USD", issueDate: Date.now() - 7 * 86400000, dueDate: Date.now() + 23 * 86400000, clientName: "Acme Corp", clientEmail: "", hasValidatedBilling: true, notes: "API integration work", proofCount: 3 },
  { _id: "mock_inv_3", invoiceNumber: "INV-003", status: "overdue", total: 950, currency: "USD", issueDate: Date.now() - 60 * 86400000, dueDate: Date.now() - 30 * 86400000, clientName: "Acme Corp", clientEmail: "", hasValidatedBilling: false, notes: "Bug fix sprint", proofCount: 2 },
];

const MOCK_PROPOSALS = [
  { _id: "mock_prop_1", title: "Mobile App Development", status: "signed", totalValue: 12000, currency: "USD", clientName: "Acme Corp", clientEmail: "", createdAt: Date.now() - 45 * 86400000 },
  { _id: "mock_prop_2", title: "Backend API Redesign", status: "sent", totalValue: 8500, currency: "USD", clientName: "Acme Corp", clientEmail: "", createdAt: Date.now() - 10 * 86400000 },
];

const MOCK_PROJECTS = [
  { _id: "mock_proj_1", projectName: "Website Redesign", clientName: "Acme Corp", status: "active", projectType: "milestone", protectionLevel: "enhanced", completionPercentage: 65, totalDeliverables: 8, completedDeliverables: 5, milestones: [
    { id: "m1", name: "Design Mockups", status: "completed", estimatedHours: 20 },
    { id: "m2", name: "Frontend Development", status: "completed", estimatedHours: 40 },
    { id: "m3", name: "Backend Integration", status: "in_progress", estimatedHours: 30 },
    { id: "m4", name: "QA & Testing", status: "pending", estimatedHours: 15 },
  ], createdAt: Date.now() - 60 * 86400000, lastActivityAt: Date.now() - 2 * 86400000 },
  { _id: "mock_proj_2", projectName: "API Integration", clientName: "Acme Corp", status: "active", projectType: "fixed", protectionLevel: "standard", completionPercentage: 30, totalDeliverables: 5, completedDeliverables: 1, milestones: [
    { id: "m5", name: "API Design", status: "completed", estimatedHours: 10 },
    { id: "m6", name: "Implementation", status: "in_progress", estimatedHours: 50 },
    { id: "m7", name: "Documentation", status: "pending", estimatedHours: 8 },
  ], createdAt: Date.now() - 20 * 86400000, lastActivityAt: Date.now() - 1 * 86400000 },
];

const MOCK_WORK_PROOFS = [
  { _id: "mock_wp_1", proofType: "time_entry" as const, title: "Frontend Development - Week 3", description: "Implemented responsive layout and navigation", hours: 18.5, date: Date.now() - 5 * 86400000, value: 1850, verified: true },
  { _id: "mock_wp_2", proofType: "task_completion" as const, title: "API Endpoint Implementation", description: "Built REST API endpoints for user management", hours: 12, date: Date.now() - 3 * 86400000, value: 1200, verified: true },
  { _id: "mock_wp_3", proofType: "milestone_delivery" as const, title: "Design Phase Complete", description: "All design mockups approved and finalized", hours: 0, date: Date.now() - 10 * 86400000, value: 2500, verified: true },
];

const MOCK_APPROVALS = [
  { _id: "mock_appr_1", title: "Phase 2 Deliverables", description: "Frontend components and API integration deliverables", projectName: "Website Redesign", clientName: "Acme Corp", approvalToken: "demo_token_1", deliverables: [
    { id: "d1", name: "Responsive Layout", status: "completed", description: "Mobile-first responsive design", estimatedHours: 15 },
    { id: "d2", name: "API Integration Layer", status: "in_progress", description: "Backend API connection layer", estimatedHours: 20 },
  ], status: "active", clientApprovedAt: undefined, createdAt: Date.now() - 7 * 86400000, updatedAt: Date.now() - 2 * 86400000 },
];

const MOCK_VERIFICATION_REPORTS = [
  { _id: "mock_vr_1", projectName: "Website Redesign", workPeriodStart: Date.now() - 60 * 86400000, workPeriodEnd: Date.now() - 10 * 86400000, wcvmScore: 87, evidenceSummary: { totalHours: 142, screenshotCount: 38, activityScore: 92, complianceRate: 96 }, generatedAt: Date.now() - 5 * 86400000, expiresAt: Date.now() + 25 * 86400000, status: "completed" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const navigate = useNavigate();
  const sessionToken = localStorage.getItem("axia_client_token");
  const clientEmail = localStorage.getItem("axia_client_email");

  // Parse verified session info
  const verifiedInfo = useMemo(() => {
    try {
      const raw = localStorage.getItem("axia_client_verified");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Validate session
  const session = useQuery(
    sessionToken ? api.clients.clientAuth.getClientSession : "skip",
    sessionToken ? { token: sessionToken } : "skip"
  ) as any;

  const logoutClient = useMutation(api.clients.clientAuth.logoutClientSession);

  // Client-scoped queries — filtered server-side by clientEmail
  const overview = useQuery(
    clientEmail ? api.clients.clientPortal.getClientOverview : "skip",
    clientEmail ? { clientEmail } : "skip"
  ) as any;

  const rawInvoices = useQuery(
    clientEmail ? api.clients.clientPortal.getClientInvoices : "skip",
    clientEmail ? { clientEmail } : "skip"
  ) as any[] | undefined;

  const rawProposals = useQuery(
    clientEmail ? api.clients.clientPortal.getClientProposals : "skip",
    clientEmail ? { clientEmail } : "skip"
  ) as any[] | undefined;

  const rawProjects = useQuery(
    clientEmail ? api.clients.clientPortal.getClientProjectsStatus : "skip",
    clientEmail ? { clientEmail } : "skip"
  ) as any[] | undefined;

  const pendingApprovals = useQuery(
    clientEmail ? api.clients.clientPortal.getClientPendingApprovals : "skip",
    clientEmail ? { clientEmail } : "skip"
  ) as any[] | undefined;

  const approvalHistory = useQuery(
    clientEmail ? api.clients.clientPortal.getClientApprovalHistory : "skip",
    clientEmail ? { clientEmail } : "skip"
  ) as any[] | undefined;

  const verificationReports = useQuery(
    clientEmail ? api.clients.clientPortal.getClientVerificationReports : "skip",
    clientEmail ? { clientEmail } : "skip"
  ) as any[] | undefined;

  // Approve/reject mutations
  const approveDeliverable = useMutation(api.clients.clientPortal.approveDeliverable);
  const rejectDeliverable = useMutation(api.clients.clientPortal.rejectDeliverable);

  // Work proofs: selected invoice for work proof viewing
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  const rawWorkProofs = useQuery(
    clientEmail && selectedInvoiceId
      ? api.clients.clientPortal.getClientWorkProofs
      : "skip",
    clientEmail && selectedInvoiceId
      ? { clientEmail, invoiceId: selectedInvoiceId as any }
      : "skip"
  ) as any[] | undefined;

  // ─── Fallback to mock data when Convex returns empty arrays ──────────
  const clientInvoices = useMemo(() => {
    if (rawInvoices === undefined) return undefined; // still loading
    return rawInvoices.length > 0 ? rawInvoices : MOCK_INVOICES;
  }, [rawInvoices]);

  const clientProposals = useMemo(() => {
    if (rawProposals === undefined) return undefined;
    return rawProposals.length > 0 ? rawProposals : MOCK_PROPOSALS;
  }, [rawProposals]);

  const clientProjects = useMemo(() => {
    if (rawProjects === undefined) return undefined;
    return rawProjects.length > 0 ? rawProjects : MOCK_PROJECTS;
  }, [rawProjects]);

  const clientApprovals = useMemo(() => {
    if (pendingApprovals === undefined) return undefined;
    return pendingApprovals.length > 0 ? pendingApprovals : MOCK_APPROVALS;
  }, [pendingApprovals]);

  const clientReports = useMemo(() => {
    if (verificationReports === undefined) return undefined;
    return verificationReports.length > 0 ? verificationReports : MOCK_VERIFICATION_REPORTS;
  }, [verificationReports]);

  const clientWorkProofs = useMemo(() => {
    if (rawWorkProofs === undefined) return undefined;
    return rawWorkProofs.length > 0 ? rawWorkProofs : MOCK_WORK_PROOFS;
  }, [rawWorkProofs]);

  // Determine if we're showing mock data
  const isUsingMockInvoices = rawInvoices !== undefined && rawInvoices.length === 0;
  const isUsingMockProposals = rawProposals !== undefined && rawProposals.length === 0;
  const isUsingMockProjects = rawProjects !== undefined && rawProjects.length === 0;
  const isUsingMockApprovals = pendingApprovals !== undefined && pendingApprovals.length === 0;
  const isUsingMockReports = verificationReports !== undefined && verificationReports.length === 0;
  const isUsingMockWorkProofs = selectedInvoiceId && rawWorkProofs !== undefined && rawWorkProofs.length === 0;

  // Session check
  const isSessionValid = session && session.clientEmail;

  // Redirect if not logged in
  useEffect(() => {
    if (sessionToken && session === null) {
      localStorage.removeItem("axia_client_token");
      localStorage.removeItem("axia_client_email");
      localStorage.removeItem("axia_client_name");
      localStorage.removeItem("axia_client_login_at");
      localStorage.removeItem("axia_client_verified");
      navigate("/client-login");
    }
  }, [session, sessionToken, navigate]);

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await logoutClient({ token: sessionToken });
      }
    } catch {}
    localStorage.removeItem("axia_client_token");
    localStorage.removeItem("axia_client_email");
    localStorage.removeItem("axia_client_name");
    localStorage.removeItem("axia_client_login_at");
    localStorage.removeItem("axia_client_verified");
    navigate("/client-login");
  };

  const handleApprove = async (approvalToken: string) => {
    try {
      await approveDeliverable({ approvalToken });
      toast.success("Deliverable approved!", {
        description: "The freelancer has been notified.",
      });
    } catch (err: any) {
      toast.error("Failed to approve", { description: err.message });
    }
  };

  const handleReject = async (approvalToken: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;
    try {
      await rejectDeliverable({ approvalToken, reason });
      toast.success("Deliverable rejected", {
        description: "The freelancer has been notified.",
      });
    } catch (err: any) {
      toast.error("Failed to reject", { description: err.message });
    }
  };

  // Display name
  const displayName = verifiedInfo?.clientName || session?.clientName || localStorage.getItem("axia_client_name") || clientEmail || "Client";

  if (!clientEmail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-2" />
            <CardTitle>Session Expired</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">Please sign in to access the client portal.</p>
            <Button onClick={() => navigate("/client-login")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compute overview with mock fallback
  const displayOverview = overview || {
    totalInvoices: clientInvoices?.length ?? 0,
    paidInvoices: clientInvoices?.filter((i: any) => i.status === "paid").length ?? 0,
    outstandingInvoices: clientInvoices?.filter((i: any) => ["sent", "viewed", "overdue"].includes(i.status)).length ?? 0,
    totalInvoiced: clientInvoices?.reduce((s: number, i: any) => s + i.total, 0) ?? 0,
    totalPaid: clientInvoices?.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.total, 0) ?? 0,
    totalOutstanding: clientInvoices?.filter((i: any) => ["sent", "viewed", "overdue"].includes(i.status)).reduce((s: number, i: any) => s + i.total, 0) ?? 0,
    totalProposals: clientProposals?.length ?? 0,
    signedProposals: clientProposals?.filter((p: any) => p.status === "signed").length ?? 0,
    totalProposalValue: clientProposals?.filter((p: any) => p.status === "signed").reduce((s: number, p: any) => s + p.totalValue, 0) ?? 0,
    projectCount: clientProjects?.length ?? 0,
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Client Portal</h1>
            <p className="text-muted-foreground">{clientEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            {!isSessionValid && (
              <Button variant="outline" size="sm" onClick={() => navigate("/client-login")}>
                Sign In for Full Access
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayOverview.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {displayOverview.outstandingInvoices} outstanding
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(displayOverview.totalInvoiced)}</div>
              <p className="text-xs text-emerald-600">
                {formatCurrency(displayOverview.totalPaid)} paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proposals</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayOverview.totalProposals}</div>
              <p className="text-xs text-muted-foreground">
                {displayOverview.signedProposals} signed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayOverview.projectCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientApprovals?.length ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">
              <LayoutDashboard className="h-4 w-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <FileText className="h-4 w-4 mr-1" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="proposals">
              <DollarSign className="h-4 w-4 mr-1" />
              Proposals
            </TabsTrigger>
            <TabsTrigger value="projects">
              <FolderKanban className="h-4 w-4 mr-1" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="proofs">
              <Link2 className="h-4 w-4 mr-1" />
              Work Proofs
            </TabsTrigger>
            <TabsTrigger value="approvals">
              <ThumbsUp className="h-4 w-4 mr-1" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="h-4 w-4 mr-1" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="directory">
              <Building2 className="h-4 w-4 mr-1" />
              Directory
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome, {displayName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Access all Axia features using the tabs above:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li><strong>Invoices:</strong> View and track invoices from freelancers</li>
                    <li><strong>Proposals:</strong> Review and respond to proposals</li>
                    <li><strong>Projects:</strong> Track project status and milestones</li>
                    <li><strong>Work Proofs:</strong> View evidence backing each invoice</li>
                    <li><strong>Approvals:</strong> Approve or reject deliverables</li>
                    <li><strong>Reports:</strong> View verification reports from freelancers</li>
                    <li><strong>Directory:</strong> Browse verified freelancers</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Outstanding Amounts */}
              {(displayOverview.totalOutstanding ?? 0) > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      Outstanding Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">
                      {formatCurrency(displayOverview.totalOutstanding ?? 0)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {displayOverview.outstandingInvoices ?? 0} invoice{(displayOverview.outstandingInvoices ?? 0) !== 1 ? "s" : ""} awaiting payment
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Recent Invoices */}
              {clientInvoices && clientInvoices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Invoices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {clientInvoices.slice(0, 5).map((inv: any) => (
                        <div key={inv._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{inv.invoiceNumber}</div>
                            <div className="text-xs text-muted-foreground">{inv.clientName}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{formatCurrency(inv.total, inv.currency)}</span>
                            <Badge variant="outline" className={INVOICE_STATUS_CONFIG[inv.status]?.className || "bg-slate-500/10 text-slate-600"}>
                              {INVOICE_STATUS_CONFIG[inv.status]?.label || inv.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    {isUsingMockInvoices && (
                      <p className="text-xs text-amber-500 mt-3 italic">Showing demo data — no invoices found for your account yet.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Your Invoices</CardTitle>
                {isUsingMockInvoices && (
                  <CardDescription className="text-amber-600">Demo data — no invoices found for your account yet.</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {clientInvoices && clientInvoices.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {clientInvoices.map((inv: any) => (
                      <div key={inv._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{inv.invoiceNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(inv.issueDate)} · Due: {formatDate(inv.dueDate)}
                          </div>
                          {inv.notes && <div className="text-xs text-muted-foreground mt-1">{inv.notes}</div>}
                        </div>
                        <div className="flex items-center gap-3 ml-4 shrink-0">
                          <span className="font-medium">{formatCurrency(inv.total, inv.currency)}</span>
                          <Badge variant="outline" className={INVOICE_STATUS_CONFIG[inv.status]?.className || "bg-slate-500/10 text-slate-600"}>
                            {INVOICE_STATUS_CONFIG[inv.status]?.label || inv.status}
                          </Badge>
                          {inv.hasValidatedBilling && (
                            <Badge className="bg-[#22c55e]/15 text-[#22c55e] text-[10px]">
                              <Shield className="h-3 w-3 mr-1" />
                              Validated
                            </Badge>
                          )}
                          {inv.proofCount > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              <Link2 className="h-3 w-3 mr-1" />
                              {inv.proofCount} proof{inv.proofCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No invoices found for your account.</p>
                    <p className="text-sm mt-1">Invoices from freelancers will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals">
            <Card>
              <CardHeader>
                <CardTitle>Your Proposals</CardTitle>
                {isUsingMockProposals && (
                  <CardDescription className="text-amber-600">Demo data — no proposals found for your account yet.</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {clientProposals && clientProposals.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {clientProposals.map((p: any) => (
                      <div key={p._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {p.clientName} · {formatDate(p.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatCurrency(p.totalValue, p.currency)}</span>
                          <Badge variant="outline" className={PROPOSAL_STATUS_CONFIG[p.status]?.className || "bg-slate-500/10 text-slate-600"}>
                            {PROPOSAL_STATUS_CONFIG[p.status]?.label || p.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No proposals found for your account.</p>
                    <p className="text-sm mt-1">Proposals from freelancers will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>Your Projects</CardTitle>
                {isUsingMockProjects && (
                  <CardDescription className="text-amber-600">Demo data — no projects found for your account yet.</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {clientProjects && clientProjects.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {clientProjects.map((project: any) => (
                      <div key={project._id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium">{project.projectName}</div>
                            <div className="text-sm text-muted-foreground">{project.clientName}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {project.projectType}
                            </Badge>
                            <Badge variant="outline" className={PROJECT_STATUS_CONFIG[project.status]?.className || "bg-slate-500/10 text-slate-600"}>
                              {PROJECT_STATUS_CONFIG[project.status]?.label || project.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Completion Progress */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Completion</span>
                            <span className="font-medium">{project.completionPercentage}%</span>
                          </div>
                          <Progress value={project.completionPercentage} className="h-2" />
                        </div>

                        {/* Milestones */}
                        {project.milestones && project.milestones.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Milestones</p>
                            {project.milestones.map((m: any) => (
                              <div key={m.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  {m.status === "completed" ? (
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : m.status === "in_progress" ? (
                                    <Activity className="h-3.5 w-3.5 text-blue-500" />
                                  ) : (
                                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                  <span className={m.status === "completed" ? "text-muted-foreground line-through" : ""}>
                                    {m.name}
                                  </span>
                                </div>
                                {m.estimatedHours && (
                                  <span className="text-xs text-muted-foreground">{m.estimatedHours}h est.</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No projects found for your account.</p>
                    <p className="text-sm mt-1">Projects will appear here when assigned by freelancers.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Proofs Tab */}
          <TabsContent value="proofs">
            <Card>
              <CardHeader>
                <CardTitle>Work Proofs</CardTitle>
                <CardDescription>
                  Select an invoice to view the work evidence backing it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Invoice Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Invoice</label>
                  <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an invoice..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientInvoices && clientInvoices.length > 0 ? (
                        clientInvoices.map((inv: any) => (
                          <SelectItem key={inv._id} value={inv._id}>
                            {inv.invoiceNumber} — {formatCurrency(inv.total, inv.currency)} ({INVOICE_STATUS_CONFIG[inv.status]?.label || inv.status})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No invoices available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Work Proofs Display */}
                {selectedInvoiceId ? (
                  clientWorkProofs && clientWorkProofs.length > 0 ? (
                    <div className="space-y-3">
                      {isUsingMockWorkProofs && (
                        <p className="text-xs text-amber-600 italic mb-2">Demo data — no work proofs found for this invoice.</p>
                      )}
                      {clientWorkProofs.map((proof: any) => (
                        <div key={proof._id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {PROOF_TYPE_LABELS[proof.proofType] || proof.proofType}
                                </Badge>
                                {proof.verified && (
                                  <Badge className="bg-[#22c55e]/15 text-[#22c55e] text-[10px]">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <div className="font-medium">{proof.title}</div>
                              {proof.description && (
                                <p className="text-sm text-muted-foreground mt-1">{proof.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span>{formatDate(proof.date)}</span>
                                {proof.hours != null && proof.hours > 0 && (
                                  <span>{proof.hours}h</span>
                                )}
                                {proof.value != null && proof.value > 0 && (
                                  <span>{formatCurrency(proof.value)}</span>
                                )}
                              </div>
                            </div>
                            {proof.url && (
                              <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-4">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    clientWorkProofs !== undefined ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Link2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p>No work proofs found for this invoice.</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )
                  )
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>Select an invoice above to view its work proofs.</p>
                    <p className="text-sm mt-1">Work proofs are evidence items that back each invoice line item.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <div className="space-y-6">
              {/* Pending Approvals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-amber-500" />
                    Pending Approvals
                  </CardTitle>
                  {isUsingMockApprovals && (
                    <CardDescription className="text-amber-600">Demo data — no pending approvals for your account.</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {clientApprovals && clientApprovals.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {clientApprovals.map((approval: any) => (
                        <div key={approval._id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium">{approval.title}</div>
                              <div className="text-sm text-muted-foreground">
                                Project: {approval.projectName}
                              </div>
                              {approval.description && (
                                <p className="text-sm text-muted-foreground mt-1">{approval.description}</p>
                              )}
                            </div>
                          </div>
                          {approval.deliverables && approval.deliverables.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase">Deliverables</p>
                              {approval.deliverables.map((d: any) => (
                                <div key={d.id} className="flex items-center gap-2 text-sm">
                                  {d.status === "completed" ? (
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : d.status === "in_progress" ? (
                                    <Activity className="h-3.5 w-3.5 text-blue-500" />
                                  ) : (
                                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                  <span>{d.name}</span>
                                  <Badge variant="outline" className="text-xs h-5 ml-auto">
                                    {d.status || "pending"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleApprove(approval.approvalToken)}
                            >
                              <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleReject(approval.approvalToken)}
                            >
                              <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>No pending approvals</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Approval History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Approval History</CardTitle>
                </CardHeader>
                <CardContent>
                  {approvalHistory && approvalHistory.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {approvalHistory.map((item: any) => (
                        <div key={item._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-muted-foreground">{item.projectName}</div>
                          </div>
                          <Badge variant="outline" className={
                            item.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-red-500/10 text-red-600"
                          }>
                            {item.status === "completed" ? "Approved" : "Disputed"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4 text-sm">No approval history yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Verification Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Verification Reports
                </CardTitle>
                {isUsingMockReports && (
                  <CardDescription className="text-amber-600">Demo data — no verification reports found for your account.</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {clientReports && clientReports.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {clientReports.map((report: any) => (
                      <div key={report._id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium">{report.projectName}</div>
                            <div className="text-sm text-muted-foreground">
                              {report.workPeriodStart ? formatDate(report.workPeriodStart) : "N/A"} — {report.workPeriodEnd ? formatDate(report.workPeriodEnd) : "N/A"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              report.wcvmScore >= 80
                                ? "bg-emerald-500/10 text-emerald-600"
                                : report.wcvmScore >= 60
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-red-500/10 text-red-600"
                            }>
                              WCVM: {report.wcvmScore}/100
                            </Badge>
                            <Badge variant="outline" className={
                              report.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : report.status === "pending"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-slate-500/10 text-slate-600"
                            }>
                              {report.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Evidence Summary */}
                        {report.evidenceSummary && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <div className="text-lg font-bold">{report.evidenceSummary.totalHours}</div>
                              <div className="text-xs text-muted-foreground">Total Hours</div>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <div className="text-lg font-bold">{report.evidenceSummary.screenshotCount}</div>
                              <div className="text-xs text-muted-foreground">Screenshots</div>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <div className="text-lg font-bold">{report.evidenceSummary.activityScore}%</div>
                              <div className="text-xs text-muted-foreground">Activity Score</div>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <div className="text-lg font-bold">{report.evidenceSummary.complianceRate}%</div>
                              <div className="text-xs text-muted-foreground">Compliance</div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <span>Generated: {report.generatedAt ? formatDate(report.generatedAt) : "N/A"}</span>
                          <span>·</span>
                          <span>Expires: {report.expiresAt ? formatDate(report.expiresAt) : "N/A"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No verification reports available.</p>
                    <p className="text-sm mt-1">Reports will appear here when freelancers submit verification data.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Directory Tab */}
          <TabsContent value="directory">
            <FreelancerDirectoryView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
