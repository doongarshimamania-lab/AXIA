import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface PricingCardProps {
  tier: string;
  price: string;
  priceNote?: string;
  badge?: string;
  features: Array<{ text: string; highlighted?: boolean; disabled?: boolean }>;
  buttonText: string;
  buttonVariant?: "default" | "outline";
  onButtonClick: () => void;
  highlighted?: boolean;
  index: number;
}

export function PricingCard({
  tier,
  price,
  priceNote,
  badge,
  features,
  buttonText,
  buttonVariant = "default",
  onButtonClick,
  highlighted = false,
  index,
}: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="h-full"
    >
      <Card className={`h-full ${highlighted ? "border-[3px] border-primary relative" : ""}`}>
        {badge && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded text-[12px] font-semibold">
            {badge}
          </div>
        )}
        
        <CardContent className="p-8">
          <h3 className="text-[24px] font-bold text-foreground mb-4">{tier}</h3>
          <div className="text-[48px] font-bold text-foreground mb-2">
            {price}
          </div>
          {priceNote && (
            <div className="text-[14px] text-success font-semibold mb-6">
              {priceNote}
            </div>
          )}
          
          <ul className="space-y-3 mb-8">
            {features.map((feature, idx) => (
              <li
                key={idx}
                className={`flex items-center gap-2 ${feature.disabled ? "opacity-50" : ""}`}
              >
                {feature.disabled ? (
                  <div className="h-5 w-5 rounded-full border-2 border-platinum-200" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                )}
                <span
                  className={feature.highlighted ? "text-success" : ""}
                  dangerouslySetInnerHTML={{ __html: feature.text }}
                />
              </li>
            ))}
          </ul>

          <Button
            variant={buttonVariant}
            className={`w-full ${
              buttonVariant === "default"
                ? "bg-primary hover:bg-primary/90 text-primary-foreground text-[16px] py-3"
                : ""
            }`}
            onClick={onButtonClick}
          >
            {buttonText}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
