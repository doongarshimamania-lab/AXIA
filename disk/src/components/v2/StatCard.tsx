import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function StatCard({ icon: Icon, value, label, trend, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
          </div>
          {trend && (
            <span className={`text-sm font-medium ${trend.isPositive ? "text-emerald-600" : "text-destructive"}`}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
