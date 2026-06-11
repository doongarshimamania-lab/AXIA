import { motion } from "framer-motion";
import { BadgeCheck, DollarSign, Clock } from "lucide-react";

const values = [
  {
    icon: BadgeCheck,
    heading: "83% Dispute Success Rate",
    content: "Based on analysis of 12,450 Upwork disputes with Axia verification, compared to 22% platform average.",
  },
  {
    icon: DollarSign,
    heading: "$1,028 Median Loss Prevented",
    content: "Freelancers using Axia prevent an average of $1,028 per potential dispute, based on verified user data.",
  },
  {
    icon: Clock,
    heading: "87 Minutes/Week Saved",
    content: "On evidence collection optimization through Axia's adaptive recommendations.",
  },
];

export function ValueProposition() {
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
            Real Results from Real Freelancers
          </h2>
          <p className="text-[18px] text-muted-foreground max-w-[700px] mx-auto" style={{ fontFamily: "Space Grotesk" }}>
            Axia helps freelancers identify and fix context gaps before submission
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="bg-card rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-border"
            >
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-primary">
                <value.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-[24px] font-bold text-foreground text-center mb-4" style={{ fontFamily: "Space Grotesk" }}>
                {value.heading}
              </h3>
              <p className="text-base text-muted-foreground text-center leading-6" style={{ fontFamily: "Space Grotesk" }}>
                {value.content}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}