import { motion } from "framer-motion";
import { WaitlistForm } from "./WaitlistForm";

export function Hero() {
  return (
    <section 
      className="relative py-20 px-10 flex items-center justify-center min-h-[600px] bg-gradient-to-b from-background to-muted"
    >
      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E\")",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-[800px] text-center flex flex-col items-center"
      >
        <h1 
          className="text-[48px] md:text-[56px] font-bold text-foreground leading-[56px] md:leading-[64px] tracking-[-0.02em] mb-4"
         
        >
          Prevent And Save From Payment Denials Before They Happen
        </h1>

        <p 
          className="text-[20px] font-medium text-muted-foreground leading-[28px] mb-12 max-w-[700px]"
         
        >
          Axia verifies your work context meets platform requirements—so your billable hours are payment-protected. The only platform that analyzes work against platform-specific requirements to help prevent denials.
        </p>

        <WaitlistForm variant="light" />
      </motion.div>
    </section>
  );
}