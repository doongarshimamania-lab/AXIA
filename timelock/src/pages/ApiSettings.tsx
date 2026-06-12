import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Webhook,
  BarChart3,
  BookOpen,
  Shield,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Zap,
  Clock,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { PageLayout } from "@/components/design-system/PageLayout";

// --- Types ---
interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  secretMasked: string;
  secretFull: string;
  createdAt: number;
  lastUsedAt: number | null;
  status: "active" | "revoked";
}

interface WebhookConfig {
  url: string;
  events: string[];
  active: boolean;
}

// --- Mock Data ---
const MOCK_API_KEYS: ApiKey[] = [
  {
    id: "key_1",
    name: "Production API",
    keyPrefix: "tl_prod_",
    secretMasked: "tl_prod_••••••••••••••••a4f2",
    secretFull: "tl_prod_sk_9x8m7k6j5h4g3f2d1a4f2",
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    lastUsedAt: Date.now() - 2 * 60 * 60 * 1000,
    status: "active",
  },
  {
    id: "key_2",
    name: "Staging Environment",
    keyPrefix: "tl_stag_",
    secretMasked: "tl_stag_••••••••••••••••b7e1",
    secretFull: "tl_stag_sk_3w4e5r6t7y8u9i0ob7e1",
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
    lastUsedAt: Date.now() - 24 * 60 * 60 * 1000,
    status: "active",
  },
  {
    id: "key_3",
    name: "Legacy Integration",
    keyPrefix: "tl_test_",
    secretMasked: "tl_test_••••••••••••••••c9d0",
    secretFull: "tl_test_sk_1a2s3d4f5g6h7j8kc9d0",
    createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    lastUsedAt: null,
    status: "revoked",
  },
];

const WEBHOOK_EVENTS = [
  { id: "evidence.created", label: "Evidence Created" },
  { id: "evidence.exported", label: "Evidence Exported" },
  { id: "project.milestone", label: "Milestone Reached" },
  { id: "payment.received", label: "Payment Received" },
  { id: "dispute.opened", label: "Dispute Opened" },
  { id: "protection.alert", label: "Protection Alert" },
];

// --- Helpers ---
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeAgo(ts: number | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function generateMockKey(prefix: string = "tl_prod_"): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = prefix + "sk_";
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function maskKey(key: string): string {
  const prefix = key.substring(0, key.indexOf("sk_") + 3);
  const suffix = key.slice(-4);
  return `${prefix}${"•".repeat(16)}${suffix}`;
}

// --- Component ---
export default function ApiSettings() {
  const { tier } = useSubscriptionTier();
  const isPro = tier === "pro" || tier === "expert";

  const rateLimit = isPro ? 10000 : 100;
  const requestsToday = isPro ? 3427 : 67;
  const errorRate = 0.3;

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // Webhook state
  const [webhook, setWebhook] = useState<WebhookConfig>({
    url: "https://myapp.com/api/axia-webhook",
    events: ["evidence.created", "protection.alert"],
    active: true,
  });
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  // Toggle key visibility
  const toggleReveal = (keyId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId);
      else next.add(keyId);
      return next;
    });
  };

  // Copy to clipboard
  const copyKey = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("API key copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  // Generate new key
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for your API key");
      return;
    }
    setIsCreating(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    const fullKey = generateMockKey("tl_prod_");
    const newApiKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      keyPrefix: "tl_prod_",
      secretMasked: maskKey(fullKey),
      secretFull: fullKey,
      createdAt: Date.now(),
      lastUsedAt: null,
      status: "active",
    };
    setApiKeys((prev) => [newApiKey, ...prev]);
    setNewlyCreatedKey(fullKey);
    setNewKeyName("");
    setIsCreating(false);
    toast.success("API key created successfully");
  };

  // Revoke key
  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;
    setIsRevoking(true);
    await new Promise((r) => setTimeout(r, 800));
    setApiKeys((prev) =>
      prev.map((k) =>
        k.id === keyToRevoke ? { ...k, status: "revoked" as const } : k
      )
    );
    setShowRevokeDialog(false);
    setKeyToRevoke(null);
    setIsRevoking(false);
    toast.success("API key revoked");
  };

  // Delete key
  const handleDeleteKey = async (keyId: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
    toast.success("API key deleted");
  };

  // Save webhook
  const handleSaveWebhook = async () => {
    if (!webhook.url.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }
    try {
      new URL(webhook.url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    if (webhook.events.length === 0) {
      toast.error("Please select at least one event");
      return;
    }
    setIsSavingWebhook(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSavingWebhook(false);
    toast.success("Webhook configuration saved");
  };

  // Toggle webhook event
  const toggleWebhookEvent = (eventId: string) => {
    setWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const activeKeys = apiKeys.filter((k) => k.status === "active");
  const revokedKeys = apiKeys.filter((k) => k.status === "revoked");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="w-full min-h-screen bg-background text-foreground">
        <PageLayout narrow>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              API Settings
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Manage API keys, webhooks, and monitor your integration usage
            </p>
          </div>

          <div className="space-y-6">
            {/* Tier Info Banner */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {isPro ? "Pro Plan" : "Free Plan"}
                        </span>
                        <Badge
                          variant={isPro ? "default" : "secondary"}
                          className={
                            isPro
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : ""
                          }
                        >
                          {isPro ? "10,000 req/day" : "100 req/day"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isPro
                          ? "You have access to the full API with higher rate limits."
                          : "Upgrade to Pro for 10,000 requests/day and priority support."}
                      </p>
                    </div>
                  </div>
                  {!isPro && (
                    <Button size="sm" className="gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      Upgrade
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* API Usage Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Requests Today
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {requestsToday.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Usage</span>
                      <span>
                        {((requestsToday / rateLimit) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{
                          width: `${Math.min(
                            (requestsToday / rateLimit) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Rate Limit
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {rateLimit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {isPro
                      ? "10,000 requests per day"
                      : "100 requests per day"}{" "}
                    &middot; Resets at midnight UTC
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Error Rate
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {errorRate}%
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {errorRate < 1
                      ? "Healthy — error rate below 1%"
                      : errorRate < 5
                        ? "Normal — error rate under 5%"
                        : "Elevated — consider checking your integration"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* API Keys Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      API Keys
                    </CardTitle>
                    <CardDescription>
                      Create and manage API keys for programmatic access
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setNewlyCreatedKey(null);
                      setShowCreateDialog(true);
                    }}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Generate Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No API keys yet</p>
                    <p className="text-sm mt-1">
                      Generate your first key to start integrating with Axia.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Active Keys */}
                    {activeKeys.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Active ({activeKeys.length})
                        </p>
                        {activeKeys.map((apiKey) => (
                          <div
                            key={apiKey.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-foreground">
                                  {apiKey.name}
                                </span>
                                <Badge
                                  variant="default"
                                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                                >
                                  Active
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono select-all">
                                  {revealedKeys.has(apiKey.id)
                                    ? apiKey.secretFull
                                    : apiKey.secretMasked}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => toggleReveal(apiKey.id)}
                                >
                                  {revealedKeys.has(apiKey.id) ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    copyKey(
                                      revealedKeys.has(apiKey.id)
                                        ? apiKey.secretFull
                                        : apiKey.secretMasked
                                    )
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Created {formatDate(apiKey.createdAt)}</span>
                                <span>
                                  Last used {timeAgo(apiKey.lastUsedAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setKeyToRevoke(apiKey.id);
                                  setShowRevokeDialog(true);
                                }}
                              >
                                Revoke
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteKey(apiKey.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Revoked Keys */}
                    {revokedKeys.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Revoked ({revokedKeys.length})
                          </p>
                          {revokedKeys.map((apiKey) => (
                            <div
                              key={apiKey.id}
                              className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border opacity-60"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-foreground">
                                    {apiKey.name}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    Revoked
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    Created {formatDate(apiKey.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteKey(apiKey.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Webhook Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhook Configuration
                </CardTitle>
                <CardDescription>
                  Receive real-time notifications when events occur in Axia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://your-app.com/api/webhook"
                    value={webhook.url}
                    onChange={(e) =>
                      setWebhook((prev) => ({ ...prev, url: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll send POST requests to this URL when selected events fire.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Events to Listen For</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {WEBHOOK_EVENTS.map((event) => (
                      <label
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={webhook.events.includes(event.id)}
                          onCheckedChange={() => toggleWebhookEvent(event.id)}
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {event.label}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {event.id}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Webhook Status
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {webhook.active
                        ? "Webhook is active and will receive events"
                        : "Webhook is paused — no events will be sent"}
                    </p>
                  </div>
                  <Button
                    variant={webhook.active ? "outline" : "default"}
                    size="sm"
                    onClick={() =>
                      setWebhook((prev) => ({
                        ...prev,
                        active: !prev.active,
                      }))
                    }
                  >
                    {webhook.active ? "Pause" : "Enable"}
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveWebhook}
                    disabled={isSavingWebhook}
                    className="gap-1.5"
                  >
                    {isSavingWebhook ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Webhook"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* API Documentation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  API Documentation
                </CardTitle>
                <CardDescription>
                  Resources to help you integrate Axia into your workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      title: "Getting Started Guide",
                      desc: "Learn the basics of the Axia API",
                      icon: "🚀",
                    },
                    {
                      title: "Authentication Docs",
                      desc: "API key authentication & best practices",
                      icon: "🔐",
                    },
                    {
                      title: "Webhooks Reference",
                      desc: "Event payloads and retry logic",
                      icon: "📡",
                    },
                    {
                      title: "API Reference",
                      desc: "Full endpoint documentation & examples",
                      icon: "📖",
                    },
                  ].map((doc) => (
                    <button
                      key={doc.title}
                      className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors text-left group"
                      onClick={() =>
                        toast.info("Documentation portal coming soon!")
                      }
                    >
                      <span className="text-2xl flex-shrink-0">{doc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground text-sm">
                            {doc.title}
                          </p>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {doc.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </PageLayout>
      </div>

      {/* Create API Key Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setNewKeyName("");
            setNewlyCreatedKey(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key to authenticate with the Axia API.
            </DialogDescription>
          </DialogHeader>

          {!newlyCreatedKey ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Production API, CI/CD Pipeline"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateKey();
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Give your key a descriptive name to identify it later.
                  </p>
                </div>

                <div className="bg-muted p-3 rounded-lg border flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">
                      Security Notice
                    </p>
                    <p>
                      The full API key will only be shown once after creation.
                      Make sure to copy it and store it securely.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-row gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateKey}
                  disabled={isCreating || !newKeyName.trim()}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Generate Key
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-600 mb-2">
                    API Key Created Successfully
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-3 py-2 rounded font-mono break-all select-all flex-1">
                      {newlyCreatedKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => copyKey(newlyCreatedKey)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    Copy this key now — you won't be able to see it again.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewlyCreatedKey(null);
                  }}
                  className="w-full"
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Key Confirmation */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will immediately disable the API key. Any applications using
                this key will lose access.
              </p>
              <p className="font-semibold text-foreground">
                This action cannot be undone. You'll need to generate a new key
                if you want to restore access.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeKey}
              disabled={isRevoking}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Key"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
