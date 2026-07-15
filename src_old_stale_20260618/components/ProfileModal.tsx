import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useTheme } from "@/components/ThemeProvider";
import { LogOut, User, Zap, Mail, DollarSign, FileText, Lock, Copy, Check } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export function ProfileModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { tier: subscriptionTier, setTier: setSubscriptionTier } = useSubscriptionTier();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuthActions();
  const [copied, setCopied] = useState(false);

  // Profile state
  const [profileName, setProfileName] = useState("Freelancer User");
  const [profileEmail, setProfileEmail] = useState(localStorage.getItem("userEmail") || "user@example.com");
  const [profileHourlyRate, setProfileHourlyRate] = useState("50");
  const [profileBio, setProfileBio] = useState("Experienced freelancer focused on quality work");

  useEffect(() => {
    function handleOpenProfileModal() {
      setIsOpen(true);
    }

    window.addEventListener("openProfileModal", handleOpenProfileModal as EventListener);
    return () => window.removeEventListener("openProfileModal", handleOpenProfileModal as EventListener);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const handleSaveProfile = () => {
    localStorage.setItem("userEmail", profileEmail);
    toast.success("Profile updated successfully");
  };

  const handleTierChange = (newTier: 'free' | 'starter' | 'pro' | 'expert' | 'client') => {
    setSubscriptionTier(newTier);
    toast.success(`Tier changed to ${newTier}`);
  };

  const handleThemeToggle = (enabled: boolean) => {
    setTheme(enabled ? "dark" : "light");
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(profileEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Profile & Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage your Axia account and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted border border-border">
            <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
            <TabsTrigger value="professional" className="text-xs">Professional</TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs">Appearance</TabsTrigger>
            <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Full Name</label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="bg-background border-border text-foreground"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Email Address</label>
                <div className="flex gap-2">
                  <Input
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="bg-background border-border text-foreground"
                    placeholder="your@email.com"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyEmail}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Hourly Rate ($)</label>
                <Input
                  type="number"
                  value={profileHourlyRate}
                  onChange={(e) => setProfileHourlyRate(e.target.value)}
                  className="bg-background border-border text-foreground"
                  placeholder="50"
                />
              </div>

              <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Current Plan
                  </span>
                  <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded capitalize">
                    {subscriptionTier}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {subscriptionTier === "free"
                    ? "Upgrade to unlock advanced protection features"
                    : "Thank you for your subscription!"}
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground block">Change Tier (Dev)</label>
                  <select
                    value={subscriptionTier}
                    onChange={(e) => handleTierChange(e.target.value as 'free' | 'starter' | 'pro' | 'expert' | 'client')}
                    className="w-full bg-background border border-border text-foreground rounded px-3 py-2 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="expert">Expert</option>
                    <option value="client">Client</option>
                  </select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Professional Information Tab */}
          <TabsContent value="professional" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Professional Bio</label>
                <Textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value.slice(0, 500))}
                  className="bg-background border-border text-foreground min-h-24"
                  placeholder="Tell us about your professional background..."
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{profileBio.length}/500 characters</p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="text-sm font-medium text-foreground mb-2">Protection Metrics</div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Axia Protection:</span>
                    <span className="text-emerald-500 dark:text-emerald-400">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hours Protected:</span>
                    <span className="text-foreground">124.5h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Denial Rate:</span>
                    <span className="text-foreground">0%</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="text-sm font-medium text-foreground mb-3">Platform Connections</div>
                <div className="space-y-2">
                  {["Upwork", "Fiverr", "Toptal"].map((platform) => (
                    <div key={platform} className="flex items-center justify-between p-2 bg-background rounded">
                      <span className="text-xs text-foreground">{platform}</span>
                      <Button size="sm" variant="outline" className="h-6 text-xs border-border text-foreground hover:bg-muted">
                        Connect
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <div className="text-sm font-medium text-foreground">Dark Mode</div>
                  <p className="text-xs text-muted-foreground mt-1">Enable dark theme for the application</p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={handleThemeToggle}
                  className="ml-auto"
                />
              </div>

              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="text-sm font-medium text-foreground mb-2">Theme Preview</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-background rounded border border-border text-center">
                    <div className="text-xs text-muted-foreground">Light Mode</div>
                  </div>
                  <div className="p-3 bg-muted rounded border border-border text-center">
                    <div className="text-xs text-muted-foreground">Dark Mode</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
              <div className="p-3 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-icon-blue" />
                  <span className="text-sm font-medium text-foreground">Account Security</span>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start border-border text-foreground hover:bg-muted">
                    <Mail className="w-4 h-4 mr-2" />
                    Change Email
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-border text-foreground hover:bg-muted">
                    <Lock className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="text-sm font-medium text-foreground mb-2">Session Information</div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Last Login:</span>
                    <span className="text-foreground">Today at 10:30 AM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Sessions:</span>
                    <span className="text-foreground">1</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-sm font-medium text-red-500 dark:text-red-400 mb-2">Danger Zone</div>
                <Button
                  onClick={handleSignOut}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-6 pt-4 border-t border-border">
          <Button
            onClick={handleSaveProfile}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Save Changes
          </Button>
          <Button
            onClick={() => setIsOpen(false)}
            variant="outline"
            className="flex-1 border-border text-foreground hover:bg-muted"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
