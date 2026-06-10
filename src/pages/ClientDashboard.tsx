import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { Progress } from "@/components/ui/progress";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  Building2,

  CheckCircle,
  Clock,
  LayoutDashboard,
  UserSearch,
  FileCheck,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  Receipt,
  Shield,
  MessageSquare,
  Send,
  FolderKanban,
  ThumbsUp,
  ThumbsDown,
  Eye,
  AlertTriangle,
  DollarSign,

  BarChart3,
  CheckCircle2,
  CircleDot,
  Loader2,
  Plus,
  Search,

  Calendar,
  ChevronRight,
  Star,

  MinusCircle,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { WCVMVerificationDashboard } from "@/components/WCVMVerificationDashboard";
import { FreelancerDirectoryView } from "@/components/FreelancerDirectoryView";
import { VerificationRequestSystem } from "@/components/VerificationRequestSystem";
import { RealTimeWorkValidation } from "@/components/RealTimeWorkValidation";

// ─── Mock data for rich demo experience ─────────────────────────────────

const MOCK_PROJECTS = [
  { id: "proj_1", name: "E-Commerce Platform Redesign", freelancer: "Sarah Chen", freelancerAvatar: "", status: "active", health: 92, verificationStatus: "verified", budget: 15000, spent: 8750, deadline: Date.now() + 30 * 86400000, milestones: 5, completedMilestones: 3 },
  { id: "proj_2", name: "Mobile App Development", freelancer: "James Wilson", freelancerAvatar: "", status: "active", health: 78, verificationStatus: "pending", budget: 25000, spent: 12000, deadline: Date.now() + 45 * 86400000, milestones: 8, completedMilestones: 4 },
  { id: "proj_3", name: "API Integration Services", freelancer: "Maria Garcia", freelancerAvatar: "", status: "completed", health: 98, verificationStatus: "verified", budget: 8000, spent: 7800, deadline: Date.now() - 5 * 86400000, milestones: 4, completedMilestones: 4 },
  { id: "proj_4", name: "Data Analytics Dashboard", freelancer: "Alex Kim", freelancerAvatar: "", status: "at_risk", health: 45, verificationStatus: "in_progress", budget: 12000, spent: 9600, deadline: Date.now() + 7 * 86400000, milestones: 6, completedMilestones: 2 },
];

const MOCK_INVOICES = [
  { id: "inv_1", number: "AX-2024-001", freelancer: "Sarah Chen", amount: 3500, status: "paid", dueDate: Date.now() - 10 * 86400000, paidDate: Date.now() - 12 * 86400000, project: "E-Commerce Platform Redesign" },
  { id: "inv_2", number: "AX-2024-002", freelancer: "James Wilson", amount: 5000, status: "pending", dueDate: Date.now() + 15 * 86400000, paidDate: null, project: "Mobile App Development" },
  { id: "inv_3", number: "AX-2024-003", freelancer: "Alex Kim", amount: 2800, status: "overdue", dueDate: Date.now() - 3 * 86400000, paidDate: null, project: "Data Analytics Dashboard" },
  { id: "inv_4", number: "AX-2024-004", freelancer: "Maria Garcia", amount: 1900, status: "paid", dueDate: Date.now() - 20 * 86400000, paidDate: Date.now() - 22 * 86400000, project: "API Integration Services" },
  { id: "inv_5", number: "AX-2024-005", freelancer: "James Wilson", amount: 4200, status: "pending", dueDate: Date.now() + 30 * 86400000, paidDate: null, project: "Mobile App Development" },
];

const MOCK_APPROVALS = [
  { id: "appr_1", type: "scope_change", title: "Scope Change: Additional Payment Module", project: "E-Commerce Platform Redesign", freelancer: "Sarah Chen", description: "Adding Stripe + PayPal integration module. Estimated +40 hours.", impact: "Budget increase of $4,000", requestedAt: Date.now() - 2 * 86400000, urgency: "high" },
  { id: "appr_2", type: "contract_review", title: "Contract Extension Request", project: "Mobile App Development", freelancer: "James Wilson", description: "Requesting 3-week extension due to additional feature requirements from stakeholder feedback.", impact: "Timeline +21 days", requestedAt: Date.now() - 1 * 86400000, urgency: "medium" },
  { id: "appr_3", type: "evidence_review", title: "Milestone Evidence: Backend API Complete", project: "Data Analytics Dashboard", freelancer: "Alex Kim", description: "All backend API endpoints delivered and tested. Code review and test coverage report attached.", impact: "Milestone payment: $2,400", requestedAt: Date.now() - 4 * 3600000, urgency: "low" },
  { id: "appr_4", type: "scope_change", title: "Scope Change: Design System Update", project: "E-Commerce Platform Redesign", freelancer: "Sarah Chen", description: "Updating design system to match new brand guidelines. Affects 12 components.", impact: "Timeline +5 days", requestedAt: Date.now() - 6 * 3600000, urgency: "low" },
];

const MOCK_MESSAGES = [
  { id: "msg_1", from: "Sarah Chen", fromAvatar: "", content: "Hi! I've completed the checkout flow redesign. Can you review the latest Figma file when you get a chance?", timestamp: Date.now() - 30 * 60000, isClient: false },
  { id: "msg_2", from: "You", fromAvatar: "", content: "Looks great! Let me review it this afternoon. One question — did you account for the guest checkout flow?", timestamp: Date.now() - 25 * 60000, isClient: true },
  { id: "msg_3", from: "Sarah Chen", fromAvatar: "", content: "Yes, guest checkout is included as a separate flow. I also added error states for all payment methods.", timestamp: Date.now() - 20 * 60000, isClient: false },
  { id: "msg_4", from: "James Wilson", fromAvatar: "", content: "Quick update on the mobile app — I've finished the authentication module and started on the dashboard. Should have a demo ready by Friday.", timestamp: Date.now() - 2 * 3600000, isClient: false },
  { id: "msg_5", from: "You", fromAvatar: "", content: "That's ahead of schedule, nice work! Let's sync on the dashboard layout tomorrow.", timestamp: Date.now() - 1.5 * 3600000, isClient: true },
  { id: "msg_6", from: "Alex Kim", fromAvatar: "", content: "I've uploaded the evidence for the backend API milestone. Could you review and approve so we can move forward?", timestamp: Date.now() - 4 * 3600000, isClient: false },
];

const MOCK_ACTIVITY = [
  { id: "act_1", type: "verification", title: "Work session verified", subtitle: "Sarah Chen · 4.5 hours", icon: "check", timestamp: Date.now() - 15 * 60000 },
  { id: "act_2", type: "approval", title: "Scope change requested", subtitle: "E-Commerce Platform Redesign", icon: "alert", timestamp: Date.now() - 2 * 3600000 },
  { id: "act_3", type: "invoice", title: "Invoice AX-2024-002 created", subtitle: "James Wilson · $5,000", icon: "receipt", timestamp: Date.now() - 5 * 3600000 },
  { id: "act_4", type: "message", title: "New message from Sarah Chen", subtitle: "Checkout flow redesign complete", icon: "message", timestamp: Date.now() - 6 * 3600000 },
  { id: "act_5", type: "milestone", title: "Milestone completed", subtitle: "API Integration Services · Final delivery", icon: "check", timestamp: Date.now() - 12 * 3600000 },
  { id: "act_6", type: "verification", title: "Real-time validation started", subtitle: "Alex Kim · Data Analytics Dashboard", icon: "activity", timestamp: Date.now() - 24 * 3600000 },
  { id: "act_7", type: "invoice", title: "Invoice AX-2024-003 overdue", subtitle: "Alex Kim · $2,800", icon: "alert", timestamp: Date.now() - 3 * 86400000 },
  { id: "act_8", type: "project", title: "Project health alert", subtitle: "Data Analytics Dashboard · Health dropped to 45%", icon: "alert", timestamp: Date.now() - 4 * 86400000 },
];

// ─── Helpers ────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getHealthColor(health: number): string {
  if (health >= 80) return "text-emerald-500";
  if (health >= 60) return "text-amber-500";
  return "text-red-500";
}

function getHealthBg(health: number): string {
  if (health >= 80) return "bg-emerald-500";
  if (health >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}



// ─── Enhanced Stat Card ────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = "text-muted-foreground",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend && (
            <span className={`flex items-center text-xs font-medium ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
              {trend === "up" ? <TrendingUp className="h-3 w-3 mr-0.5" /> : trend === "down" ? <TrendingDown className="h-3 w-3 mr-0.5" /> : <MinusCircle className="h-3 w-3 mr-0.5" />}
              {trendLabel}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Activity Icon Helper ──────────────────────────────────────────────

function ActivityIcon({ icon }: { icon: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    check: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    alert: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    receipt: <Receipt className="h-4 w-4 text-blue-500" />,
    message: <MessageSquare className="h-4 w-4 text-axia-teal-700" />,
    activity: <Activity className="h-4 w-4 text-primary" />,
  };
  return (
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
      {iconMap[icon] ?? <CircleDot className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
}

// ─── Approval Type Badge ───────────────────────────────────────────────

function ApprovalTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
    scope_change: { label: "Scope Change", variant: "default", icon: FileText },
    contract_review: { label: "Contract Review", variant: "secondary", icon: Shield },
    evidence_review: { label: "Evidence Review", variant: "outline", icon: Eye },
  };
  const c = config[type] ?? { label: type, variant: "outline" as const, icon: FileCheck };
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className="text-xs gap-1">
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

// ─── Urgency Indicator ─────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${colors[urgency] ?? colors.low}`}>
      {urgency.toUpperCase()}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN CLIENT DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function ClientDashboard() {
  const navigate = useNavigate();
  const clientEmail = localStorage.getItem("axia_client_email");
  const [activeTab, setActiveTab] = useState("overview");
  const [messageInput, setMessageInput] = useState("");
  const [selectedFreelancer, setSelectedFreelancer] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

  // Fetch client profile
  const clientProfile = useQuery(
    "clientAuth:getClientProfile" as any,
    clientEmail ? { email: clientEmail } : "skip"
  );

  // Fetch verification requests — used by sub-components (VerificationRequestSystem)
  useQuery(
    api.clients.verificationRequests.getClientVerificationRequests,
    clientProfile?._id ? { clientId: clientProfile._id } : "skip"
  );

  // Fetch freelancer directory — used by sub-components (FreelancerDirectoryView)
  useQuery(
    api.clients.freelancerDirectory.getVerifiedFreelancers,
    {}
  );

  // Mock client profile if not logged in
  const mockClientProfile = {
    _id: "mock_client_1",
    email: clientEmail || "demo@company.com",
    companyName: "Demo Company",
    contactName: "Demo User",
    verificationCount: 12,
    industry: "Technology",
    companySize: "10-50",
  };

  const displayProfile = clientProfile || mockClientProfile;

  // ─── Derived stats ─────────────────────────────────────────────────────
  const activeProjects = MOCK_PROJECTS.filter((p) => p.status === "active" || p.status === "at_risk").length;

  const pendingInvoices = MOCK_INVOICES.filter((i) => i.status === "pending").length;
  const overdueInvoices = MOCK_INVOICES.filter((i) => i.status === "overdue").length;
  const outstandingAmount = MOCK_INVOICES.filter((i) => i.status === "pending" || i.status === "overdue").reduce((sum, i) => sum + i.amount, 0);
  const pendingApprovals = MOCK_APPROVALS.length;
  const avgHealth = Math.round(MOCK_PROJECTS.reduce((sum, p) => sum + p.health, 0) / MOCK_PROJECTS.length);
  const verifiedFreelancers = MOCK_PROJECTS.filter((p) => p.verificationStatus === "verified").length;

  // ─── Message threads (grouped by freelancer) ───────────────────────────
  const messageThreads = useMemo(() => {
    const threads: Record<string, typeof MOCK_MESSAGES> = {};
    MOCK_MESSAGES.forEach((msg) => {
      const key = msg.isClient ? (msg.from === "You" ? "Sarah Chen" : msg.from) : msg.from;
      if (!threads[key]) threads[key] = [];
      threads[key].push(msg);
    });
    return threads;
  }, []);

  const freelancerNames = Object.keys(messageThreads);
  const currentThread = selectedFreelancer ? messageThreads[selectedFreelancer] ?? [] : [];

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleApprovalAction = async (approvalId: string, action: "approved" | "rejected") => {
    setApprovalLoading(approvalId);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setApprovalLoading(null);
    const approval = MOCK_APPROVALS.find((a) => a.id === approvalId);
    if (action === "approved") {
      toast.success("Approved", { description: `${approval?.title} has been approved.` });
    } else {
      toast.info("Rejected", { description: `${approval?.title} has been rejected.` });
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedFreelancer) return;
    toast.success("Message sent", { description: `Message sent to ${selectedFreelancer}` });
    setMessageInput("");
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "verification":
        setActiveTab("requests");
        toast.info("Navigate to Verification Requests", { description: "Create a new verification request for a freelancer." });
        break;
      case "reports":
        toast.info("Generating Reports", { description: "Your verification report is being prepared." });
        break;
      case "approve":
        setActiveTab("approvals");
        break;
      case "directory":
        setActiveTab("directory");
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Client Dashboard</h1>
              <p className="text-muted-foreground text-sm">{displayProfile.companyName} · {displayProfile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:flex gap-1">
              <Shield className="h-3 w-3" />
              Axia Protected
            </Badge>
            <Button variant="outline" size="sm" onClick={() => {
              localStorage.removeItem("axia_client_email");
              navigate("/client-login");
            }}>
              Logout
            </Button>
          </div>
        </motion.div>

        {/* ─── Enhanced Stats Cards ───────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <StatCard
            title="Active Projects"
            value={activeProjects}
            subtitle={`${MOCK_PROJECTS.length} total projects`}
            icon={FolderKanban}
            trend="up"
            trendLabel="+2 this month"
            color="text-primary"
          />
          <StatCard
            title="Verifications"
            value={displayProfile.verificationCount || 0}
            subtitle="Work sessions verified"
            icon={CheckCircle}
            trend="up"
            trendLabel="+8 this week"
            color="text-emerald-500"
          />
          <StatCard
            title="Outstanding"
            value={fmtCurrency(outstandingAmount)}
            subtitle={`${pendingInvoices} pending · ${overdueInvoices} overdue`}
            icon={DollarSign}
            trend={overdueInvoices > 0 ? "down" : "neutral"}
            trendLabel={overdueInvoices > 0 ? `${overdueInvoices} overdue` : "On track"}
            color="text-amber-500"
          />
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals}
            subtitle="Awaiting your review"
            icon={Clock}
            trend={pendingApprovals > 0 ? "down" : "neutral"}
            trendLabel={pendingApprovals > 0 ? "Needs attention" : "All clear"}
            color="text-axia-teal-700"
          />
        </motion.div>

        {/* ─── Main Tabs ──────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 sm:grid-cols-9 h-auto gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs sm:text-sm">
              <FolderKanban className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs sm:text-sm">
              <Receipt className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs sm:text-sm relative">
              <ThumbsUp className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Approvals</span>
              {pendingApprovals > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                  {pendingApprovals}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="wcvm" className="text-xs sm:text-sm">
              <CheckCircle className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">WCVM</span>
            </TabsTrigger>
            <TabsTrigger value="directory" className="text-xs sm:text-sm">
              <UserSearch className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Directory</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs sm:text-sm">
              <FileCheck className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="realtime" className="text-xs sm:text-sm">
              <Activity className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Real-time</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── OVERVIEW TAB ──────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Welcome Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Star className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-1">Welcome back, {displayProfile.contactName}!</h2>
                    <p className="text-muted-foreground text-sm mb-3">
                      Your projects are running smoothly. You have <strong>{pendingApprovals} pending approval{pendingApprovals !== 1 ? "s" : ""}</strong> and <strong>{activeProjects} active project{activeProjects !== 1 ? "s" : ""}</strong>.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {displayProfile.industry && <Badge variant="secondary">{displayProfile.industry}</Badge>}
                      {displayProfile.companySize && <Badge variant="outline">{displayProfile.companySize} employees</Badge>}
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Protected
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Timeline — 2 cols */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      View all <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-96">
                      <div className="space-y-1">
                        {MOCK_ACTIVITY.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                          >
                            <ActivityIcon icon={item.icon} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {fmtRelative(item.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Verification Stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Verification Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                        <p className="text-2xl font-bold text-emerald-600">{displayProfile.verificationCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Verified Sessions</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-blue-500/10">
                        <p className="text-2xl font-bold text-blue-600">{verifiedFreelancers}/{MOCK_PROJECTS.length}</p>
                        <p className="text-xs text-muted-foreground">Verified Freelancers</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-axia-teal-500/10">
                        <p className="text-2xl font-bold text-axia-teal-700">98%</p>
                        <p className="text-xs text-muted-foreground">Dispute Win Rate</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-amber-500/10">
                        <p className="text-2xl font-bold text-amber-600">{avgHealth}%</p>
                        <p className="text-xs text-muted-foreground">Avg. Project Health</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions Panel — 1 col */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={() => handleQuickAction("verification")}
                    >
                      <Shield className="h-4 w-4 text-emerald-500" />
                      Request Verification
                    </Button>
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={() => handleQuickAction("reports")}
                    >
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      View Reports
                    </Button>
                    <Button
                      className="w-full justify-start gap-2 relative"
                      variant={pendingApprovals > 0 ? "default" : "outline"}
                      onClick={() => handleQuickAction("approve")}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Approve Pending Items
                      {pendingApprovals > 0 && (
                        <Badge variant="destructive" className="ml-auto text-[10px] h-5 px-1.5">
                          {pendingApprovals}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={() => handleQuickAction("directory")}
                    >
                      <UserSearch className="h-4 w-4 text-axia-teal-700" />
                      Browse Freelancers
                    </Button>
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={() => setActiveTab("messages")}
                    >
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Messages
                    </Button>
                  </CardContent>
                </Card>

                {/* Project Health Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Project Health</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {MOCK_PROJECTS.map((project) => (
                      <div key={project.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium truncate max-w-[140px]">{project.name}</span>
                          <span className={`text-xs font-bold ${getHealthColor(project.health)}`}>
                            {project.health}%
                          </span>
                        </div>
                        <Progress value={project.health} className="h-1.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Upcoming Deadlines */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Upcoming Deadlines</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {MOCK_PROJECTS.filter((p) => p.status !== "completed").map((project) => (
                      <div key={project.id} className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1">{project.name}</span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {fmtDate(project.deadline)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── PROJECTS TAB ──────────────────────────────────────────── */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Your Projects</h2>
                <p className="text-sm text-muted-foreground">{MOCK_PROJECTS.length} projects · {activeProjects} active</p>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Project
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_PROJECTS.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px]">{getInitials(project.freelancer)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{project.freelancer}</span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          project.status === "active" ? "default" :
                          project.status === "completed" ? "secondary" :
                          "destructive"
                        }
                        className="text-[10px]"
                      >
                        {project.status === "at_risk" ? "At Risk" : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Health Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Project Health</span>
                        <span className={`font-medium ${getHealthColor(project.health)}`}>{project.health}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getHealthBg(project.health)}`}
                          style={{ width: `${project.health}%` }}
                        />
                      </div>
                    </div>

                    {/* Milestones */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Milestones</span>
                      <span className="font-medium">{project.completedMilestones}/{project.milestones} complete</span>
                    </div>

                    {/* Budget */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-medium">{fmtCurrency(project.spent)} / {fmtCurrency(project.budget)}</span>
                    </div>

                    {/* Verification Status */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Verification</span>
                      <Badge
                        variant={
                          project.verificationStatus === "verified" ? "default" :
                          project.verificationStatus === "pending" ? "secondary" :
                          "outline"
                        }
                        className="text-[10px] gap-1"
                      >
                        {project.verificationStatus === "verified" && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {project.verificationStatus === "in_progress" && <Clock className="h-2.5 w-2.5" />}
                        {project.verificationStatus === "pending" && <Clock className="h-2.5 w-2.5" />}
                        {project.verificationStatus === "verified" ? "Verified" : project.verificationStatus === "in_progress" ? "In Progress" : "Pending"}
                      </Badge>
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Deadline</span>
                      <span className="text-muted-foreground">{fmtDate(project.deadline)}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      View Details <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── INVOICES TAB ──────────────────────────────────────────── */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Invoices</h2>
                <p className="text-sm text-muted-foreground">{MOCK_INVOICES.length} invoices · {fmtCurrency(outstandingAmount)} outstanding</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search invoices..." className="pl-9 h-9 w-48" />
                </div>
              </div>
            </div>

            {/* Invoice Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{fmtCurrency(MOCK_INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0))}</p>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{fmtCurrency(MOCK_INVOICES.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0))}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{fmtCurrency(MOCK_INVOICES.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0))}</p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice List */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Invoice</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Freelancer</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Project</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Amount</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Due Date</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_INVOICES.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <span className="text-sm font-medium font-mono">{invoice.number}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[8px]">{getInitials(invoice.freelancer)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{invoice.freelancer}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-muted-foreground max-w-[150px] truncate block">{invoice.project}</span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm font-semibold">{fmtCurrency(invoice.amount)}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-muted-foreground">{fmtDate(invoice.dueDate)}</span>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                invoice.status === "paid" ? "default" :
                                invoice.status === "overdue" ? "destructive" :
                                "secondary"
                              }
                              className="text-[10px]"
                            >
                              {invoice.status === "paid" && <CheckCircle2 className="h-2.5 w-2.5 mr-1" />}
                              {invoice.status === "overdue" && <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                              {invoice.status === "pending" && <Clock className="h-2.5 w-2.5 mr-1" />}
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── APPROVALS TAB ─────────────────────────────────────────── */}
          <TabsContent value="approvals" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pending Approvals</h2>
                <p className="text-sm text-muted-foreground">{pendingApprovals} items awaiting your review</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {MOCK_APPROVALS.filter((a) => a.urgency === "high").length} Urgent
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              {MOCK_APPROVALS.map((approval) => (
                <Card key={approval.id} className={`hover:shadow-md transition-shadow ${approval.urgency === "high" ? "border-red-200" : ""}`}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        approval.type === "scope_change" ? "bg-blue-500/10" :
                        approval.type === "contract_review" ? "bg-axia-teal-500/10" :
                        "bg-emerald-500/10"
                      }`}>
                        {approval.type === "scope_change" && <FileText className="h-5 w-5 text-blue-500" />}
                        {approval.type === "contract_review" && <Shield className="h-5 w-5 text-axia-teal-700" />}
                        {approval.type === "evidence_review" && <Eye className="h-5 w-5 text-emerald-500" />}
                      </div>
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <ApprovalTypeBadge type={approval.type} />
                          <UrgencyBadge urgency={approval.urgency} />
                          <span className="text-[10px] text-muted-foreground">{fmtRelative(approval.requestedAt)}</span>
                        </div>
                        <h3 className="text-sm font-semibold">{approval.title}</h3>
                        <p className="text-xs text-muted-foreground">{approval.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className="text-muted-foreground">
                            <strong>Project:</strong> {approval.project}
                          </span>
                          <span className="text-muted-foreground">
                            <strong>Freelancer:</strong> {approval.freelancer}
                          </span>
                          <span className="font-medium text-foreground">
                            <strong>Impact:</strong> {approval.impact}
                          </span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
                        <Button
                          size="sm"
                          className="flex-1 sm:w-24 gap-1"
                          disabled={approvalLoading === approval.id}
                          onClick={() => handleApprovalAction(approval.id, "approved")}
                        >
                          {approvalLoading === approval.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-3.5 w-3.5" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 sm:w-24 gap-1"
                          disabled={approvalLoading === approval.id}
                          onClick={() => handleApprovalAction(approval.id, "rejected")}
                        >
                          {approvalLoading === approval.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ThumbsDown className="h-3.5 w-3.5" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {MOCK_APPROVALS.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <h3 className="text-sm font-medium mb-1">All caught up!</h3>
                    <p className="text-xs text-muted-foreground max-w-[240px]">
                      No pending approvals. New items will appear here when freelancers submit requests.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ─── MESSAGES TAB ──────────────────────────────────────────── */}
          <TabsContent value="messages" className="space-y-0">
            <Card className="overflow-hidden">
              <div className="flex h-[500px]">
                {/* Conversation List */}
                <div className="w-64 border-r border-border flex-shrink-0 hidden sm:flex flex-col">
                  <div className="p-3 border-b border-border">
                    <h3 className="text-sm font-semibold mb-2">Conversations</h3>
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search..." className="pl-8 h-8 text-xs" />
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {freelancerNames.map((name) => {
                        const msgs = messageThreads[name];
                        const lastMsg = msgs[msgs.length - 1];
                        const unread = !lastMsg?.isClient;
                        return (
                          <button
                            key={name}
                            onClick={() => setSelectedFreelancer(name)}
                            className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors ${
                              selectedFreelancer === name ? "bg-primary/10" : "hover:bg-muted/50"
                            }`}
                          >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs ${unread ? "font-semibold" : "font-medium"}`}>{name}</span>
                                {lastMsg && (
                                  <span className="text-[10px] text-muted-foreground">{fmtRelative(lastMsg.timestamp)}</span>
                                )}
                              </div>
                              {lastMsg && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {lastMsg.isClient ? "You: " : ""}{lastMsg.content}
                                </p>
                              )}
                            </div>
                            {unread && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col min-w-0">
                  {selectedFreelancer ? (
                    <>
                      {/* Chat Header */}
                      <div className="flex items-center gap-3 p-3 border-b border-border">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(selectedFreelancer)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{selectedFreelancer}</p>
                          <p className="text-[10px] text-muted-foreground">Freelancer</p>
                        </div>
                      </div>

                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                          {currentThread.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.isClient ? "justify-end" : "justify-start"}`}
                            >
                              <div className={`flex items-end gap-2 max-w-[80%] ${msg.isClient ? "flex-row-reverse" : ""}`}>
                                {!msg.isClient && (
                                  <Avatar className="h-6 w-6 flex-shrink-0">
                                    <AvatarFallback className="text-[8px]">{getInitials(msg.from)}</AvatarFallback>
                                  </Avatar>
                                )}
                                <div
                                  className={`rounded-2xl px-3 py-2 text-sm ${
                                    msg.isClient
                                      ? "bg-primary text-primary-foreground rounded-br-sm"
                                      : "bg-muted rounded-bl-sm"
                                  }`}
                                >
                                  <p>{msg.content}</p>
                                  <p className={`text-[10px] mt-1 ${msg.isClient ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                    {fmtRelative(msg.timestamp)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Message Input */}
                      <div className="p-3 border-t border-border">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type a message..."
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            className="flex-1 h-9"
                          />
                          <Button size="sm" onClick={handleSendMessage} disabled={!messageInput.trim()}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-6">
                      <div>
                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                          <MessageSquare className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">Select a conversation</h3>
                        <p className="text-xs text-muted-foreground max-w-[240px]">
                          Choose a freelancer from the list to start messaging.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ─── WCVM Dashboard TAB (existing) ──────────────────────────── */}
          <TabsContent value="wcvm">
            <WCVMVerificationDashboard clientId={displayProfile._id} />
          </TabsContent>

          {/* ─── Freelancer Directory TAB (existing) ───────────────────── */}
          <TabsContent value="directory">
            <FreelancerDirectoryView />
          </TabsContent>

          {/* ─── Verification Requests TAB (existing) ──────────────────── */}
          <TabsContent value="requests">
            <VerificationRequestSystem clientId={displayProfile._id} />
          </TabsContent>

          {/* ─── Real-time Validation TAB (existing) ───────────────────── */}
          <TabsContent value="realtime">
            <RealTimeWorkValidation />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
