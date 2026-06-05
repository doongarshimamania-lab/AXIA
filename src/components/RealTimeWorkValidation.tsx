import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Eye, MousePointer, Keyboard, Image } from "lucide-react";

export function RealTimeWorkValidation() {
  // Mock real-time data - in production, this would connect to live WCVM data
  const mockValidationData = {
    activeFreelancers: 0,
    averageActivityScore: 0,
    recentActivity: [],
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Freelancers</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockValidationData.activeFreelancers}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Activity Score</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockValidationData.averageActivityScore}%</div>
            <Progress value={mockValidationData.averageActivityScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validation Status</CardTitle>
            <Badge variant="outline">Live</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Active</div>
            <p className="text-xs text-muted-foreground">Real-time monitoring</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          {mockValidationData.recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No active work sessions to monitor</p>
              <p className="text-sm text-muted-foreground mt-1">
                Activity will appear here when freelancers start working on verified projects
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mockValidationData.recentActivity.map((activity: any, index: number) => (
                <div key={index} className="flex items-center gap-3 border-b pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4 text-blue-500" />
                    <Keyboard className="h-4 w-4 text-green-500" />
                    <Image className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.freelancerName}</p>
                    <p className="text-sm text-muted-foreground">{activity.projectName}</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
