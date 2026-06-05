import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

interface ProtectionScoreCardProps {
  score: number;
  tier: string;
  description: string;
  metrics: Array<{ name: string; value: string }>;
  valueProtection: number;
  upgradeMessage: string | null;
  onUpgrade?: () => void;
  isDemoMode?: boolean;
  gradient: string;
  borderColor: string;
  primaryColor: string;
}

export function ProtectionScoreCard({
  score,
  tier,
  description,
  metrics,
  valueProtection,
  upgradeMessage,
  onUpgrade,
  isDemoMode = false,
  gradient,
  borderColor,
  primaryColor
}: ProtectionScoreCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    let current = 0;
    const targetScore = score;
    const increment = Math.ceil(targetScore / 20);
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setAnimatedScore(targetScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(current);
      }
    }, 50);
    
    return () => clearInterval(timer);
  }, [score]);

  return (
    <Card className={`relative overflow-hidden rounded-2xl border-2 shadow-xl transition-all duration-300 hover:shadow-2xl ${borderColor}`}>
      {/* Header */}
      <div className={`p-6 ${gradient}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-white">Protection Score</h3>
              <p className="text-sm text-white/80">{description}</p>
            </div>
          </div>
          <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 font-bold px-4 py-1">
            {tier.toUpperCase()}
          </Badge>
        </div>

        {isDemoMode && (
          <div className="mb-4 rounded-lg border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-white">
            📊 Demo Mode: Connect a live project for real-time protection insights
          </div>
        )}

        {/* Score Display */}
        <div className="text-center py-6">
          <div className="text-6xl font-black text-white mb-2 drop-shadow-lg">
            {animatedScore}
          </div>
          <div className="text-white/90 text-lg font-semibold">
            Protection Score
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-6 bg-card">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/50 transition-colors"
            >
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {metric.name}
              </div>
              <div className="text-lg font-bold" style={{ color: primaryColor }}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>

        {/* Value Protection */}
        <div className={`p-4 rounded-xl mb-4 ${gradient} bg-opacity-10`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Protected Value
              </div>
              <div className="text-3xl font-bold" style={{ color: primaryColor }}>
                ${valueProtection.toLocaleString()}
              </div>
            </div>
            <CheckCircle className="w-8 h-8" style={{ color: primaryColor }} />
          </div>
        </div>

        {/* Upgrade CTA */}
        {upgradeMessage && tier !== 'expert' && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-2">
                  {upgradeMessage}
                </p>
                <Button size="sm" onClick={onUpgrade} className="w-full">
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {tier === 'expert' && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Maximum Protection Active
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your entire business is protected across all platforms
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
