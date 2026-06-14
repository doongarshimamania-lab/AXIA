import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link as LinkIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { useQuery, useMutation, useConvexAuth, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { PageLayout } from "@/components/design-system/PageLayout";

type Platform = "upwork" | "fiverr" | "toptal" | "freelancer";

const platformLabels: Record<Platform, string> = {
  upwork: "Upwork",
  fiverr: "Fiverr",
  toptal: "Toptal",
  freelancer: "Freelancer.com",
};

const platformColors: Record<Platform, string> = {
  upwork: "#14A800",
  fiverr: "#1DBF73",
  toptal: "#204ECF",
  freelancer: "#29B2FE",
};

export default function PlatformIntegrations() {
  const { isAuthenticated } = useConvexAuth();

  // Fetch real platform connections from Convex
  const connections = useQuery(
    isAuthenticated ? api.platforms.platformConnections.getPlatformConnectionStatus : "skip",
    {}
  );

  // Mutations for connect / disconnect
  const initiateConnection = useMutation(
    isAuthenticated ? api.platforms.platformAuth.initiatePlatformConnection : null
  );
  const completeConnection = useMutation(
    isAuthenticated ? api.platforms.platformAuth.completePlatformConnection : null
  );
  const disconnectPlatform = useMutation(
    isAuthenticated ? api.platforms.platformAuth.disconnectPlatform : null
  );

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const platforms: Platform[] = ["upwork", "fiverr", "toptal", "freelancer"];

  // Build a lookup from the Convex query result
  const connectionMap = new Map<string, { status: string; connectedAt?: number; lastSyncedAt?: number }>();
  if (connections && Array.isArray(connections)) {
    for (const c of connections) {
      connectionMap.set(c.platform, {
        status: c.status,
        connectedAt: c.connectedAt,
        lastSyncedAt: c.lastSyncedAt,
      });
    }
  }

  const getConnectionStatus = (platform: Platform) => {
    const conn = connectionMap.get(platform);
    if (conn && (conn.status === "connected" || conn.status === "pending")) {
      return conn;
    }
    return null;
  };

  const getConnectionRaw = (platform: Platform) => {
    return connectionMap.get(platform);
  };

  const handleConnectClick = (platform: Platform) => {
    setSelectedPlatform(platform);
    setShowConnectModal(true);
  };

  const handleDisconnectClick = (platform: Platform) => {
    setSelectedPlatform(platform);
    setShowDisconnectDialog(true);
  };

  const handleConnect = async () => {
    if (!selectedPlatform) return;
    setIsConnecting(true);
    try {
      // Step 1: Initiate connection (creates pending record)
      const result = await initiateConnection({ platform: selectedPlatform });

      if (result?.alreadyConnected) {
        toast.success(`Already connected to ${platformLabels[selectedPlatform]}!`);
        setShowConnectModal(false);
        setSelectedPlatform(null);
        setIsConnecting(false);
        return;
      }

      // Step 2: Complete connection (simulated auto-complete for demo)
      if (result?.connectionId) {
        await completeConnection({
          connectionId: result.connectionId,
          platformUserId: `demo_${selectedPlatform}_user`,
          platformEmail: `user@${selectedPlatform}.com`,
        });
      }

      toast.success(`Connected to ${platformLabels[selectedPlatform]}!`, {
        description: "Importing your data...",
      });
      setShowConnectModal(false);
      setSelectedPlatform(null);
    } catch (err: any) {
      toast.error("Connection failed", {
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedPlatform) return;
    setIsDisconnecting(true);
    try {
      const result = await disconnectPlatform({ platform: selectedPlatform });
      const deletedRecords = result?.deletedRecords ?? 0;
      toast.success(`Disconnected from ${platformLabels[selectedPlatform]}`, {
        description: `Deleted ${deletedRecords} record${deletedRecords !== 1 ? "s" : ""}`,
      });
      setShowDisconnectDialog(false);
      setSelectedPlatform(null);
    } catch (err: any) {
      toast.error("Disconnect failed", {
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // ─── Demo mode (not authenticated) ────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground">
        <PageLayout>
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Platform Connections
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Connect and manage your professional platforms
            </p>
          </div>

          <Card className="mb-6 border-dashed">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <LinkIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Demo Mode</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Sign in to connect your professional platforms and sync your work data for real-time income protection.
              </p>
            </CardContent>
          </Card>

          {/* Show static preview cards */}
          <Card>
            <CardHeader>
              <CardTitle>Available Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {platforms.map((platform) => (
                  <div
                    key={platform}
                    className="flex items-center justify-between p-4 rounded-lg bg-card border border-border opacity-60"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                        style={{ backgroundColor: platformColors[platform] }}
                      >
                        {platformLabels[platform][0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground text-base font-semibold">
                          {platformLabels[platform]}
                        </div>
                        <div className="text-sm text-muted-foreground">Not connected</div>
                      </div>
                    </div>
                    <Button variant="outline" disabled>
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </PageLayout>
      </div>
    );
  }

  // ─── Loading state ────────────────────────────────────────────────────────
  const { isDisconnected } = useConvexConnectionState();
  const isLoading = connections === undefined;
  const loadingTimedOut = useQueryTimeout(isLoading, 3000);
  const showLoading = isLoading && !loadingTimedOut && !isDisconnected;

  if (showLoading) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground">
        <PageLayout>
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Platform Connections
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Connect and manage your professional platforms
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Connected Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-24 rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </PageLayout>
      </div>
    );
  }

  // ─── Authenticated view ───────────────────────────────────────────────────
  return (
    <>
      <div className="w-full min-h-screen bg-background text-foreground">
        <PageLayout>
            <div className="mb-6">
              <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
                Platform Connections
              </h1>
              <p className="text-[16px] text-muted-foreground">
                Connect and manage your professional platforms
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Connected Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {platforms.map((platform) => {
                    const connection = getConnectionStatus(platform);
                    const rawConnection = getConnectionRaw(platform);
                    const isConnected = !!connection && connection.status === "connected";
                    const isPending = !!connection && connection.status === "pending";
                    const isError = rawConnection?.status === "error";

                    return (
                      <div
                        key={platform}
                        className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                            style={{ backgroundColor: platformColors[platform] }}
                          >
                            {platformLabels[platform][0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-foreground text-base font-semibold">
                                {platformLabels[platform]}
                              </div>
                              {isConnected && (
                                <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                  Connected
                                </Badge>
                              )}
                              {isPending && (
                                <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                  Pending
                                </Badge>
                              )}
                              {isError && (
                                <Badge variant="default" className="bg-red-500/10 text-red-600 border-red-500/20">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Error
                                </Badge>
                              )}
                            </div>
                            {isConnected && connection.lastSyncedAt && (
                              <div className="text-sm text-muted-foreground">
                                Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
                              </div>
                            )}
                            {isPending && (
                              <div className="text-sm text-muted-foreground">
                                Connection in progress...
                              </div>
                            )}
                            {isError && (
                              <div className="text-sm text-red-500">
                                Connection error — try reconnecting
                              </div>
                            )}
                            {!isConnected && !isPending && !isError && (
                              <div className="text-sm text-muted-foreground">
                                Not connected
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isConnected ? (
                            <Button
                              variant="outline"
                              onClick={() => handleDisconnectClick(platform)}
                            >
                              Disconnect
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleConnectClick(platform)}
                            >
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </PageLayout>
        </div>

      {/* Connect Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Connect {selectedPlatform && platformLabels[selectedPlatform]}
            </DialogTitle>
            <DialogDescription>
              Axia needs access to protect your income
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm font-semibold">
              We'll access:
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Your profile information (name, email, hourly rate)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Work history and time tracking data
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Earnings and payment information
                </p>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground italic">
                <strong className="text-foreground">Why we need this:</strong> Axia analyzes your work patterns to ensure
                they meet platform requirements, preventing payment rejections before they happen.
              </p>
            </div>

            <div className="bg-muted p-3 rounded-lg border-l-4 border-primary">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Your data is secure:</strong> We only store the minimum required information,
                encrypt sensitive data, and you can disconnect anytime.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConnectModal(false)}
              disabled={isConnecting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Connect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect {selectedPlatform && platformLabels[selectedPlatform]}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will permanently remove:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All imported work history</li>
                <li>Earnings and payment data</li>
                <li>Platform-specific protection settings</li>
              </ul>
              <p className="font-semibold text-foreground">
                You can reconnect anytime, but data will need to be re-imported.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

