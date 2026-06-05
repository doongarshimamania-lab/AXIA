import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, CheckCircle, Clock, LayoutDashboard, UserSearch, FileCheck, Activity, FileText, DollarSign } from "lucide-react";
import { useNavigate } from "react-router";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { WCVMVerificationDashboard } from "@/components/WCVMVerificationDashboard";
import { FreelancerDirectoryView } from "@/components/FreelancerDirectoryView";
import { VerificationRequestSystem } from "@/components/VerificationRequestSystem";
import { RealTimeWorkValidation } from "@/components/RealTimeWorkValidation";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const clientEmail = localStorage.getItem("axia_client_email");
  const loginAt = localStorage.getItem("axia_client_login_at");

  // Fetch client profile from Convex
  const clientProfile = useQuery(
    clientEmail ? api.clients.clientAuth.getClientProfile : "skip",
    clientEmail ? { email: clientEmail } : "skip"
  ) as any;

  // Fetch invoices visible to this client (by public token or client email)
  const clientInvoices = useQuery(
    api.billing.crud.getInvoices,
    {}
  ) as any[] | undefined;

  // Fetch proposals visible to this client
  const clientProposals = useQuery(
    api.proposals.crud.getProposals,
    {}
  ) as any[] | undefined;

  // Mock client profile if not logged in or no Convex data
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

  // Filter invoices for this client
  const myInvoices = clientInvoices
    ? clientInvoices.filter((inv: any) => 
        inv.clientEmail === clientEmail || inv.clientName === displayProfile.companyName
      )
    : [];

  // Filter proposals for this client
  const myProposals = clientProposals
    ? clientProposals.filter((p: any) =>
        p.clientEmail === clientEmail || p.clientName === displayProfile.companyName
      )
    : [];

  // Session check — if not logged in and no recent session, show limited access
  const isSessionValid = clientEmail && loginAt && (Date.now() - parseInt(loginAt)) < 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Client Portal</h1>
            <p className="text-muted-foreground">{displayProfile.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {!isSessionValid && (
              <Button variant="outline" size="sm" onClick={() => navigate("/client-login")}>
                Sign In for Full Access
              </Button>
            )}
            <Button variant="outline" onClick={() => {
              localStorage.removeItem("axia_client_email");
              localStorage.removeItem("axia_client_login_at");
              navigate("/client-login");
            }}>
              Logout
            </Button>
          </div>
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
              <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myInvoices.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proposals</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myProposals.length}</div>
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
            <TabsTrigger value="invoices">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="proposals">
              <DollarSign className="h-4 w-4 mr-2" />
              Proposals
            </TabsTrigger>
            <TabsTrigger value="wcvm">
              <CheckCircle className="h-4 w-4 mr-2" />
              WCVM
            </TabsTrigger>
            <TabsTrigger value="directory">
              <UserSearch className="h-4 w-4 mr-2" />
              Directory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
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
                    <li><strong>Invoices:</strong> View and track invoices from freelancers</li>
                    <li><strong>Proposals:</strong> Review and respond to proposals</li>
                    <li><strong>WCVM Dashboard:</strong> View and manage work context verifications</li>
                    <li><strong>Freelancer Directory:</strong> Browse verified freelancers with Axia protection</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Recent Invoices Summary */}
              {myInvoices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Invoices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {myInvoices.slice(0, 5).map((inv: any) => (
                        <div key={inv._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{inv.invoiceNumber}</div>
                            <div className="text-xs text-muted-foreground">{inv.clientName}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">${inv.total?.toFixed(2)}</span>
                            <Badge variant="outline" className={
                              inv.status === "paid" ? "bg-emerald-500/10 text-emerald-600" :
                              inv.status === "overdue" ? "bg-red-500/10 text-red-600" :
                              inv.status === "sent" ? "bg-amber-500/10 text-amber-600" :
                              "bg-slate-500/10 text-slate-600"
                            }>
                              {inv.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Proposals Summary */}
              {myProposals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Proposals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {myProposals.slice(0, 5).map((p: any) => (
                        <div key={p._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{p.title}</div>
                            <div className="text-xs text-muted-foreground">{p.clientName}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">${p.totalValue?.toFixed(2)}</span>
                            <Badge variant="outline" className={
                              p.status === "signed" ? "bg-emerald-500/10 text-emerald-600" :
                              p.status === "declined" ? "bg-red-500/10 text-red-600" :
                              p.status === "sent" ? "bg-amber-500/10 text-amber-600" :
                              "bg-slate-500/10 text-slate-600"
                            }>
                              {p.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Your Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {myInvoices.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {myInvoices.map((inv: any) => (
                      <div key={inv._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{inv.invoiceNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(inv.issueDate).toLocaleDateString()} · Due: {new Date(inv.dueDate).toLocaleDateString()}
                          </div>
                          {inv.notes && <div className="text-xs text-muted-foreground mt-1">{inv.notes}</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">${inv.total?.toFixed(2)}</span>
                          <Badge variant="outline" className={
                            inv.status === "paid" ? "bg-emerald-500/10 text-emerald-600" :
                            inv.status === "overdue" ? "bg-red-500/10 text-red-600" :
                            inv.status === "sent" ? "bg-amber-500/10 text-amber-600" :
                            "bg-slate-500/10 text-slate-600"
                          }>
                            {inv.status}
                          </Badge>
                          {inv.hasValidatedBilling && (
                            <Badge className="bg-[#22c55e]/15 text-[#22c55e] text-[10px]">
                              Validated
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No invoices found for your account.</p>
                    <p className="text-sm mt-1">Invoices from freelancers will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proposals">
            <Card>
              <CardHeader>
                <CardTitle>Your Proposals</CardTitle>
              </CardHeader>
              <CardContent>
                {myProposals.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {myProposals.map((p: any) => (
                      <div key={p._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {p.clientName} · {new Date(p.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">${p.totalValue?.toFixed(2)}</span>
                          <Badge variant="outline" className={
                            p.status === "signed" ? "bg-emerald-500/10 text-emerald-600" :
                            p.status === "declined" ? "bg-red-500/10 text-red-600" :
                            p.status === "sent" ? "bg-amber-500/10 text-amber-600" :
                            "bg-slate-500/10 text-slate-600"
                          }>
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No proposals found for your account.</p>
                    <p className="text-sm mt-1">Proposals from freelancers will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wcvm">
            <WCVMVerificationDashboard clientId={displayProfile._id} />
          </TabsContent>

          <TabsContent value="directory">
            <FreelancerDirectoryView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
