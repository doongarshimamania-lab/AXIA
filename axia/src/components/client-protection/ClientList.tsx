import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Lock, Share2, Copy, Check, ExternalLink, Tag as TagIcon } from "lucide-react";
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
// ponytail: read-only badge display + multi-select picker popover for client cards.
import { TagPicker, TagBadges } from "@/components/tags";

// Check if an ID is a mock/demo ID (not a real Convex document ID)
// Convex IDs for table "clients" always start with "clients:" or are 22+ char base62 strings
function isMockId(id: string): boolean {
  // Real Convex IDs are long hex-ish strings, typically 22+ chars with no underscores
  // Mock IDs like "client_1", "client_2" are clearly not Convex IDs
  if (id.startsWith("client_") || id.startsWith("mem_") || id.startsWith("proj_")) return true;
  // Convex document IDs for the "clients" table are typically 22+ chars
  // and contain only alphanumeric characters (no underscores)
  if (id.length < 16 || id.includes("_")) return true;
  return false;
}

// Generate a demo token locally (for mock data)
function generateDemoToken(clientId: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const segments: string[] = ["demo"];
  for (let s = 0; s < 3; s++) {
    let seg = "";
    for (let i = 0; i < 8; i++) {
      seg += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(seg);
  }
  return segments.join("-");
}

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
  // ponytail: optional tagIds on the client (added by phase-1a schema patch).
  tagIds?: string[];
}

interface ClientListProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelectClient: (id: string | null) => void;
  onAddClient: () => void;
  subscriptionTier?: "free" | "starter" | "pro" | "expert";
  onUpgrade?: () => void;
  // ponytail: workspace tag list for rendering TagBadges + the Manage Tags popover.
  allTags?: any[];
}

export function ClientList({ 
  clients, 
  selectedClientId, 
  onSelectClient, 
  onAddClient,
  subscriptionTier = "free",
  onUpgrade,
  allTags = []
}: ClientListProps) {
  const [shareClientId, setShareClientId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  // ponytail: track which client's "Manage tags" popover is currently open.
  const [manageTagsFor, setManageTagsFor] = useState<string | null>(null);

  // Only use mutation if the clientWorkspace API exists
  const clientWorkspaceApi = (api as any).clients?.clientWorkspace;
  const generateToken = useMutation(
    clientWorkspaceApi?.generateClientWorkspaceToken ?? null
  );

  const handleShare = useCallback(async (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareClientId(clientId);
    setShareLoading(true);
    setShareToken(null);

    try {
      if (isMockId(clientId)) {
        // Demo mode: generate a local token, no Convex call needed
        const demoToken = generateDemoToken(clientId);
        setShareToken(demoToken);
      } else {
        // Real Convex data: call the mutation with proper ID
        if (!generateToken) {
          toast.error("Share feature requires authentication. Please sign in.");
          setShareClientId(null);
          setShareLoading(false);
          return;
        }
        const result = await generateToken({ clientId: clientId as any });
        if (result) {
          setShareToken(result.token);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link. You may need to be authenticated.");
      setShareClientId(null);
    }
    setShareLoading(false);
  }, [generateToken]);

  const copyLink = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/workspace/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

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
    // ponytail: 'client' tier removed — only free/starter/pro/expert remain.
    const levels: Record<string, number> = { free: 0, starter: 1, pro: 2, expert: 3 };
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
                      {/* ponytail: read-only tag badges on each client card. */}
                      <div className="mt-1">
                        <TagBadges
                          tagIds={client.tagIds}
                          tags={allTags}
                          max={3}
                          size="xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* ponytail: Manage-tags popover — TagPicker with entityId persists
                        immediately via setEntityTags, so no extra save logic needed. */}
                    <Popover open={manageTagsFor === client._id} onOpenChange={(o) => setManageTagsFor(o ? client._id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); setManageTagsFor(client._id); }}
                          title="Manage tags"
                        >
                          <TagIcon className="h-3.5 w-3.5 mr-1" />
                          Tags
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px]" align="end" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">Tags for {client.clientName}</div>
                          <TagPicker
                            entityType="clients"
                            entityId={client._id}
                            initialTagIds={client.tagIds ?? []}
                            categoryHint="client"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Badge className={getRiskColor(client.riskLevel)}>
                      {client.riskLevel} risk
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/30"
                      onClick={(e) => handleShare(client._id, e)}
                      title="Share workspace with client"
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1" />
                      Share
                    </Button>
                  </div>
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

      {/* Share Link Dialog */}
      <Dialog open={shareClientId !== null} onOpenChange={(open) => { if (!open) { setShareClientId(null); setShareToken(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-violet-500" />
              Share Client Workspace
            </DialogTitle>
            <DialogDescription>
              Generate a shareable link for this client. They can view their projects, proposals, invoices, and team — no login required.
            </DialogDescription>
          </DialogHeader>
          {shareLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : shareToken ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  {shareToken?.startsWith("demo-")
                    ? "Demo share link generated! (Using demo data — link will show sample content)"
                    : "Share link generated successfully!"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                  {window.location.origin}/workspace/{shareToken}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <a
                href={`/workspace/${shareToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Preview as client
              </a>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Note:</strong> Anyone with this link can view this client's projects, proposals, and invoices. The client will only see their own data.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500">
              Unable to generate link. Make sure you're authenticated.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
