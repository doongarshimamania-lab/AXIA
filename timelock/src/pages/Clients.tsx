import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClientPolicyProfile } from "@/components/client-protection/ClientPolicyProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, Search, Shield, Clock, DollarSign, TrendingUp, ChevronRight } from "lucide-react";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const platformMeta: Record<string, { label: string; color: string; bg: string }> = {
  upwork: { label: "Upwork", color: "text-emerald-600", bg: "bg-emerald-500" },
  fiverr: { label: "Fiverr", color: "text-green-600", bg: "bg-green-500" },
  toptal: { label: "Toptal", color: "text-red-600", bg: "bg-red-500" },
  freelancer: { label: "Freelancer.com", color: "text-blue-600", bg: "bg-blue-500" },
  direct: { label: "Direct Client", color: "text-violet-600", bg: "bg-violet-500" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Clients() {
  const { tier: subscriptionTier } = useSubscriptionTier();

  const [showAddClient, setShowAddClient] = useState(false);
  const [clientName, setClientName] = useState("");
  const [platform, setPlatform] = useState<"upwork" | "fiverr" | "toptal" | "freelancer" | "direct">("upwork");
  const [hourlyRate, setHourlyRate] = useState("");
  const [contractType, setContractType] = useState<"hourly" | "fixed">("hourly");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const clients = [
    {
      _id: "client_1" as any,
      clientName: "TechCorp Solutions",
      platform: "upwork" as const,
      hourlyRate: 85,
      contractType: "hourly" as const,
      riskLevel: "low" as const,
      protectionScore: 94,
      totalHours: 127.5,
      totalValue: 10837.50,
      activeSession: false,
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
      totalValue: 5785.00,
      activeSession: true,
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
      totalValue: 18720.00,
      activeSession: false,
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
      totalValue: 3015.00,
      activeSession: false,
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
      totalValue: 9832.50,
      activeSession: false,
    },
  ];

  const filteredClients = clients.filter((c) =>
    c.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddClient = async () => {
    if (!clientName || !hourlyRate) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Client added successfully! (Demo mode)");
    setShowAddClient(false);
    setClientName("");
    setHourlyRate("");
  };

  const selectedClient = clients.find((c) => c._id === selectedClientId);

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="flex-1 transition-all duration-300 p-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Clients
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Manage your clients and their policy profiles.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddClient(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>

        {/* Tabs: Clients List & Policy Profile */}
        <Tabs defaultValue="clients-list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="clients-list">All Clients</TabsTrigger>
            <TabsTrigger value="policy-profile">Client Policy Profile</TabsTrigger>
          </TabsList>

          {/* ── All Clients Tab ── */}
          <TabsContent value="clients-list" className="space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Total Clients</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{clients.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-muted-foreground">Avg Protection</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(clients.reduce((a, c) => a + c.protectionScore, 0) / clients.length)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Total Hours</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {clients.reduce((a, c) => a + c.totalHours, 0).toFixed(1)}h
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-muted-foreground">Total Value</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(clients.reduce((a, c) => a + c.totalValue, 0))}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Clients Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Client Directory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Client</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Platform</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Contract</th>
                        <th className="text-right py-3 px-3 font-medium text-muted-foreground">Rate</th>
                        <th className="text-right py-3 px-3 font-medium text-muted-foreground">Hours</th>
                        <th className="text-right py-3 px-3 font-medium text-muted-foreground">Value</th>
                        <th className="text-center py-3 px-3 font-medium text-muted-foreground">Protection</th>
                        <th className="text-center py-3 px-3 font-medium text-muted-foreground">Risk</th>
                        <th className="text-center py-3 px-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-right py-3 px-3 font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client) => {
                        const meta = platformMeta[client.platform];
                        const riskColors: Record<string, string> = {
                          low: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
                          medium: "text-amber-600 bg-amber-500/10 border-amber-500/30",
                          high: "text-red-600 bg-red-500/10 border-red-500/30",
                        };
                        const protectionColor =
                          client.protectionScore >= 85
                            ? "text-emerald-600"
                            : client.protectionScore >= 70
                            ? "text-amber-600"
                            : "text-red-600";

                        return (
                          <tr
                            key={client._id}
                            className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedClientId(client._id === selectedClientId ? null : client._id);
                            }}
                          >
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                  {client.clientName.charAt(0)}
                                </div>
                                <span className="font-medium text-foreground">{client.clientName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${meta.bg}`} />
                                <span className="text-muted-foreground">{meta.label}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant="outline" className="text-xs capitalize">
                                {client.contractType}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-foreground">
                              ${client.hourlyRate}/hr
                            </td>
                            <td className="py-3 px-3 text-right text-muted-foreground">
                              {client.totalHours}h
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-foreground">
                              {formatCurrency(client.totalValue)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`font-semibold ${protectionColor}`}>
                                {client.protectionScore}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize ${riskColors[client.riskLevel]}`}
                              >
                                {client.riskLevel}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {client.activeSession ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                                  <span className="text-xs text-emerald-600">Active</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Inactive</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredClients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No clients match your search</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Client Policy Profile Tab ── */}
          <TabsContent value="policy-profile" className="space-y-6">
            {/* Client Selector */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Select Client</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {clients.map((client) => (
                  <button
                    key={client._id}
                    onClick={() => setSelectedClientId(client._id === selectedClientId ? null : client._id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedClientId === client._id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {client.clientName}
                  </button>
                ))}
              </div>
            </Card>

            <h2 className="text-2xl font-black text-foreground">Client Policy Profile</h2>
            {selectedClientId ? (
              clients.filter(c => c._id === selectedClientId).map((client) => (
                <ClientPolicyProfile
                  key={client._id}
                  selectedClient={client}
                  tier={subscriptionTier}
                />
              ))
            ) : (
              <Card className="p-6 bg-card rounded-xl border border-border">
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Select a client to view policy profile
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client Name</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <Label>Platform</Label>
              <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upwork">Upwork</SelectItem>
                  <SelectItem value="fiverr">Fiverr</SelectItem>
                  <SelectItem value="toptal">Toptal</SelectItem>
                  <SelectItem value="freelancer">Freelancer.com</SelectItem>
                  <SelectItem value="direct">Direct Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hourly Rate ($)</Label>
              <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="85" />
            </div>
            <div>
              <Label>Contract Type</Label>
              <Select value={contractType} onValueChange={(v: any) => setContractType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risk Level</Label>
              <Select value={riskLevel} onValueChange={(v: any) => setRiskLevel(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddClient(false)}>Cancel</Button>
            <Button onClick={handleAddClient}>Add Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}