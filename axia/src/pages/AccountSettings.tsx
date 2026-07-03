import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useTheme } from "@/components/ThemeProvider";
import {
  User,
  Zap,
  HelpCircle,
  Shield,
  LogOut,
  Copy,
  Check,
  Mail,
  Lock,
  CheckCircle2,
  X,
  Crown,
  Rocket,
  ChevronDown,
  ChevronUp,
  CreditCard,
  BarChart3,
  HardDrive,
  Users,
  Brain,
  Globe,
  Star,
  MessageSquare,
  ArrowUpRight,
  Search,
  Headphones,
  Phone,
  Bug,
  Lightbulb,
  BookOpen,
  PlayCircle,
  ChevronRight,
  Send,
  Loader2,
  ExternalLink,
  ArrowRight,
  Settings,
  FileText,
  Clock,
  AlertCircle,
  CircleDot,
  Sparkles,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useAction, useConvexAuth, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { PageLayout } from "@/components/design-system/PageLayout";

// ─── Navigation Items ────────────────────────────────────────────────────────

type SettingsSection = "profile" | "subscription" | "connections" | "help" | "security";

const navItems: { key: SettingsSection; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "subscription", label: "Subscription", icon: Zap },
  { key: "connections", label: "Connections", icon: Globe },
  { key: "help", label: "Help & Support", icon: HelpCircle },
  { key: "security", label: "Security", icon: Shield },
];

// ─── Tier Definitions ────────────────────────────────────────────────────────

type TierKey = "free" | "starter" | "pro" | "expert";

interface TierInfo {
  key: TierKey;
  name: string;
  price: number;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  badge?: string;
  highlighted?: boolean;
}

const TIERS: TierInfo[] = [
  {
    key: "free",
    name: "Free",
    price: 0,
    description: "Basic protection for freelancers getting started",
    icon: <Shield className="w-5 h-5" />,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
  },
  {
    key: "starter",
    name: "Starter",
    price: 19,
    description: "Enhanced protection with evidence collection",
    icon: <Rocket className="w-5 h-5" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    key: "pro",
    name: "Pro",
    price: 49,
    description: "Complete protection with dispute resolution",
    icon: <Star className="w-5 h-5" />,
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
    badge: "Popular",
    highlighted: true,
  },
  {
    key: "expert",
    name: "Expert",
    price: 99,
    description: "Enterprise-grade with team validation & WCVM",
    icon: <Crown className="w-5 h-5" />,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
];

// ─── Help Center Types ────────────────────────────────────────────────────

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AccountSettings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  // Listen for navigation events from child components (e.g. "Manage" button in Profile)
  useEffect(() => {
    function handleNavigateToConnections() {
      setActiveSection("connections");
    }
    window.addEventListener("navigateToConnections", handleNavigateToConnections as EventListener);
    return () => window.removeEventListener("navigateToConnections", handleNavigateToConnections as EventListener);
  }, []);
  const { tier: subscriptionTier, setTier: setSubscriptionTier } = useSubscriptionTier();
  const { theme, setTheme } = useTheme();
  // ponytail: use wrapped signOut from useAuth (clears localStorage + reloads)
  const { signOut } = useAuth();

  // ── Profile State ──
  // CRITICAL FIX (2026-06-22): Previously these defaulted to hardcoded values
  // ("Agency User", "user@example.com", "50", "Experienced professional...")
  // and `handleSaveProfile` only wrote to localStorage. This meant data the
  // user entered during onboarding (name, hourlyRate, bio) was NEVER shown
  // here, and edits the user made here were NEVER persisted to Convex.
  //
  // Now we:
  //   1. Fetch the real profile from Convex via `api.users.getProfile`
  //   2. Sync it into local form state once loaded
  //   3. On save, call `api.users.updateProfile` mutation to persist changes
  const profile = useQuery(api.users.getProfile, {});
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileHourlyRate, setProfileHourlyRate] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync Convex profile → local form state, once.
  // We use a `profileLoaded` flag instead of comparing values so that the
  // user's in-progress edits are not overwritten by re-renders.
  useEffect(() => {
    if (profile && !profileLoaded) {
      setProfileName(profile.name || "");
      setProfileEmail(profile.email || "");
      setProfileHourlyRate(
        profile.hourlyRate !== undefined && profile.hourlyRate !== null
          ? String(profile.hourlyRate)
          : ""
      );
      setProfileBio(profile.professionalBio || "");
      setProfileLoaded(true);
    }
  }, [profile, profileLoaded]);

  // ── Help State ──
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // ── Sign Out Confirmation ──
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(profileEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async () => {
    // Persist profile changes to Convex (no more localStorage-only writes).
    // ponytail: previously the email field was editable but never sent to
    // the backend — api.users.updateProfile doesn't accept email as an arg
    // (it would let users bypass the password-verification gate). Now if
    // the user has changed their email, we call the changeEmail action
    // (which requires their current password). Since we don't have the
    // password here in the Profile form, we detect the email change and
    // route the user to the Security tab where the proper EmailChangeDialog
    // collects the password. (Audit item #17.)
    setIsSavingProfile(true);
    try {
      const emailChanged =
        !!profile &&
        !!profileEmail &&
        profile.email !== profileEmail &&
        profile.email.toLowerCase() !== profileEmail.trim().toLowerCase();

      await updateProfileMutation({
        name: profileName.trim() || undefined,
        hourlyRate:
          profileHourlyRate && !isNaN(Number(profileHourlyRate))
            ? Number(profileHourlyRate)
            : undefined,
        professionalBio: profileBio.trim() || undefined,
      });

      if (emailChanged) {
        toast.info("Email change requires verification", {
          description:
            "For security, email changes are verified with your current password. Open the Security tab → Email Address → Change to complete the change.",
          duration: 8000,
        });
        // Don't roll back the field — let the user see what they typed so
        // they know what they were trying to change. The actual email in
        // the DB is unchanged until they complete the Security flow.
      } else {
        toast.success("Profile updated successfully");
      }
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      toast.error(err?.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleTierChange = (newTier: TierKey) => {
    setSubscriptionTier(newTier);
    toast.success(`Subscription changed to ${newTier}`);
  };

  const handleThemeToggle = (enabled: boolean) => {
    setTheme(enabled ? "dark" : "light");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    // ponytail: previously this setTimeout'd for 1.5s then toasted "Support
    // ticket submitted!" — but no ticket was ever persisted anywhere, so the
    // user's issue was silently dropped. There is no support-ticket backend
    // yet. Instead of faking success, we now open the user's mail client with
    // a prefilled message to hello@axia.com so the request actually reaches
    // a human. (Audit item #11)
    setIsSubmittingTicket(true);
    const subject = encodeURIComponent(`[Support] ${ticketSubject.trim()}`);
    const body = encodeURIComponent(
      `${ticketMessage.trim()}\n\n— Sent from Axia Account Settings`
    );
    window.location.href = `mailto:hello@axia.com?subject=${subject}&body=${body}`;
    setIsSubmittingTicket(false);
    setTicketSubject("");
    setTicketMessage("");
    toast.success("Opening your email client", {
      description: "If nothing happened, email hello@axia.com directly.",
    });
  };

  // No mock articles - help articles will come from Convex when implemented

  return (
    <div className="w-full min-h-screen bg-background">
      <PageLayout>
        {/* Page Header */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-[32px] font-bold text-foreground tracking-tight mb-2">
            Account Settings
          </h1>
          <p className="text-sm md:text-[16px] text-muted-foreground">
            Manage your profile, subscription, get help, and secure your account.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Left Sidebar Navigation — horizontal tabs on mobile, vertical on desktop */}
          <nav className="w-full md:w-56 flex-shrink-0">
            <div className="bg-card border border-border rounded-xl p-2 space-y-1 md:sticky md:top-8 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {navItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeSection === key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === "profile" && (
                <ProfileSection
                  profileName={profileName}
                  setProfileName={setProfileName}
                  profileEmail={profileEmail}
                  setProfileEmail={setProfileEmail}
                  profileHourlyRate={profileHourlyRate}
                  setProfileHourlyRate={setProfileHourlyRate}
                  profileBio={profileBio}
                  setProfileBio={setProfileBio}
                  subscriptionTier={subscriptionTier}
                  handleTierChange={handleTierChange}
                  handleCopyEmail={handleCopyEmail}
                  copied={copied}
                  handleSaveProfile={handleSaveProfile}
                  isSavingProfile={isSavingProfile}
                  theme={theme}
                  handleThemeToggle={handleThemeToggle}
                />
              )}
              {activeSection === "subscription" && (
                <SubscriptionSection
                  subscriptionTier={subscriptionTier}
                  handleTierChange={handleTierChange}
                />
              )}
              {activeSection === "connections" && (
                <ConnectionsSection />
              )}
              {activeSection === "help" && (
                <HelpSection
                  ticketSubject={ticketSubject}
                  setTicketSubject={setTicketSubject}
                  ticketMessage={ticketMessage}
                  setTicketMessage={setTicketMessage}
                  isSubmittingTicket={isSubmittingTicket}
                  handleSubmitTicket={handleSubmitTicket}
                />
              )}
              {activeSection === "security" && (
                <SecuritySection
                  showSignOutConfirm={showSignOutConfirm}
                  setShowSignOutConfirm={setShowSignOutConfirm}
                  handleSignOut={handleSignOut}
                />
              )}
            </motion.div>
          </div>
        </div>
      </PageLayout>
    </div>
  );
}

// ─── Profile Section ─────────────────────────────────────────────────────────

function ProfileSection({
  profileName, setProfileName,
  profileEmail, setProfileEmail,
  profileHourlyRate, setProfileHourlyRate,
  profileBio, setProfileBio,
  subscriptionTier, handleTierChange,
  handleCopyEmail, copied,
  handleSaveProfile,
  isSavingProfile,
  theme, handleThemeToggle,
}: {
  profileName: string; setProfileName: (v: string) => void;
  profileEmail: string; setProfileEmail: (v: string) => void;
  profileHourlyRate: string; setProfileHourlyRate: (v: string) => void;
  profileBio: string; setProfileBio: (v: string) => void;
  subscriptionTier: string; handleTierChange: (t: TierKey) => void;
  handleCopyEmail: () => void; copied: boolean;
  handleSaveProfile: () => void;
  isSavingProfile: boolean;
  theme: string; handleThemeToggle: (e: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Personal Information
          </CardTitle>
          <CardDescription>Your personal details and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Full Name</Label>
            <Input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="bg-background border-border"
              placeholder="Your name"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Email Address</Label>
            <div className="flex gap-2">
              <Input
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="bg-background border-border"
                placeholder="your@email.com"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyEmail}
                className="border-border hover:bg-accent"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {/* ponytail: helper text explaining the email-change flow.
                Previously the email field was editable but never persisted —
                the user typed a new email, clicked Save, saw 'Profile
                updated successfully', and the email was silently unchanged.
                Now we honestly tell the user that email changes require
                password verification in the Security tab. (Audit item #17.) */}
            <p className="text-xs text-muted-foreground mt-1.5">
              To change your email, edit it here then go to <strong>Security → Email Address → Change</strong> to verify with your password.
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Hourly Rate ($)</Label>
            <Input
              type="number"
              value={profileHourlyRate}
              onChange={(e) => setProfileHourlyRate(e.target.value)}
              className="bg-background border-border"
              placeholder="50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Professional Profile
          </CardTitle>
          <CardDescription>Your professional background and platform connections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Professional Bio</Label>
            <Textarea
              value={profileBio}
              onChange={(e) => setProfileBio(e.target.value.slice(0, 500))}
              className="bg-background border-border min-h-24"
              placeholder="Tell us about your professional background..."
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">{profileBio.length}/500 characters</p>
          </div>

          <div className="p-4 bg-primary/5 rounded-lg border border-border">
            <div className="text-sm font-medium mb-2">Protection Metrics</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Axia Protection:</span>
                <span className="text-emerald-500 font-medium">Active</span>
              </div>
              <div className="flex justify-between">
                <span>Hours Protected:</span>
                <span className="text-foreground font-medium">124.5h</span>
              </div>
              <div className="flex justify-between">
                <span>Denial Rate:</span>
                <span className="text-foreground font-medium">0%</span>
              </div>
            </div>
          </div>

          {/* Platform Connections — link to dedicated Connections tab */}
          <div className="p-4 bg-primary/5 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Platform Connections</div>
                <div className="text-xs text-muted-foreground mt-1">Manage Upwork, Fiverr, Toptal, and Freelancer.com connections</div>
              </div>
              <Button size="sm" variant="outline" className="border-border hover:bg-accent" onClick={() => {
                // Navigate to connections tab — we use the parent component's setActiveSection
                const event = new CustomEvent('navigateToConnections');
                window.dispatchEvent(event);
              }}>
                Manage <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how Axia looks for you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-border">
            <div>
              <div className="text-sm font-medium">Dark Mode</div>
              <p className="text-xs text-muted-foreground mt-1">
                {theme === "dark" ? "Dark theme is currently active" : "Light theme is currently active"}
              </p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={handleThemeToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isSavingProfile ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Subscription Section ────────────────────────────────────────────────────

function SubscriptionSection({
  subscriptionTier,
  handleTierChange,
}: {
  subscriptionTier: string;
  handleTierChange: (t: TierKey) => void;
}) {
  const [expandedTier, setExpandedTier] = useState<TierKey | null>(null);
  const { isAuthenticated } = useConvexAuth();
  const { isDisconnected } = useConvexConnectionState();

  const tierFeatures: Record<TierKey, { included: string[]; notIncluded: string[] }> = {
    free: {
      included: [
        "1 active project",
        "Basic evidence collection",
        "CSV evidence export",
        "Email support",
        "Community access",
      ],
      notIncluded: [
        "Browser extension",
        "Legal package export",
        "Dispute resolution",
        "Team collaboration",
        "WCVM verification",
      ],
    },
    starter: {
      included: [
        "5 active projects",
        "Enhanced evidence collection",
        "CSV + JSON export",
        "Browser extension",
        "Priority email support",
        "Scope deviation alerts",
      ],
      notIncluded: [
        "Legal package export",
        "Dispute resolution",
        "Team collaboration",
        "WCVM verification",
      ],
    },
    pro: {
      included: [
        "Unlimited projects",
        "Full evidence collection + timeline",
        "All export formats (CSV, JSON, PDF, Legal)",
        "Browser extension + auto-capture",
        "Dispute resolution assistant",
        "Scope deviation detection",
        "Payment pattern analysis",
      ],
      notIncluded: [
        "Team collaboration",
        "WCVM verification",
        "Custom integrations",
      ],
    },
    expert: {
      included: [
        "Unlimited projects",
        "Full evidence collection + timeline + WCVM",
        "All export formats + chain-of-custody",
        "Browser extension + auto-capture",
        "Dispute resolution + legal templates",
        "Team collaboration & validation",
        "WCVM cryptographic verification",
        "Custom integrations & API access",
        "Dedicated account manager",
      ],
      notIncluded: [],
    },
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Banner */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Your Subscription
          </CardTitle>
          <CardDescription>Current plan and available upgrades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-border">
            <div>
              <div className="text-sm text-muted-foreground">Current Plan</div>
              <div className="text-2xl font-bold capitalize">{subscriptionTier}</div>
            </div>
            <Badge className="bg-primary/20 text-primary border-0 capitalize text-sm">
              {subscriptionTier === "free" ? "Free Tier" : subscriptionTier === "starter" ? "Starter" : subscriptionTier === "pro" ? "Pro" : subscriptionTier === "expert" ? "Expert" : "Free Tier"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tier Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TIERS.map((tier) => {
          const isCurrent = subscriptionTier === tier.key;
          const features = tierFeatures[tier.key];
          const isExpanded = expandedTier === tier.key;

          return (
            <Card
              key={tier.key}
              className={`bg-card transition-all ${
                isCurrent
                  ? `border-2 ${tier.borderColor} ${tier.bgColor}`
                  : tier.highlighted
                  ? "border-primary/40 hover:border-primary/60"
                  : "border-border hover:border-primary/20"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${tier.bgColor}`}>
                      <div className={tier.color}>{tier.icon}</div>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tier.name}</CardTitle>
                      {tier.badge && (
                        <Badge className="bg-primary/20 text-primary border-0 text-[10px] ml-1">
                          {tier.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isCurrent && (
                    <Badge className="bg-primary text-primary-foreground border-0 text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-2">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold">${tier.price}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>

                <button
                  onClick={() => setExpandedTier(isExpanded ? null : tier.key)}
                  className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-3"
                >
                  {isExpanded ? "Hide" : "Show"} features
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {isExpanded && (
                  <div className="space-y-1.5">
                    {features.included.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {features.notIncluded.map((feature, i) => (
                      <div key={`no-${i}`} className="flex items-center gap-2 text-sm text-muted-foreground/60">
                        <X className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button variant="outline" className="w-full border-border" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleTierChange(tier.key)}
                    className={`w-full ${
                      tier.highlighted
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : "bg-background border border-border hover:bg-accent text-foreground"
                    }`}
                    variant={tier.highlighted ? "default" : "outline"}
                  >
                    {subscriptionTier && TIERS.findIndex(t => t.key === subscriptionTier) > TIERS.findIndex(t => t.key === tier.key)
                      ? "Downgrade"
                      : "Upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Dev Tier Switcher */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Development: Quick Tier Switcher
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Switch between tiers for development and testing. In production, this would connect to a payment provider.
          </p>
          <div className="flex gap-2 flex-wrap">
            {(["free", "starter", "pro", "expert"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={subscriptionTier === t ? "default" : "outline"}
                onClick={() => handleTierChange(t)}
                className={subscriptionTier === t ? "bg-primary text-primary-foreground" : "border-border"}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Help & Support Section ──────────────────────────────────────────────────

function HelpSection({
  ticketSubject, setTicketSubject,
  ticketMessage, setTicketMessage,
  isSubmittingTicket, handleSubmitTicket,
}: {
  ticketSubject: string; setTicketSubject: (v: string) => void;
  ticketMessage: string; setTicketMessage: (v: string) => void;
  isSubmittingTicket: boolean; handleSubmitTicket: () => void;
}) {
  const [activeHelpTab, setActiveHelpTab] = useState<"articles" | "contact">("articles");

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: BookOpen, title: "Documentation", desc: "Browse guides and tutorials", action: () => setActiveHelpTab("articles") },
          { icon: MessageSquare, title: "Contact Support", desc: "Submit a support ticket", action: () => setActiveHelpTab("contact") },
        ].map(({ icon: Icon, title, desc, action }) => (
          <Card key={title} className="bg-card border-border cursor-pointer hover:border-primary/40 transition-colors" onClick={action}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">{title}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {[
          { key: "articles" as const, label: "Articles" },
          { key: "contact" as const, label: "Contact Support" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveHelpTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeHelpTab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Articles Tab - Coming Soon */}
      {activeHelpTab === "articles" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Help articles and guides</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center py-8">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">Coming Soon</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Help articles and documentation are being prepared. In the meantime, contact support if you need assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Support Tab */}
      {activeHelpTab === "contact" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>Submit a support ticket and we'll respond within 24 hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Subject</Label>
              <Input
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="bg-background border-border"
                placeholder="Brief description of your issue"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Message</Label>
              <Textarea
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                className="bg-background border-border min-h-32"
                placeholder="Describe your issue in detail..."
              />
            </div>
            <Button
              onClick={handleSubmitTicket}
              disabled={isSubmittingTicket}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmittingTicket ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Ticket
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Security Section ────────────────────────────────────────────────────────

function SecuritySection({
  showSignOutConfirm,
  setShowSignOutConfirm,
  handleSignOut,
}: {
  showSignOutConfirm: boolean;
  setShowSignOutConfirm: (v: boolean) => void;
  handleSignOut: () => void;
}) {
  // ponytail: real email-change + password-change state. Previously both
  // 'Change' buttons only fired toast.info pointing the user elsewhere.
  // Now we open real dialogs that call the new
  // api.accountSettings.{changeEmail, changePassword} actions, which
  // verify the current password via Convex Auth's retrieveAccount before
  // mutating. (Audit items #16, #17.)
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const changeEmailAction = useAction(api.accountSettings.changeEmail);
  const changePasswordAction = useAction(api.accountSettings.changePassword);
  const currentEmail = useQuery(api.accountSettings.getCurrentEmail, {});

  return (
    <div className="space-y-6">
      {/* Account Security */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Account Security
          </CardTitle>
          <CardDescription>Manage your account credentials and sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">Email Address</div>
                <div className="text-xs text-muted-foreground">Change your login email</div>
              </div>
            </div>
            {/* ponytail: RESTORED real email-change flow. Previously the
                button fired toast.info('Email hello@axia.com...') — no
                actual change happened. Now opens a dialog that collects
                newEmail + currentPassword and calls the changeEmail action. */}
            <Button
              variant="outline"
              size="sm"
              className="border-border hover:bg-accent"
              onClick={() => setShowEmailDialog(true)}
            >
              Change
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">Password</div>
                <div className="text-xs text-muted-foreground">Update your account password</div>
              </div>
            </div>
            {/* ponytail: RESTORED real password-change flow. Previously
                the button fired toast.info('Sign out, then click Forgot
                password...'). Now opens a dialog that collects
                currentPassword + newPassword and calls the changePassword
                action — no sign-out required. */}
            <Button
              variant="outline"
              size="sm"
              className="border-border hover:bg-accent"
              onClick={() => setShowPasswordDialog(true)}
            >
              Change
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Session Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-3 bg-primary/5 rounded-lg border border-border">
              <span className="text-muted-foreground">Last Login</span>
              <span className="font-medium">Today at 10:30 AM</span>
            </div>
            <div className="flex justify-between p-3 bg-primary/5 rounded-lg border border-border">
              <span className="text-muted-foreground">Active Sessions</span>
              <span className="font-medium">1</span>
            </div>
            <div className="flex justify-between p-3 bg-primary/5 rounded-lg border border-border">
              <span className="text-muted-foreground">Two-Factor Authentication</span>
              <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-xs">Not Enabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-card border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible account actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showSignOutConfirm ? (
            <Button
              onClick={() => setShowSignOutConfirm(true)}
              variant="outline"
              className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20 space-y-3">
              <p className="text-sm text-red-500 font-medium">Are you sure you want to sign out?</p>
              <p className="text-xs text-muted-foreground">You will be redirected to the login page and will need to sign in again to access your account.</p>
              <div className="flex gap-2">
                <Button
                  onClick={handleSignOut}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Yes, Sign Out
                </Button>
                <Button
                  onClick={() => setShowSignOutConfirm(false)}
                  variant="outline"
                  className="border-border hover:bg-accent"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ponytail: Email Change Dialog — wired to api.accountSettings.changeEmail.
          Previously the 'Change' button only fired toast.info pointing the
          user at support. Now collects newEmail + currentPassword and calls
          the changeEmail action, which verifies the password via
          retrieveAccount, checks the new email isn't taken, patches both
          authAccounts.providerAccountId + users.email, and invalidates all
          sessions so the user re-signs-in with the new email. */}
      <EmailChangeDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        currentEmail={currentEmail ?? ""}
        changeEmailAction={changeEmailAction}
        onSignOut={handleSignOut}
      />

      {/* ponytail: Password Change Dialog — wired to
          api.accountSettings.changePassword. Previously the 'Change' button
          only fired toast.info pointing the user at the 'Forgot password'
          flow. Now collects currentPassword + newPassword and calls the
          changePassword action, which verifies the current password via
          retrieveAccount, validates the new password against the same
          policy enforced at signup (8-16 chars per auth.ts), and calls
          modifyAccountCredentials to set the new hash. */}
      <PasswordChangeDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        changePasswordAction={changePasswordAction}
      />
    </div>
  );
}

// ─── Email Change Dialog ────────────────────────────────────────────────────
function EmailChangeDialog({
  open,
  onOpenChange,
  currentEmail,
  changeEmailAction,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentEmail: string;
  changeEmailAction: (args: { newEmail: string; currentPassword: string }) => Promise<any>;
  onSignOut: () => void;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newEmail.trim() || !currentPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await changeEmailAction({
        newEmail: newEmail.trim(),
        currentPassword,
      });
      if (result?.success) {
        toast.success("Email changed successfully", {
          description: "For security, you've been signed out. Please sign in with your new email.",
        });
        // The action invalidated all sessions, so we sign out locally
        // and let the auth flow redirect to /auth.
        onSignOut();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to change email");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Change Email Address
          </DialogTitle>
          <DialogDescription>
            Enter your new email and current password to confirm. For security, you'll be signed out afterwards and will need to sign in with the new email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Current email</Label>
            <Input value={currentEmail} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newEmail">New email</Label>
            <Input
              id="newEmail"
              type="email"
              placeholder="your.new@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailCurrentPassword">Current password</Label>
            <Input
              id="emailCurrentPassword"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <p className="text-xs text-muted-foreground">Required to verify it's really you.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !newEmail.trim() || !currentPassword}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Change Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Password Change Dialog ─────────────────────────────────────────────────
function PasswordChangeDialog({
  open,
  onOpenChange,
  changePasswordAction,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  changePasswordAction: (args: { currentPassword: string; newPassword: string }) => Promise<any>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword.length > 16) {
      toast.error("New password must be at most 16 characters (DoS protection)");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await changePasswordAction({ currentPassword, newPassword });
      if (result?.success) {
        toast.success("Password changed successfully", {
          description: "All other sessions have been signed out.",
        });
        onOpenChange(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Enter your current password to confirm, then choose a new one (8-16 characters).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="8-16 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Change Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Connections Section ──────────────────────────────────────────────────────

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

function ConnectionsSection() {
  const { isAuthenticated } = useConvexAuth();
  const { isDisconnected } = useConvexConnectionState();

  // Fetch real platform connection status
  const connections = useQuery(
    isAuthenticated ? api.platforms.platformConnections.getPlatformConnectionStatus : "skip",
    {}
  );

  // ponytail: wired to real Convex mutations — previously these handlers
  // only setTimeout + toast.success, leaving the user with a fake "Connected"
  // banner while nothing was actually written to platformConnections.
  // Now initiatePlatformConnection creates a pending row (status="pending")
  // and disconnectPlatform revokes tokens + deletes imported data.
  // (Audit item #9)
  const initiateConnection = useMutation(api.platforms.platformAuth.initiatePlatformConnection);
  const disconnectConnection = useMutation(api.platforms.platformAuth.disconnectPlatform);
  // ponytail: "Join the waitlist" button previously had no onClick.
  // Now it calls the real addToWaitlist Convex mutation. (Audit item #10)
  const joinWaitlist = useMutation(api.waitlist.addToWaitlist);

  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<Platform | null>(null);

  const handleConnect = async (platform: Platform) => {
    setConnectingPlatform(platform);
    try {
      const result: any = await initiateConnection({ platform });
      if (result?.alreadyConnected) {
        toast.info(`Already connected to ${platformLabels[platform]}`);
      } else {
        toast.success(`Connection to ${platformLabels[platform]} initiated`, {
          description: "Your platform data will begin syncing automatically.",
        });
      }
    } catch (err: any) {
      toast.error(`Failed to connect ${platformLabels[platform]}`, {
        description: err?.message || "Please try again later.",
      });
    }
    setConnectingPlatform(null);
  };

  const handleDisconnect = async (platform: Platform) => {
    setDisconnectingPlatform(platform);
    try {
      await disconnectConnection({ platform });
      toast.success(`Disconnected from ${platformLabels[platform]}`, {
        description: "Your platform data has been removed.",
      });
    } catch (err: any) {
      toast.error(`Failed to disconnect ${platformLabels[platform]}`, {
        description: err?.message || "Please try again later.",
      });
    }
    setDisconnectingPlatform(null);
  };

  const getStatusInfo = (platform: Platform) => {
    if (!connections || isDisconnected) {
      return { status: "not_connected" as const, label: "Not Connected", color: "text-muted-foreground" };
    }
    const conn = (connections as any)?.find((c: any) => c.platform === platform);
    if (!conn) {
      return { status: "not_connected" as const, label: "Not Connected", color: "text-muted-foreground" };
    }
    if (conn.status === "connected") {
      return { status: "connected" as const, label: "Connected", color: "text-emerald-500", lastSynced: conn.lastSyncedAt };
    }
    if (conn.status === "pending") {
      return { status: "pending" as const, label: "Pending", color: "text-amber-500" };
    }
    if (conn.status === "error") {
      return { status: "error" as const, label: "Error", color: "text-red-500" };
    }
    return { status: "not_connected" as const, label: "Not Connected", color: "text-muted-foreground" };
  };

  const platforms: Platform[] = ["upwork", "fiverr", "toptal", "freelancer"];

  return (
    <div className="space-y-6">
      {/* Platform Connections */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Platform Connections
          </CardTitle>
          <CardDescription>
            Connect your freelance platforms to automatically collect evidence and sync work data.
            Axia reads your work history, communications, and earnings to build your protection record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {platforms.map((platform) => {
            const statusInfo = getStatusInfo(platform);
            const isConnecting = connectingPlatform === platform;
            const isDisconnecting = disconnectingPlatform === platform;

            return (
              <div
                key={platform}
                className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: platformColors[platform] }}
                  >
                    {platformLabels[platform].charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{platformLabels[platform]}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {statusInfo.status === "connected" && statusInfo.lastSynced && (
                        <span className="text-xs text-muted-foreground">
                          — Last synced {new Date(statusInfo.lastSynced).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusInfo.status === "connected" ? (
                    <>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 border">
                        <CheckCircle2 className="w-3 h-3 mr-1" />Active
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(platform)}
                        disabled={isDisconnecting}
                        className="border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                      >
                        {isDisconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Disconnect"}
                      </Button>
                    </>
                  ) : statusInfo.status === "pending" ? (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 border">
                      <Clock className="w-3 h-3 mr-1" />Pending
                    </Badge>
                  ) : statusInfo.status === "error" ? (
                    <>
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 border">
                        <AlertCircle className="w-3 h-3 mr-1" />Error
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(platform)}
                        disabled={isConnecting}
                        className="border-border hover:bg-accent"
                      >
                        {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reconnect"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(platform)}
                      disabled={isConnecting || !isAuthenticated}
                      className="border-border hover:bg-accent"
                    >
                      {isConnecting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* What Axia Accesses */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm">What Axia Accesses</CardTitle>
          <CardDescription>When you connect a platform, Axia reads the following data to build your protection record:</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Users, title: "Profile & Work History", desc: "Your public profile, skills, and completed contracts" },
              { icon: MessageSquare, title: "Communications", desc: "Message timestamps and response patterns (not content)" },
              { icon: CreditCard, title: "Earnings & Payments", desc: "Payment records, milestones, and transaction history" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-3 bg-background rounded-lg border border-border">
                <Icon className="w-4 h-4 text-primary mb-2" />
                <div className="text-sm font-medium mb-1">{title}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon: CRM & Tool Integrations */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Coming Soon: Data Import from Other Tools
          </CardTitle>
          <CardDescription>
            Import your existing data from CRMs, project managers, and invoicing tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: "HubSpot", color: "#FF7A59" },
              { name: "Stripe", color: "#635BFF" },
              { name: "ClickUp", color: "#7B68EE" },
              { name: "Pipedrive", color: "#2F4C48" },
              { name: "Asana", color: "#F06A6A" },
              { name: "FreshBooks", color: "#0070FF" },
              { name: "PandaDoc", color: "#3D7BFF" },
              { name: "QuickBooks", color: "#2CA01C" },
            ].map((tool) => (
              <div
                key={tool.name}
                className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border opacity-60"
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: tool.color }}
                >
                  {tool.name.charAt(0)}
                </div>
                <span className="text-sm">{tool.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            We're building OAuth-based integrations to import your clients, projects, invoices, and proposals from these tools.
            Want early access?{" "}
            {/* ponytail: wired to api.waitlist.addToWaitlist — previously this
                button had no onClick. (Audit item #10) */}
            <Button
              variant="link"
              className="h-auto p-0 text-xs text-primary"
              onClick={async () => {
                const email = window.prompt("Enter your email to join the integrations waitlist:");
                if (!email) return;
                if (!email.includes("@") || email.length < 5) {
                  toast.error("Please enter a valid email address");
                  return;
                }
                try {
                  await joinWaitlist({ email, source: "account-settings-integrations" });
                  toast.success("You're on the waitlist!", {
                    description: "We'll be in touch when these integrations launch.",
                  });
                } catch (err: any) {
                  toast.error("Failed to join waitlist", {
                    description: err?.message || "Please try again later.",
                  });
                }
              }}
            >
              Join the waitlist
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
