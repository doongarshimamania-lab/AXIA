import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function PaymentPatterns() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Payment Patterns
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Analyze your payment history and trends
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payment data yet. Connect your platforms to see payment patterns.</p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
