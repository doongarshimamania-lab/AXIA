import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Key,
  Webhook,
  BookOpen,
  Shield,
  Zap,
  Bell,
  Loader2,
  Mail,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageLayout } from "@/components/design-system/PageLayout";

export default function ApiSettings() {
  const [email, setEmail] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [hasSignedUp, setHasSignedUp] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSigningUp(true);
    // TODO: Replace with real Convex mutation when API access notification system is implemented
    await new Promise((r) => setTimeout(r, 1000));
    setIsSigningUp(false);
    setHasSignedUp(true);
    toast.success("You'll be notified when API access becomes available!");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="w-full min-h-screen bg-background text-foreground">
        <PageLayout narrow>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              API Settings
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Manage API keys, webhooks, and integrations
            </p>
          </div>

          <div className="space-y-6">
            {/* Coming Soon Banner */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-12 flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <Key className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  API Access is Coming Soon
                </h2>
                <p className="text-muted-foreground max-w-md mb-2">
                  Manage your API keys, webhooks, and integrations from this
                  page. We're building a powerful API that will let you
                  integrate Axia's protection features into your own
                  applications and workflows.
                </p>
                <p className="text-sm text-muted-foreground">
                  Sign up below to be notified when API access becomes
                  available.
                </p>
              </CardContent>
            </Card>

            {/* What's Coming */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Key,
                  title: "API Keys",
                  description:
                    "Generate and manage secure API keys with fine-grained permissions",
                  badge: "Core",
                },
                {
                  icon: Webhook,
                  title: "Webhooks",
                  description:
                    "Real-time event notifications for evidence, disputes, and payments",
                  badge: "Core",
                },
                {
                  icon: BookOpen,
                  title: "SDK & Docs",
                  description:
                    "Client libraries for JavaScript, Python, and REST API documentation",
                  badge: "Planned",
                },
              ].map((item) => (
                <Card key={item.title} className="border-border">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <Badge
                        variant={
                          item.badge === "Core" ? "default" : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {item.badge}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Planned API Endpoints Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Planned API Endpoints
                </CardTitle>
                <CardDescription>
                  A preview of the endpoints that will be available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    {
                      method: "GET",
                      path: "/api/v1/projects",
                      desc: "List all projects",
                    },
                    {
                      method: "POST",
                      path: "/api/v1/evidence",
                      desc: "Submit evidence records",
                    },
                    {
                      method: "GET",
                      path: "/api/v1/invoices/:id",
                      desc: "Retrieve invoice details",
                    },
                    {
                      method: "POST",
                      path: "/api/v1/webhooks",
                      desc: "Register webhook endpoint",
                    },
                    {
                      method: "GET",
                      path: "/api/v1/protection/status",
                      desc: "Check protection status",
                    },
                  ].map((endpoint) => (
                    <div
                      key={endpoint.path}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <Badge
                        variant={
                          endpoint.method === "GET" ? "secondary" : "default"
                        }
                        className="text-[10px] font-mono w-12 justify-center"
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm text-foreground font-mono">
                        {endpoint.path}
                      </code>
                      <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
                        {endpoint.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Notification Signup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Get Notified
                </CardTitle>
                <CardDescription>
                  Enter your email to be notified when API access becomes
                  available.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasSignedUp ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Zap className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        You're on the list!
                      </p>
                      <p className="text-xs text-muted-foreground">
                        We'll email you as soon as API access is ready.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSignup();
                        }}
                      />
                    </div>
                    <Button
                      onClick={handleSignup}
                      disabled={isSigningUp}
                      className="gap-1.5"
                    >
                      {isSigningUp ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing up...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Notify Me
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </PageLayout>
      </div>
    </motion.div>
  );
}
