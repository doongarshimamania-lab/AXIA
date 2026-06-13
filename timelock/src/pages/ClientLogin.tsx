import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Shield, Building2 } from "lucide-react";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // SECURITY: Redirect to the main auth page instead of storing email in localStorage.
    // Client portal now uses proper Convex authentication — no more demo mode bypass.
    try {
      // Navigate to the main auth page with the client-dashboard redirect
      navigate(`/auth?redirect=/client-dashboard&email=${encodeURIComponent(email)}`);
    } catch {
      toast.error("Failed to redirect to login. Please try again.");
    } finally {
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
            Verify professional work with Axia's industry-standard verification
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Redirecting..." : "Continue to Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate("/auth?mode=signUp&redirect=/client-dashboard")}
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
