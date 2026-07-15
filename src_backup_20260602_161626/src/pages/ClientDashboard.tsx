import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, CheckCircle, Clock, LayoutDashboard, UserSearch, FileCheck, Activity } from "lucide-react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { WCVMVerificationDashboard } from "@/components/WCVMVerificationDashboard";
import { FreelancerDirectoryView } from "@/components/FreelancerDirectoryView";
import { VerificationRequestSystem } from "@/components/VerificationRequestSystem";
import { RealTimeWorkValidation } from "@/components/RealTimeWorkValidation";

export default function ClientDashboard() {
  const navigate = useNavigate();

  // Proper auth check via Convex auth
  const { isAuthenticated, user } = useAuth();
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/client-login");
    }
  }, [isAuthenticated, navigate]);

  const clientEmail = user?.email || localStorage.getItem("axia_client_email");

  // Fetch client profile
  // @ts-ignore - Convex type inference causes deep instantiation error
  const clientProfile = useQuery(
    "clientAuth:getClientProfile" as any,
    clientEmail ? { email: clientEmail } : "skip"
  );

  // Allow access only when authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Mock client profile if not logged in
  const mockClientProfile = {
    _id: "mock_client_1",
    email: clientEmail || "demo@company.com",
    companyName: "Demo Company",
    contactName: "Demo User",
    verificationCount: 0,
    industry: "Technology",
    companySize: "10-50",
  };

  const displayProfile = clientProfile || mockClientProfile;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Client Dashboard</h1>
            <p className="text-muted-foreground">{displayProfile.email}</p>
          </div>
          <Button variant="outline" onClick={() => {
            localStorage.removeItem("axia_client_email");
            navigate("/client-login");
          }}>
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayProfile.verificationCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Freelancers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Company</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{displayProfile.companyName}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="wcvm">
              <CheckCircle className="h-4 w-4 mr-2" />
              WCVM Dashboard
            </TabsTrigger>
            <TabsTrigger value="directory">
              <UserSearch className="h-4 w-4 mr-2" />
              Freelancer Directory
            </TabsTrigger>
            <TabsTrigger value="requests">
              <FileCheck className="h-4 w-4 mr-2" />
              Verification Requests
            </TabsTrigger>
            <TabsTrigger value="realtime">
              <Activity className="h-4 w-4 mr-2" />
              Real-time Validation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Axia Client Portal, {displayProfile.contactName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Company:</strong> {displayProfile.companyName}
                  </p>
                  {displayProfile.industry && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Industry:</strong> {displayProfile.industry}
                    </p>
                  )}
                  {displayProfile.companySize && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Company Size:</strong> {displayProfile.companySize}
                    </p>
                  )}
                </div>
                <p className="text-muted-foreground mb-4">
                  Access all Axia verification features using the tabs above:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li><strong>WCVM Dashboard:</strong> View and manage work context verifications</li>
                  <li><strong>Freelancer Directory:</strong> Browse verified freelancers with Axia protection</li>
                  <li><strong>Verification Requests:</strong> Request work verification from freelancers</li>
                  <li><strong>Real-time Validation:</strong> Monitor active work sessions in real-time</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wcvm">
            <WCVMVerificationDashboard clientId={displayProfile._id} />
          </TabsContent>

          <TabsContent value="directory">
            <FreelancerDirectoryView />
          </TabsContent>

          <TabsContent value="requests">
            <VerificationRequestSystem clientId={displayProfile._id} />
          </TabsContent>

          <TabsContent value="realtime">
            <RealTimeWorkValidation />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}