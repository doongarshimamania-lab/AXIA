import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, CheckCircle, Clock, LayoutDashboard, UserSearch, FileCheck, Activity } from "lucide-react";
import { useNavigate } from "react-router";
import { useQuery, useConvexAuth } from "@/lib/safe-convex-react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { WCVMVerificationDashboard } from "@/components/WCVMVerificationDashboard";
import { FreelancerDirectoryView } from "@/components/FreelancerDirectoryView";
import { VerificationRequestSystem } from "@/components/VerificationRequestSystem";
import { RealTimeWorkValidation } from "@/components/RealTimeWorkValidation";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();

  // SECURITY: Redirect unauthenticated users — auth guard is now enforced
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth?redirect=/client-dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Fetch client profile using authenticated user's data
  // SECURITY: No longer reading email from localStorage — uses Convex auth
  const userProfile = useQuery(
    isAuthenticated ? api.users.getProfile : "skip",
    {}
  );

  // Don't render dashboard content until authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">Please sign in to access the client portal.</p>
            <Button onClick={() => navigate("/auth?redirect=/client-dashboard")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build client profile from real user profile data returned by users.getProfile
  const displayProfile = {
    _id: userProfile?._id || "unknown",
    email: userProfile?.email || "",
    companyName: userProfile?.name || userProfile?.email?.split("@")[0] || "My Company",
    contactName: userProfile?.name || "User",
    role: userProfile?.role || "member",
    subscriptionTier: userProfile?.subscriptionTier || "free",
    verificationCount: userProfile?.verificationCount ?? 0,
    industry: userProfile?.industry || "",
    companySize: userProfile?.companySize || "",
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Client Dashboard</h1>
            <p className="text-muted-foreground">{displayProfile.email}</p>
          </div>
          <Button variant="outline" onClick={() => {
            // SECURITY: Use proper sign out instead of clearing localStorage
            navigate("/auth");
          }}>
            Sign Out
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
              <CardTitle className="text-sm font-medium">Verified Professionals</CardTitle>
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
              Professional Directory
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
                  <li><strong>Professional Directory:</strong> Browse verified professionals with Axia protection</li>
                  <li><strong>Verification Requests:</strong> Request work verification from professionals</li>
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
