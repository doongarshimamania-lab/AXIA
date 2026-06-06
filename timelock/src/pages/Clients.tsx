import { useState } from "react";
import { ClientList } from "@/components/client-protection/ClientList";
import { ClientPolicyProfile } from "@/components/client-protection/ClientPolicyProfile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
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
      totalValue: 5785.00,
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
      totalValue: 18720.00,
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
      totalValue: 3015.00,
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
      totalValue: 9832.50,
      activeSession: false,
      addedAt: Date.now() - 150 * 24 * 60 * 60 * 1000,
      lastActivityAt: Date.now() - 72 * 60 * 60 * 1000,
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
        <div>
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Clients
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Manage client policy profiles and protection settings.
          </p>
        </div>

        {/* Client List */}
        <ClientList 
          clients={clients}
          selectedClientId={selectedClientId}
          onSelectClient={setSelectedClientId}
          onAddClient={() => setShowAddClient(true)}
          subscriptionTier={subscriptionTier}
          onUpgrade={() => toast.info("Upgrade feature coming soon")}
        />

        {/* Client Policy Profile */}
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
              <Button variant="outline" onClick={() => setShowAddClient(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddClient} disabled={!clientName || !hourlyRate}>
                Add Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
