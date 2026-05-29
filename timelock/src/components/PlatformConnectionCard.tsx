import { useState } from "react";
// Removed Convex hooks to avoid deep type instantiation
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CheckCircle2, Circle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Platform = "upwork" | "fiverr" | "toptal" | "freelancer";

const platformLabels: Record<Platform, string> = {
  upwork: "Upwork",
  fiverr: "Fiverr",
  toptal: "Toptal",
  freelancer: "Freelancer.com",
};

const platformColors: Record<Platform, string> = {
  upwork: "bg-[#14A800]",
  fiverr: "bg-[#1DBF73]",
  toptal: "bg-[#204ECF]",
  freelancer: "bg-[#29B2FE]",
};

export function PlatformConnectionCard() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Add: local mock connections state
  type Connection = { platform: Platform; status: "connected" | "disconnected"; lastSyncedAt?: number };
  const [connectionsState, setConnectionsState] = useState<Array<Connection>>([
    { platform: "upwork", status: "connected", lastSyncedAt: Date.now() - 24 * 60 * 60 * 1000 },
    { platform: "fiverr", status: "disconnected" },
    { platform: "toptal", status: "disconnected" },
    { platform: "freelancer", status: "connected", lastSyncedAt: Date.now() - 2 * 24 * 60 * 60 * 1000 },
  ]);

  const platforms: Platform[] = ["upwork", "fiverr", "toptal", "freelancer"];

  const getConnectionStatus = (platform: Platform) => {
    // Use local mock state
    return connectionsState.find((c) => c.platform === platform && c.status === "connected") || null;
  };

  const handleConnectClick = (platform: Platform) => {
    setSelectedPlatform(platform);
    setShowConnectModal(true);
  };

  const handleDisconnectClick = (platform: Platform) => {
    setSelectedPlatform(platform);
    setShowDisconnectDialog(true);
  };

  // Replace Convex flow with local state updates
  const handleConnect = async () => {
    if (!selectedPlatform) return;

    setIsConnecting(true);
    setTimeout(() => {
      setConnectionsState((prev) => {
        const others = prev.filter((c) => c.platform !== selectedPlatform);
        return [
          ...others,
          { platform: selectedPlatform, status: "connected", lastSyncedAt: Date.now() },
        ];
      });

      toast.success(`Connected to ${platformLabels[selectedPlatform]}!`, {
        description: "Importing your data...",
      });

      setShowConnectModal(false);
      setSelectedPlatform(null);
      setIsConnecting(false);
    }, 600);
  };

  const handleDisconnect = async () => {
    if (!selectedPlatform) return;

    setIsDisconnecting(true);
    setTimeout(() => {
      setConnectionsState((prev) =>
        prev.map((c) =>
          c.platform === selectedPlatform ? { platform: c.platform, status: "disconnected" } : c
        )
      );

      toast.success(`Disconnected from ${platformLabels[selectedPlatform]}`, {
        description: `Deleted 0 records`,
      });

      setShowDisconnectDialog(false);
      setSelectedPlatform(null);
      setIsDisconnecting(false);
    }, 400);
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Platform Connections</CardTitle>
          <CardDescription>
            Connect your freelance platforms to enable full income protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.map((platform) => {
              const connection = getConnectionStatus(platform);
              const isConnected = !!connection;

              return (
                <div
                  key={platform}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-background"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${platformColors[platform]} flex items-center justify-center text-white font-bold`}>
                      {platformLabels[platform][0]}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {platformLabels[platform]}
                      </div>
                      {isConnected && connection.lastSyncedAt && (
                        <div className="text-xs text-muted-foreground">
                          Last synced: {new Date(connection.lastSyncedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnectClick(platform)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-muted-foreground">
                          <Circle className="w-3 h-3 mr-1" />
                          Not connected
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleConnectClick(platform)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Connect
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
            <div className="text-sm font-semibold text-foreground">
              We'll access:
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm text-foreground">
                  Your profile information (name, email, hourly rate)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm text-foreground">
                  Work history and time tracking data
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm text-foreground">
                  Earnings and payment information
                </p>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground italic">
                <strong>Why we need this:</strong> Axia analyzes your work patterns to ensure
                they meet platform requirements, preventing payment rejections before they happen.
              </p>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg border-l-4 border-primary">
              <p className="text-xs text-foreground">
                <strong>Your data is secure:</strong> We only store the minimum required information,
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
              className="flex-1 bg-primary hover:bg-primary/90"
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