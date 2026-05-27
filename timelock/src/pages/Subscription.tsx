import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function Subscription() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Subscription
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Manage your TIMELock subscription plan
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
                <p className="text-lg font-semibold mb-2">Free Plan</p>
                <p className="text-muted-foreground mb-4">Upgrade to unlock premium features</p>
                <Button className="bg-primary hover:bg-primary/90">
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
