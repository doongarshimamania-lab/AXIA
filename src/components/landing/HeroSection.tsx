import { motion } from "framer-motion";
import { WaitlistForm } from "./WaitlistForm";
import { ShieldCheck, TrendingUp, Clock, FolderKanban, FileCheck, Activity } from "lucide-react";

const avatarNames = ["J", "M", "S", "K"];

export function HeroSection() {
  return (
    <section className="relative pt-6 pb-16 px-6 md:px-10 overflow-hidden bg-[#00246B] dark:bg-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Scarcity Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white mb-6 border border-white/10"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold tracking-wide" style={{ fontFamily: "Space Grotesk" }}>
              100+ already waiting — only 97 spots left
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.15] tracking-tight mb-5 max-w-[900px]"
            style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
          >
            The 1-tab system for Your agency & Freelance business.{" "}
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Ten hours back, every week, 1 Tab.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-blue-100/90 mb-8 max-w-[700px] leading-relaxed"
            style={{ fontFamily: "Space Grotesk" }}
          >
            Scope creep, unpaid revisions, and admin waste aren't inevitable — they're
            symptoms of a broken workflow. Axia fixes the root cause in one tab.
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
              ctaText="Secure Founding Access"
              showScarcity={true}
              className="bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-white/10"
            />
          </motion.div>

          {/* Avatars */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="flex -space-x-2">
              {avatarNames.map((name, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-[#00246B] dark:border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-md"
                  style={{ fontFamily: "Space Grotesk" }}
                >
                  {name}
                </div>
              ))}
            </div>
            <span className="text-sm text-blue-200/80 font-medium" style={{ fontFamily: "Space Grotesk" }}>
              Joined this week
            </span>
          </motion.div>

          {/* Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="w-full max-w-[900px]"
          >
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 md:p-8 shadow-2xl">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
                    Dashboard
                  </h3>
                  <p className="text-xs text-blue-200/60">Last updated: just now</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">Live</span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl bg-white/10 border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderKanban className="w-4 h-4 text-blue-300" />
                    <span className="text-xs text-blue-200/70 font-medium">Active Projects</span>
                  </div>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
                    7
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-emerald-300" />
                    <span className="text-xs text-blue-200/70 font-medium">Verified Hours</span>
                  </div>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
                    142
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-amber-300" />
                    <span className="text-xs text-blue-200/70 font-medium">Revenue MTD</span>
                  </div>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
                    $12,840
                  </div>
                </div>
              </div>

              {/* Recent Verified Deliverables */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck className="w-4 h-4 text-blue-300" />
                  <span className="text-sm font-semibold text-white" style={{ fontFamily: "Space Grotesk" }}>
                    Recent Verified Deliverables
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Brand Guidelines v2", time: "2h 34m", status: "Verified" },
                    { name: "API Integration Sprint", time: "8h 12m", status: "Verified" },
                    { name: "Q1 Marketing Report", time: "3h 45m", status: "Verified" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <Activity className="w-3.5 h-3.5 text-blue-300/60" />
                        <span className="text-sm text-blue-100/80">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-blue-200/50">{item.time}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
