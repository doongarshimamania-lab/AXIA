import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Switch } from "@/components/ui/switch";
import {
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  DollarSign,
  FolderKanban,
  BookOpen,
  BrainCircuit,
  Users,
  CheckCircle2,
  Star,
  Quote,
  ChevronRight,
  Lock,
  Eye,
  Target,
  Clock,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

// Import existing modular components
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemCards } from "@/components/landing/ProblemCards";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
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

const features = [
  {
    icon: ShieldCheck,
    title: "Work Verification",
    description:
      "Real-time verification of your work against platform-specific requirements before submission. Never get denied for missing compliance again.",
    color: "from-emerald-500 to-teal-600",
    bgAccent: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: DollarSign,
    title: "Payment Protection",
    description:
      "Document every agreement, rate, and scope change with immutable timestamps. Get paid for every hour you work — no exceptions.",
    color: "from-amber-500 to-orange-600",
    bgAccent: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    icon: Eye,
    title: "Scope Tracking",
    description:
      "Automatic scope drift detection alerts you the moment a project creeps beyond its original terms. Formalize changes in one click.",
    color: "from-sky-500 to-cyan-600",
    bgAccent: "bg-sky-50 dark:bg-sky-950/30",
  },
  {
    icon: BookOpen,
    title: "Evidence Library",
    description:
      "Organize screenshots, contracts, messages, and work logs into a dispute-ready evidence timeline. Generate reports in under 2 minutes.",
    color: "from-violet-500 to-purple-600",
    bgAccent: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    icon: BrainCircuit,
    title: "AI Dispute Prediction",
    description:
      "Simulate potential disputes and see your win probability before you submit. Our AI identifies weak points and suggests fixes.",
    color: "from-rose-500 to-pink-600",
    bgAccent: "bg-rose-50 dark:bg-rose-950/30",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Share protection dashboards with co-freelancers. Coordinate evidence collection, split disputes, and protect your team's income together.",
    color: "from-indigo-500 to-blue-600",
    bgAccent: "bg-indigo-50 dark:bg-indigo-950/30",
  },
];

const howItWorksSteps = [
  {
    step: 1,
    title: "Create Project",
    description:
      "Add your contract details, client requirements, and platform. Axia instantly maps protection criteria unique to your project.",
    icon: FolderKanban,
  },
  {
    step: 2,
    title: "Track Work",
    description:
      "Our browser extension captures work context alongside time tracking — screenshots, activity density, and deliverable progress.",
    icon: Target,
  },
  {
    step: 3,
    title: "Collect Evidence",
    description:
      "Axia auto-organizes your evidence into a timeline and flags gaps before submission. Everything is stored immutably.",
    icon: FileCheck,
  },
  {
    step: 4,
    title: "Get Protected",
    description:
      "Verify your work meets payment protection requirements. Submit with confidence — or dispute with rock-solid evidence.",
    icon: Lock,
  },
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

const testimonials = [
  {
    quote:
      "Axia helped me identify context gaps in my Upwork submissions that I never knew existed. I've prevented $1,872 in potential payment denials over 6 months.",
    author: "Sarah Jenkins",
    role: "Senior UX Designer",
    platform: "Upwork Top-Rated Plus",
    rating: 5,
    avatar: "SJ",
  },
  {
    quote:
      "The dispute simulation saved me from a nightmare client. It flagged that my screenshots weren't frequent enough before I submitted the work.",
    author: "Marcus Chen",
    role: "Full-Stack Developer",
    platform: "Toptal Network",
    rating: 5,
    avatar: "MC",
  },
  {
    quote:
      "Finally, a tool that protects ME. Platforms always side with the client, but Axia gives me the leverage I need to get paid for every minute.",
    author: "Elena Rodriguez",
    role: "Digital Marketer",
    platform: "Fiverr Pro",
    rating: 5,
    avatar: "ER",
  },
  {
    quote:
      "I used to spend hours each week documenting everything manually. Axia automated 90% of that and caught things I would have missed entirely.",
    author: "David Kim",
    role: "Software Engineer",
    platform: "Upwork",
    rating: 5,
    avatar: "DK",
  },
  {
    quote:
      "The scope tracking alone has saved me from $3,000+ in scope creep this year. Every freelancer needs this — no question.",
    author: "Priya Mehta",
    role: "Graphic Designer",
    platform: "Fiverr",
    rating: 5,
    avatar: "PM",
  },
  {
    quote:
      "As a team lead, the collaboration features let us coordinate protection across all our contracts. Disputes went from stressful to routine.",
    author: "James O'Brien",
    role: "Agency Owner",
    platform: "Multi-platform",
    rating: 5,
    avatar: "JO",
  },
];

const stats = [
  { value: "12,500+", label: "Freelancers Protected", icon: Users },
  { value: "28,000+", label: "Projects Secured", icon: FolderKanban },
  { value: "83%", label: "Disputes Won", icon: Award },
  { value: "145,000+", label: "Hours Tracked", icon: Clock },
];

const faqs = [
  {
    q: "How does Axia verify my work against platform requirements?",
    a: "Axia's Work Context Verification Model (WCVM) analyzes your work context — screenshots, activity density, deliverable progress — against the specific requirements of your platform (Upwork, Fiverr, Toptal, etc.). It flags gaps before you submit, so you can fix them and get paid.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. All evidence is stored with end-to-end encryption and immutable timestamps. Your data is never shared with clients or platforms. You own it, you control it.",
  },
  {
    q: "Do I need to install anything?",
    a: "Axia works as a browser extension that runs alongside your existing time tracker. Installation takes under 2 minutes and works with Chrome, Firefox, and Edge.",
  },
  {
    q: "What platforms does Axia support?",
    a: "We currently support Upwork, Fiverr, and Toptal with full compliance monitoring. We're adding Toptal Freelancer, Guru, and Freelancer.com support soon.",
  },
  {
    q: "Can I try Axia for free?",
    a: "Yes! Our Free tier gives you 1 project workspace with basic invoice verification and an evidence timeline. No credit card required. Upgrade anytime as your needs grow.",
  },
  {
    q: "How does the dispute simulation work?",
    a: "Our AI-powered dispute simulation models how a real dispute would play out based on your current evidence. It shows your win probability, identifies weak spots, and recommends specific evidence to collect before you submit.",
  },
  {
    q: "What if I'm already in a dispute?",
    a: "Axia can help mid-dispute too. Upload your existing evidence, and we'll generate a professional dispute report highlighting the strongest arguments and filling any remaining gaps.",
  },
  {
    q: "Is there team or agency pricing?",
    a: "Yes — our Expert tier includes unlimited projects and team collaboration tools. For larger teams, contact us for custom enterprise pricing with dedicated support.",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Landing() {
  const { isLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToWaitlist = () => {
    const el = document.querySelector('[data-waitlist-section]');
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
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

            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => scrollToSection("features")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection("problems")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Problems We Solve
              </button>
              <button
                onClick={() => scrollToSection("social-proof")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Reviews
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
              </button>
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
        {/* ─── Hero Section ──────────────────────────────────────────────── */}
        <HeroSection />

        {/* ─── Stats Section ──────────────────────────────────────────────── */}
        <section className="py-12 px-6 md:px-10 bg-white dark:bg-slate-900 border-b border-border/30">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={i}
                  className="text-center group"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#00246B]/10 dark:bg-[#00246B]/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                    <stat.icon className="w-6 h-6 text-[#00246B] dark:text-blue-400" />
                  </div>
                  <div
                    className="text-3xl md:text-4xl font-bold text-[#00246B] dark:text-blue-400 mb-1"
                    style={{ fontFamily: "Space Grotesk" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── Features Section ───────────────────────────────────────────── */}
        <section id="features" className="py-20 px-6 md:px-10 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <Badge variant="secondary" className="mb-4 text-xs font-semibold uppercase tracking-wider">
                Powerful Features
              </Badge>
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Everything You Need to{" "}
                <span className="bg-gradient-to-r from-[#00246B] to-emerald-500 bg-clip-text text-transparent">
                  Get Paid
                </span>
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-[700px] mx-auto leading-relaxed"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Six core features designed to prevent payment denials before they
                happen — and win disputes when they do.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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
          </div>
        </section>

        {/* ─── How It Works Section ───────────────────────────────────────── */}
        <section id="how-it-works" className="py-20 px-6 md:px-10 bg-white dark:bg-slate-900">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <Badge variant="secondary" className="mb-4 text-xs font-semibold uppercase tracking-wider">
                Simple Process
              </Badge>
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                How It Works
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-[600px] mx-auto leading-relaxed"
                style={{ fontFamily: "Space Grotesk" }}
              >
                From project creation to payment protection in four simple steps.
              </p>
            </motion.div>

            {/* Desktop: Horizontal connector */}
            <div className="hidden md:block relative max-w-[1000px] mx-auto pt-4">
              {/* Connector line */}
              <div className="absolute top-[52px] left-[10%] right-[10%] h-[3px] bg-gradient-to-r from-[#00246B] via-emerald-500 to-[#00246B] rounded-full" />

              <div className="flex justify-between">
                {howItWorksSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.15 }}
                    className="relative text-center w-1/4 px-3"
                  >
                    {/* Step number bubble */}
                    <div className="flex justify-center mb-6">
                      <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#00246B] to-[#003A8C] text-white flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-slate-900">
                        <step.icon className="w-7 h-7" />
                      </div>
                    </div>
                    <div
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00246B]/10 dark:bg-[#00246B]/30 text-[#00246B] dark:text-blue-400 text-xs font-bold mb-3"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      {step.step}
                    </div>
                    <h3
                      className="text-lg font-bold text-foreground mb-2"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Mobile: Vertical timeline */}
            <div className="md:hidden space-y-6 relative pl-10">
              <div className="absolute left-5 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#00246B] via-emerald-500 to-[#00246B] rounded-full" />
              {howItWorksSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex gap-4 items-start relative"
                >
                  <div className="absolute -left-10 top-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#00246B] to-[#003A8C] text-white flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900 z-10">
                    <step.icon className="w-4 h-4" />
                  </div>
                  <div className="pt-2">
                    <div
                      className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#00246B]/10 dark:bg-[#00246B]/30 text-[#00246B] dark:text-blue-400 text-[10px] font-bold mb-2 uppercase tracking-wider"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      Step {step.step}
                    </div>
                    <h3
                      className="text-lg font-bold text-foreground mb-1"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Problem Cards ──────────────────────────────────────────────── */}
        <div id="problems">
          <ProblemCards />
        </div>

        {/* ─── Testimonials Section ───────────────────────────────────────── */}
        <section id="testimonials" className="py-20 px-6 md:px-10 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <Badge variant="secondary" className="mb-4 text-xs font-semibold uppercase tracking-wider">
                Social Proof
              </Badge>
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Loved by{" "}
                <span className="bg-gradient-to-r from-[#00246B] to-emerald-500 bg-clip-text text-transparent">
                  Freelancers
                </span>
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-[600px] mx-auto leading-relaxed"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Real stories from freelancers who protect their income with Axia every day.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {testimonials.map((t, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <Card className="h-full group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/60">
                    <CardContent className="p-6 relative">
                      <Quote className="absolute top-4 right-4 w-10 h-10 text-[#00246B]/8 dark:text-blue-400/8" />
                      {/* Stars */}
                      <div className="flex gap-1 mb-4">
                        {[...Array(t.rating)].map((_, s) => (
                          <Star
                            key={s}
                            className="w-4 h-4 fill-amber-400 text-amber-400"
                          />
                        ))}
                      </div>
                      {/* Quote */}
                      <p
                        className="text-sm text-foreground leading-relaxed mb-5 italic"
                        style={{ fontFamily: "Space Grotesk" }}
                      >
                        &ldquo;{t.quote}&rdquo;
                      </p>
                      {/* Author */}
                      <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00246B] to-[#003A8C] flex items-center justify-center text-white text-xs font-bold shadow-md">
                          {t.avatar}
                        </div>
                        <div>
                          <p
                            className="text-sm font-bold text-foreground"
                            style={{ fontFamily: "Space Grotesk" }}
                          >
                            {t.author}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.role} &middot; {t.platform}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── Social Proof Section (existing carousel) ───────────────────── */}
        <div id="social-proof">
          <SocialProofSection />
        </div>

        {/* ─── Pricing Section ────────────────────────────────────────────── */}
        <section id="pricing" className="py-20 px-6 md:px-10 bg-white dark:bg-slate-900">
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

        {/* ─── FAQ Section ────────────────────────────────────────────────── */}
        <section id="faq" className="py-20 px-6 md:px-10 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-[800px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <Badge variant="secondary" className="mb-4 text-xs font-semibold uppercase tracking-wider">
                FAQ
              </Badge>
              <h2
                className="text-3xl md:text-5xl font-bold text-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Frequently Asked Questions
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-[600px] mx-auto leading-relaxed"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Everything you need to know about Axia — and if it's right for you.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, i) => (
                      <AccordionItem key={i} value={`item-${i}`} className="px-6">
                        <AccordionTrigger
                          className="text-left text-base font-semibold hover:no-underline"
                          style={{ fontFamily: "Space Grotesk" }}
                        >
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent
                          className="text-muted-foreground leading-relaxed"
                          style={{ fontFamily: "Space Grotesk" }}
                        >
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center mt-10"
            >
              <p
                className="text-sm text-muted-foreground mb-4"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Still have questions?
              </p>
              <Button
                onClick={scrollToWaitlist}
                variant="outline"
                className="rounded-full px-6 border-[#00246B] dark:border-blue-500 text-[#00246B] dark:text-blue-400 hover:bg-[#00246B] hover:text-white"
                style={{ fontFamily: "Space Grotesk" }}
              >
                Talk to Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ─── Final CTA ──────────────────────────────────────────────────── */}
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
