import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Copy, RotateCcw, X, Eye, EyeOff } from "lucide-react";
// import removed to avoid deep type instantiation: useQuery/useMutation
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";

export function ExtensionTokenSection() {
  const [showToken, setShowToken] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Local token management (avoid Convex types)
  const { isAuthenticated } = useAuth();
  const isGuest = !isAuthenticated;

  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | undefined>(undefined);
  const [lastUsed, setLastUsed] = useState<number | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("extension_token");
      if (raw) {
        const data = JSON.parse(raw) as { token: string; expiresAt?: number; lastUsed?: number };
        setToken(data.token);
        setExpiresAt(data.expiresAt);
        setLastUsed(data.lastUsed);
      }
    } catch {}
  }, []);

  const saveToken = (t: string | null) => {
    if (!t) {
      localStorage.removeItem("extension_token");
      setToken(null);
      setExpiresAt(undefined);
      setLastUsed(undefined);
      return;
    }
    const data = {
      token: t,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      lastUsed: Date.now(),
    };
    localStorage.setItem("extension_token", JSON.stringify(data));
    setToken(data.token);
    setExpiresAt(data.expiresAt);
    setLastUsed(data.lastUsed);
  };

  const randomHex = (len = 64) => {
    const bytes = new Uint8Array(len / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleGenerateToken = async () => {
    console.log("[handleGenerateToken] Starting token generation...");
    
    if (!import.meta.env.VITE_CONVEX_URL) {
      console.error("[handleGenerateToken] VITE_CONVEX_URL not set");
      toast.error("Configuration Error", {
        description: "VITE_CONVEX_URL is not configured. Please set it in your environment variables.",
      });
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading("Generating extension token...");

    try {
      const newToken = randomHex(64);
      saveToken(newToken);

      const pairingCode = `${import.meta.env.VITE_CONVEX_URL}::${newToken}`;
      try {
        await navigator.clipboard.writeText(pairingCode);
        console.log("[handleGenerateToken] Pairing code copied to clipboard");
      } catch (clipboardError) {
        console.error("[handleGenerateToken] Clipboard write failed:", clipboardError);
        toast.error("Token generated but clipboard copy failed", {
          description: "Please copy the token manually from the field below",
        });
      }

      toast.success("Extension token generated!", {
        description: "Pairing code copied to clipboard",
        id: loadingToast,
      });
      setShowToken(true);
    } catch (error: any) {
      console.error("[handleGenerateToken] Error:", error);
      toast.error("Token generation failed", {
        description: error?.message || "Failed to generate token",
        id: loadingToast,
      });
    } finally {
      setIsGenerating(false);
      console.log("[handleGenerateToken] Completed");
    }
  };

  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  const handleRotateToken = async () => {
    console.log("[handleRotateToken] Starting token rotation...");
    
    // Validate VITE_CONVEX_URL is set
    if (!import.meta.env.VITE_CONVEX_URL) {
      console.error("[handleRotateToken] VITE_CONVEX_URL not set");
      toast.error("Configuration Error", {
        description: "VITE_CONVEX_URL is not configured. Please set it in your environment variables.",
      });
      return;
    }
    
    // Show confirmation dialog instead of using native confirm()
    setShowRotateConfirm(true);
  };

  const confirmRotateToken = async () => {
    console.log("[confirmRotateToken] User confirmed rotation");
    setShowRotateConfirm(false);
    
    setIsGenerating(true);
    const loadingToast = toast.loading("Rotating extension token...");
    
    try {
      const newToken = randomHex(64);
      saveToken(newToken);

      const pairingCode = `${import.meta.env.VITE_CONVEX_URL}::${newToken}`;
      try {
        await navigator.clipboard.writeText(pairingCode);
        console.log("[handleRotateToken] New pairing code copied to clipboard");
      } catch (clipboardError) {
        console.error("[handleRotateToken] Clipboard write failed:", clipboardError);
      }
      
      toast.success("Token rotated successfully!", {
        description: "New pairing code copied to clipboard",
        id: loadingToast,
      });
      setShowToken(true);
    } catch (error: any) {
      console.error("[handleRotateToken] Error:", error);
      toast.error("Token rotation failed", {
        description: error?.message || "Failed to rotate token",
        id: loadingToast,
      });
    } finally {
      setIsGenerating(false);
      console.log("[handleRotateToken] Completed");
    }
  };

  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const handleRevokeToken = async () => {
    setShowRevokeConfirm(true);
  };

  const confirmRevokeToken = async () => {
    console.log("[confirmRevokeToken] User confirmed revocation");
    setShowRevokeConfirm(false);
    try {
      saveToken(null);
      setShowToken(false);
      toast.success("Token revoked successfully");
    } catch (error) {
      console.error("[handleRevokeToken] Error:", error);
      toast.error("Failed to revoke token");
    }
  };

  const formatLastUsed = (timestamp?: number) => {
    if (!timestamp) return "Never used";
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const formatExpiry = (expiresAt?: number) => {
    if (!expiresAt) return "";
    const now = Date.now();
    const diff = expiresAt - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days <= 0) return "Expired";
    if (days === 1) return "Expires in 1 day";
    return `Expires in ${days} days`;
  };

  return (
    <>
      <AlertDialog open={showRotateConfirm} onOpenChange={setShowRotateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate Extension Token?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate your current token and you'll need to re-pair your extension with the new token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              console.log("[handleRotateToken] User cancelled rotation");
              setShowRotateConfirm(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRotateToken}>
              Rotate Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Extension Token?</AlertDialogTitle>
            <AlertDialogDescription>
              Your extension will stop working until you generate a new token. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRevokeConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevokeToken} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="bg-card rounded-xl shadow-sm border border-border p-4">
      <h3 className="font-[Space_Grotesk] font-semibold text-lg text-foreground mb-2">
        Chrome Extension
      </h3>
      <p className="text-muted-foreground text-sm mb-3">
        Connect your Axia Chrome Extension for real-time evidence collection
      </p>
      
      {isGuest ? (
        <div className="space-y-3">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
            <p className="text-sm text-foreground font-medium mb-2">
              ⚠️ Guest Login Restriction
            </p>
            <p className="text-xs text-muted-foreground">
              Extension pairing is not available for guest logins. Please create a full account to use the Chrome Extension and enable real-time evidence collection.
            </p>
          </div>
          <Button
            disabled
            className="w-full py-3 bg-muted text-muted-foreground cursor-not-allowed"
          >
            Generate Extension Token (Account Required)
          </Button>
        </div>
      ) : token ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Token:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotateToken}
              disabled={isGenerating}
              className="h-8 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {isGenerating ? "Generating..." : "Generate New Token"}
            </Button>
          </div>

          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={`${import.meta.env.VITE_CONVEX_URL}::${token ?? ""}`}
              readOnly
              className="font-mono bg-muted pr-20 text-sm"
              style={{ fontFamily: "Space Grotesk, monospace" }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const pairingCode = `${import.meta.env.VITE_CONVEX_URL}::${token}`;
                try {
                  await navigator.clipboard.writeText(pairingCode);
                  toast.success("Pairing code copied to clipboard");
                } catch (error) {
                  toast.error("Failed to copy pairing code");
                }
              }}
              className="flex items-center flex-1"
              size="sm"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Pairing Code
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevokeToken}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4 mr-1" />
              Revoke
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Last used: {formatLastUsed(lastUsed)}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {formatExpiry(expiresAt)}
            </span>
            <span className="text-destructive font-medium">
              Never share your token
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            onClick={handleGenerateToken}
            disabled={isGenerating}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-white"
          >
            {isGenerating ? "Generating..." : "Generate Extension Token"}
          </Button>
          
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <p className="text-xs text-foreground">
              <span className="font-medium">⚠️ Important:</span> You must be logged into the Dashboard to generate a token. If you see "Not authenticated" errors, please refresh the page and ensure you're logged in.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-accent/50 rounded-md border border-border">
        <p className="text-sm text-foreground">
          <span className="font-medium">How to connect:</span> Copy the pairing code above and paste it into your Chrome Extension. The code contains both your secure token and deployment URL in one string.
        </p>
      </div>
    </Card>
    </>
  );
}