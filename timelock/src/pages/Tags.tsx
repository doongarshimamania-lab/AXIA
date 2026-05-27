import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag, Plus } from "lucide-react";

export default function Tags() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Tags
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Organize your work with custom tags
            </p>
          </div>

          <div className="mb-4">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Tag
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tags yet. Create your first tag to organize your work.</p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
