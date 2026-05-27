import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function EvidenceExport() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Evidence Export
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Export your work evidence and compliance data
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No evidence data available. Start tracking to export your work evidence.</p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
