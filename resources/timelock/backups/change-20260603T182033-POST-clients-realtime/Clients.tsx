import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Edit3,
  Shield,
  Loader2,
  Database,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  X,
} from "lucide-react";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { ClientDisputeSimulation } from "@/components/client-protection/ClientDisputeSimulation";
import { ClientPaymentPattern } from "@/components/client-protection/ClientPaymentPattern";
import { ClientPolicyProfile } from "@/components/client-protection/ClientPolicyProfile";
import { ClientGapPrediction } from "@/components/client-protection/ClientGapPrediction";

// ─── Types ──────────────────────────────────────────────────────────────────

type Platform = "upwork" | "fiverr" | "toptal" | "freelancer" | "direct";
type ContractType = "hourly" | "fixed";
type RiskLevel = "low" | "medium" | "high";

interface ClientDoc {
  _id: string;
  clientName: string;
  platform: Platform;
  hourlyRate: number;
  contractType: ContractType;
  riskLevel: RiskLevel;
  addedAt: number;
  lastActivityAt: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string }> = {
  upwork: { label: "Upwork", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25" },
  fiverr: { label: "Fiverr", color: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/25" },
  toptal: { label: "Toptal", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25" },
  freelancer: { label: "Freelancer", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25" },
  direct: { label: "Direct", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/25" },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: "Low Risk", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25" },
  medium: { label: "Medium Risk", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25" },
  high: { label: "High Risk", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25" },
};

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function Clients() {
  const { tier: subscriptionTier } = useSubscriptionTier();

  // Convex queries
  const clients = useQuery(api.clients.crud.getClients, {}) as ClientDoc[] | undefined;
  const stats = useQuery(api.clients.crud.getClientStats, {}) as any;
  const policies = useQuery(api.policies.clientPolicies.getUserPolicies, {}) as any[] | undefined;

  // Convex mutations
  const createClient = useMutation(api.clients.crud.createClient);
  const updateClient = useMutation(api.clients.crud.updateClient);
  const deleteClient = useMutation(api.clients.crud.deleteClient);
  const seedMockClients = useMutation(api.seedNew.seedMockClients);
  const createClientPolicy = useMutation(api.policies.clientPolicies.createClientPolicy);
  const deleteClientPolicy = useMutation(api.policies.clientPolicies.deleteClientPolicy);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientDoc | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientDoc | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPlatform, setFormPlatform] = useState<Platform>("upwork");
  const [formHourlyRate, setFormHourlyRate] = useState("");
  const [formContractType, setFormContractType] = useState<ContractType>("hourly");
  const [formRiskLevel, setFormRiskLevel] = useState<RiskLevel>("low");

  // Policy form
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [policyClientName, setPolicyClientName] = useState("");
  const [policyPlatform, setPolicyPlatform] = useState<Platform>("upwork");

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.clientName.toLowerCase().includes(q) ||
        c.platform.toLowerCase().includes(q) ||
        c.contractType.toLowerCase().includes(q) ||
        c.riskLevel.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  // Selected client
  const selectedClient = useMemo(
    () => clients?.find((c) => c._id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  // Client policies for selected client
  const selectedClientPolicies = useMemo(
    () => policies?.filter((p) => p.clientName === selectedClient?.clientName) ?? [],
    [policies, selectedClient]
  );

  // Payment pattern for selected client
  const paymentPattern: any = selectedClient
    ? {
        hasPattern: true,
        disputeRate: selectedClient.riskLevel === "low" ? 5 : selectedClient.riskLevel === "medium" ? 15 : 30,
        disputeCycle: "End of month payment disputes",
        highRiskPeriod: selectedClient.riskLevel === "high" ? "Last week of each month" : "N/A",
        paymentTriggers: [
          "Client reviews invoices on the 25th of each month",
          "Disputes typically filed 2-3 days after invoice review",
          "Higher dispute rate when project milestones are unclear",
        ],
        protectionPlan: [
          { action: "Send detailed work summary 3 days before month-end", impact: "Reduces disputes by 40%" },
          { action: "Schedule brief check-in call on the 23rd", impact: "Improves communication clarity" },
          { action: "Ensure all evidence is uploaded by the 20th", impact: "Provides dispute protection buffer" },
        ],
      }
    : undefined;

  // ─── Handlers ────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormName("");
    setFormPlatform("upwork");
    setFormHourlyRate("");
    setFormContractType("hourly");
    setFormRiskLevel("low");
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (!formHourlyRate || Number(formHourlyRate) <= 0) {
      toast.error("Please enter a valid hourly rate");
      return;
    }
    setIsCreating(true);
    try {
      await createClient({
        clientName: formName.trim(),
        platform: formPlatform,
        hourlyRate: Number(formHourlyRate),
        contractType: formContractType,
        riskLevel: formRiskLevel,
      });
      toast.success("Client created successfully!");
      setShowCreateDialog(false);
      resetForm();
    } catch (err: any) {
      toast.error("Failed to create client", { description: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (client: ClientDoc) => {
    setEditingClient(client);
    setFormName(client.clientName);
    setFormPlatform(client.platform);
    setFormHourlyRate(String(client.hourlyRate));
    setFormContractType(client.contractType);
    setFormRiskLevel(client.riskLevel);
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editingClient) return;
    if (!formName.trim()) {
      toast.error("Client name is required");
      return;
    }
    setIsUpdating(true);
    try {
      await updateClient({
        clientId: editingClient._id as any,
        clientName: formName.trim(),
        platform: formPlatform,
        hourlyRate: Number(formHourlyRate),
        contractType: formContractType,
        riskLevel: formRiskLevel,
      });
      toast.success("Client updated successfully!");
      setShowEditDialog(false);
      setEditingClient(null);
      resetForm();
    } catch (err: any) {
      toast.error("Failed to update client", { description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = (client: ClientDoc) => {
    setDeletingClient(client);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);
    try {
      await deleteClient({ clientId: deletingClient._id as any });
      toast.success("Client deleted successfully!");
      if (selectedClientId === deletingClient._id) {
        setSelectedClientId(null);
      }
      setShowDeleteDialog(false);
      setDeletingClient(null);
    } catch (err: any) {
      toast.error("Failed to delete client", { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const result = await seedMockClients({});
      if (result.seeded) {
        toast.success(`Seeded ${result.count} demo clients!`);
      } else {
        toast.info(`You already have ${result.count} clients`);
      }
    } catch (err: any) {
      toast.error("Failed to seed data", { description: err.message });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreatePolicy = async () => {
    if (!policyClientName.trim()) {
      toast.error("Client name is required for the policy");
      return;
    }
    try {
      await createClientPolicy({
        clientName: policyClientName.trim(),
        platform: policyPlatform === "direct" ? "custom" : policyPlatform,
        requirements: [
          {
            type: "activity",
            description: "Activity tracking required",
            requirement: "Minimum 8 hours/week",
            evidenceType: "screenshot",
          },
        ],
      });
      toast.success("Policy created!");
      setShowPolicyDialog(false);
      setPolicyClientName("");
    } catch (err: any) {
      toast.error("Failed to create policy", { description: err.message });
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    try {
      await deleteClientPolicy({ policyId: policyId as any });
      toast.success("Policy deleted");
    } catch (err: any) {
      toast.error("Failed to delete policy", { description: err.message });
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (clients === undefined) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5CF6] mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading clients...</p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="w-full min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold text-foreground tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Clients
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your client relationships and protection settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[#8B5CF6] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10"
              onClick={handleSeedData}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              Seed Demo Data
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Client
            </Button>
          </div>
        </div>

        {/* ─── Search ──────────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, platform, or risk level..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* ─── Stats Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-[#8B5CF6]/20 bg-[#8B5CF6]/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-[#8B5CF6]" />
                <span className="text-xs text-muted-foreground font-medium">Total Clients</span>
              </div>
              <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {stats?.totalClients ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground font-medium">Avg Rate</span>
              </div>
              <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ${stats?.totalClients ? Math.round(stats.totalValue / stats.totalClients) : 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground font-medium">Low Risk</span>
              </div>
              <div className="text-2xl font-bold text-emerald-600" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {stats?.lowRisk ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground font-medium">High Risk</span>
              </div>
              <div className="text-2xl font-bold text-red-600" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {stats?.highRisk ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Client List ─────────────────────────────────────────────────── */}
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-40 text-muted-foreground" />
              <p className="text-foreground font-medium mb-1">
                {searchQuery ? "No clients match your search" : "No clients yet"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Try a different search term"
                  : "Add your first client or seed demo data to get started"}
              </p>
              {!searchQuery && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleSeedData}
                    disabled={isSeeding}
                  >
                    <Database className="h-3.5 w-3.5" />
                    Seed Demo Data
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                    onClick={() => {
                      resetForm();
                      setShowCreateDialog(true);
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Client
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {filteredClients.map((client) => {
                const platformCfg = PLATFORM_CONFIG[client.platform];
                const riskCfg = RISK_CONFIG[client.riskLevel];
                const isSelected = selectedClientId === client._id;

                return (
                  <motion.div
                    key={client._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    layout
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? "ring-2 ring-[#8B5CF6] border-[#8B5CF6]/30"
                          : "hover:border-[#8B5CF6]/20"
                      }`}
                      onClick={() =>
                        setSelectedClientId(isSelected ? null : client._id)
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0">
                              <Users className="h-5 w-5 text-[#8B5CF6]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground truncate">
                                {client.clientName}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] h-5 px-1.5 ${platformCfg.color}`}
                                >
                                  {platformCfg.label}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  {client.contractType === "hourly"
                                    ? `$${client.hourlyRate}/hr`
                                    : `Fixed · $${client.hourlyRate}/hr`}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  · {client.contractType}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(client.lastActivityAt)}
                            </div>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] h-5 px-1.5 ${riskCfg.color}`}
                            >
                              {riskCfg.label}
                            </Badge>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(client);
                                }}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(client);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded section for selected client */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-border space-y-4">
                                {/* Client details grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div>
                                    <div className="text-[11px] text-muted-foreground">Platform</div>
                                    <div className="text-sm font-medium text-foreground capitalize">{client.platform}</div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-muted-foreground">Hourly Rate</div>
                                    <div className="text-sm font-medium text-foreground">${client.hourlyRate}/hr</div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-muted-foreground">Contract Type</div>
                                    <div className="text-sm font-medium text-foreground capitalize">{client.contractType}</div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-muted-foreground">Added</div>
                                    <div className="text-sm font-medium text-foreground">
                                      {new Date(client.addedAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-[12px]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(client);
                                    }}
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-[12px] text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(client);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-[12px] text-[#8B5CF6] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPolicyClientName(client.clientName);
                                      setPolicyPlatform(client.platform);
                                      setShowPolicyDialog(true);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Policy
                                  </Button>
                                </div>

                                {/* Client Policies */}
                                {selectedClientPolicies.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      Policies ({selectedClientPolicies.length})
                                    </h4>
                                    {selectedClientPolicies.map((policy: any) => (
                                      <div
                                        key={policy._id}
                                        className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg text-sm"
                                      >
                                        <div>
                                          <span className="font-medium text-foreground">{policy.clientName}</span>
                                          <span className="text-muted-foreground ml-2 text-xs">
                                            {policy.platform} · {policy.requirements?.length ?? 0} requirements
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePolicy(policy._id);
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Client Protection Sub-components */}
                                <ClientDisputeSimulation
                                  clientData={{
                                    ...client,
                                    evidenceCount: client.riskLevel === "low" ? 5 : client.riskLevel === "medium" ? 4 : 3,
                                    evidenceCompleteness: client.riskLevel === "low" ? 0.9 : client.riskLevel === "medium" ? 0.7 : 0.5,
                                    evidenceWithClientKeywords: client.riskLevel === "low" ? 4 : client.riskLevel === "medium" ? 3 : 2,
                                    clientKeywords: ["design", "mobile", "responsive"],
                                    workSpecificity: client.riskLevel === "low" ? 0.9 : client.riskLevel === "medium" ? 0.75 : 0.6,
                                    hasClientSpecificRequirements: client.riskLevel === "low",
                                    activityDensity: client.riskLevel === "low" ? 2.1 : client.riskLevel === "medium" ? 1.4 : 0.9,
                                    memoQuality: client.riskLevel === "low" ? 0.9 : client.riskLevel === "medium" ? 0.75 : 0.6,
                                    clientDiversity: 75,
                                    platformCoverage: 80,
                                    historicalSuccess: 85,
                                    avgProjectValue: 1200,
                                    weeklyIncome: 250,
                                    upworkCompliance: 95,
                                    fiverrCompliance: 90,
                                    toptalCompliance: 85,
                                    platformRecommendations: 3,
                                    businessPattern: 85,
                                    paymentPatternRisk: 15,
                                    disputeTrend: "Low",
                                  }}
                                  tier={subscriptionTier}
                                />

                                <ClientPolicyProfile
                                  selectedClient={client}
                                  tier={subscriptionTier}
                                />

                                <ClientGapPrediction
                                  selectedClient={client}
                                  tier={subscriptionTier}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ─── Client Payment Pattern (always visible when client selected) ── */}
        <ClientPaymentPattern
          paymentPattern={paymentPattern}
          tier={subscriptionTier}
        />

        {/* ─── Create Client Dialog ────────────────────────────────────────── */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Add New Client
              </DialogTitle>
              <DialogDescription>
                Add a client to track protection and risk levels.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Client Name *</Label>
                <Input
                  placeholder="e.g., Acme Corp"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Platform *</Label>
                  <Select value={formPlatform} onValueChange={(v) => setFormPlatform(v as Platform)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upwork">Upwork</SelectItem>
                      <SelectItem value="fiverr">Fiverr</SelectItem>
                      <SelectItem value="toptal">Toptal</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Contract Type *</Label>
                  <Select value={formContractType} onValueChange={(v) => setFormContractType(v as ContractType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Hourly Rate ($) *</Label>
                  <Input
                    type="number"
                    placeholder="85"
                    value={formHourlyRate}
                    onChange={(e) => setFormHourlyRate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Risk Level *</Label>
                  <Select value={formRiskLevel} onValueChange={(v) => setFormRiskLevel(v as RiskLevel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                onClick={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-1" />
                )}
                Create Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Edit Client Dialog ──────────────────────────────────────────── */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Edit Client
              </DialogTitle>
              <DialogDescription>
                Update client details and risk assessment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Client Name *</Label>
                <Input
                  placeholder="e.g., Acme Corp"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Platform *</Label>
                  <Select value={formPlatform} onValueChange={(v) => setFormPlatform(v as Platform)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upwork">Upwork</SelectItem>
                      <SelectItem value="fiverr">Fiverr</SelectItem>
                      <SelectItem value="toptal">Toptal</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Contract Type *</Label>
                  <Select value={formContractType} onValueChange={(v) => setFormContractType(v as ContractType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Hourly Rate ($) *</Label>
                  <Input
                    type="number"
                    placeholder="85"
                    value={formHourlyRate}
                    onChange={(e) => setFormHourlyRate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Risk Level *</Label>
                  <Select value={formRiskLevel} onValueChange={(v) => setFormRiskLevel(v as RiskLevel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                onClick={handleUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Edit3 className="h-4 w-4 mr-1" />
                )}
                Update Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Client</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">{deletingClient?.clientName}</span>?
                This will also remove all associated policies. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Create Policy Dialog ────────────────────────────────────────── */}
        <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Client Policy</DialogTitle>
              <DialogDescription>
                Add a protection policy for this client.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Client Name</Label>
                <Input value={policyClientName} onChange={(e) => setPolicyClientName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Platform</Label>
                <Select value={policyPlatform} onValueChange={(v) => setPolicyPlatform(v as Platform)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upwork">Upwork</SelectItem>
                    <SelectItem value="fiverr">Fiverr</SelectItem>
                    <SelectItem value="toptal">Toptal</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPolicyDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                onClick={handleCreatePolicy}
              >
                Create Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}
