import { motion } from "framer-motion";
import { WaitlistForm } from "./WaitlistForm";
import { CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-4 pb-2 px-6 md:px-10 overflow-hidden gradient-hero">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/50 dark:bg-white blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Identity Trigger */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-white/10 text-foreground dark:text-white mb-3 border border-primary/20 dark:border-white/10"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold tracking-wide uppercase">
              For Freelancers Who Value Their Time
            </span>
          </motion.div>

          {/* Headline - Problem-Focused */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-5xl font-semibold text-foreground dark:text-white leading-[1.2] tracking-tight mb-3 max-w-[900px]"
            style={{ fontFamily: "Geist Sans, system-ui, sans-serif" }}
          >
            Stop Losing Payments to Invoice Errors, Context Gaps, and Pricing Disputes
          </motion.h1>

          {/* Subheading - Specific Problem */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground dark:text-blue-100 mb-6 max-w-[700px] leading-relaxed"
          >
            35% of payment disputes happen because of simple mistakes you can prevent. 
            Axia verifies your work against platform requirements <i>before</i> submission—so you get paid, every time.
          </motion.p>

          {/* Waitlist Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full flex justify-center mb-6"
          >
            <WaitlistForm 
              variant="dark" 
              ctaText="Secure My Spot" 
              showScarcity={true}
              className="bg-muted/50 dark:bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-border dark:border-white/10"
            />
          </motion.div>

          {/* Social Proof / Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6 md:gap-12 text-muted-foreground dark:text-blue-200/80"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary dark:text-blue-400" />
              <span className="font-medium text-sm">Avg. Loss Prevented: $697</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary dark:text-blue-400" />
              <span className="font-medium text-sm">83% Dispute Success Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary dark:text-blue-400" />
              <span className="font-medium text-sm">Real-Time Verification</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
