import { motion } from "framer-motion";
import { TestimonialCarousel } from "./TestimonialCarousel";

export function SocialProofSection() {
  return (
    <section className="py-12 px-6 md:px-10 bg-slate-50 dark:bg-slate-950/50">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Don't Just Take My Word For It
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Freelancers are already reclaiming thousands in lost income by verifying their work context.
          </p>
        </motion.div>

        <TestimonialCarousel />
        
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-t border-slate-200 dark:border-slate-800 pt-8">
          <div>
            <div className="text-3xl font-bold text-primary dark:text-blue-400 mb-1">83%</div>
            <div className="text-sm text-slate-500">Dispute Success Rate</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary dark:text-blue-400 mb-1">$1,028</div>
            <div className="text-sm text-slate-500">Avg. Loss Prevented</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary dark:text-blue-400 mb-1">12k+</div>
            <div className="text-sm text-slate-500">Hours Protected</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary dark:text-blue-400 mb-1">4.9/5</div>
            <div className="text-sm text-slate-500">User Rating</div>
          </div>
        </div>
      </div>
    </section>
  );
}