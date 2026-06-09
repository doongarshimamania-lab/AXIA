import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { useQuery } from "@/lib/safe-convex-react";
import { Id } from "@/convex/_generated/dataModel";

interface WCVMVerificationDashboardProps {
  clientId: Id<"clientCompanies">;
}

export function WCVMVerificationDashboard({ clientId }: WCVMVerificationDashboardProps) {
  const verificationResults = useQuery(
    "clients/verificationRequests:getClientVerificationRequests" as any,
    clientId ? { clientId } : "skip"
  );

  if (!verificationResults) {
    return <div className="text-muted-foreground">Loading verification data...</div>;
  }

  const completedVerifications = verificationResults.filter((v: any) => v.status === "completed");
  const pendingVerifications = verificationResults.filter((v: any) => v.status === "pending");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verificationResults.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedVerifications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingVerifications.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          {verificationResults.length === 0 ? (
            <p className="text-muted-foreground text-sm">No verification requests yet.</p>
          ) : (
            <div className="space-y-3">
              {verificationResults.slice(0, 5).map((verification: any) => (
                <div key={verification._id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{verification.projectName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(verification.workPeriodStart).toLocaleDateString()} - {new Date(verification.workPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={
                    verification.status === "completed" ? "default" :
                    verification.status === "pending" ? "secondary" :
                    verification.status === "accepted" ? "outline" : "destructive"
                  }>
                    {verification.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}