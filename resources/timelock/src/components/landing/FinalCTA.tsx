import { motion } from "framer-motion";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCTAProps {
  /** Called when the primary CTA is clicked (sign up OR go to dashboard) */
  onPrimaryCTA: () => void;
  /** Whether the user is already authenticated — changes CTA label */
  isAuthenticated: boolean;
}

export function FinalCTA({ onPrimaryCTA, isAuthenticated }: FinalCTAProps) {
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
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {isAuthenticated ? "Welcome back to Axia" : "Protect Your Income Today"}
          </h2>

          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
            {isAuthenticated
              ? "Jump back into your dashboard to keep tracking clients, deals, proposals, and invoices — all in one place."
              : "Get started for free with the only tool that verifies your work context against platform requirements — before you submit."}
          </p>

          <div className="flex justify-center">
            <Button
              onClick={onPrimaryCTA}
              size="lg"
              className="h-14 px-8 text-lg font-bold rounded-xl shadow-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isAuthenticated ? (
                <>
                  <LayoutDashboard className="mr-2 h-5 w-5" />
                  Open Dashboard
                </>
              ) : (
                <>
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>

          {!isAuthenticated && (
            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required · Free forever tier · Cancel anytime
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
