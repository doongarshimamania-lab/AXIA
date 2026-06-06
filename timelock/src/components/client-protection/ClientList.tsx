import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Lock } from "lucide-react";

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
  onUpgrade
}: ClientListProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-emerald-500 bg-emerald-500/10";
      case "medium": return "text-yellow-500 bg-yellow-500/10";
      case "high": return "text-red-500 bg-red-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  // PRO+ feature: Client Payment Pattern Analysis
  const getTierLevel = (tier: string) => {
    const levels: Record<string, number> = { free: 0, starter: 1, pro: 2, expert: 3, client: 0 };
    return levels[tier] || 0;
  };
  const hasPaymentPatternAccess = getTierLevel(subscriptionTier) >= getTierLevel("pro");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Client Protection Hub
            {!hasPaymentPatternAccess && (
              <Badge variant="outline" className="ml-2 bg-primary/10 text-primary">
                <Lock className="h-3 w-3 mr-1" />
                PRO+
              </Badge>
            )}
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
                  selectedClientId === client._id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onSelectClient(client._id === selectedClientId ? null : client._id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-foreground">{client.clientName}</div>
                      <div className="text-sm text-muted-foreground">
                        {client.platform} · ${client.hourlyRate}/hr · {client.contractType}
                      </div>
                    </div>
                  </div>
                  <Badge className={getRiskColor(client.riskLevel)}>
                    {client.riskLevel} risk
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
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
                    <div className="text-lg font-bold text-emerald-500">${client.totalValue}</div>
                  </div>
                </div>
                {client.activeSession && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-500">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    Active session
                  </div>
                )}
                
                {/* Payment Pattern Analysis - PRO+ Feature */}
                {selectedClientId === client._id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    {hasPaymentPatternAccess ? (
                      <div className="text-sm">
                        <div className="font-medium text-foreground mb-2">Payment Pattern Analysis</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Avg Payment Time:</span>
                            <span className="ml-1 font-medium">5 days</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Reliability:</span>
                            <span className="ml-1 font-medium text-emerald-500">High</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-3 bg-muted/50 rounded-lg">
                        <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground mb-1">
                          Client Payment Pattern Analysis
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Unlock payment reliability tracking and risk prediction
                        </p>
                        <Button size="sm" onClick={onUpgrade}>
                          Upgrade to PRO
                        </Button>
                      </div>
                    )}
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