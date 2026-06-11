import { motion } from "framer-motion";
import { FileX, AlertCircle, DollarSign, Clock, Shield, ArrowRight, CheckCircle } from "lucide-react";

const problemCategories = [
  {
    icon: FileX,
    problem: "Invoice Errors",
    quote: "My invoice was rejected for 'missing terms' but the platform never told me what was missing. Lost $720.",
    author: "Sarah K., Web Developer",
    avgLoss: "42% of agencies",
    lossDescription: "report not getting paid for invoice errors (Skynova, 2024)",
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50 dark:bg-slate-800/50",
    borderColor: "border-red-200 dark:border-red-900/20",
    iconColor: "text-red-500/20 dark:text-red-500/20",
    solutionTitle: "Verify Invoices Before Submission",
    solutionDescription: "Axia verifies your invoice against platform-specific requirements before submission, showing exactly what's missing with dollar-value impact.",
    features: [
      "Invoice format validation",
      "Terms completeness check",
      "Platform requirement matching",
      "Real-time error detection"
    ]
  },
  {
    icon: AlertCircle,
    problem: "Context Gap Errors",
    quote: "Platform denied payment because my screenshots didn't show 'sufficient activity'—but I was coding the whole time.",
    author: "Marcus T., Software Engineer",
    avgLoss: "35% of agencies",
    lossDescription: "lose payments due to context gaps (Upwork data, 2024)",
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50 dark:bg-slate-800/50",
    borderColor: "border-orange-200 dark:border-orange-900/20",
    iconColor: "text-orange-500/20 dark:text-orange-500/20",
    solutionTitle: "Real-Time Context Verification",
    solutionDescription: "Our WCVM engine analyzes your work context in real-time, alerting you instantly if evidence doesn't meet platform standards.",
    features: [
      "Activity density tracking",
      "Screenshot compliance check",
      "Work context verification",
      "Gap prediction alerts"
    ]
  },
  {
    icon: DollarSign,
    problem: "Pricing Disputes",
    quote: "Client disputed my rate saying 'we never agreed to this'—even though it was in the contract. $1,200 gone.",
    author: "Elena R., Designer",
    avgLoss: "28% of agencies",
    lossDescription: "face pricing disputes without documentation (Fiverr survey, 2024)",
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50 dark:bg-slate-800/50",
    borderColor: "border-amber-200 dark:border-amber-900/20",
    iconColor: "text-amber-500/20 dark:text-amber-500/20",
    solutionTitle: "Document All Pricing Agreements",
    solutionDescription: "Axia documents all pricing agreements with timestamps and client acknowledgment, creating an immutable record.",
    features: [
      "Rate documentation",
      "Client approval tracking",
      "Change order logging",
      "Dispute-ready reports"
    ]
  },
  {
    icon: Clock,
    problem: "Scope Creep",
    quote: "Client kept adding 'small tweaks' that turned into 15 hours of unpaid work. They refused to pay for extras.",
    author: "David L., Developer",
    avgLoss: "42% of agencies",
    lossDescription: "report not getting paid for scope creep (Skynova, 2024)",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50 dark:bg-slate-800/50",
    borderColor: "border-blue-200 dark:border-blue-900/20",
    iconColor: "text-blue-500/20 dark:text-blue-500/20",
    solutionTitle: "Formalize Changes Instantly",
    solutionDescription: "Automatic scope drift detection prompts you to formalize changes immediately, getting client approval on record before you do the work.",
    features: [
      "Scope change detection",
      "One-click change orders",
      "Client approval workflow",
      "Timeline documentation"
    ]
  },
  {
    icon: Shield,
    problem: "Platform Policy Violations",
    quote: "Upwork flagged my work diary for 'low activity' and denied payment. I had no idea I was at risk.",
    author: "Priya M., Consultant",
    avgLoss: "31% of agencies",
    lossDescription: "have payments denied for policy violations (Toptal data, 2024)",
    color: "from-slate-600 to-slate-700",
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
    borderColor: "border-slate-200 dark:border-slate-700/50",
    iconColor: "text-slate-500/20 dark:text-slate-400/20",
    solutionTitle: "Real-Time Compliance Monitoring",
    solutionDescription: "Real-time compliance monitoring against Upwork, Fiverr, and Toptal policies, with instant alerts when you're at risk.",
    features: [
      "Multi-platform compliance",
      "Policy violation alerts",
      "Activity threshold tracking",
      "Preventive recommendations"
    ]
  }
];

const scrollToWaitlist = () => {
  const waitlistSection = document.querySelector('[data-waitlist-section]');
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

export function ProblemCards() {
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
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2" style={{ fontFamily: "Space Grotesk" }}>
            5 Payment Problems Axia Prevents
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Each problem costs agencies hundreds of dollars. Here's how Axia stops them before they happen.
          </p>
        </motion.div>

        {/* First 4 cards in 2x2 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {problemCategories.slice(0, 4).map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 bg-white dark:bg-slate-900 flex flex-col md:flex-row shadow-sm hover:shadow-md"
            >
              {/* Problem Side (Left) */}
              <div className={`${category.bgColor} p-5 md:w-1/2 md:border-r border-slate-200 dark:border-slate-800 relative overflow-hidden`}>
                {/* Background Icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10">
                  <category.icon className={`w-40 h-40 ${category.iconColor}`} strokeWidth={1.5} />
                </div>
                
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                    THE PROBLEM
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2" style={{ fontFamily: "Space Grotesk" }}>
                    The '{category.problem}' Trap
                  </h3>

                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed font-medium">
                    "{category.quote}"
                  </p>

                  <div className="bg-white/50 dark:bg-slate-950/50 rounded-lg p-2 border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                    <div className={`text-xl font-bold bg-gradient-to-r ${category.color} bg-clip-text text-transparent mb-0.5`} style={{ fontFamily: "Space Grotesk" }}>
                      {category.avgLoss}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      — {category.lossDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution Side (Right) */}
              <div className="bg-white dark:bg-slate-900 p-5 md:w-1/2 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                    THE AXIA SOLUTION
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2" style={{ fontFamily: "Space Grotesk" }}>
                    {category.solutionTitle}
                  </h3>

                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                    {category.solutionDescription}
                  </p>

                  <ul className="space-y-1.5 mb-3">
                    {category.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={scrollToWaitlist}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all hover:scale-105 text-xs w-full mt-auto"
                  style={{ fontFamily: "Space Grotesk" }}
                >
                  Join the Waitlist to Fix This
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 5th card centered below */}
        <div className="flex justify-center">
          <div className="w-full lg:w-2/3">
            {problemCategories.slice(4).map((category, index) => (
              <motion.div
                key={index + 4}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 bg-white dark:bg-slate-900 flex flex-col md:flex-row shadow-sm hover:shadow-md"
              >
                {/* Problem Side (Left) */}
                <div className={`${category.bgColor} p-5 md:w-1/2 md:border-r border-slate-200 dark:border-slate-800 relative overflow-hidden`}>
                  {/* Background Icon */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10">
                    <category.icon className={`w-40 h-40 ${category.iconColor}`} strokeWidth={1.5} />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                      THE PROBLEM
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2" style={{ fontFamily: "Space Grotesk" }}>
                      The '{category.problem}' Trap
                    </h3>

                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed font-medium">
                      "{category.quote}"
                    </p>

                    <div className="bg-white/50 dark:bg-slate-950/50 rounded-lg p-2 border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                      <div className={`text-xl font-bold bg-gradient-to-r ${category.color} bg-clip-text text-transparent mb-0.5`} style={{ fontFamily: "Space Grotesk" }}>
                        {category.avgLoss}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                        — {category.lossDescription}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Solution Side (Right) */}
                <div className="bg-white dark:bg-slate-900 p-5 md:w-1/2 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                      THE AXIA SOLUTION
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2" style={{ fontFamily: "Space Grotesk" }}>
                      {category.solutionTitle}
                    </h3>

                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                      {category.solutionDescription}
                    </p>

                    <ul className="space-y-1.5 mb-3">
                      {category.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={scrollToWaitlist}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all hover:scale-105 text-xs w-full mt-auto"
                    style={{ fontFamily: "Space Grotesk" }}
                  >
                    Join the Waitlist to Fix This
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mt-8"
        >
          <button
            onClick={scrollToWaitlist}
            className="px-8 py-3 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-xl transition-all hover:scale-105"
            style={{ fontFamily: "Space Grotesk" }}
          >
            Prevent These Problems Now →
          </button>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Join 2,000+ agencies protecting their income with Axia
          </p>
        </motion.div>
      </div>
    </section>
  );
}