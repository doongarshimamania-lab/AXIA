import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Switch } from "@/components/ui/switch";
import {
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  FolderKanban,
  Users,
  CheckCircle2,
  X,
  Clock,
  PenTool,
  Code2,
  Video,
  GraduationCap,
  BookOpen,
  Palette,
  Briefcase,
  Headphones,
  Camera,
  Figma,
  Megaphone,
  Lightbulb,
  UserCheck,
  Newspaper,
  Monitor,
  FileText,
  BrainCircuit,
  Bell,
  ShieldAlert,
  MessageSquare,
  Zap,
  ChevronRight,
  Timer,
  Gift,
  Crown,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

// Import existing modular components
import { HeroSection } from "@/components/landing/HeroSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

// ─── Animation helpers ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── Data ────────────────────────────────────────────────────────────────────

const professions = [
  { name: "Writers", icon: PenTool, color: "from-amber-500 to-orange-500" },
  { name: "Developers", icon: Code2, color: "from-emerald-500 to-teal-500" },
  { name: "Videographers", icon: Video, color: "from-rose-500 to-pink-500" },
  { name: "Coaches", icon: GraduationCap, color: "from-violet-500 to-purple-500" },
  { name: "Bookkeepers", icon: BookOpen, color: "from-sky-500 to-cyan-500" },
  { name: "Designers", icon: Palette, color: "from-fuchsia-500 to-pink-500" },
  { name: "Consultants", icon: Briefcase, color: "from-slate-500 to-gray-600" },
  { name: "Assistants", icon: Headphones, color: "from-lime-500 to-green-500" },
  { name: "Photographers", icon: Camera, color: "from-orange-500 to-red-500" },
  { name: "UX/UI Designers", icon: Figma, color: "from-indigo-500 to-violet-500" },
  { name: "Marketing Agencies", icon: Megaphone, color: "from-yellow-500 to-amber-500" },
  { name: "Creative Agencies", icon: Lightbulb, color: "from-pink-500 to-rose-500" },
  { name: "Staffing Agencies", icon: UserCheck, color: "from-teal-500 to-emerald-500" },
  { name: "PR Agencies", icon: Newspaper, color: "from-cyan-500 to-sky-500" },
  { name: "Digital Agencies", icon: Monitor, color: "from-purple-500 to-indigo-500" },
];

const features = [
  {
    icon: FileText,
    title: "Smart Proposals",
    description:
      "Draft proposals in your brand voice with smart follow-ups that trigger on Day 3, 7, and 14",
    color: "from-amber-500 to-orange-600",
    bgAccent: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    icon: DollarSign,
    title: "Validated Billing",
    description:
      "Invoices that prove their own worth. Every line item links back to verified work logs",
    color: "from-emerald-500 to-teal-600",
    bgAccent: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: FolderKanban,
    title: "CRM & Pipeline",
    description:
      "Visual pipeline board tracks every deal from first contact to close",
    color: "from-sky-500 to-cyan-600",
    bgAccent: "bg-sky-50 dark:bg-sky-950/30",
  },
  {
    icon: Clock,
    title: "Verified Workstreams",
    description:
      "Zero-friction time tracking that records automatically",
    color: "from-violet-500 to-purple-600",
    bgAccent: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    icon: BrainCircuit,
    title: "Truth Layer Verification",
    description:
      "A background engine that validates activity in real-time",
    color: "from-rose-500 to-pink-600",
    bgAccent: "bg-rose-50 dark:bg-rose-950/30",
  },
  {
    icon: Bell,
    title: "Automated Payment Reminders",
    description:
      "Smart payment reminders that fire on schedule — Day 3, 7, and 14",
    color: "from-amber-500 to-yellow-600",
    bgAccent: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    icon: ShieldAlert,
    title: "Scope Creep Protection",
    description:
      "Catch scope creep as it happens with automatic detection and one-click change orders",
    color: "from-red-500 to-orange-600",
    bgAccent: "bg-red-50 dark:bg-red-950/30",
  },
  {
    icon: MessageSquare,
    title: "Context Management & Communication",
    description:
      "Keep every project detail, client message, and decision in one place",
    color: "from-teal-500 to-emerald-600",
    bgAccent: "bg-teal-50 dark:bg-teal-950/30",
  },
  {
    icon: Zap,
    title: "Instant Setup, Zero Config",
    description:
      "No workflow builders. No automation rules to configure",
    color: "from-lime-500 to-green-600",
    bgAccent: "bg-lime-50 dark:bg-lime-950/30",
  },
];

const comparisonTable = [
  {
    capability: "Proposal workflow",
    others: "Manual or partial",
    axia: "Auto-drafted + smart follow-ups",
  },
  {
    capability: "Work verification",
    others: "Screenshots only",
    axia: "Truth Layer — full audit trail",
  },
  {
    capability: "Invoice proof",
    others: "Static PDF",
    axia: "Validated Billing — linked to work",
  },
  {
    capability: "Scope creep protection",
    others: "Manual tracking",
    axia: "Auto-detected + change orders",
  },
  {
    capability: "Setup time",
    others: "3–7 days",
    axia: "10 minutes",
  },
];

const beforeTools = [
  { name: "Google Docs", icon: FileText },
  { name: "Trello", icon: FolderKanban },
  { name: "Stripe", icon: DollarSign },
  { name: "Loom", icon: Video },
  { name: "Slack", icon: MessageSquare },
];

const afterTools = [
  { name: "Contracts & Proposals", icon: FileText },
  { name: "Verified Time Tracking", icon: Clock },
  { name: "CRM & Pipeline", icon: FolderKanban },
  { name: "Billing & Payments", icon: DollarSign },
  { name: "Work Verification Engine", icon: ShieldCheck },
];

const otherToolsFeatures = [
  { name: "Proposals & contracts", included: true },
  { name: "Basic billing", included: true },
  { name: "Payment collection", included: true },
  { name: "Template library", included: true },
  { name: "Verified work logs", included: false },
  { name: "Automated context capture", included: false },
  { name: "Dispute-proof billing", included: false },
];

const axiaFeatures = [
  { name: "Proposals & contracts", included: true },
  { name: "Basic billing", included: true },
  { name: "Payment collection", included: true },
  { name: "Template library", included: true },
  { name: "Verified Workstreams", included: true },
  { name: "Automated context capture", included: true },
  { name: "Dispute-proof billing", included: true },
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Basic protection for getting started",
    badge: null,
    features: [
      { text: "1 project workspace", included: true },
      { text: "Basic invoice verification", included: true },
      { text: "Evidence timeline", included: true },
      { text: "Community support", included: true },
      { text: "Dispute simulation", included: false },
      { text: "AI gap prediction", included: false },
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$7",
    period: "/month",
    description: "Essential features for active freelancers",
    badge: null,
    features: [
      { text: "3 project workspaces", included: true },
      { text: "Context gap identification", included: true },
      { text: "Upwork compliance checks", included: true },
      { text: "1 dispute simulation / month", included: true },
      { text: "Email support", included: true },
      { text: "AI gap prediction", included: false },
    ],
    cta: "Get Starter",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$15",
    period: "/month",
    description: "Advanced protection for serious freelancers",
    badge: "Most Popular",
    features: [
      { text: "10 project workspaces", included: true },
      { text: "Advanced gap analysis", included: true },
      { text: "Upwork + Fiverr compliance", included: true },
      { text: "3 dispute simulations / month", included: true },
      { text: "AI gap prediction", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Get Pro",
    highlighted: true,
  },
  {
    name: "Expert",
    price: "$49",
    period: "/month",
    description: "Maximum protection for teams & agencies",
    badge: "Best Value",
    features: [
      { text: "Unlimited projects", included: true },
      { text: "Strategic gap analysis", included: true },
      { text: "All platforms supported", included: true },
      { text: "Unlimited dispute simulations", included: true },
      { text: "Team collaboration tools", included: true },
      { text: "Dedicated account manager", included: true },
    ],
    cta: "Get Expert",
    highlighted: false,
  },
];

const referralTiers = [
  {
    referrals: 1,
    reward: "Priority early access",
    icon: Zap,
    color: "from-sky-500 to-cyan-500",
  },
  {
    referrals: 3,
    reward: "3 months free on Starter",
    icon: Gift,
    color: "from-emerald-500 to-teal-500",
  },
  {
    referrals: 5,
    reward: "50% off any tier for one year",
    icon: Star,
    color: "from-amber-500 to-orange-500",
  },
  {
    referrals: 10,
    reward: "Expert tier free for 1 year",
    icon: Crown,
    color: "from-violet-500 to-purple-500",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Landing() {
  const { isLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const scrollToWaitlist = () => {
    const el = document.querySelector('[data-waitlist-section]');
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* ─── Header / Nav ──────────────────────────────────────────────────── */}
      <header>
        {/* Dark Mode Toggle */}
        <div
          data-theme-toggle
          className="fixed top-24 right-6 z-50 flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-md px-3 py-2 shadow-sm transition-all duration-300"
        >
          <Sun
            className={`h-4 w-4 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`}
          />
          <Switch
            checked={theme === "dark"}
            onCheckedChange={toggleTheme}
            aria-label="Toggle dark mode"
          />
          <Moon
            className={`h-4 w-4 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`}
          />
        </div>

        {/* Navigation */}
        <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <motion.div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
              whileHover={{ scale: 1.05 }}
            >
              <img src="/logo.svg" alt="Axia" width={32} height={32} />
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Axia
              </span>
            </motion.div>

            {/* Waitlist Counter - Center */}
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Users className="w-4 h-4 text-emerald-500" />
              <span
                className="text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                style={{ fontFamily: "Space Grotesk" }}
              >
                103 people waiting · Only 97 spots left
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={scrollToWaitlist}
                className="bg-[#00246B] hover:bg-[#00246B]/90 text-white rounded-full px-6"
                disabled={isLoading}
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* ─── 1. Hero Section ──────────────────────────────────────────────── */}
        <HeroSection />

        {/* ─── 2. Industries We Serve ───────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10 bg-white dark:bg-slate-900">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <Badge
                variant="secondary"
                className="mb-4 text-xs font-semibold uppercase tracking-wider bg-[#00246B]/10 text-[#00246B] dark:bg-[#00246B]/20 dark:text-blue-400"
              >
                BUILT FOR YOU
              </Badge>
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                One platform.{" "}
                <span className="bg-gradient-to-r from-[#00246B] to-emerald-500 bg-clip-text text-transparent">
                  Every profession. Every agency.
                </span>
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-[700px] mx-auto leading-relaxed"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Whether you're a solo freelancer or running a full-service agency, Axia adapts to your workflow — not the other way around.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {professions.map((prof, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <Card className="h-full group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/60 cursor-pointer">
                    <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${prof.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <prof.icon className="w-6 h-6 text-white" />
                      </div>
                      <span
                        className="text-sm font-semibold text-foreground"
                        style={{ fontFamily: "Space Grotesk" }}
                      >
                        {prof.name}
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── 3. Features Section ──────────────────────────────────────────── */}
        <section id="features" className="py-20 px-6 md:px-10 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                One workspace.{" "}
                <span className="bg-gradient-to-r from-[#00246B] to-emerald-500 bg-clip-text text-transparent">
                  Every tool you need.
                </span>
              </h2>
            </motion.div>

            {/* 9 Feature Cards */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
            >
              {features.map((feature, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <Card className="h-full group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/60 overflow-hidden">
                    <CardContent className="p-6 relative">
                      {/* Gradient glow on hover */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none`}
                      />
                      <div className="relative z-10">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br ${feature.color} shadow-lg`}
                        >
                          <feature.icon className="w-7 h-7 text-white" />
                        </div>
                        <h3
                          className="text-xl font-bold text-foreground mb-3"
                          style={{ fontFamily: "Space Grotesk" }}
                        >
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Comparison Table */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-border/60 overflow-hidden shadow-lg">
                <CardContent className="p-0">
                  {/* Table Header */}
                  <div className="grid grid-cols-3 bg-[#00246B] dark:bg-slate-800 text-white">
                    <div className="p-4 md:p-5 font-bold text-sm md:text-base" style={{ fontFamily: "Space Grotesk" }}>
                      Capability
                    </div>
                    <div className="p-4 md:p-5 font-bold text-sm md:text-base text-center" style={{ fontFamily: "Space Grotesk" }}>
                      Others
                    </div>
                    <div className="p-4 md:p-5 font-bold text-sm md:text-base text-center" style={{ fontFamily: "Space Grotesk" }}>
                      Axia
                    </div>
                  </div>
                  {/* Table Rows */}
                  {comparisonTable.map((row, i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-3 ${
                        i % 2 === 0
                          ? "bg-white dark:bg-slate-900"
                          : "bg-slate-50 dark:bg-slate-950/50"
                      } ${i < comparisonTable.length - 1 ? "border-b border-border/40" : ""}`}
                    >
                      <div className="p-4 md:p-5 font-semibold text-sm text-foreground" style={{ fontFamily: "Space Grotesk" }}>
                        {row.capability}
                      </div>
                      <div className="p-4 md:p-5 text-sm text-muted-foreground text-center" style={{ fontFamily: "Space Grotesk" }}>
                        {row.others}
                      </div>
                      <div className="p-4 md:p-5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-center" style={{ fontFamily: "Space Grotesk" }}>
                        {row.axia}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* ─── 4. Before & After ────────────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10 bg-white dark:bg-slate-900">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                You didn't start a business to{" "}
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  manage a tech stack.
                </span>
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-[700px] mx-auto leading-relaxed"
                style={{ fontFamily: "Space Grotesk" }}
              >
                You've been duct-taping Google Docs, Trello, Stripe, Loom, and Slack together — hoping they somehow work as a system. They don't.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* BEFORE */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="h-full border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10">
                  <CardHeader>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider w-fit mb-2">
                      BEFORE
                    </div>
                    <CardTitle className="text-xl" style={{ fontFamily: "Space Grotesk" }}>
                      Duct-taped together
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {beforeTools.map((tool, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-red-100 dark:border-red-900/20"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                            <tool.icon className="w-5 h-5 text-red-500" />
                          </div>
                          <span
                            className="flex-1 text-sm font-semibold text-foreground"
                            style={{ fontFamily: "Space Grotesk" }}
                          >
                            {tool.name}
                          </span>
                          <X className="w-5 h-5 text-red-500" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* AFTER */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="h-full border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10">
                  <CardHeader>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider w-fit mb-2">
                      AFTER
                    </div>
                    <CardTitle className="text-xl" style={{ fontFamily: "Space Grotesk" }}>
                      One tab. All of it.
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {afterTools.map((tool, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/20"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
                            <tool.icon className="w-5 h-5 text-emerald-500" />
                          </div>
                          <span
                            className="flex-1 text-sm font-semibold text-foreground"
                            style={{ fontFamily: "Space Grotesk" }}
                          >
                            {tool.name}
                          </span>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── 5. Truth Layer Verification ──────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Other tools stop once the contract is signed.{" "}
                <span className="bg-gradient-to-r from-[#00246B] to-emerald-500 bg-clip-text text-transparent">
                  Axia is just getting started.
                </span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              {/* Other Tools */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="h-full border-border/60">
                  <CardHeader>
                    <Badge variant="outline" className="w-fit text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Other Tools
                    </Badge>
                    <CardTitle className="text-lg mt-2" style={{ fontFamily: "Space Grotesk" }}>
                      Stop at the contract
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {otherToolsFeatures.map((feat, i) => (
                        <div key={i} className="flex items-center gap-3">
                          {feat.included ? (
                            <CheckCircle2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm ${feat.included ? "text-foreground" : "text-red-500 font-semibold"}`}
                            style={{ fontFamily: "Space Grotesk" }}
                          >
                            {feat.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Axia */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="h-full border-2 border-[#00246B] dark:border-blue-500 shadow-xl">
                  <CardHeader>
                    <Badge className="w-fit text-xs font-semibold uppercase tracking-wider bg-[#00246B] text-white dark:bg-blue-600">
                      Axia
                    </Badge>
                    <CardTitle className="text-lg mt-2" style={{ fontFamily: "Space Grotesk" }}>
                      Verification engine built in
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {axiaFeatures.map((feat, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <span
                            className="text-sm font-semibold text-foreground"
                            style={{ fontFamily: "Space Grotesk" }}
                          >
                            {feat.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center text-muted-foreground max-w-[700px] mx-auto leading-relaxed"
              style={{ fontFamily: "Space Grotesk" }}
            >
              The Truth Layer runs silently in the background — verifying work as it happens, capturing context automatically, and building a dispute-proof record you never have to think about.
            </motion.p>
          </div>
        </section>

        {/* ─── 6. Time & Money Saved ────────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10 bg-white dark:bg-slate-900">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Disputes are rare.{" "}
                <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">
                  Justification is constant.
                </span>
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-[700px] mx-auto leading-relaxed"
                style={{ fontFamily: "Space Grotesk" }}
              >
                You're losing 3–5 hours every week justifying work you've already done. That's time you could spend on billable work — or just living your life.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {/* Stat 1 */}
              <motion.div variants={fadeUp} custom={0}>
                <Card className="text-center h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/60">
                  <CardContent className="p-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-5 shadow-lg">
                      <Timer className="w-8 h-8 text-white" />
                    </div>
                    <div
                      className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent mb-2"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      3–5 hrs
                    </div>
                    <p
                      className="text-sm font-semibold text-foreground mb-1"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      Saved per week
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No more manual justification of work you've already done
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Stat 2 */}
              <motion.div variants={fadeUp} custom={1}>
                <Card className="text-center h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/60">
                  <CardContent className="p-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-5 shadow-lg">
                      <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <div
                      className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent mb-2"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      Validated
                    </div>
                    <p
                      className="text-sm font-semibold text-foreground mb-1"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      Invoices
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Every line item links back to verified work logs
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Stat 3 */}
              <motion.div variants={fadeUp} custom={2}>
                <Card className="text-center h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/60">
                  <CardContent className="p-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00246B] to-blue-600 mb-5 shadow-lg">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <div
                      className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#00246B] to-blue-600 bg-clip-text text-transparent mb-2"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      Zero
                    </div>
                    <p
                      className="text-sm font-semibold text-foreground mb-1"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      Friction work streams
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Time tracking that records automatically — no manual entry
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ─── 7. Pricing Plans ─────────────────────────────────────────────── */}
        <section id="pricing" className="py-20 px-6 md:px-10 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <Badge variant="secondary" className="mb-4 text-xs font-semibold uppercase tracking-wider">
                Pricing
              </Badge>
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Choose Your{" "}
                <span className="bg-gradient-to-r from-[#00246B] to-emerald-500 bg-clip-text text-transparent">
                  Protection Level
                </span>
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-[600px] mx-auto leading-relaxed"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Start free, upgrade when you need more. Every plan includes our core payment protection engine.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {pricingTiers.map((tier, i) => (
                <motion.div key={i} variants={fadeUp} custom={i} className="h-full">
                  <Card
                    className={`h-full relative flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                      tier.highlighted
                        ? "border-2 border-[#00246B] dark:border-blue-500 shadow-lg"
                        : "border-border/60"
                    }`}
                  >
                    {tier.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-[#00246B] text-white dark:bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-md">
                          {tier.badge}
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-2 pt-6">
                      <CardTitle
                        className="text-xl"
                        style={{ fontFamily: "Space Grotesk" }}
                      >
                        {tier.name}
                      </CardTitle>
                      <CardDescription>{tier.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <div className="mb-6">
                        <span
                          className="text-4xl font-bold text-foreground"
                          style={{ fontFamily: "Space Grotesk" }}
                        >
                          {tier.price}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          {tier.period}
                        </span>
                      </div>
                      <ul className="space-y-3 mb-8 flex-1">
                        {tier.features.map((f, fi) => (
                          <li
                            key={fi}
                            className={`flex items-start gap-2.5 text-sm ${
                              !f.included ? "opacity-40" : ""
                            }`}
                          >
                            {f.included ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-border mt-0.5 flex-shrink-0" />
                            )}
                            <span className="text-muted-foreground">
                              {f.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={scrollToWaitlist}
                        className={`w-full rounded-xl font-bold ${
                          tier.highlighted
                            ? "bg-[#00246B] hover:bg-[#00246B]/90 text-white shadow-lg"
                            : "bg-secondary hover:bg-secondary/80 text-foreground"
                        }`}
                        style={{ fontFamily: "Space Grotesk" }}
                      >
                        {tier.cta}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-muted-foreground mt-8"
              style={{ fontFamily: "Space Grotesk" }}
            >
              All plans include a 14-day free trial. No credit card required to
              start.
            </motion.p>
          </div>
        </section>

        {/* ─── 8. Referral Rewards ──────────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10 bg-white dark:bg-slate-900">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Share Axia.{" "}
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Get rewarded.
                </span>
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-[600px] mx-auto leading-relaxed"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Every referral unlocks bigger rewards. The more you share, the more you save.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {referralTiers.map((tier, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <Card className="h-full text-center group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/60">
                    <CardContent className="p-6">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br ${tier.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <tier.icon className="w-8 h-8 text-white" />
                      </div>
                      <div
                        className="text-3xl font-bold text-foreground mb-1"
                        style={{ fontFamily: "Space Grotesk" }}
                      >
                        {tier.referrals}
                      </div>
                      <p
                        className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3"
                        style={{ fontFamily: "Space Grotesk" }}
                      >
                        {tier.referrals === 1 ? "Referral" : "Referrals"}
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00246B]/10 dark:bg-[#00246B]/20">
                        <Sparkles className="w-3.5 h-3.5 text-[#00246B] dark:text-blue-400" />
                        <span
                          className="text-sm font-bold text-[#00246B] dark:text-blue-400"
                          style={{ fontFamily: "Space Grotesk" }}
                        >
                          {tier.reward}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── 9. Final CTA ──────────────────────────────────────────────────── */}
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
