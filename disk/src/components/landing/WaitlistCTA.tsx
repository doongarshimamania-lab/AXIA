import { motion } from "framer-motion";
import { WaitlistForm } from "./WaitlistForm";

const metrics = [
  { amount: "83%", description: "Dispute success rate with Axia verification" },
  { amount: "$1,028", description: "Median loss prevented per potential dispute" },
  { amount: "87 min", description: "Saved weekly on evidence collection" },
];

export function WaitlistCTA() {
  return (
    <section 
      data-waitlist-section
      className="py-20 px-10 bg-gradient-to-b from-card to-background"
    >
      <div className="max-w-[800px] mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-[36px] font-bold text-foreground mb-4" style={{ fontFamily: "Space Grotesk" }}>
            Start Protecting Your Income Today
          </h2>
          <p className="text-xl text-muted-foreground leading-7 max-w-[600px] mx-auto mb-10" style={{ fontFamily: "Space Grotesk" }}>
            Join the waitlist and be among the first to access Axia's payment protection platform
          </p>

          <div className="flex justify-center">
            <WaitlistForm variant="dark" />
          </div>

          <div className="flex flex-wrap justify-center gap-10 mt-12">
            {metrics.map((metric, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center min-w-[180px]"
              >
                <div className="text-[32px] font-bold text-[#00246B] dark:text-white leading-none mb-2" style={{ fontFamily: "Space Grotesk" }}>
                  {metric.amount}
                </div>
                <div className="text-base text-muted-foreground" style={{ fontFamily: "Space Grotesk" }}>
                  {metric.description}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
