import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link as LinkIcon, Loader2, CheckCircle2 } from "lucide-react";
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
  const [connections, setConnections] = useState([
    { platform: "upwork" as Platform, status: "connected" as const, lastSyncedAt: Date.now() - 3600000 },
    { platform: "fiverr" as Platform, status: "disconnected" as const }
  ]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const platforms: Platform[] = ["upwork", "fiverr", "toptal", "freelancer"];

  const getConnectionStatus = (platform: Platform) => {
    return connections.find((c) => c.platform === platform && c.status === "connected");
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
    const newConn = { platform: selectedPlatform, status: "connected" as const, lastSyncedAt: Date.now() };
    setConnections(prev => [...prev.filter(c => c.platform !== selectedPlatform), newConn]);
    toast.success(`Connected to ${platformLabels[selectedPlatform]}!`, { description: "Importing your data..." });
    setShowConnectModal(false);
    setSelectedPlatform(null);
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    if (!selectedPlatform) return;
    setIsDisconnecting(true);
    setConnections(prev => prev.filter(c => c.platform !== selectedPlatform));
    toast.success(`Disconnected from ${platformLabels[selectedPlatform]}`, { description: "Deleted 5 records" });
    setShowDisconnectDialog(false);
    setSelectedPlatform(null);
    setIsDisconnecting(false);
  };

  return (
    <>
      <div className="w-full min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
              <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
                Platform Connections
              </h1>
              <p className="text-[16px] text-muted-foreground">
                Connect and manage your freelance platforms
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
                    const isConnected = !!connection;
                    
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
                            </div>
                            {isConnected && connection.lastSyncedAt && (
                              <div className="text-sm text-muted-foreground">
                                Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
                              </div>
                            )}
                            {!isConnected && (
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
          </div>
        </div>

      {/* Connect Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Connect {selectedPlatform && platformLabels[selectedPlatform]}
            </DialogTitle>
            <DialogDescription>
              TIMELock needs access to protect your income
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
                <strong className="text-foreground">Why we need this:</strong> TIMELock analyzes your work patterns to ensure
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
