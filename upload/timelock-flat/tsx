import { motion } from "framer-motion";
import { WaitlistForm } from "./WaitlistForm";
import { CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-0 pb-0 px-0 overflow-hidden bg-[#00246B] dark:bg-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none"> {/* Increased opacity */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Identity Trigger */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white mb-4 border border-white/10"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide uppercase" style={{ fontFamily: "Space Grotesk" }}>
              For Freelancers Who Value Their Time
            </span>
          </motion.div>

          {/* Headline - Problem-Focused */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl font-semibold text-white leading-[1.2] tracking-tight mb-4 max-w-[900px]"
            style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
          >
            Stop Losing Payments to Invoice Errors, Context Gaps, and Pricing Disputes
          </motion.h1>

          {/* Subheading - Specific Problem */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-blue-100 mb-6 max-w-[700px] leading-relaxed"
            style={{ fontFamily: "Space Grotesk" }}
          >
            35% of payment disputes happen because of simple mistakes you can prevent. 
            TIMELock verifies your work against platform requirements <i>before</i> submission—so you get paid, every time.
          </motion.p>

          {/* Waitlist Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full flex justify-center mb-8"
          >
            <WaitlistForm 
              variant="dark" 
              ctaText="Secure My Spot" 
              showScarcity={true}
              className="bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-white/10"
            />
          </motion.div>

          {/* Social Proof / Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}\
            className="flex flex-wrap justify-center gap-8 md:gap-16 text-blue-200/80"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <span className="font-medium">$697 Avg. Loss Prevented</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="font-medium">83% Dispute Success Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span className=\"font-medium\">Real-Time Verification</span>\
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
