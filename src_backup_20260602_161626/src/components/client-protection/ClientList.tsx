import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus } from "lucide-react";

interface Client {
  _id: string;
  clientName: string;
  platform: string;
  hourlyRate: number;
  contractType: string;
  riskLevel: string;
  protectionScore: number;
  totalHours: number;
  totalValue: number;
  activeSession: boolean;
}

interface ClientListProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelectClient: (id: string | null) => void;
  onAddClient: () => void;
  subscriptionTier?: "free" | "starter" | "pro" | "expert" | "client";
  onUpgrade?: () => void;
}

export function ClientList({
  clients,
  selectedClientId,
  onSelectClient,
  onAddClient,
  subscriptionTier = "free",
  onUpgrade,
}: ClientListProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-emerald-500 bg-emerald-500/10";
      case "medium": return "text-yellow-500 bg-yellow-500/10";
      case "high": return "text-red-500 bg-red-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const getRiskDot = (risk: string) => {
    switch (risk) {
      case "low": return "bg-emerald-500";
      case "medium": return "bg-yellow-500";
      case "high": return "bg-red-500";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Client Protection Hub
          </CardTitle>
          <Button size="sm" onClick={onAddClient}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!clients || clients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No clients yet. Add your first client to start tracking protection.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div
                key={client._id}
                className={`p-4 border border-border rounded-lg hover:bg-muted/50 transition cursor-pointer ${
                  selectedClientId === client._id ? 'ring-2 ring-primary bg-muted/30' : ''
                }`}
                onClick={() => onSelectClient(client._id === selectedClientId ? null : client._id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${getRiskDot(client.riskLevel)}`} />
                    <div>
                      <div className="font-medium text-foreground">{client.clientName}</div>
                      <div className="text-sm text-muted-foreground">
                        {client.platform} &middot; ${client.hourlyRate}/hr &middot; {client.contractType}
                      </div>
                    </div>
                  </div>
                  <Badge className={getRiskColor(client.riskLevel)}>
                    {client.riskLevel} risk
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Protection Score</div>
                    <div className="text-lg font-bold text-foreground">{client.protectionScore}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Hours</div>
                    <div className="text-lg font-bold text-foreground">{client.totalHours}h</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Value</div>
                    <div className="text-lg font-bold text-emerald-500">${client.totalValue.toLocaleString()}</div>
                  </div>
                </div>
                {client.activeSession && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-500">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    Active session
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
