import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function ApiSettings() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              API Settings
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Manage your API keys and integrations
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configure your API settings and manage access tokens.</p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
