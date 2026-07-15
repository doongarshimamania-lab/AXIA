import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";

const tiers = [
  { name: "Free", price: "$0", description: "Basic protection", popular: false },
  { name: "Starter", price: "$7/mo", description: "Essential features", popular: false },
  { name: "Pro", price: "$15/mo", description: "Advanced protection", popular: true },
  { name: "Expert", price: "$49/mo", description: "Maximum protection", popular: false },
];

const features = [
  {
    category: "Project Protection",
    items: [
      { name: "Project Protection Workspace", values: ["✓ (1 client preview)", "✓ (3 clients)", "✓ (10 clients)", "✓ (Unlimited)"] },
      { name: "Project Timeline Analysis", values: ["✓ (Basic)", "✓ (Contextual)", "✓ (Advanced vulnerability detection)", "✓ (Business-level protection)"] },
    ],
  },
  {
    category: "Context Verification",
    items: [
      { name: "Context Gap Identification", values: [false, "✓ (Basic)", "✓ (Advanced)", "✓ (Strategic)"] },
      { name: "Platform-Specific Requirements", values: [false, "✓ (Upwork only)", "✓ (Upwork, Fiverr)", "✓ (Upwork, Fiverr, Toptal)"] },
    ],
  },
  {
    category: "Timeline Analysis",
    items: [
      { name: "Timeline Risk Detection", values: ["✓ (Basic)", "✓ (Contextual)", "✓ (Pattern analysis)", "✓ (Cross-platform analysis)"] },
      { name: "Timeline Protection Score", values: [false, false, true, "✓ (Business-wide)"] },
    ],
  },
  {
    category: "Evidence Collection",
    items: [
      { name: "Evidence Timeline", values: [true, true, true, true] },
      { name: "Evidence Optimization", values: [false, "✓ (Basic)", "✓ (Advanced)", "✓ (Strategic)"] },
    ],
  },
  {
    category: "Dispute Prevention",
    items: [
      { name: "Dispute Simulation", values: [false, "✓ (1/mo)", "✓ (3/mo)", "✓ (Unlimited)"] },
      { name: "Dispute Prevention Alerts", values: [false, true, true, true] },
    ],
  },
  {
    category: "Value Metrics",
    items: [
      { name: "Dollar Value Protected", values: [false, "✓ (Weekly)", "✓ (Weekly/Monthly)", "✓ (Weekly/Monthly/Business-wide)"] },
      { name: "Dispute Success Rate", values: [false, false, true, true] },
    ],
  },
];

export function FeatureComparison() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const addToWaitlist = useMutation(api.waitlist.addToWaitlist);

  const handleTierClick = (tierName: string) => {
    // Scroll to waitlist section
    const waitlistSection = document.querySelector('[data-waitlist-section]');
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Show toast to encourage signup
      setTimeout(() => {
        toast.info(`Join the waitlist to get ${tierName} tier access!`, {
          description: "Be the first to know when we launch.",
        });
      }, 500);
    }
  };

  const renderValue = (value: boolean | string) => {
    if (value === false) {
      return <X className="w-5 h-5 text-danger mx-auto" />;
    }
    if (value === true) {
      return <Check className="w-5 h-5 text-primary mx-auto" />;
    }
    return <span className="text-sm text-foreground">{value}</span>;
  };

  return (
    <section className="py-20 px-10 bg-muted">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-[32px] font-bold text-foreground mb-4">
            Choose Your Protection Level
          </h2>
          <p className="text-[18px] text-muted-foreground max-w-[700px] mx-auto">
            Each tier builds on the previous with stronger dispute success rates
          </p>
        </motion.div>

        <div className="overflow-x-auto pb-6">
          <table className="w-full min-w-[900px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-card shadow-sm">
                <th className="p-6 text-left"></th>
                {tiers.map((tier, index) => (
                  <th
                    key={index}
                    className={`p-6 text-center relative ${
                      index === 0 ? "rounded-tl-2xl" : ""
                    } ${index === tiers.length - 1 ? "rounded-tr-2xl" : ""}`}
                  >
                    {tier.popular && (
                      <div className="absolute top-0 right-0 bg-premium text-foreground text-xs font-semibold px-2 py-1 rounded-tr-lg rounded-bl-lg">
                        POPULAR
                      </div>
                    )}
                    <div className="text-xl font-bold text-foreground mb-2">
                      {tier.name}
                    </div>
                    <div className="text-base font-semibold text-foreground mb-2">
                      {tier.price}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tier.description}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((category, catIndex) => (
                <>
                  <tr key={`cat-${catIndex}`}>
                    <td colSpan={5} className="pt-6 pb-2 px-6 text-lg font-bold text-foreground">
                      {category.category}
                    </td>
                  </tr>
                  {category.items.map((item, itemIndex) => (
                    <tr key={`item-${catIndex}-${itemIndex}`} className="border-b border-border">
                      <td className="p-5 text-base font-medium text-foreground">
                        {item.name}
                      </td>
                      {item.values.map((value, valIndex) => (
                        <td key={valIndex} className="p-5 text-center">
                          {renderValue(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
              <tr>
                <td className="p-5"></td>
                {tiers.map((tier, index) => (
                  <td key={index} className="p-5 text-center">
                    <Button
                      onClick={() => handleTierClick(tier.name)}
                      disabled={loadingTier === tier.name}
                      className="w-full max-w-[180px] h-14 rounded-xl font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all hover:scale-105"
                     
                    >
                      {tier.name === "Free" ? "Get Started" : `Get ${tier.name}`}
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}