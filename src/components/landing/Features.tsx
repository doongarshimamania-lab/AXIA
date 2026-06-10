import { motion } from "framer-motion";
import { Shield, FileCheck, TrendingUp, AlertTriangle, Clock, CheckCircle, Zap, Target } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Real-Time Protection Score",
    description: "Live monitoring of your work context against platform requirements. Know your protection level before submission.",
    stat: "95%",
    statLabel: "Average protection score",
    color: "from-primary to-primary/80",
  },
  {
    icon: FileCheck,
    title: "Evidence Gap Detection",
    description: "AI-powered analysis identifies missing evidence before disputes happen. Never submit incomplete work context again.",
    stat: "87%",
    statLabel: "Gaps caught early",
    color: "from-primary to-indigo-600",
  },
  {
    icon: TrendingUp,
    title: "Dispute Success Prediction",
    description: "Simulate potential disputes and see your success probability. Make informed decisions about work submission.",
    stat: "83%",
    statLabel: "Dispute success rate",
    color: "from-primary to-primary/80",
  },
  {
    icon: AlertTriangle,
    title: "Platform Compliance Alerts",
    description: "Get instant notifications when your work context doesn't meet Upwork, Fiverr, or Toptal requirements.",
    stat: "Real-time",
    statLabel: "Instant alerts",
    color: "from-danger to-[#FF6B6B]",
  },
  {
    icon: Clock,
    title: "Adaptive Evidence Timeline",
    description: "Smart recommendations on when and what evidence to collect based on your work patterns and client requirements.",
    stat: "87 min",
    statLabel: "Saved weekly",
    color: "from-premium to-[#FFA500]",
  },
  {
    icon: CheckCircle,
    title: "Cross-Platform Verification",
    description: "Verify work consistency across multiple platforms. Ensure your evidence aligns everywhere.",
    stat: "4+",
    statLabel: "Platforms supported",
    color: "from-primary to-primary/80",
  },
  {
    icon: Zap,
    title: "Automated Dispute Reports",
    description: "Generate professional dispute reports in seconds with all required evidence automatically compiled.",
    stat: "< 2 min",
    statLabel: "Report generation",
    color: "from-primary/80 to-primary/60",
  },
  {
    icon: Target,
    title: "Client Policy Analyzer",
    description: "Understand specific client requirements and get personalized recommendations for each project.",
    stat: "$1,028",
    statLabel: "Avg. loss prevented",
    color: "from-primary to-primary/80",
  },
];

export function Features() {
  return (
    <section className="py-20 px-10 bg-gradient-to-b from-background to-muted">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-[36px] font-bold text-foreground mb-4">
            Payment Protection Features That Actually Work
          </h2>
          <p className="text-[20px] text-muted-foreground max-w-[800px] mx-auto leading-8">
            Every feature is designed to prevent payment denials before they happen. 
            <span className="text-primary font-semibold"> Real protection, backed by real data.</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-border relative overflow-hidden group"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              <div className="relative z-10">
                {/* Icon with gradient background */}
                <div className={`w-14 h-14 mb-4 flex items-center justify-center rounded-xl bg-gradient-to-br ${feature.color}`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-[18px] font-bold text-foreground mb-3 leading-tight">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-[14px] text-muted-foreground leading-6 mb-4">
                  {feature.description}
                </p>

                {/* Stat badge */}
                <div className="flex items-baseline gap-2 pt-3 border-t border-border">
                  <span className={`text-[24px] font-bold bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                    {feature.stat}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {feature.statLabel}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA at bottom of features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-16"
        >
          <p className="text-[18px] text-muted-foreground mb-6">
            Join <span className="font-bold text-primary">thousands of freelancers</span> protecting their income with Axia
          </p>
          <button
            onClick={() => {
              const waitlistSection = document.querySelector('[data-waitlist-section]');
              if (waitlistSection) {
                waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="px-8 py-4 text-[18px] font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-105"
           
          >
            Start Protecting Your Income →
          </button>
        </motion.div>
      </div>
    </section>
  );
}