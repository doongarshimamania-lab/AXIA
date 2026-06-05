import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Shield, Building2, Loader2 } from "lucide-react";
import { useMutation, useConvex } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createClientSession = useMutation(api.clients.clientAuth.verifyClientAccess);
  const convex = useConvex();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Verify the email exists using the clientPortal query (no auth required)
      const verification = await convex.query(api.clients.clientPortal.verifyClientAccess, {
        clientEmail: email.trim(),
      }) as any;

      if (!verification || !verification.found) {
        toast.error("Access denied", {
          description: "No account found with this email. Please contact your freelancer.",
        });
        setIsLoading(false);
        return;
      }

      // Step 2: Create a secure session token via the mutation
      const result = await createClientSession({ email: email.trim() }) as any;

      if (!result.success) {
        toast.error("Access denied", {
          description: result.error || "No account found with this email.",
        });
        setIsLoading(false);
        return;
      }

      // Store session data in localStorage
      localStorage.setItem("axia_client_token", result.token);
      localStorage.setItem("axia_client_email", result.clientEmail);
      localStorage.setItem("axia_client_name", result.clientName || "");
      localStorage.setItem("axia_client_login_at", Date.now().toString());

      // Also store verification info from the query (clientPortal data)
      localStorage.setItem("axia_client_verified", JSON.stringify({
        email: verification.clientEmail,
        verified: true,
        timestamp: Date.now(),
        clientName: verification.clientName,
        contactName: verification.contactName,
        clients: verification.clients,
      }));

      toast.success("Logged in successfully", {
        description: result.clientName
          ? `Welcome back, ${result.contactName || result.clientName}`
          : "Welcome to the Client Portal",
      });

      setTimeout(() => {
        navigate("/client-dashboard");
        setIsLoading(false);
      }, 500);
    } catch (err: any) {
      toast.error("Login failed", {
        description: err.message || "Please try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Client Portal</CardTitle>
          <CardDescription>
            Verify freelancer work with Axia's industry-standard verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Company Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate("/client-signup")}
              >
                Sign up
              </Button>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Industry-standard work verification</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
