import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";

interface ProblemSectionProps {
  id: string;
  problemTitle: string;
  problemDescription: string;
  problemStat: string;
  problemStatSource: string;
  solutionTitle: string;
  solutionDescription: string;
  solutionBenefits: string[];
  image?: string;
  reversed?: boolean;
}

export function ProblemSection({
  id,
  problemTitle,
  problemDescription,
  problemStat,
  problemStatSource,
  solutionTitle,
  solutionDescription,
  solutionBenefits,
  reversed = false,
}: ProblemSectionProps) {
  const scrollToWaitlist = () => {
    const el = document.querySelector('[data-waitlist-section]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section id={id} className="py-20 px-6 md:px-10 bg-white dark:bg-background overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <div className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
          
          {/* Problem Side (Pain) */}
          <motion.div 
            initial={{ opacity: 0, x: reversed ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 w-full"
          >
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-3xl p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <AlertTriangle className="w-32 h-32 text-red-500" />
              </div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider mb-6">
                  The Problem
                </div>
                
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "Space Grotesk" }}>
                  {problemTitle}
                </h3>
                
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                  {problemDescription}
                </p>
                
                <div className="bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-red-100 dark:border-red-900/20">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2" style={{ fontFamily: "Space Grotesk" }}>
                    {problemStat}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    — {problemStatSource}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Solution Side (Gain) */}
          <motion.div 
            initial={{ opacity: 0, x: reversed ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 w-full"
          >
            <div className="pl-0 lg:pl-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00246B]/10 dark:bg-blue-900/30 text-[#00246B] dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                The TIMELock Solution
              </div>
              
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6" style={{ fontFamily: "Space Grotesk" }}>
                {solutionTitle}
              </h3>
              
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                {solutionDescription}
              </p>
              
              <ul className="space-y-4 mb-10">
                {solutionBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-[#00246B] dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-base text-slate-700 dark:text-slate-200 font-medium">{benefit}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={scrollToWaitlist}
                className="group inline-flex items-center gap-2 text-lg font-bold text-[#00246B] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Join the Waitlist to Fix This
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
