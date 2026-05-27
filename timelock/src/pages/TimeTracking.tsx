import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Play } from "lucide-react";

export default function TimeTracking() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Time Tracking
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Track your work hours across all projects
            </p>
          </div>

          <div className="mb-4">
            <Button className="bg-primary hover:bg-primary/90">
              <Play className="mr-2 h-4 w-4" />
              Start Timer
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No time entries yet. Start tracking to see your work hours.</p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}