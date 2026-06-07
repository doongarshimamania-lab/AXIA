import { useState, useEffect } from "react";
import { ClientList } from "@/components/client-protection/ClientList";
import { ClientPolicyProfile } from "@/components/client-protection/ClientPolicyProfile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Info, Trash2, Loader2, Shield, Plus } from "lucide-react";

// ─── Mock data for demo mode (unauthenticated) ──────────────────────────
const MOCK_CLIENTS = [
  {
    _id: "client_1" as any,
    clientName: "TechCorp Solutions",
    platform: "upwork" as const,
    hourlyRate: 85,
    contractType: "hourly" as const,
    riskLevel: "low" as const,
    protectionScore: 94,
    totalHours: 127.5,
    totalValue: 10837.5,
    activeSession: false,
    addedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    _id: "client_2" as any,
    clientName: "StartupHub Inc",
    platform: "fiverr" as const,
    hourlyRate: 65,
    contractType: "fixed" as const,
    riskLevel: "medium" as const,
    protectionScore: 78,
    totalHours: 89.0,
    totalValue: 5785.0,
    activeSession: true,
    addedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 15 * 60 * 1000,
  },
  {
    _id: "client_3" as any,
    clientName: "Global Enterprises",
    platform: "toptal" as const,
    hourlyRate: 120,
    contractType: "hourly" as const,
    riskLevel: "high" as const,
    protectionScore: 65,
    totalHours: 156.0,
    totalValue: 18720.0,
    activeSession: false,
    addedAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 24 * 60 * 60 * 1000,
  },
  {
    _id: "client_4" as any,
    clientName: "Digital Marketing Co",
    platform: "freelancer" as const,
    hourlyRate: 45,
    contractType: "hourly" as const,
    riskLevel: "low" as const,
    protectionScore: 88,
    totalHours: 67.0,
    totalValue: 3015.0,
    activeSession: false,
    addedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 48 * 60 * 60 * 1000,
  },
  {
    _id: "client_5" as any,
    clientName: "Creative Studios",
    platform: "direct" as const,
    hourlyRate: 95,
    contractType: "fixed" as const,
    riskLevel: "medium" as const,
    protectionScore: 72,
    totalHours: 103.5,
    totalValue: 9832.5,
    activeSession: false,
    addedAt: Date.now() - 150 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 72 * 60 * 60 * 1000,
  },
];

export default function Clients() {
  const { tier: subscriptionTier } = useSubscriptionTier();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ─── Convex queries ────────────────────────────────────────────────────
  const clientsData = useQuery(api.clients.crud.getClients, {});

  // ─── Convex mutations ──────────────────────────────────────────────────
  const createClientMutation = useMutation(api.clients.crud.createClient);
  const deleteClientMutation = useMutation(api.clients.crud.deleteClient);

  // ─── Local state ───────────────────────────────────────────────────────
  const [showAddClient, setShowAddClient] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [platform, setPlatform] = useState<"upwork" | "fiverr" | "toptal" | "freelancer" | "direct">("upwork");
  const [hourlyRate, setHourlyRate] = useState("");
  const [contractType, setContractType] = useState<"hourly" | "fixed">("hourly");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Loading timeout pattern ───────────────────────────────────────────
  const [queryTimeout, setQueryTimeout] = useState(false);

  useEffect(() => {
    if (clientsData === undefined) {
      const timer = setTimeout(() => setQueryTimeout(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setQueryTimeout(false);
    }
  }, [clientsData]);

  const isLoading = !authLoading && clientsData === undefined && !queryTimeout;

  // ─── Determine demo mode ───────────────────────────────────────────────
  const isDemoMode = !authLoading && !isAuthenticated;

  // ─── Map Convex data to ClientList shape ───────────────────────────────
  const realClients = (clientsData ?? []).map((c: any) => ({
    _id: c._id,
    clientName: c.clientName,
    platform: c.platform,
    hourlyRate: c.hourlyRate,
    contractType: c.contractType,
    riskLevel: c.riskLevel ?? "medium",
    protectionScore: c.protectionScore ?? 0,
    totalHours: c.totalHours ?? 0,
    totalValue: c.totalProjectValue ?? c.totalValue ?? 0,
    activeSession: c.activeSession ?? false,
    addedAt: c.addedAt,
    lastActivityAt: c.lastActivityAt,
  }));

  // Use mock data in demo mode, real data otherwise
  const clients = isDemoMode ? MOCK_CLIENTS : realClients;

  // ─── Auto-select first client ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0]._id);
    }
  }, [clients, selectedClientId]);

  // ─── Get selected client object ────────────────────────────────────────
  const selectedClient = clients.find((c: any) => c._id === selectedClientId) ?? null;

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleAddClient = async () => {
    if (!clientName || !hourlyRate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isDemoMode) {
      toast.success("Client added successfully! (Demo mode)");
      setShowAddClient(false);
      resetForm();
      return;
    }

    setIsCreating(true);
    try {
      await createClientMutation({
        clientName,
        platform,
        hourlyRate: Number(hourlyRate),
        contractType,
        riskLevel,
      });
      toast.success("Client added successfully!");
      setShowAddClient(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add client");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClientId) return;

    if (isDemoMode) {
      toast.success("Client deleted! (Demo mode)");
      setSelectedClientId(null);
      setShowDeleteConfirm(false);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteClientMutation({ clientId: selectedClientId as any });
      toast.success("Client deleted successfully");
      setSelectedClientId(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete client");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const resetForm = () => {
    setClientName("");
    setHourlyRate("");
    setPlatform("upwork");
    setContractType("hourly");
    setRiskLevel("low");
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-background">
      <div className="flex-1 transition-all duration-300 p-8 space-y-6">
        <div>
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Clients
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Manage client policy profiles and protection settings.
          </p>
        </div>

        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Demo Mode</span> — You're viewing sample data.{" "}
              <a href="/auth" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
                Sign in
              </a>{" "}
              to manage your real clients.
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[280px] w-full rounded-xl" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Client List */}
            <ClientList
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onAddClient={() => setShowAddClient(true)}
              subscriptionTier={subscriptionTier}
              onUpgrade={() => toast.info("Upgrade feature coming soon")}
            />

            {/* Empty state with CTA */}
            {!isDemoMode && clients.length === 0 && (
              <Card className="p-8 bg-card rounded-xl border border-border">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">No clients yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your first client to start tracking protection and policy profiles.
                    </p>
                  </div>
                  <Button onClick={() => setShowAddClient(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Client
                  </Button>
                </div>
              </Card>
            )}

            {/* Client Policy Profile */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-foreground">Client Policy Profile</h2>
                {selectedClientId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Client
                  </Button>
                )}
              </div>
              {selectedClient ? (
                <ClientPolicyProfile
                  selectedClient={selectedClient}
                  tier={subscriptionTier}
                />
              ) : (
                <Card className="p-6 bg-card rounded-xl border border-border">
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Select a client to view policy profile
                  </div>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Add Client Dialog */}
        <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name *</Label>
                <Input
                  id="client-name"
                  placeholder="Enter client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upwork">Upwork</SelectItem>
                    <SelectItem value="fiverr">Fiverr</SelectItem>
                    <SelectItem value="toptal">Toptal</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="direct">Direct Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly-rate">Hourly Rate ($) *</Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  placeholder="85"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contract Type</Label>
                <Select value={contractType} onValueChange={(v: any) => setContractType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={riskLevel} onValueChange={(v: any) => setRiskLevel(v)}>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddClient(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleAddClient} disabled={!clientName || !hourlyRate || isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Client"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Client</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  {selectedClient?.clientName ?? "this client"}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteClient}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
