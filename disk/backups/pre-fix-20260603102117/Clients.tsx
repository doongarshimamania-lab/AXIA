import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClientList } from "@/components/client-protection/ClientList";
import { ClientPaymentPattern } from "@/components/client-protection/ClientPaymentPattern";
import { ClientDisputeSimulation } from "@/components/client-protection/ClientDisputeSimulation";
import { ClientPolicyProfile } from "@/components/client-protection/ClientPolicyProfile";
import { ClientGapPrediction } from "@/components/client-protection/ClientGapPrediction";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, AlertTriangle, FileText } from "lucide-react";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useTheme } from "@/components/ThemeProvider";

export default function Clients() {
  const { tier: subscriptionTier } = useSubscriptionTier();
  const { theme } = useTheme();
  
  // Tier hierarchy helper
  const getTierLevel = (tier: string) => {
    const levels: Record<string, number> = { free: 0, starter: 1, pro: 2, expert: 3, client: 0 };
    return levels[tier] || 0;
  };
  const hasTierAccess = (requiredTier: string) => getTierLevel(subscriptionTier) >= getTierLevel(requiredTier);

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

  const paymentPattern: any = selectedClientId ? {
    hasPattern: true,
    disputeRate: 15,
    disputeCycle: "End of month payment disputes",
    highRiskPeriod: "Last week of each month",
    paymentTriggers: [
      "Client reviews invoices on the 25th of each month",
      "Disputes typically filed 2-3 days after invoice review",
      "Higher dispute rate when project milestones are unclear"
    ],
    protectionPlan: [
      { action: "Send detailed work summary 3 days before month-end", impact: "Reduces disputes by 40%" },
      { action: "Schedule brief check-in call on the 23rd", impact: "Improves communication clarity" },
      { action: "Ensure all evidence is uploaded by the 20th", impact: "Provides dispute protection buffer" }
    ]
  } : undefined;

  // Calculate tier-specific protection data
  const getTierProtectionData = () => {
    const selectedClient = clients.find(c => c._id === selectedClientId);
    if (!selectedClient) {
      return {
        protectionValue: 0,
        timePeriod: "month",
        platform: "all platforms",
        statusColor: "#10b981",
        protectionStatus: "No client selected"
      };
    }

    const baseValue = selectedClient.totalValue;
    const platformName = selectedClient.platform === "direct" ? "client" : selectedClient.platform;
    
    // Tier-specific protection calculations
    const tierMultipliers: Record<string, number> = {
      free: 0.22,
      starter: 0.45,
      pro: 0.83,
      expert: 0.95
    };
    
    const multiplier = tierMultipliers[subscriptionTier] || 0.22;
    const protectionValue = Math.round(baseValue * multiplier);
    
    // Status based on risk level
    const statusColors: Record<string, string> = {
      low: "#10b981",
      medium: "#f59e0b",
      high: "#ef4444"
    };
    
    const statusMessages: Record<string, string> = {
      low: "Fully Protected",
      medium: "Protected with Monitoring",
      high: "Protected with Active Alerts"
    };

    return {
      protectionValue,
      timePeriod: "month",
      platform: platformName.charAt(0).toUpperCase() + platformName.slice(1),
      statusColor: statusColors[selectedClient.riskLevel],
      protectionStatus: statusMessages[selectedClient.riskLevel]
    };
  };

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
        
        <ClientList 
          clients={clients}
          selectedClientId={selectedClientId}
          onSelectClient={setSelectedClientId}
          onAddClient={() => setShowAddClient(true)}
          subscriptionTier={subscriptionTier}
          onUpgrade={() => toast.info("Upgrade feature coming soon")}
        />

        {/* Client Trust Score Dashboard - Tiered System */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-foreground">Client Trust Score</h2>
          
          {selectedClientId ? (
            clients.filter(c => c._id === selectedClientId).map((client) => {
              // Calculate client data for formulas
              const paymentReliability = client.riskLevel === "low" ? 95 : client.riskLevel === "medium" ? 82 : 65;
              const communicationFrequency = client.riskLevel === "low" ? 90 : client.riskLevel === "medium" ? 75 : 60;
              const responseTime = client.riskLevel === "low" ? 85 : client.riskLevel === "medium" ? 70 : 55;
              const messageClarity = client.riskLevel === "low" ? 92 : client.riskLevel === "medium" ? 78 : 62;
              const communicationScore = Math.min(100, Math.round(
                (communicationFrequency * 0.4) + (responseTime * 0.3) + (messageClarity * 0.3)
              ));
              
              const activityDensity = client.riskLevel === "low" ? 2.1 : client.riskLevel === "medium" ? 1.4 : 0.9;
              const memoQuality = client.riskLevel === "low" ? 0.9 : client.riskLevel === "medium" ? 0.75 : 0.6;
              const hasClientRequirements = client.riskLevel === "low";
              let pattern7Vulnerability = 0;
              if (!hasClientRequirements) pattern7Vulnerability += 40;
              if (activityDensity < 1.5) pattern7Vulnerability += 30;
              if (memoQuality < 0.8) pattern7Vulnerability += 30;
              const pattern7Score = Math.min(100, 100 - pattern7Vulnerability);
              
              const clientDiversity = 75;
              const platformCoverage = 80;
              const historicalSuccess = 85;
              const businessScore = Math.min(100, Math.round(
                (clientDiversity * 0.3) + (platformCoverage * 0.35) + (historicalSuccess * 0.35)
              ));

              // FREE TIER
              if (subscriptionTier === "free") {
                return (
                  <Card key={client._id} className="p-6 bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-xl border-3 border-emerald-700 shadow-2xl">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h3 className="font-black text-2xl text-emerald-100">Basic Trust Metrics</h3>
                        <p className="text-emerald-200 text-sm font-bold">Payment reliability analysis only</p>
                      </div>
                      <span className="bg-emerald-600 text-white px-3 py-1 rounded font-black text-xs">Free Tier</span>
                    </div>
                    
                    <div className="text-center mb-6">
                      <div className="text-6xl font-black text-emerald-100 mb-2">{paymentReliability}/100</div>
                      <div className="text-emerald-200 font-bold text-lg">Basic trust score</div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="border-l-4 border-emerald-400 bg-emerald-900 p-4 rounded-lg">
                        <div className="text-emerald-100 text-sm mb-1 font-black">Payment Reliability</div>
                        <div className="text-4xl font-black text-emerald-200">{paymentReliability}%</div>
                      </div>
                    </div>
                    
                    <div className="mt-5 p-4 bg-emerald-900 border-3 border-emerald-600 rounded-lg">
                      <p className="text-emerald-100 text-sm mb-2 font-bold">
                        <span className="font-black text-emerald-200">You've protected ${Math.round(paymentReliability * 0.185).toFixed(2)} this month</span> through basic payment reliability
                      </p>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg">
                        Upgrade to Starter for communication pattern analysis
                      </Button>
                    </div>
                  </Card>
                );
              }

              // STARTER TIER
              if (subscriptionTier === "starter") {
                const overallScore = Math.round((paymentReliability + communicationScore) / 2);
                return (
                  <Card key={client._id} className="p-6 bg-gradient-to-br from-blue-950 to-blue-900 rounded-xl border-3 border-blue-700 shadow-2xl">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h3 className="font-black text-2xl text-blue-100">Client Trust Score</h3>
                        <p className="text-blue-200 text-sm font-bold">Contextual Trust Analysis</p>
                        <p className="text-blue-200 text-sm font-bold">Payment reliability + communication patterns</p>
                      </div>
                      <span className="bg-blue-600 text-white px-3 py-1 rounded font-black text-xs">Starter Tier</span>
                    </div>
                    
                    <div className="text-center mb-6">
                      <div className="text-6xl font-black text-blue-100 mb-2">{overallScore}/100</div>
                      <div className="text-blue-200 font-bold text-lg">Contextual trust score</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border-l-4 border-blue-400 bg-blue-900 p-4 rounded-lg">
                        <div className="text-blue-100 text-sm mb-1 font-black">Payment Reliability</div>
                        <div className="text-4xl font-black text-blue-200">{paymentReliability}%</div>
                      </div>
                      <div className="border-l-4 border-blue-400 bg-blue-900 p-4 rounded-lg">
                        <div className="text-blue-100 text-sm mb-1 font-black">Communication Quality</div>
                        <div className="text-4xl font-black text-blue-200">{communicationScore}%</div>
                      </div>
                    </div>
                    
                    <div className="mt-5 p-4 bg-blue-900 border-3 border-blue-600 rounded-lg">
                      <p className="text-blue-100 text-sm mb-2 font-bold">
                        <span className="font-black text-blue-200">You're protecting ${Math.round((paymentReliability + communicationScore) * 0.425)} this month</span> through contextual trust analysis
                      </p>
                      <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black shadow-lg">
                        Upgrade to Pro for Pattern #7 vulnerability detection
                      </Button>
                    </div>
                  </Card>
                );
              }

              // PRO TIER
              if (subscriptionTier === "pro") {
                const overallScore = Math.round((paymentReliability + communicationScore + pattern7Score) / 3);
                return (
                  <Card key={client._id} className="p-6 bg-gradient-to-br from-amber-950 to-amber-900 rounded-xl border-3 border-amber-700 shadow-2xl">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h3 className="font-black text-2xl text-amber-100">Client Trust Score</h3>
                        <p className="text-amber-200 text-sm font-bold">Pattern #7 Vulnerability Analysis</p>
                        <p className="text-amber-200 text-sm font-bold">Payment reliability + communication + Pattern #7 protection</p>
                      </div>
                      <span className="bg-amber-600 text-white px-3 py-1 rounded font-black text-xs">Pro Tier</span>
                    </div>
                    
                    <div className="text-center mb-6">
                      <div className="text-6xl font-black text-amber-100 mb-2">{overallScore}/100</div>
                      <div className="text-amber-200 font-bold text-lg">Pattern-optimized trust score</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border-l-4 border-amber-400 bg-amber-900 p-4 rounded-lg">
                        <div className="text-amber-100 text-sm mb-1 font-black">Payment Reliability</div>
                        <div className="text-4xl font-black text-amber-200">{paymentReliability}%</div>
                      </div>
                      <div className="border-l-4 border-amber-400 bg-amber-900 p-4 rounded-lg">
                        <div className="text-amber-100 text-sm mb-1 font-black">Communication Quality</div>
                        <div className="text-4xl font-black text-amber-200">{communicationScore}%</div>
                      </div>
                      <div className="border-l-4 border-amber-400 bg-amber-900 p-4 rounded-lg">
                        <div className="text-amber-100 text-sm mb-1 font-black">Pattern #7 Vulnerability</div>
                        <div className="text-4xl font-black text-amber-200">{pattern7Score}%</div>
                      </div>
                    </div>
                    
                    <div className="mt-5 p-4 bg-amber-900 border-3 border-amber-600 rounded-lg">
                      <p className="text-amber-100 text-sm mb-2 font-bold">
                        <span className="font-black text-amber-200">You're preventing $480 Pattern #7 losses</span> through vulnerability analysis
                      </p>
                      <Button className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black shadow-lg">
                        Upgrade to Expert for business-wide trust analysis
                      </Button>
                    </div>
                  </Card>
                );
              }

              // EXPERT TIER
              const overallScore = Math.round((paymentReliability + communicationScore + pattern7Score + businessScore) / 4);
              return (
                <Card key={client._id} className="p-6 bg-gradient-to-br from-purple-950 to-purple-900 rounded-xl border-3 border-purple-700 shadow-2xl">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="font-black text-2xl text-purple-100">Client Trust Score</h3>
                      <p className="text-purple-200 text-sm font-bold">Business-Wide Trust Analysis</p>
                      <p className="text-purple-200 text-sm font-bold">Payment reliability + communication + Pattern #7 + business patterns</p>
                    </div>
                    <span className="bg-purple-600 text-white px-3 py-1 rounded font-black text-xs">Expert Tier</span>
                  </div>
                  
                  <div className="text-center mb-6">
                    <div className="text-6xl font-black text-purple-100 mb-2">{overallScore}/100</div>
                    <div className="text-purple-200 font-bold text-lg">Business-level trust score</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-l-4 border-purple-400 bg-purple-900 p-4 rounded-lg">
                      <div className="text-purple-100 text-sm mb-1 font-black">Payment Reliability</div>
                      <div className="text-4xl font-black text-purple-200">{paymentReliability}%</div>
                    </div>
                    <div className="border-l-4 border-purple-400 bg-purple-900 p-4 rounded-lg">
                      <div className="text-purple-100 text-sm mb-1 font-black">Communication Quality</div>
                      <div className="text-4xl font-black text-purple-200">{communicationScore}%</div>
                    </div>
                    <div className="border-l-4 border-purple-400 bg-purple-900 p-4 rounded-lg">
                      <div className="text-purple-100 text-sm mb-1 font-black">Pattern #7 Vulnerability</div>
                      <div className="text-4xl font-black text-purple-200">{pattern7Score}%</div>
                    </div>
                    <div className="border-l-4 border-purple-400 bg-purple-900 p-4 rounded-lg">
                      <div className="text-purple-100 text-sm mb-1 font-black">Business Pattern Score</div>
                      <div className="text-4xl font-black text-purple-200">{businessScore}%</div>
                    </div>
                  </div>
                  
                  <div className="mt-5 p-4 bg-purple-900 border-3 border-purple-600 rounded-lg">
                    <p className="text-purple-100 text-sm mb-2 font-bold">
                      <span className="font-black text-purple-200">You're protecting $1,287 across all clients</span> through business-wide trust analysis
                    </p>
                    <div className="text-center text-purple-200 text-sm font-bold">Top-tier protection complete</div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-6 bg-card rounded-xl border border-border">
              <div className="text-center py-4 text-sm text-muted-foreground">
                Select a client to view trust score analysis
              </div>
            </Card>
          )}
        </div>

        {/* Client Protection Score - Tiered System */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-foreground">Client Protection Score</h2>
          
          {selectedClientId ? (
            clients.filter(c => c._id === selectedClientId).map((client) => {
              // Calculate client data for formulas
              const evidenceCount = client.riskLevel === "low" ? 5 : client.riskLevel === "medium" ? 4 : 3;
              const evidenceWithClientKeywords = client.riskLevel === "low" ? 4 : client.riskLevel === "medium" ? 3 : 2;
              const clientKeywords = ["design", "mobile", "responsive"];
              const workSpecificity = client.riskLevel === "low" ? 0.9 : client.riskLevel === "medium" ? 0.75 : 0.6;
              const hasClientSpecificRequirements = client.riskLevel === "low";
              const activityDensity = client.riskLevel === "low" ? 2.1 : client.riskLevel === "medium" ? 1.4 : 0.9;
              const memoQuality = client.riskLevel === "low" ? 0.9 : client.riskLevel === "medium" ? 0.75 : 0.6;
              const clientDiversity = 75;
              const platformCoverage = 80;
              const historicalSuccess = 85;
              const avgProjectValue = 1200;
              const weeklyIncome = 250;

              const clientData = {
                evidenceCount,
                evidenceWithClientKeywords,
                clientKeywords,
                workSpecificity,
                contextRelevance: Math.min(100, Math.round(
                  (evidenceWithClientKeywords / Math.max(1, clientKeywords.length)) * 50 + (workSpecificity * 50)
                )),
                hasClientSpecificRequirements,
                activityDensity,
                memoQuality,
                pattern7Vulnerability: (() => {
                  let score = 0;
                  if (hasClientSpecificRequirements) score += 40;
                  score += Math.min(40, activityDensity * 20);
                  score += memoQuality * 20;
                  return Math.min(100, score);
                })(),
                clientDiversity,
                platformCoverage,
                historicalSuccess,
                businessProtection: Math.min(100, Math.round(
                  (clientDiversity * 0.3) + (platformCoverage * 0.35) + (historicalSuccess * 0.35)
                )),
                avgProjectValue,
                weeklyIncome,
              };

              // FREE TIER
              if (subscriptionTier === "free") {
                const evidenceCollection = Math.min(100, Math.round(clientData.evidenceCount * 20));
                const dollarValue = Math.round(evidenceCollection * 0.185);

                return (
                  <Card key={client._id} className="p-6 bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-xl border-3 border-emerald-700 shadow-2xl">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h3 className="font-black text-2xl text-emerald-100">Basic Protection</h3>
                        <p className="text-emerald-200 text-sm font-bold">Evidence collection verification</p>
                      </div>
                      <span className="bg-emerald-600 text-white px-3 py-1 rounded font-black text-xs">Free Tier</span>
                    </div>

                    <div className="text-center mb-6">
                      <div className="text-6xl font-black text-emerald-100 mb-2">{evidenceCollection}/100</div>
                      <div className="text-emerald-200 font-bold text-lg">Basic protection level</div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="border-l-4 border-emerald-400 bg-emerald-900 p-4 rounded-lg">
                        <div className="text-emerald-100 text-sm mb-1 font-black">Evidence Collection</div>
                        <div className="text-4xl font-black text-emerald-200">{clientData.evidenceCount} items</div>
                      </div>
                    </div>

                    <div className="mt-5 p-4 bg-emerald-900 border-3 border-emerald-600 rounded-lg">
                      <p className="text-emerald-100 text-sm mb-2 font-bold">
                        <span className="font-black text-emerald-200">You've protected ${dollarValue.toFixed(2)} this month</span> through basic evidence collection
                      </p>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg">
                        Upgrade to Starter for context relevance metrics
                      </Button>
                    </div>
                  </Card>
                );
              }

              // STARTER TIER
              if (subscriptionTier === "starter") {
                const evidenceCollection = Math.min(100, Math.round(clientData.evidenceCount * 20));
                const contextRelevance = clientData.contextRelevance;
                const score = Math.round((evidenceCollection + contextRelevance) / 2);
                const dollarValue = Math.round((evidenceCollection + contextRelevance) * 0.425);

                return (
                  <Card key={client._id} className="p-6 bg-gradient-to-br from-blue-950 to-blue-900 rounded-xl border-3 border-blue-700 shadow-2xl">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h3 className="font-black text-2xl text-blue-100">Contextual Protection</h3>
                        <p className="text-blue-200 text-sm font-bold">Evidence collection + context relevance</p>
                      </div>
                      <span className="bg-blue-600 text-white px-3 py-1 rounded font-black text-xs">Starter Tier</span>
                    </div>

                    <div className="text-center mb-6">
                      <div className="text-6xl font-black text-blue-100 mb-2">{score}/100</div>
                      <div className="text-blue-200 font-bold text-lg">Contextual protection level</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border-l-4 border-blue-400 bg-blue-900 p-4 rounded-lg">
                        <div className="text-blue-100 text-sm mb-1 font-black">Evidence Collection</div>
                        <div className="text-4xl font-black text-blue-200">{clientData.evidenceCount} items</div>
                      </div>
                      <div className="border-l-4 border-blue-400 bg-blue-900 p-4 rounded-lg">
                        <div className="text-blue-100 text-sm mb-1 font-black">Context Relevance</div>
                        <div className="text-4xl font-black text-blue-200">{contextRelevance}%</div>
                      </div>
                    </div>

                    <div className="mt-5 p-4 bg-blue-900 border-3 border-blue-600 rounded-lg">
                      <p className="text-blue-100 text-sm mb-2 font-bold">
                        <span className="font-black text-blue-200">You're protecting ${dollarValue} this month</span> through contextual protection
                      </p>
                      <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black shadow-lg">
                        Upgrade to Pro for Pattern #7 vulnerability protection
                      </Button>
                    </div>
                  </Card>
                );
              }

              // PRO TIER
              if (subscriptionTier === "pro") {
                const evidenceCollection = Math.min(100, Math.round(clientData.evidenceCount * 20));
                const contextRelevance = clientData.contextRelevance;
                const pattern7Protection = clientData.pattern7Vulnerability;
                const score = Math.round((evidenceCollection + contextRelevance + pattern7Protection) / 3);
                const dollarValue = Math.round(avgProjectValue * 0.35);

                return (
                  <Card key={client._id} className="p-6 bg-gradient-to-br from-amber-950 to-amber-900 rounded-xl border-3 border-amber-700 shadow-2xl">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h3 className="font-black text-2xl text-amber-100">Pattern #7 Protection</h3>
                        <p className="text-amber-200 text-sm font-bold">Evidence + context + Pattern #7 vulnerability</p>
                      </div>
                      <span className="bg-amber-600 text-white px-3 py-1 rounded font-black text-xs">Pro Tier</span>
                    </div>

                    <div className="text-center mb-6">
                      <div className="text-6xl font-black text-amber-100 mb-2">{score}/100</div>
                      <div className="text-amber-200 font-bold text-lg">Pattern-optimized protection level</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border-l-4 border-amber-400 bg-amber-900 p-4 rounded-lg">
                        <div className="text-amber-100 text-sm mb-1 font-black">Evidence Collection</div>
                        <div className="text-4xl font-black text-amber-200">{clientData.evidenceCount} items</div>
                      </div>
                      <div className="border-l-4 border-amber-400 bg-amber-900 p-4 rounded-lg">
                        <div className="text-amber-100 text-sm mb-1 font-black">Context Relevance</div>
                        <div className="text-4xl font-black text-amber-200">{contextRelevance}%</div>
                      </div>
                      <div className="border-l-4 border-amber-400 bg-amber-900 p-4 rounded-lg">
                        <div className="text-amber-100 text-sm mb-1 font-black">Pattern #7 Vulnerability</div>
                        <div className="text-4xl font-black text-amber-200">{pattern7Protection}%</div>
                      </div>
                    </div>

                    <div className="mt-5 p-4 bg-amber-900 border-3 border-amber-600 rounded-lg">
                      <p className="text-amber-100 text-sm mb-2 font-bold">
                        <span className="font-black text-amber-200">You're preventing ${dollarValue} Pattern #7 losses</span> through vulnerability protection
                      </p>
                      <Button className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black shadow-lg">
                        Upgrade to Expert for business-wide protection
                      </Button>
                    </div>
                  </Card>
                );
              }

              // EXPERT TIER
              const evidenceCollection = Math.min(100, Math.round(clientData.evidenceCount * 20));
              const contextRelevance = clientData.contextRelevance;
              const pattern7Protection = clientData.pattern7Vulnerability;
              const businessProtection = clientData.businessProtection;
              const score = Math.round((evidenceCollection + contextRelevance + pattern7Protection + businessProtection) / 4);
              const dollarValue = Math.round((weeklyIncome * 4.33) * 0.12);

              return (
                <Card key={client._id} className="p-6 bg-gradient-to-br from-purple-950 to-purple-900 rounded-xl border-3 border-purple-700 shadow-2xl">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="font-black text-2xl text-purple-100">Business-Wide Protection</h3>
                      <p className="text-purple-200 text-sm font-bold">Evidence + context + Pattern #7 + business protection</p>
                    </div>
                    <span className="bg-purple-600 text-white px-3 py-1 rounded font-black text-xs">Expert Tier</span>
                  </div>

                  <div className="text-center mb-6">
                    <div className="text-6xl font-black text-purple-100 mb-2">{score}/100</div>
                    <div className="text-purple-200 font-bold text-lg">Business-level protection level</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-l-4 border-purple-400 bg-purple-900 p-4 rounded-lg">
                      <div className="text-purple-100 text-sm mb-1 font-black">Evidence Collection</div>
                      <div className="text-4xl font-black text-purple-200">{clientData.evidenceCount} items</div>
                    </div>
                    <div className="border-l-4 border-purple-400 bg-purple-900 p-4 rounded-lg">
                      <div className="text-purple-100 text-sm mb-1 font-black">Context Relevance</div>
                      <div className="text-4xl font-black text-purple-200">{contextRelevance}%</div>
                    </div>
                    <div className="border-l-4 border-purple-400 bg-purple-900 p-4 rounded-lg">
                      <div className="text-purple-100 text-sm mb-1 font-black">Pattern #7 Vulnerability</div>
                      <div className="text-4xl font-black text-purple-200">{pattern7Protection}%</div>
                    </div>
                    <div className="border-l-4 border-purple-400 bg-purple-900 p-4 rounded-lg">
                      <div className="text-purple-100 text-sm mb-1 font-black">Business Protection</div>
                      <div className="text-4xl font-black text-purple-200">{businessProtection}%</div>
                    </div>
                  </div>

                  <div className="mt-5 p-4 bg-purple-900 border-3 border-purple-600 rounded-lg">
                    <p className="text-purple-100 text-sm mb-2 font-bold">
                      <span className="font-black text-purple-200">You're protecting ${dollarValue} across all clients</span> through business-wide protection
                    </p>
                    <div className="text-center text-purple-200 text-sm font-bold">Top-tier protection complete</div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-6 bg-card rounded-xl border border-border">
              <div className="text-center py-4 text-sm text-muted-foreground">
                Select a client to view protection score analysis
              </div>
            </Card>
          )}
        </div>

        {/* Client Dispute Simulation - Tiered Feature */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-foreground">Client Dispute Simulation</h2>
          {selectedClientId ? (
            clients.filter(c => c._id === selectedClientId).map((client) => {
              // Prepare client data for simulation
              const clientData = {
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
                disputeTrend: "Low"
              };

              return (
                <ClientDisputeSimulation 
                  key={client._id}
                  clientData={clientData}
                  tier={subscriptionTier}
                />
              );
            })
          ) : (
            <Card className="p-6 bg-card rounded-xl border border-border">
              <div className="text-center py-4 text-sm text-muted-foreground">
                Select a client to view dispute simulation
              </div>
            </Card>
          )}
        </div>

        <ClientPaymentPattern 
          paymentPattern={paymentPattern}
          tier={subscriptionTier}
        />

        {/* Client Policy Profile - Tiered Feature */}
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

        {/* Client-Specific Gap Prediction - Tiered Feature */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-foreground">Client Gap Prediction</h2>
          {selectedClientId ? (
            clients.filter(c => c._id === selectedClientId).map((client) => (
              <ClientGapPrediction 
                key={client._id}
                selectedClient={client}
                tier={subscriptionTier}
              />
            ))
          ) : (
            <Card className="p-6 bg-card rounded-xl border border-border">
              <div className="text-center py-4 text-sm text-muted-foreground">
                Select a client to view gap prediction
              </div>
            </Card>
          )}
        </div>

        {/* Team Evidence Validation - EXPERT Feature */}
        <Card className="p-6 bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-primary mr-2" />
              <h3 className="font-bold text-xl text-foreground">Team Evidence Validation Network</h3>
            </div>
            {!hasTierAccess("expert") && (
              <Badge variant="outline" className="bg-primary/10 text-primary">EXPERT</Badge>
            )}
          </div>
          {hasTierAccess("expert") ? (
            <div className="text-center py-8 bg-muted rounded-lg">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No team members yet. Invite colleagues to validate evidence.
              </p>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Team Member
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 bg-muted rounded-lg">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Team Evidence Validation Network
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Collaborate with team members to validate and strengthen evidence
              </p>
              <Button size="sm" onClick={() => toast.info("Upgrade feature coming soon")}>
                Upgrade to Expert
              </Button>
            </div>
          )}
        </Card>

        <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client Name</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="25"
                />
              </div>
              <div>
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
              <div>
                <Label>Risk Level</Label>
                <Select value={riskLevel} onValueChange={(v: any) => setRiskLevel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddClient(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddClient}>Add Client</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}