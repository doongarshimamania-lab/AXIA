import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

export default function HelpCenter() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Help Center
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Get help and support for TIMELock
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Support Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Browse our documentation and FAQs to get help with TIMELock.</p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
