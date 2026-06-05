import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClientPolicyProfile } from "@/components/client-protection/ClientPolicyProfile";
import { Card } from "@/components/ui/card";
import { Users, Plus } from "lucide-react";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";

export default function Clients() {
  const { tier: subscriptionTier } = useSubscriptionTier();

  const [showAddClient, setShowAddClient] = useState(false);
  const [clientName, setClientName] = useState("");
  const [platform, setPlatform] = useState<"upwork" | "fiverr" | "toptal" | "freelancer" | "direct">("upwork");
  const [hourlyRate, setHourlyRate] = useState("");
  const [contractType, setContractType] = useState<"hourly" | "fixed">("hourly");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [selectedClientId, setSelectedClientId] = useState<string | null>("client_1");

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

        {/* Client Policy Profile - KEEP */}
        <div className="space-y-6">
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
        </div>
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
