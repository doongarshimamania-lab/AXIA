import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Plus } from "lucide-react";

export default function Goals() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Goals
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Set and track your professional goals
            </p>
          </div>

          <div className="mb-4">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No goals yet. Set your first goal to track your progress.</p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
