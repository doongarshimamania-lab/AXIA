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
import { useQuery, useConvexAuth, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

// ─── Navigation Items ────────────────────────────────────────────────────────

type SettingsSection = "profile" | "subscription" | "help" | "security";

const navItems: { key: SettingsSection; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "subscription", label: "Subscription", icon: Zap },
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

// ─── Help Center Mock Data ───────────────────────────────────────────────────

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: number;
  updatedAt: number;
}

const MOCK_ARTICLES: HelpArticle[] = [
  { id: "1", title: "How to set up your first project", category: "Getting Started", excerpt: "Learn how to create your first protected project in Axia." },
  { id: "2", title: "Understanding scope protection", category: "Core Features", excerpt: "How Axia monitors your project scope and alerts you to deviations." },
  { id: "3", title: "Evidence collection best practices", category: "Evidence", excerpt: "Tips for ensuring your evidence is comprehensive and admissible." },
  { id: "4", title: "How to file a dispute", category: "Disputes", excerpt: "Step-by-step guide to initiating and managing a dispute." },
  { id: "5", title: "Invoicing and payment tracking", category: "Billing", excerpt: "How to create invoices and track payment patterns." },
  { id: "6", title: "Setting up platform connections", category: "Integrations", excerpt: "Connect your freelance platforms for automatic evidence collection." },
  { id: "7", title: "Using the browser extension", category: "Evidence", excerpt: "Install and use the Axia browser extension for real-time evidence capture." },
  { id: "8", title: "Team management and permissions", category: "Teams", excerpt: "Invite team members and manage their roles and access levels." },
];

const MOCK_FAQ = [
  { q: "What is scope protection?", a: "Scope protection monitors your project agreements and alerts you when work deviates from the agreed terms. It uses automated evidence collection to build a verifiable record of all work performed." },
  { q: "How does evidence collection work?", a: "Axia collects evidence through multiple channels: the browser extension captures real-time work activity, time tracking records work sessions, and platform integrations pull in communications and deliverables. All evidence is cryptographically timestamped." },
  { q: "Can I export evidence for legal proceedings?", a: "Yes! Pro and Expert tiers support Legal Package exports that include chain-of-custody documentation, cryptographic verification, and court-admissible formatting. Free and Starter tiers can export in CSV and JSON formats." },
  { q: "How do I upgrade my plan?", a: "Navigate to the Subscription tab in Account Settings and select your desired plan. You can upgrade or downgrade at any time, with prorated billing for mid-cycle changes." },
  { q: "Is my data secure?", a: "Absolutely. All data is encrypted at rest and in transit. Evidence records use cryptographic hashing for tamper-proof verification. We never share your data with third parties." },
  { q: "What happens if I downgrade?", a: "When you downgrade, you retain access to features at your new tier level. Any data created at a higher tier remains accessible in read-only mode. You can upgrade again at any time to regain full access." },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AccountSettings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const { tier: subscriptionTier, setTier: setSubscriptionTier } = useSubscriptionTier();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuthActions();

  // ── Profile State ──
  const [profileName, setProfileName] = useState("Agency User");
  const [profileEmail, setProfileEmail] = useState(localStorage.getItem("userEmail") || "user@example.com");
  const [profileHourlyRate, setProfileHourlyRate] = useState("50");
  const [profileBio, setProfileBio] = useState("Experienced professional focused on quality work");
  const [copied, setCopied] = useState(false);

  // ── Help State ──
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleSaveProfile = () => {
    localStorage.setItem("userEmail", profileEmail);
    toast.success("Profile updated successfully");
  };

  const handleTierChange = (newTier: TierKey | "client") => {
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
    setIsSubmittingTicket(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmittingTicket(false);
    setTicketSubject("");
    setTicketMessage("");
    toast.success("Support ticket submitted! We'll get back to you within 24 hours.");
  };

  const filteredArticles = MOCK_ARTICLES.filter(
    article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Account Settings
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Manage your profile, subscription, get help, and secure your account.
          </p>
        </div>

        <div className="flex gap-8">
          {/* Left Sidebar Navigation */}
          <nav className="w-56 flex-shrink-0">
            <div className="bg-card border border-border rounded-xl p-2 space-y-1 sticky top-8">
              {navItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
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
              {activeSection === "help" && (
                <HelpSection
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filteredArticles={filteredArticles}
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
      </div>
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
  theme, handleThemeToggle,
}: {
  profileName: string; setProfileName: (v: string) => void;
  profileEmail: string; setProfileEmail: (v: string) => void;
  profileHourlyRate: string; setProfileHourlyRate: (v: string) => void;
  profileBio: string; setProfileBio: (v: string) => void;
  subscriptionTier: string; handleTierChange: (t: TierKey | "client") => void;
  handleCopyEmail: () => void; copied: boolean;
  handleSaveProfile: () => void;
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

          <div className="p-4 bg-primary/5 rounded-lg border border-border">
            <div className="text-sm font-medium mb-3">Platform Connections</div>
            <div className="space-y-2">
              {[
                { name: "Upwork", color: "#14A800" },
                { name: "Fiverr", color: "#1DBF73" },
                { name: "Toptal", color: "#204ECF" },
              ].map((platform) => (
                <div key={platform.name} className="flex items-center justify-between p-2 bg-background rounded border border-border">
                  <span className="text-sm">{platform.name}</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-border hover:bg-accent">
                    Connect
                  </Button>
                </div>
              ))}
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
        <Button onClick={handleSaveProfile} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Save Changes
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
  handleTierChange: (t: TierKey | "client") => void;
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
              {subscriptionTier === "free" ? "Free Tier" : subscriptionTier === "starter" ? "Starter" : subscriptionTier === "pro" ? "Pro" : subscriptionTier === "expert" ? "Expert" : "Client"}
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
            {(["free", "starter", "pro", "expert", "client"] as const).map((t) => (
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
  searchQuery, setSearchQuery,
  filteredArticles,
  ticketSubject, setTicketSubject,
  ticketMessage, setTicketMessage,
  isSubmittingTicket, handleSubmitTicket,
}: {
  searchQuery: string; setSearchQuery: (v: string) => void;
  filteredArticles: HelpArticle[];
  ticketSubject: string; setTicketSubject: (v: string) => void;
  ticketMessage: string; setTicketMessage: (v: string) => void;
  isSubmittingTicket: boolean; handleSubmitTicket: () => void;
}) {
  const [activeHelpTab, setActiveHelpTab] = useState<"articles" | "faq" | "contact">("articles");

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: BookOpen, title: "Documentation", desc: "Browse guides and tutorials", action: () => setActiveHelpTab("articles") },
          { icon: HelpCircle, title: "FAQ", desc: "Quick answers to common questions", action: () => setActiveHelpTab("faq") },
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
          { key: "faq" as const, label: "FAQ" },
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

      {/* Articles Tab */}
      {activeHelpTab === "articles" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Search our articles and guides</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="p-3 bg-background rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">{article.title}</div>
                    <Badge variant="outline" className="text-[10px] border-border">{article.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{article.excerpt}</p>
                </div>
              ))}
              {filteredArticles.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No articles found matching your search.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQ Tab */}
      {activeHelpTab === "faq" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Quick answers to common questions about Axia</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {MOCK_FAQ.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium text-left hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
            <Button variant="outline" size="sm" className="border-border hover:bg-accent">
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
            <Button variant="outline" size="sm" className="border-border hover:bg-accent">
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
    </div>
  );
}
