import { useState } from "react";
import { toast } from "sonner";
import { ClientList } from "@/components/client-protection/ClientList";
import { ClientPolicyProfile } from "@/components/client-protection/ClientPolicyProfile";
import { Card } from "@/components/ui/card";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";

export default function Clients() {
  const { tier: subscriptionTier } = useSubscriptionTier();

  const [showAddClient, setShowAddClient] = useState(false);
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

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="flex-1 transition-all duration-300 p-8 space-y-6">
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
      </div>
    </div>
  );
}
