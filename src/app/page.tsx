'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, TrendingUp, CheckCircle2, FileX, AlertCircle, DollarSign,
  Clock, Shield, ArrowRight, CheckCircle, Sun, Moon, ChevronLeft,
  ChevronRight, Users, FileText, Clock3, BarChart3, Zap, Star,
  Monitor, Settings, HelpCircle, CreditCard, Tag, Target, Receipt,
  Layers, Activity, Eye, Brain, Lock, Menu, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

/* ─────────────────────── LANDING PAGE ─────────────────────── */

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative pt-4 pb-2 px-6 md:px-10 overflow-hidden bg-[#00246B] dark:bg-slate-900">
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
      </div>
      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white mb-3 border border-white/10"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide uppercase">
              For Freelancers Who Value Their Time
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-5xl font-semibold text-white leading-[1.2] tracking-tight mb-3 max-w-[900px]"
          >
            Stop Losing Payments to Invoice Errors, Context Gaps, and Pricing Disputes
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-blue-100 mb-6 max-w-[700px] leading-relaxed"
          >
            35% of payment disputes happen because of simple mistakes you can prevent.
            TIMELock verifies your work against platform requirements <i>before</i> submission—so you get paid, every time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full flex justify-center mb-6"
          >
            <div className="bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-white/10 flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-blue-200/60 focus:outline-none focus:ring-2 focus:ring-white/30 w-64"
              />
              <Button
                onClick={onGetStarted}
                className="bg-white text-[#00246B] hover:bg-blue-50 rounded-xl px-6 font-bold"
              >
                Secure My Spot
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6 md:gap-12 text-blue-200/80"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm">Avg. Loss Prevented: $697</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm">83% Dispute Success Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm">Real-Time Verification</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

const problemCategories = [
  {
    icon: FileX, problem: "Invoice Errors",
    quote: "My invoice was rejected for 'missing terms' but the platform never told me what was missing. Lost $720.",
    author: "Sarah K., Web Developer", avgLoss: "42% of freelancers",
    lossDescription: "report not getting paid for invoice errors (Skynova, 2024)",
    color: "from-red-500 to-red-600", bgColor: "bg-red-50 dark:bg-slate-800/50",
    borderColor: "border-red-200 dark:border-red-900/20", iconColor: "text-red-500/20",
    solutionTitle: "Verify Invoices Before Submission",
    solutionDescription: "TIMELock verifies your invoice against platform-specific requirements before submission, showing exactly what's missing.",
    features: ["Invoice format validation", "Terms completeness check", "Platform requirement matching", "Real-time error detection"]
  },
  {
    icon: AlertCircle, problem: "Context Gap Errors",
    quote: "Platform denied payment because my screenshots didn't show 'sufficient activity'—but I was coding the whole time.",
    author: "Marcus T., Software Engineer", avgLoss: "35% of freelancers",
    lossDescription: "lose payments due to context gaps (Upwork data, 2024)",
    color: "from-orange-500 to-orange-600", bgColor: "bg-orange-50 dark:bg-slate-800/50",
    borderColor: "border-orange-200 dark:border-orange-900/20", iconColor: "text-orange-500/20",
    solutionTitle: "Real-Time Context Verification",
    solutionDescription: "Our WCVM engine analyzes your work context in real-time, alerting you instantly if evidence doesn't meet platform standards.",
    features: ["Activity density tracking", "Screenshot compliance check", "Work context verification", "Gap prediction alerts"]
  },
  {
    icon: DollarSign, problem: "Pricing Disputes",
    quote: "Client disputed my rate saying 'we never agreed to this'—even though it was in the contract. $1,200 gone.",
    author: "Elena R., Designer", avgLoss: "28% of freelancers",
    lossDescription: "face pricing disputes without documentation (Fiverr survey, 2024)",
    color: "from-amber-500 to-amber-600", bgColor: "bg-amber-50 dark:bg-slate-800/50",
    borderColor: "border-amber-200 dark:border-amber-900/20", iconColor: "text-amber-500/20",
    solutionTitle: "Document All Pricing Agreements",
    solutionDescription: "TIMELock documents all pricing agreements with timestamps and client acknowledgment, creating an immutable record.",
    features: ["Rate documentation", "Client approval tracking", "Change order logging", "Dispute-ready reports"]
  },
  {
    icon: Clock, problem: "Scope Creep",
    quote: "Client kept adding 'small tweaks' that turned into 15 hours of unpaid work. They refused to pay for extras.",
    author: "David L., Developer", avgLoss: "42% of freelancers",
    lossDescription: "report not getting paid for scope creep (Skynova, 2024)",
    color: "from-blue-500 to-blue-600", bgColor: "bg-blue-50 dark:bg-slate-800/50",
    borderColor: "border-blue-200 dark:border-blue-900/20", iconColor: "text-blue-500/20",
    solutionTitle: "Formalize Changes Instantly",
    solutionDescription: "Automatic scope drift detection prompts you to formalize changes immediately, getting client approval on record.",
    features: ["Scope change detection", "One-click change orders", "Client approval workflow", "Timeline documentation"]
  },
]

function ProblemCards() {
  return (
    <section className="py-8 px-6 md:px-10 bg-slate-50 dark:bg-slate-950" id="problems">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            4 Payment Problems TIMELock Prevents
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Each problem costs freelancers hundreds of dollars. Here's how TIMELock stops them before they happen.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {problemCategories.map((category, index) => {
            const Icon = category.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-xl overflow-hidden border border-border hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 bg-card flex flex-col md:flex-row shadow-sm hover:shadow-md"
              >
                <div className={`${category.bgColor} p-5 md:w-1/2 md:border-r border-border relative overflow-hidden`}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10">
                    <Icon className={`w-40 h-40 ${category.iconColor}`} strokeWidth={1.5} />
                  </div>
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                      THE PROBLEM
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      The &apos;{category.problem}&apos; Trap
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed font-medium">
                      &ldquo;{category.quote}&rdquo;
                    </p>
                    <div className="bg-white/50 dark:bg-slate-950/50 rounded-lg p-2 border border-border backdrop-blur-sm">
                      <div className={`text-xl font-bold bg-gradient-to-r ${category.color} bg-clip-text text-transparent mb-0.5`}>
                        {category.avgLoss}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                        — {category.lossDescription}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-card p-5 md:w-1/2 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                      THE TIMELOCK SOLUTION
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{category.solutionTitle}</h3>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{category.solutionDescription}</p>
                    <ul className="space-y-1.5 mb-3">
                      {category.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-foreground font-medium">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SocialProofSection() {
  const testimonials = [
    { name: "Alex M.", role: "Full-Stack Developer", text: "TIMELock caught a compliance gap that would have cost me $1,200. Best investment ever.", rating: 5 },
    { name: "Priya S.", role: "UX Designer", text: "I used to lose 2-3 hours weekly to disputes. Now I get flagged before problems happen.", rating: 5 },
    { name: "Jordan K.", role: "Content Writer", text: "The real-time monitoring gives me peace of mind. No more wondering if my time will be rejected.", rating: 5 },
    { name: "Sam R.", role: "Data Analyst", text: "Generated a dispute report in 30 seconds that won back $890. Used to take hours of manual work.", rating: 5 },
  ]

  return (
    <section className="py-12 px-6 md:px-10 bg-slate-50 dark:bg-slate-950/50" id="social-proof">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Don&apos;t Just Take My Word For It
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Freelancers are already reclaiming thousands in lost income by verifying their work context.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-5 rounded-xl border border-border bg-card"
            >
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-foreground mb-3 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#00246B] flex items-center justify-center text-white text-xs font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-t border-border pt-8">
          <div>
            <div className="text-3xl font-bold text-[#00246B] dark:text-blue-400 mb-1">83%</div>
            <div className="text-sm text-muted-foreground">Dispute Success Rate</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#00246B] dark:text-blue-400 mb-1">$1,028</div>
            <div className="text-sm text-muted-foreground">Avg. Loss Prevented</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#00246B] dark:text-blue-400 mb-1">12k+</div>
            <div className="text-sm text-muted-foreground">Hours Protected</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#00246B] dark:text-blue-400 mb-1">4.9/5</div>
            <div className="text-sm text-muted-foreground">User Rating</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalCTA({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section data-waitlist-section className="py-8 px-6 md:px-10 bg-[#00246B] dark:bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
      </div>
      <div className="max-w-[800px] mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Protect Your Income Today</h2>
          <p className="text-lg text-blue-100 mb-6 max-w-2xl mx-auto leading-relaxed">
            Join the waitlist to get early access to the only tool that verifies your work context against platform requirements—before you submit.
          </p>
          <div className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-white/10 flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-blue-200/60 focus:outline-none focus:ring-2 focus:ring-white/30 w-64"
              />
              <Button
                onClick={onGetStarted}
                className="bg-white text-[#00246B] hover:bg-blue-50 rounded-xl px-6 font-bold"
              >
                Get Early Access
              </Button>
            </div>
          </div>
          <p className="mt-6 text-sm text-blue-200/60">Join 2,000+ freelancers on the waitlist. Launching soon.</p>
        </motion.div>
      </div>
    </section>
  )
}

function LandingFooter() {
  const footerLinks = {
    Product: ["Features", "Pricing", "How It Works", "Testimonials"],
    Resources: ["Documentation", "Help Center", "Blog", "Case Studies"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
    Contact: ["Support", "Sales", "Partnerships", "Careers"],
  }
  return (
    <footer className="bg-card text-muted-foreground py-16 px-10 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-lg font-semibold text-foreground mb-4">{heading}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <span className="text-base text-muted-foreground hover:text-[#00246B] dark:hover:text-white transition-colors font-medium cursor-pointer">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; 2025 TIMELock. All rights reserved. Protecting freelancer income worldwide.
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────── DASHBOARD ─────────────────────── */

const sidebarItems = [
  { icon: BarChart3, label: 'Dashboard', id: 'dashboard' },
  { icon: Users, label: 'Clients', id: 'clients' },
  { icon: Layers, label: 'Projects', id: 'projects' },
  { icon: Eye, label: 'Evidence', id: 'evidence' },
  { icon: Clock3, label: 'Time Tracking', id: 'time' },
  { icon: Tag, label: 'Tags', id: 'tags' },
  { icon: Target, label: 'Goals', id: 'goals' },
  { icon: Receipt, label: 'Invoices', id: 'invoices' },
  { icon: Activity, label: 'Payment Patterns', id: 'payments' },
  { icon: FileText, label: 'Reports', id: 'reports' },
  { icon: Monitor, label: 'Platforms', id: 'platforms' },
  { icon: Brain, label: 'AI Insights', id: 'ai' },
  { icon: CreditCard, label: 'Subscription', id: 'subscription' },
  { icon: Settings, label: 'Settings', id: 'settings' },
  { icon: HelpCircle, label: 'Help Center', id: 'help' },
]

function DashboardSidebar({ collapsed, setCollapsed, activeTab, setActiveTab }: {
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  activeTab: string; setActiveTab: (v: string) => void;
}) {
  return (
    <div
      className={`h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-[#00246B] flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold tracking-tight text-foreground"
          >
            TIMELock
          </motion.span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-hide">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                active
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Upgrade Banner */}
      {!collapsed && (
        <div className="p-4 m-2 rounded-xl bg-[#00246B]/10 border border-[#00246B]/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#00246B] dark:text-blue-400" />
            <span className="text-xs font-bold text-foreground">Upgrade to Pro</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">Unlock AI dispute prediction, unlimited reports, and cross-platform verification.</p>
          <Button size="sm" className="w-full bg-[#00246B] hover:bg-[#00246B]/90 text-white text-xs h-7">
            Upgrade Now
          </Button>
        </div>
      )}
    </div>
  )
}

function ComplianceStatusBar() {
  const [status, setStatus] = useState<'compliant' | 'at_risk' | 'rejected'>('compliant')

  useEffect(() => {
    const interval = setInterval(() => {
      const states: Array<'compliant' | 'at_risk' | 'rejected'> = ['compliant', 'at_risk', 'rejected']
      setStatus(states[Math.floor(Math.random() * states.length)])
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const statusConfig = {
    compliant: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', label: 'Timer Running — 100% Compliant', dot: 'bg-emerald-500' },
    at_risk: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', label: 'Cross-platform work detected — Review needed', dot: 'bg-amber-500' },
    rejected: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-600 dark:text-red-400', label: '2.5 hrs rejected — Generate Report', dot: 'bg-red-500' },
  }

  const cfg = statusConfig[status]

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border ${cfg.bg} rounded-lg mb-4`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
        <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        You&apos;re losing <span className="text-red-500 font-bold">$64</span> this week
        <span className="text-xs ml-1">(Upwk $48 · Fivr $12 · Toptl $4)</span>
      </span>
    </div>
  )
}

function DashboardView() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')

  const platformTabs = [
    { key: 'all', label: 'All Platforms', badge: 'Cross-Platform View' },
    { key: 'upwork', label: 'Upwork', badge: 'Work Diary' },
    { key: 'fiverr', label: 'Fiverr', badge: 'Time Tracking' },
    { key: 'toptal', label: 'Toptal', badge: 'Activity Score' },
  ]

  const mockTimeBlocks = [
    { time: '2:00 PM - 2:05 PM', activity: 'Code Review', site: 'github.com', status: 'compliant' as const, screenshots: 12 },
    { time: '2:05 PM - 2:10 PM', activity: 'Client Communication', site: 'fiverr.com', status: 'at_risk' as const, screenshots: 8 },
    { time: '2:10 PM - 2:15 PM', activity: 'Research', site: 'toptal.com', status: 'rejected' as const, screenshots: 2 },
    { time: '2:15 PM - 2:20 PM', activity: 'Spec Writing', site: 'notion.so', status: 'compliant' as const, screenshots: 5 },
    { time: '2:20 PM - 2:25 PM', activity: 'UI Design', site: 'figma.com', status: 'compliant' as const, screenshots: 9 },
    { time: '2:25 PM - 2:30 PM', activity: 'API Development', site: 'vscode.dev', status: 'compliant' as const, screenshots: 11 },
  ]

  return (
    <div className="flex-1 p-6 overflow-auto">
      <ComplianceStatusBar />

      {/* Platform Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {platformTabs.map((tab) => {
          const active = selectedPlatform === tab.key
          const isPlatform = tab.key !== 'all'
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedPlatform(tab.key)}
              className={`pb-2 text-sm rounded-md px-3 py-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'font-semibold text-foreground bg-primary/10 ring-1 ring-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  {tab.label}
                  {isPlatform && <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />}
                </span>
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">{tab.badge}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Timelock Dashboard</h1>
        <p className="text-[16px] text-muted-foreground">Protect your payments with real-time cross-platform compliance monitoring</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[14px] font-medium text-muted-foreground">Active Session</CardTitle>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-emerald-600">Evidence: 24</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-[24px] font-bold text-foreground">2h 15m</div>
            <p className="text-[12px] text-muted-foreground">Client: Acme Corp</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[14px] font-medium text-muted-foreground">Rejected Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[24px] font-bold text-red-600">2.5h</div>
            <p className="text-[12px] text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[14px] font-medium text-muted-foreground">Dispute Reports</CardTitle>
            <Badge variant="outline" className="text-[10px]">Free: 0/1 used</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-[24px] font-bold text-foreground">0</div>
            <p className="text-[12px] text-muted-foreground">Generated this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Work Diary */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-[16px] flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Work Diary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockTimeBlocks.map((block, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  block.status === 'compliant'
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : block.status === 'at_risk'
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-red-500/20 bg-red-500/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    block.status === 'compliant' ? 'bg-emerald-500' : block.status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <span className="text-sm font-medium text-foreground">{block.activity}</span>
                    <span className="text-xs text-muted-foreground ml-2">{block.site}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{block.screenshots} screenshots</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      block.status === 'compliant'
                        ? 'border-emerald-500/30 text-emerald-600'
                        : block.status === 'at_risk'
                        ? 'border-amber-500/30 text-amber-600'
                        : 'border-red-500/30 text-red-600'
                    }`}
                  >
                    {block.status === 'compliant' ? 'Compliant' : block.status === 'at_risk' ? 'At Risk' : 'Rejected'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Evidence Monitor + AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[16px] flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Evidence Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Screenshots</span>
                  <span className="font-medium text-foreground">47/50</span>
                </div>
                <Progress value={94} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Activity Score</span>
                  <span className="font-medium text-foreground">87%</span>
                </div>
                <Progress value={87} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Context Relevance</span>
                  <span className="font-medium text-foreground">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Work Memos</span>
                  <span className="font-medium text-foreground">3/5</span>
                </div>
                <Progress value={60} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[16px] flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              AI Dispute Prediction
              <Badge variant="outline" className="text-[10px] ml-auto">Pro Feature</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Medium Risk Detected</span>
                </div>
                <p className="text-xs text-muted-foreground">Fiverr session has low keyboard activity. Consider adding work memos.</p>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Upwork Session Strong</span>
                </div>
                <p className="text-xs text-muted-foreground">All compliance metrics within acceptable range. Continue current pattern.</p>
              </div>
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-2 mb-1">
                  <FileX className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">Evidence Gap</span>
                </div>
                <p className="text-xs text-muted-foreground">Missing 3 work memos for Toptal session. Generate before submission.</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-3 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
              onClick={() => toast.success('AI analysis started!', { description: 'Results will appear in 30 seconds' })}
            >
              Run Full Analysis
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6">
        <Button className="bg-[#00246B] hover:bg-[#00246B]/90 text-white cursor-pointer">
          <Clock3 className="mr-2 h-4 w-4" />
          Start Timer
        </Button>
        <Button variant="outline" className="cursor-pointer" onClick={() => toast.success('Report generated! Case ID: CASE-001')}>
          <FileText className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
        <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 cursor-pointer">
          Upgrade to Pro
        </Button>
      </div>

      {/* Lost Income Calculator */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-[16px] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Lost Income This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg border border-border">
              <div className="text-2xl font-bold text-red-500">$48</div>
              <p className="text-xs text-muted-foreground">Upwork</p>
            </div>
            <div className="text-center p-3 rounded-lg border border-border">
              <div className="text-2xl font-bold text-red-500">$12</div>
              <p className="text-xs text-muted-foreground">Fiverr</p>
            </div>
            <div className="text-center p-3 rounded-lg border border-border">
              <div className="text-2xl font-bold text-red-500">$4</div>
              <p className="text-xs text-muted-foreground">Toptal</p>
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className="text-sm text-muted-foreground">Total Weekly Loss: </span>
            <span className="text-xl font-bold text-red-500">$64</span>
            <span className="text-sm text-muted-foreground ml-2">| With Pro: </span>
            <span className="text-xl font-bold text-emerald-500">$53 saved</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────── ALL DASHBOARD VIEWS ─────────────────────── */

function ClientsView() {
  const clients = [
    { name: "TechCorp Solutions", trust: 92, protection: 88, projects: 3, earned: "$12,400", status: "active", platform: "upwork" },
    { name: "StartupHub Inc", trust: 78, protection: 72, projects: 2, earned: "$8,200", status: "active", platform: "fiverr" },
    { name: "Global Enterprises", trust: 65, protection: 55, projects: 1, earned: "$3,200", status: "at_risk", platform: "upwork" },
    { name: "Creative Studios", trust: 88, protection: 91, projects: 4, earned: "$15,600", status: "active", platform: "toptal" },
    { name: "Acme Corp", trust: 45, protection: 38, projects: 1, earned: "$1,800", status: "flagged", platform: "fiverr" },
  ]
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6"><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Clients</h1><p className="text-[16px] text-muted-foreground">Monitor client trust scores, protection levels, and payment patterns</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Total Clients</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">5</div><p className="text-[12px] text-muted-foreground">Across 3 platforms</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Avg Trust Score</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-emerald-600">73.6</div><p className="text-[12px] text-muted-foreground">Good standing</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">At-Risk Clients</CardTitle><AlertCircle className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-[24px] font-bold text-amber-600">2</div><p className="text-[12px] text-muted-foreground">Need attention</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Total Earned</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">$41,200</div><p className="text-[12px] text-muted-foreground">All time</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-[18px]">Client Directory</CardTitle></CardHeader><CardContent><div className="space-y-3">
        {clients.map((c, i) => (<div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-[#00246B] flex items-center justify-center text-white text-sm font-bold">{c.name[0]}</div><div><div className="font-medium text-foreground">{c.name}</div><div className="text-sm text-muted-foreground">{c.projects} projects · {c.platform}</div></div></div>
          <div className="flex items-center gap-4">
            <div className="text-center"><div className="text-xs text-muted-foreground">Trust</div><div className={`text-sm font-bold ${c.trust >= 80 ? 'text-emerald-600' : c.trust >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{c.trust}%</div></div>
            <div className="text-center"><div className="text-xs text-muted-foreground">Protection</div><Progress value={c.protection} className="w-16 h-2" /></div>
            <div className="text-right"><div className="text-sm font-bold text-foreground">{c.earned}</div><Badge variant="outline" className={`text-[10px] ${c.status === 'active' ? 'border-emerald-500/30 text-emerald-600' : c.status === 'at_risk' ? 'border-amber-500/30 text-amber-600' : 'border-red-500/30 text-red-600'}`}>{c.status}</Badge></div>
          </div>
        </div>))}
      </div></CardContent></Card>
    </div>
  )
}

function ProjectsView() {
  const projects = [
    { name: "Website Redesign", client: "TechCorp", score: 92, hours: 45, value: "$4,250", risk: "low", platform: "upwork" },
    { name: "Mobile App MVP", client: "StartupHub", score: 78, hours: 120, value: "$6,800", risk: "medium", platform: "fiverr" },
    { name: "Backend API System", client: "Global Ent.", score: 55, hours: 30, value: "$3,200", risk: "high", platform: "upwork" },
    { name: "Brand Identity Package", client: "Creative Studios", score: 91, hours: 80, value: "$5,500", risk: "low", platform: "toptal" },
    { name: "E-commerce Platform", client: "Acme Corp", score: 38, hours: 15, value: "$9,200", risk: "critical", platform: "fiverr" },
  ]
  const riskColor: Record<string, string> = { low: "border-emerald-500/30 text-emerald-600", medium: "border-amber-500/30 text-amber-600", high: "border-orange-500/30 text-orange-600", critical: "border-red-500/30 text-red-600" }
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6"><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Project Protection</h1><p className="text-[16px] text-muted-foreground">Monitor project protection scores, risks, and evidence coverage</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Active Projects</CardTitle><Layers className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">5</div><p className="text-[12px] text-muted-foreground">3 platforms</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Avg Protection</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-emerald-600">70.8%</div><p className="text-[12px] text-muted-foreground">Good coverage</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Total Value</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">$28,950</div><p className="text-[12px] text-muted-foreground">Protected</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">At-Risk Projects</CardTitle><AlertCircle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-[24px] font-bold text-red-600">2</div><p className="text-[12px] text-muted-foreground">Need review</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-[18px]">Project List</CardTitle></CardHeader><CardContent><div className="space-y-3">
        {projects.map((p, i) => (<div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-4"><div className={`w-2 h-8 rounded-full ${p.score >= 80 ? 'bg-emerald-500' : p.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} /><div><div className="font-medium text-foreground">{p.name}</div><div className="text-sm text-muted-foreground">{p.client} · {p.hours}h · {p.platform}</div></div></div>
          <div className="flex items-center gap-4"><div className="text-center"><div className="text-xs text-muted-foreground">Score</div><div className="text-sm font-bold text-foreground">{p.score}%</div></div><div className="text-sm font-bold text-foreground">{p.value}</div><Badge variant="outline" className={`text-[10px] ${riskColor[p.risk]}`}>{p.risk} risk</Badge></div>
        </div>))}
      </div></CardContent></Card>
    </div>
  )
}

function EvidenceView() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6"><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Evidence Library</h1><p className="text-[16px] text-muted-foreground">Browse, analyze, and export your work evidence across all projects</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Total Items</CardTitle><Eye className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">254</div><p className="text-[12px] text-muted-foreground">Across all projects</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Health Score</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-emerald-600">94%</div><p className="text-[12px] text-muted-foreground">Excellent</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Compliance Rate</CardTitle><CheckCircle2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-emerald-600">97%</div><p className="text-[12px] text-muted-foreground">Verified items</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Evidence Gaps</CardTitle><AlertCircle className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-[24px] font-bold text-amber-600">3</div><p className="text-[12px] text-muted-foreground">Need attention</p></CardContent></Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-[16px]">Evidence by Type</CardTitle></CardHeader><CardContent><div className="space-y-3">
          {[{ label: "Screenshots", val: 47, max: 50 }, { label: "Activity Logs", val: 128, max: 150 }, { label: "Work Memos", val: 23, max: 30 }, { label: "Compliance Records", val: 56, max: 60 }].map((e, i) => (<div key={i}><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">{e.label}</span><span className="font-medium text-foreground">{e.val}</span></div><Progress value={(e.val / e.max) * 100} className="h-2" /></div>))}
        </div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[16px]">Quality Scorecard</CardTitle></CardHeader><CardContent><div className="space-y-3">
          {[{ label: "Screenshot Quality", val: 96 }, { label: "Activity Density", val: 87 }, { label: "Memo Completeness", val: 72 }, { label: "Timestamp Accuracy", val: 99 }].map((e, i) => (<div key={i}><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">{e.label}</span><span className={`font-medium ${e.val >= 90 ? 'text-emerald-600' : e.val >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{e.val}%</span></div><Progress value={e.val} className="h-2" /></div>))}
        </div></CardContent></Card>
      </div>
    </div>
  )
}

function TimeTrackingView() {
  const [timerRunning, setTimerRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => { if (!timerRunning) return; const id = setInterval(() => setElapsed(e => e + 1), 1000); return () => clearInterval(id) }, [timerRunning])
  const fmt = (s: number) => `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const entries = [{ project: "Website Redesign", client: "TechCorp", dur: "4h 30m", platform: "upwork", status: "compliant" }, { project: "Mobile App MVP", client: "StartupHub", dur: "3h 00m", platform: "fiverr", status: "compliant" }, { project: "Brand Identity", client: "Creative Studios", dur: "2h 30m", platform: "upwork", status: "at_risk" }, { project: "E-commerce Platform", client: "Acme Corp", dur: "1h 30m", platform: "fiverr", status: "flagged" }]
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6"><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Time Tracking</h1><p className="text-[16px] text-muted-foreground">Track work hours across all platforms with compliance monitoring</p></div>
      <Card className="border-2 border-primary/20 mb-6"><CardContent className="pt-6"><div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3"><div className={`h-3 w-3 rounded-full ${timerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} /><span className="text-sm font-medium text-muted-foreground">{timerRunning ? 'Recording' : 'Ready to track'}</span></div>
        <div className="text-[56px] font-mono font-bold text-foreground tracking-wider">{fmt(elapsed)}</div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" onClick={() => setTimerRunning(!timerRunning)} className="w-32">{timerRunning ? <><Zap className="mr-2 h-4 w-4" />Pause</> : <><Activity className="mr-2 h-4 w-4" />Start</>}</Button>
          {timerRunning && <Button variant="destructive" size="lg" onClick={() => { setTimerRunning(false); setElapsed(0); toast.success('Time entry saved!') }} className="w-32">Stop</Button>}
        </div>
      </div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-[18px]">Recent Time Entries</CardTitle></CardHeader><CardContent><div className="space-y-2">
        {entries.map((e, i) => (<div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border"><div className="flex items-center gap-3"><div className={`h-2 w-2 rounded-full ${e.status === 'compliant' ? 'bg-emerald-500' : e.status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'}`} /><div><div className="font-medium text-foreground">{e.project}</div><div className="text-sm text-muted-foreground">{e.client} · {e.platform}</div></div></div><div className="flex items-center gap-3"><span className="font-mono text-sm font-medium">{e.dur}</span><Badge variant="outline" className={`text-[10px] ${e.status === 'compliant' ? 'border-emerald-500/30 text-emerald-600' : e.status === 'at_risk' ? 'border-amber-500/30 text-amber-600' : 'border-red-500/30 text-red-600'}`}>{e.status}</Badge></div></div>))}
      </div></CardContent></Card>
    </div>
  )
}

function TagsView() {
  const tags = [{ name: "Urgent", color: "#EF4444", count: 12 }, { name: "Design", color: "#8B5CF6", count: 8 }, { name: "Development", color: "#3B82F6", count: 15 }, { name: "Client Communication", color: "#10B981", count: 6 }, { name: "Bug Fix", color: "#F59E0B", count: 9 }, { name: "Documentation", color: "#6366F1", count: 4 }, { name: "Revision", color: "#EC4899", count: 7 }, { name: "Research", color: "#14B8A6", count: 3 }]
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6 flex items-start justify-between"><div><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Tags</h1><p className="text-[16px] text-muted-foreground">Organize your work with custom tags</p></div><Button className="bg-[#00246B] hover:bg-[#00246B]/90 text-white"><Zap className="mr-2 h-4 w-4" />Create Tag</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tags.map((t, i) => (<Card key={i} className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="pt-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} /><div><div className="font-medium text-foreground">{t.name}</div><div className="text-sm text-muted-foreground">{t.count} entries</div></div></div><Badge variant="secondary">{t.count}</Badge></div></CardContent></Card>))}
      </div>
    </div>
  )
}

function GoalsView() {
  const goals = [{ title: "Reach $10K monthly", progress: 72, deadline: "Jun 30", status: "active" }, { title: "Zero rejected hours", progress: 89, deadline: "Ongoing", status: "active" }, { title: "5-star rating on Upwork", progress: 94, deadline: "Jul 31", status: "active" }, { title: "Complete 50 projects", progress: 60, deadline: "Dec 31", status: "active" }, { title: "Build 3 recurring clients", progress: 100, deadline: "Completed", status: "completed" }]
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6 flex items-start justify-between"><div><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Goals</h1><p className="text-[16px] text-muted-foreground">Set and track your professional goals</p></div><Button className="bg-[#00246B] hover:bg-[#00246B]/90 text-white"><Target className="mr-2 h-4 w-4" />Create Goal</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Active Goals</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">4</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Completion Rate</CardTitle><CheckCircle2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-emerald-600">83%</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Best Streak</CardTitle><Zap className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">14 days</div></CardContent></Card>
      </div>
      <div className="space-y-4">{goals.map((g, i) => (<Card key={i}><CardContent className="pt-6"><div className="flex items-center justify-between mb-3"><div><div className="font-medium text-foreground">{g.title}</div><div className="text-sm text-muted-foreground">Deadline: {g.deadline}</div></div><Badge variant="outline" className={g.status === 'completed' ? 'border-emerald-500/30 text-emerald-600' : 'border-blue-500/30 text-blue-600'}>{g.status}</Badge></div><div className="flex items-center gap-3"><Progress value={g.progress} className="flex-1 h-2" /><span className="text-sm font-bold text-foreground min-w-[40px] text-right">{g.progress}%</span></div></CardContent></Card>))}</div>
    </div>
  )
}

function InvoicesView() {
  const invoices = [{ id: "INV-001", client: "TechCorp", amount: "$4,250", status: "paid", date: "May 15" }, { id: "INV-002", client: "StartupHub", amount: "$6,800", status: "pending", date: "May 22" }, { id: "INV-003", client: "Global Ent.", amount: "$3,200", status: "overdue", date: "May 1" }, { id: "INV-004", client: "Creative Studios", amount: "$5,500", status: "paid", date: "May 10" }, { id: "INV-005", client: "Acme Corp", amount: "$9,200", status: "draft", date: "—" }]
  const statusColor: Record<string, string> = { paid: "border-emerald-500/30 text-emerald-600", pending: "border-blue-500/30 text-blue-600", overdue: "border-red-500/30 text-red-600", draft: "border-gray-500/30 text-gray-600" }
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6 flex items-start justify-between"><div><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Invoices</h1><p className="text-[16px] text-muted-foreground">Manage and track your invoices</p></div><Button className="bg-[#00246B] hover:bg-[#00246B]/90 text-white"><Receipt className="mr-2 h-4 w-4" />Create Invoice</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">$28,950</div><p className="text-[12px] text-muted-foreground">2 paid invoices</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Pending</CardTitle><Clock3 className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-[24px] font-bold text-blue-600">$6,800</div><p className="text-[12px] text-muted-foreground">1 invoice</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Overdue</CardTitle><AlertCircle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-[24px] font-bold text-red-600">$3,200</div><p className="text-[12px] text-muted-foreground">1 invoice</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Avg Payment</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">5.3 days</div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-[18px]">Recent Invoices</CardTitle></CardHeader><CardContent><div className="space-y-2">
        {invoices.map((inv, i) => (<div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"><div className="flex items-center gap-4"><div><div className="font-medium text-foreground">{inv.id}</div><div className="text-sm text-muted-foreground">{inv.client}</div></div></div><div className="flex items-center gap-4"><span className="text-sm text-muted-foreground">{inv.date}</span><span className="text-lg font-bold text-foreground">{inv.amount}</span><Badge variant="outline" className={`text-[10px] ${statusColor[inv.status]}`}>{inv.status}</Badge></div></div>))}
      </div></CardContent></Card>
    </div>
  )
}

function PaymentPatternsView() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6"><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Payment Patterns</h1><p className="text-[16px] text-muted-foreground">Analyze payment history and trends across platforms</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Total Earned</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">$106,430</div><p className="text-[12px] text-emerald-600">+9.2% YoY</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Avg Payment Time</CardTitle><Clock3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">5.3 days</div><p className="text-[12px] text-emerald-600">-0.8 days improving</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">On-Time Rate</CardTitle><CheckCircle2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-emerald-600">89%</div><Progress value={89} className="h-2 mt-1" /></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">At-Risk Amount</CardTitle><AlertCircle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-[24px] font-bold text-red-600">$4,620</div><p className="text-[12px] text-red-500">+$640 vs last month</p></CardContent></Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[{ name: "Upwork", earned: "$62,400", avg: "4.2 days", onTime: "93%", color: "#14A800" }, { name: "Fiverr", earned: "$28,030", avg: "6.8 days", onTime: "84%", color: "#1DBF73" }, { name: "Toptal", earned: "$16,000", avg: "5.1 days", onTime: "91%", color: "#204ECF" }].map((p, i) => (<Card key={i}><CardHeader className="pb-2"><CardTitle className="text-[16px] flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Earned</span><span className="font-medium text-foreground">{p.earned}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg Payment</span><span className="font-medium text-foreground">{p.avg}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">On-Time</span><span className="font-medium text-foreground">{p.onTime}</span></div></div></CardContent></Card>))}
      </div>
      <Card><CardHeader className="pb-2"><CardTitle className="text-[16px] flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" />Late Payment Alerts</CardTitle></CardHeader><CardContent><div className="space-y-2">
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5"><div className="flex items-center justify-between"><div><span className="text-sm font-bold text-red-600">Global Enterprises</span><span className="text-xs text-muted-foreground ml-2">— 14 days overdue</span></div><span className="text-sm font-bold text-red-600">$3,200</span></div></div>
        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5"><div className="flex items-center justify-between"><div><span className="text-sm font-bold text-amber-600">Acme Corp</span><span className="text-xs text-muted-foreground ml-2">— 5 days overdue</span></div><span className="text-sm font-bold text-amber-600">$1,420</span></div></div>
      </div></CardContent></Card>
    </div>
  )
}

function ReportsView() {
  const reports = [{ id: "UPW-2024-001", client: "TechCorp", amount: "$1,200", status: "generated", date: "May 20" }, { id: "FIV-2024-002", client: "StartupHub", amount: "$890", status: "sent", date: "May 18" }, { id: "UPW-2024-003", client: "Global Ent.", amount: "$3,200", status: "resolved", date: "May 10" }, { id: "TOP-2024-004", client: "Creative Studios", amount: "$560", status: "appealed", date: "May 5" }]
  const statusColor: Record<string, string> = { generated: "border-blue-500/30 text-blue-600", sent: "border-amber-500/30 text-amber-600", resolved: "border-emerald-500/30 text-emerald-600", appealed: "border-purple-500/30 text-purple-600" }
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6 flex items-start justify-between"><div><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Reports</h1><p className="text-[16px] text-muted-foreground">Generate and manage dispute reports</p></div><Button className="bg-[#00246B] hover:bg-[#00246B]/90 text-white" onClick={() => toast.success('Report generated! Case ID: RPT-005')}><FileText className="mr-2 h-4 w-4" />Generate Report</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Total Reports</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">4</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Success Rate</CardTitle><CheckCircle2 className="h-4 w-4 text-emerald-500" /></CardHeader><CardContent><div className="text-[24px] font-bold text-emerald-600">83%</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Avg Resolution</CardTitle><Clock3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">6.2 days</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Protected Amount</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-emerald-600">$4,850</div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-[18px]">Dispute Reports</CardTitle></CardHeader><CardContent><div className="space-y-2">
        {reports.map((r, i) => (<div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"><div><div className="font-mono font-medium text-foreground">{r.id}</div><div className="text-sm text-muted-foreground">{r.client} · {r.date}</div></div><div className="flex items-center gap-4"><span className="text-lg font-bold text-foreground">{r.amount}</span><Badge variant="outline" className={`text-[10px] ${statusColor[r.status]}`}>{r.status}</Badge></div></div>))}
      </div></CardContent></Card>
    </div>
  )
}

function PlatformsView() {
  const [connecting, setConnecting] = useState<string | null>(null)
  const platforms = [{ name: "Upwork", color: "#14A800", connected: true, lastSync: "2 min ago", projects: 3 }, { name: "Fiverr", color: "#1DBF73", connected: true, lastSync: "15 min ago", projects: 2 }, { name: "Toptal", color: "#204ECF", connected: false, lastSync: "—", projects: 0 }, { name: "Freelancer.com", color: "#29B2FE", connected: false, lastSync: "—", projects: 0 }]
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6"><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Platform Connections</h1><p className="text-[16px] text-muted-foreground">Connect and manage your freelance platform accounts</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((p, i) => (<Card key={i} className={p.connected ? 'border-emerald-500/30' : ''}><CardContent className="pt-6"><div className="flex items-center justify-between">
          <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}><div className="w-6 h-6 rounded" style={{ backgroundColor: p.color }} /></div><div><div className="font-medium text-foreground text-lg">{p.name}</div>{p.connected ? <div className="text-sm text-emerald-600">Connected · Last sync: {p.lastSync}</div> : <div className="text-sm text-muted-foreground">Not connected</div>}</div></div>
          <div>{p.connected ? <Button variant="outline" size="sm" onClick={() => toast.info(`Disconnecting ${p.name}...`)}>Disconnect</Button> : <Button size="sm" className="bg-[#00246B] hover:bg-[#00246B]/90 text-white" onClick={() => { setConnecting(p.name); toast.success(`Connecting to ${p.name}...`) }}>Connect</Button>}</div>
        </div>{p.connected && <div className="mt-4 pt-4 border-t border-border"><div className="flex gap-4 text-sm"><span className="text-muted-foreground">Projects: <span className="text-foreground font-medium">{p.projects}</span></span><span className="text-muted-foreground">Compliance: <span className="text-emerald-600 font-medium">Active</span></span></div></div>}</CardContent></Card>))}
      </div>
    </div>
  )
}

function AIInsightsView() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6"><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">AI Insights</h1><p className="text-[16px] text-muted-foreground">AI-powered dispute prediction and protection recommendations</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Dispute Risk</CardTitle><AlertCircle className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-[24px] font-bold text-amber-600">Medium</div><p className="text-[12px] text-muted-foreground">Based on current patterns</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Predicted Savings</CardTitle><DollarSign className="h-4 w-4 text-emerald-500" /></CardHeader><CardContent><div className="text-[24px] font-bold text-emerald-600">$892/mo</div><p className="text-[12px] text-muted-foreground">With current protection</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-[14px] font-medium text-muted-foreground">Accuracy</CardTitle><Brain className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-[24px] font-bold text-foreground">94.2%</div><p className="text-[12px] text-muted-foreground">Prediction accuracy</p></CardContent></Card>
      </div>
      <Card className="mb-6"><CardHeader className="pb-2"><CardTitle className="text-[16px] flex items-center gap-2"><Brain className="w-4 h-4 text-primary" />AI Recommendations</CardTitle></CardHeader><CardContent><div className="space-y-3">
        <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5"><div className="flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4 text-amber-500" /><span className="text-sm font-bold text-amber-600">Add Work Memos to Fiverr Sessions</span></div><p className="text-xs text-muted-foreground">Your Fiverr sessions have 30% fewer work memos than platform average. Adding 2-3 memos per session can reduce rejection risk by 45%.</p></div>
        <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5"><div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm font-bold text-emerald-600">Upwork Pattern is Strong</span></div><p className="text-xs text-muted-foreground">Your Upwork work diary consistently meets all compliance requirements. Maintain current screenshot frequency and memo quality.</p></div>
        <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5"><div className="flex items-center gap-2 mb-1"><FileX className="w-4 h-4 text-red-500" /><span className="text-sm font-bold text-red-600">Evidence Gap on Toptal Project</span></div><p className="text-xs text-muted-foreground">Missing 5 hours of screenshots on the Brand Identity project. Generate evidence report before client review on Friday.</p></div>
      </div></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-[16px]">Custom Policy Analysis</CardTitle><Badge variant="outline" className="text-[10px] ml-2">Pro Feature</Badge></CardHeader><CardContent><p className="text-sm text-muted-foreground mb-4">AI-powered analysis of platform-specific policies and how they apply to your current work sessions.</p><Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => toast.success('Policy analysis started!')}>Analyze Current Session</Button></CardContent></Card>
    </div>
  )
}

function SubscriptionView() {
  const [selectedPlan, setSelectedPlan] = useState('free')
  const plans = [{ name: "Free", price: "$0", period: "/mo", features: ["1 dispute report/mo", "Basic compliance", "1 platform", "Community support"], highlight: false }, { name: "Starter", price: "$9", period: "/mo", features: ["5 reports/mo", "Enhanced compliance", "2 platforms", "Evidence export", "Email support"], highlight: false }, { name: "Pro", price: "$29", period: "/mo", features: ["Unlimited reports", "AI dispute prediction", "Cross-platform verification", "WCVM engine", "Priority support"], highlight: true }, { name: "Expert", price: "$79", period: "/mo", features: ["Everything in Pro", "Team features", "Custom policies", "Premium network", "Dedicated support"], highlight: false }]
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6"><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Subscription</h1><p className="text-[16px] text-muted-foreground">Manage your TIMELock subscription plan</p></div>
      <Card className="mb-6 border-primary/30"><CardContent className="pt-6"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Zap className="h-6 w-6 text-primary" /></div><div><div className="text-lg font-bold text-foreground">Current Plan: Free</div><div className="text-sm text-muted-foreground">Basic protection with limited features</div></div></div><Button className="bg-[#00246B] hover:bg-[#00246B]/90 text-white">Upgrade to Pro</Button></div></CardContent></Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {plans.map((p, i) => (<Card key={i} className={p.highlight ? 'border-primary ring-2 ring-primary/20' : ''}><CardContent className="pt-6">{p.highlight && <Badge className="mb-3 bg-primary text-primary-foreground">Most Popular</Badge>}<div className="mb-4"><div className="text-lg font-bold text-foreground">{p.name}</div><div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-foreground">{p.price}</span><span className="text-muted-foreground">{p.period}</span></div></div><ul className="space-y-2 mb-4">{p.features.map((f, j) => (<li key={j} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" /><span className="text-muted-foreground">{f}</span></li>))}</ul><Button className={`w-full ${p.highlight ? 'bg-[#00246B] hover:bg-[#00246B]/90 text-white' : ''}`} variant={p.highlight ? 'default' : 'outline'}>{p.name === 'Free' ? 'Current Plan' : 'Upgrade'}</Button></CardContent></Card>))}
      </div>
    </div>
  )
}

function SettingsView() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6"><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Settings</h1><p className="text-[16px] text-muted-foreground">Manage your account and preferences</p></div>
      <div className="space-y-6">
        <Card><CardHeader><CardTitle className="text-[18px]">Profile</CardTitle></CardHeader><CardContent><div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-sm font-medium text-muted-foreground">Full Name</label><div className="mt-1 p-2 rounded-md border border-border bg-background text-foreground">John Doe</div></div><div><label className="text-sm font-medium text-muted-foreground">Email</label><div className="mt-1 p-2 rounded-md border border-border bg-background text-foreground">john@example.com</div></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-sm font-medium text-muted-foreground">Hourly Rate</label><div className="mt-1 p-2 rounded-md border border-border bg-background text-foreground">$25/hr</div></div><div><label className="text-sm font-medium text-muted-foreground">Primary Platform</label><div className="mt-1 p-2 rounded-md border border-border bg-background text-foreground">Upwork</div></div></div>
        </div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-[18px]">API Keys</CardTitle></CardHeader><CardContent><div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border"><div><div className="text-sm font-medium text-foreground">Production Key</div><div className="text-xs text-muted-foreground font-mono">tl_live_****...****x7k9</div></div><Badge variant="outline" className="border-emerald-500/30 text-emerald-600">Active</Badge></div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border"><div><div className="text-sm font-medium text-foreground">Development Key</div><div className="text-xs text-muted-foreground font-mono">tl_test_****...****m2p4</div></div><Badge variant="outline" className="border-emerald-500/30 text-emerald-600">Active</Badge></div>
          <Button variant="outline" size="sm" onClick={() => toast.success('New API key generated!')}>Generate New Key</Button>
        </div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-[18px]">Notifications</CardTitle></CardHeader><CardContent><div className="space-y-3">
          {[{ label: "Compliance alerts", desc: "Get notified when compliance drops", on: true }, { label: "Payment reminders", desc: "Remind clients about overdue invoices", on: true }, { label: "Weekly summary", desc: "Weekly report of your protection status", on: false }, { label: "AI insights", desc: "Proactive AI-powered recommendations", on: true }].map((n, i) => (<div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border"><div><div className="text-sm font-medium text-foreground">{n.label}</div><div className="text-xs text-muted-foreground">{n.desc}</div></div><Switch defaultChecked={n.on} /></div>))}
        </div></CardContent></Card>
      </div>
    </div>
  )
}

function HelpCenterView() {
  const [search, setSearch] = useState('')
  const faqs = [{ q: "What is TIMELock?", a: "TIMELock is a freelancer protection platform that monitors your work compliance in real-time, collects evidence, and generates dispute reports to protect your payments." }, { q: "How does evidence collection work?", a: "TIMELock automatically captures screenshots, tracks activity density, and records work memos during your sessions. This evidence is verified against platform requirements." }, { q: "What platforms are supported?", a: "We support Upwork, Fiverr, and Toptal with platform-specific compliance rules and work diary integration." }, { q: "Can I try TIMELock for free?", a: "Yes! Our Free plan includes 1 dispute report per month, basic compliance monitoring, and 1 platform connection." }, { q: "How does AI dispute prediction work?", a: "Our AI analyzes your work patterns, platform policies, and historical dispute data to predict potential issues before they become problems." }, { q: "Is my data secure?", a: "All evidence is encrypted end-to-end and stored securely. Only you can access your data, and we never share it with third parties." }]
  const filtered = search ? faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())) : faqs
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6"><h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Help Center</h1><p className="text-[16px] text-muted-foreground">Get help and support for TIMELock</p></div>
      <div className="mb-6"><div className="relative"><input type="text" placeholder="Search help articles..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 rounded-lg border border-border bg-background text-foreground pl-10" /><HelpCircle className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" /></div></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[{ icon: HelpCircle, label: "Contact Support", color: "bg-blue-500/10 text-blue-600" }, { icon: Clock3, label: "Schedule Call", color: "bg-emerald-500/10 text-emerald-600" }, { icon: FileX, label: "Report Bug", color: "bg-red-500/10 text-red-600" }, { icon: Star, label: "Feature Request", color: "bg-amber-500/10 text-amber-600" }].map((a, i) => { const Icon = a.icon; return (<Card key={i} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => toast.info(`${a.label} feature coming soon!`)}><CardContent className="pt-6 text-center"><Icon className={`h-8 w-8 mx-auto mb-2 ${a.color.split(' ')[1]}`} /><div className="text-sm font-medium text-foreground">{a.label}</div></CardContent></Card>) })}
      </div>
      <Card><CardHeader><CardTitle className="text-[18px]">Frequently Asked Questions</CardTitle></CardHeader><CardContent><div className="space-y-3">
        {filtered.map((f, i) => (<div key={i} className="p-4 rounded-lg border border-border"><div className="text-sm font-bold text-foreground mb-2">{f.q}</div><div className="text-sm text-muted-foreground">{f.a}</div></div>))}
      </div></CardContent></Card>
    </div>
  )
}

/* ─────────────────────── MAIN APP ─────────────────────── */

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState<'landing' | 'dashboard'>('landing')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('timelock_theme') as 'light' | 'dark' | null
    const t = saved || 'dark'
    document.documentElement.classList.toggle('dark', t === 'dark')
    // Defer state updates to avoid synchronous setState in effect
    queueMicrotask(() => {
      setTheme(t)
      setMounted(true)
    })
  }, [])

  useEffect(() => {
    localStorage.setItem('timelock_theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  if (!mounted) return null

  const handleGetStarted = () => {
    setView('dashboard')
    toast.success('Welcome to TIMELock!', { description: 'Your protection dashboard is ready' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-md px-3 py-2">
        <Sun className={`h-4 w-4 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
        <Switch
          checked={theme === 'dark'}
          onCheckedChange={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label="Toggle dark mode"
        />
        <Moon className={`h-4 w-4 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>

      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Landing Navbar */}
            <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
              <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
                  <div className="w-8 h-8 rounded-lg bg-[#00246B] flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-2xl font-bold tracking-tight">TIMELock</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => document.getElementById('problems')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:block cursor-pointer"
                  >
                    Problems We Solve
                  </button>
                  <button
                    onClick={() => document.getElementById('social-proof')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:block cursor-pointer"
                  >
                    Reviews
                  </button>
                  <Button
                    onClick={handleGetStarted}
                    className="bg-[#00246B] hover:bg-[#00246B]/90 text-white rounded-full px-6 cursor-pointer"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </nav>

            <main>
              <HeroSection onGetStarted={handleGetStarted} />
              <ProblemCards />
              <SocialProofSection />
              <FinalCTA onGetStarted={handleGetStarted} />
            </main>
            <LandingFooter />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-full min-h-screen"
          >
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card border border-border cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Sidebar - desktop always visible, mobile overlay */}
            <div className={`fixed md:relative z-40 md:z-auto ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-transform duration-300`}>
              <DashboardSidebar
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                activeTab={activeTab}
                setActiveTab={(tab) => { setActiveTab(tab); setMobileMenuOpen(false) }}
              />
            </div>
            {mobileMenuOpen && (
              <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Main content */}
            <div className="flex-1 min-h-screen bg-background">
              {/* Dashboard top bar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#00246B] flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                    JD
                  </div>
                  <span className="text-sm font-medium text-foreground hidden md:block">John Doe</span>
                  <Badge variant="outline" className="text-[10px] hidden md:block">Free Tier</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setView('landing')}
                >
                  <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                  Back to Home
                </Button>
              </div>

              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'clients' && <ClientsView />}
              {activeTab === 'projects' && <ProjectsView />}
              {activeTab === 'evidence' && <EvidenceView />}
              {activeTab === 'time' && <TimeTrackingView />}
              {activeTab === 'tags' && <TagsView />}
              {activeTab === 'goals' && <GoalsView />}
              {activeTab === 'invoices' && <InvoicesView />}
              {activeTab === 'payments' && <PaymentPatternsView />}
              {activeTab === 'reports' && <ReportsView />}
              {activeTab === 'platforms' && <PlatformsView />}
              {activeTab === 'ai' && <AIInsightsView />}
              {activeTab === 'subscription' && <SubscriptionView />}
              {activeTab === 'settings' && <SettingsView />}
              {activeTab === 'help' && <HelpCenterView />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
