import { motion } from "framer-motion";
import { WaitlistForm } from "./WaitlistForm";

export function FinalCTA() {
  return (
    <section 
      data-waitlist-section
      className="py-8 px-6 md:px-10 gradient-hero relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/50 dark:bg-white blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
      </div>

      <div className="max-w-[800px] mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white mb-4">
            Protect Your Income Today
          </h2>
          
          <p className="text-lg text-muted-foreground dark:text-blue-100 mb-6 max-w-2xl mx-auto leading-relaxed">
            Join the waitlist to get early access to the only tool that verifies your work context against platform requirements—before you submit.
          </p>

          <div className="flex justify-center">
            <WaitlistForm 
              variant="dark" 
              ctaText="Get Early Access" 
              showScarcity={true}
              className="bg-muted/50 dark:bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-border dark:border-white/10"
            />
          </div>
          
          <p className="mt-6 text-sm text-muted-foreground dark:text-blue-200/60">
            Join 2,000+ freelancers on the waitlist. Launching soon.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
