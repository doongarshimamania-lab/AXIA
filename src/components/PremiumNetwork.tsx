import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Search, Handshake, Plus, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PremiumNetworkProps {
  onFindPartners?: () => void;
  onReferralProgram?: () => void;
  onRespondToOpportunity?: (opportunityId: string) => void;
}

export function PremiumNetwork({
  onFindPartners,
  onReferralProgram,
  onRespondToOpportunity,
}: PremiumNetworkProps) {
  // Theme is managed globally by ThemeProvider

  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showOpportunitiesModal, setShowOpportunitiesModal] = useState(false);

  // Lightweight local data to avoid heavy Convex types during render
  const networkConnections: any[] = [
    {
      _id: "conn1",
      name: "Sarah Johnson",
      hourlyRate: 45,
      protectedHours: 320,
      image: "",
      connectedPlatforms: ["Upwork", "Toptal"],
      connectionStrength: 87
    },
    {
      _id: "conn2",
      name: "Michael Chen",
      hourlyRate: 55,
      protectedHours: 450,
      image: "",
      connectedPlatforms: ["Fiverr", "Upwork"],
      connectionStrength: 92
    },
    {
      _id: "conn3",
      name: "Emily Rodriguez",
      hourlyRate: 38,
      protectedHours: 280,
      image: "",
      connectedPlatforms: ["Toptal", "Direct"],
      connectionStrength: 78
    },
    {
      _id: "conn4",
      name: "David Kim",
      hourlyRate: 50,
      protectedHours: 390,
      image: "",
      connectedPlatforms: ["Upwork", "Freelancer.com"],
      connectionStrength: 85
    }
  ];
  
  const referralOpportunities: any[] = [
    {
      reportId: "rep1",
      userName: "Alex Thompson",
      caseId: "CASE-2024-001",
      lostIncome: 450
    },
    {
      reportId: "rep2",
      userName: "Jessica Martinez",
      caseId: "CASE-2024-002",
      lostIncome: 320
    }
  ];
  
  const sendRequest = async (_args: any) => {
    toast.success("Connection request sent successfully!");
    return Promise.resolve();
  };

  // Add loading and error states
  if (networkConnections === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has access - null means no access, empty array is valid for pro users
  const hasAccess = networkConnections !== null;

  if (!hasAccess) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Agency Partners</h2>
          <p className="text-muted-foreground mb-6">
            This feature is exclusive to Pro users. Upgrade to connect with trusted partner agencies and access referral opportunities.
          </p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const handleSendRequest = async (targetUserId: string) => {
    try {
      await sendRequest({ targetUserId: targetUserId as any });
      toast.success("Connection request sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send request");
    }
  };

  const topConnections = networkConnections?.slice(0, 3) || [];
  const totalConnections = networkConnections?.length || 0;

  return (
    <div className="p-8">
        <Card className="p-6 bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-primary mr-2" />
            <h3 className="font-[Space_Grotesk] font-bold text-xl text-foreground">
              Agency Partners
            </h3>
          </div>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            PRO
          </span>
        </div>

        <div className="mb-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-foreground">Your Network</span>
            <span className="text-xs text-muted-foreground">
              {totalConnections} partner agencies
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {topConnections.map((connection: any) => (
              <div key={connection._id} className="text-center">
                <Avatar className="w-12 h-12 mx-auto mb-2">
                  <AvatarImage src={connection.image} />
                  <AvatarFallback className="bg-primary/10 text-foreground">
                    {connection.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-xs font-medium truncate text-foreground">
                  {connection.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  ${connection.hourlyRate}/hr
                </div>
              </div>
            ))}
            {totalConnections > 3 && (
              <button
                onClick={() => setShowNetworkModal(true)}
                className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg h-16 hover:bg-muted/50 transition"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">
                  +{totalConnections - 3}
                </span>
              </button>
            )}
          </div>
        </div>

        {referralOpportunities && referralOpportunities.length > 0 && (
          <div className="mb-5 p-4 bg-muted rounded-lg border border-border/50">
            <div className="flex items-start">
              <MessageSquare className="w-5 h-5 text-primary mt-1 mr-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-1 text-foreground">Referral Opportunity</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  <span className="font-medium">{referralOpportunities[0].userName}</span> needs help with
                  dispute resolution (${referralOpportunities[0].lostIncome} at risk)
                </p>
                <button
                  onClick={() => {
                    onRespondToOpportunity?.(referralOpportunities[0].reportId);
                    setShowOpportunitiesModal(true);
                  }}
                  className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full hover:bg-primary/90 transition"
                >
                  Respond Now
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => {
              onFindPartners?.();
              setShowNetworkModal(true);
            }}
            className="p-3 border border-border rounded-lg hover:bg-muted/50 transition text-left"
          >
            <div className="flex items-center mb-1">
              <Search className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm text-foreground">Find Partners</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Connect with similar professionals
            </p>
          </button>

          <button
            onClick={onReferralProgram}
            className="p-3 border border-border rounded-lg hover:bg-muted/50 transition text-left"
          >
            <div className="flex items-center mb-1">
              <Handshake className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm text-foreground">Referral Program</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Earn 1 month free for each referral
            </p>
          </button>
        </div>

        <div className="p-3 bg-accent/50 rounded-md">
          <p className="text-sm text-foreground">
            <span className="font-medium">Network Value:</span> Connect with trusted partner agencies for collaboration and referrals
          </p>
        </div>
      </Card>

      {/* Network Modal */}
      <Dialog open={showNetworkModal} onOpenChange={setShowNetworkModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agency Partners</DialogTitle>
            <DialogDescription>Connect with trusted partner agencies for collaboration and referrals.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {networkConnections?.map((connection: any) => (
              <div key={connection._id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={connection.image} />
                    <AvatarFallback className="bg-primary/10">
                      {connection.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-foreground">{connection.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${connection.hourlyRate}/hr · {connection.protectedHours}h protected
                    </div>
                    <div className="flex gap-1 mt-1">
                      {connection.connectedPlatforms.map((platform: string) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    {connection.connectionStrength}% match
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(connection._id)}
                  >
                    Connect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Opportunities Modal */}
      <Dialog open={showOpportunitiesModal} onOpenChange={setShowOpportunitiesModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Referral Opportunities</DialogTitle>
            <DialogDescription>View and respond to referral opportunities from your network.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {referralOpportunities?.map((opp: any) => (
              <div key={opp.reportId} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-foreground">{opp.userName}</div>
                  <Badge variant="outline">${opp.lostIncome} at risk</Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  Case ID: {opp.caseId}
                </div>
                <Button size="sm" className="w-full">
                  Offer Assistance
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}