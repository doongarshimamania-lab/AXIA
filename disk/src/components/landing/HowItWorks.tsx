import { motion } from "framer-motion";

const steps = [
  {
    number: 1,
    heading: "Track Work Context",
    content: "Axia's browser extension captures work context alongside time tracking, focusing on what matters for payment protection.",
  },
  {
    number: 2,
    heading: "Analyze Against Requirements",
    content: "Our WCVM algorithm analyzes work context against platform-specific requirements to identify potential gaps.",
  },
  {
    number: 3,
    heading: "Receive Actionable Insights",
    content: "Get real-time recommendations to optimize evidence collection before submission.",
  },
  {
    number: 4,
    heading: "Protect Your Billable Hours",
    content: "Verify your work meets payment protection requirements before submission, helping prevent denials before they happen.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 px-10 bg-background">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-[32px] font-bold text-foreground mb-4" style={{ fontFamily: "Space Grotesk" }}>
            How Axia Works
          </h2>
          <p className="text-[18px] text-muted-foreground max-w-[700px] mx-auto" style={{ fontFamily: "Space Grotesk" }}>
            Four simple steps to payment protection
          </p>
        </motion.div>

        {/* Desktop: Horizontal timeline */}
        <div className="hidden md:block relative max-w-[1000px] mx-auto pt-20">
          {/* Timeline line */}
          <div className="absolute top-16 left-[50px] right-[50px] h-0.5 bg-border" />

          <div className="flex justify-between">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative text-center w-1/4 px-4"
              >
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg" style={{ fontFamily: "Space Grotesk" }}>
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "Space Grotesk" }}>
                  {step.heading}
                </h3>
                <p className="text-base text-muted-foreground leading-6" style={{ fontFamily: "Space Grotesk" }}>
                  {step.content}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: Vertical timeline */}
        <div className="md:hidden space-y-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg" style={{ fontFamily: "Space Grotesk" }}>
                {step.number}
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "Space Grotesk" }}>
                  {step.heading}
                </h3>
                <p className="text-base text-muted-foreground leading-6" style={{ fontFamily: "Space Grotesk" }}>
                  {step.content}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}