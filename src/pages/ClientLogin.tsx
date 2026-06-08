import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Shield,
  Building2,
  Mail,
  FileCheck2,
  Users,
  BarChart3,
  Eye,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const features = [
  {
    icon: FileCheck2,
    title: "Work Verification",
    description: "Verify freelancer deliverables against industry standards",
  },
  {
    icon: Users,
    title: "Talent Insights",
    description: "Access verified performance data for hiring decisions",
  },
  {
    icon: BarChart3,
    title: "Quality Metrics",
    description: "Track project quality with real-time dashboards",
  },
  {
    icon: Eye,
    title: "Full Transparency",
    description: "See exactly how work is verified and scored",
  },
];

export default function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Load remembered email on mount
  useEffect(() => {
    const saved = localStorage.getItem("axia_client_email_remembered");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const validateEmail = (value: string) => {
    if (!value) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return "Please enter a valid email address";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsLoading(true);

    try {
      // Allow any email for dev/demo access
      if (rememberMe) {
        localStorage.setItem("axia_client_email_remembered", email);
      } else {
        localStorage.removeItem("axia_client_email_remembered");
      }
      localStorage.setItem("axia_client_email", email);
      toast.success("Logged in successfully (Demo Mode)");
      setTimeout(() => {
        navigate("/client-dashboard");
      }, 500);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast.info(`${provider} login coming soon!`, {
      description: "This feature will be available in a future update.",
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding & Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-primary/8 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo & Branding */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Axia</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight mb-4">
              Client Portal
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-md">
              Verify freelancer work with Axia&apos;s industry-standard
              verification platform. Make data-driven hiring decisions.
            </p>

            {/* Feature highlights */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Trust indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Shield className="h-4 w-4 text-primary" />
              <span>SOC 2 Compliant &bull; Enterprise-ready security</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Demo mode banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">Demo Mode</span>{" "}
                &mdash; Enter any email to explore the client portal
              </span>
            </div>
          </motion.div>

          <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
            <CardContent className="pt-8 pb-6 px-6 sm:px-8">
              {/* Mobile logo */}
              <div className="flex items-center gap-2 mb-6 lg:hidden">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">Axia</span>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                  Welcome back
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign in to your client account
                </p>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin("Google")}
                  type="button"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin("Microsoft")}
                  type="button"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path d="M11.4 24H0V12.6h11.4V24z" fill="#F25022" />
                    <path d="M24 24H12.6V12.6H24V24z" fill="#00A4EF" />
                    <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#7FBA00" />
                    <path d="M24 11.4H12.6V0H24v11.4z" fill="#FFB900" />
                  </svg>
                  Microsoft
                </Button>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Company Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      className={`pl-9 ${error ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
                      required
                    />
                  </div>
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-destructive flex items-center gap-1"
                      >
                        <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) =>
                        setRememberMe(checked === true)
                      }
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm font-normal text-muted-foreground cursor-pointer"
                    >
                      Remember email
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="inline-block h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      />
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              {/* Sign up link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-semibold"
                    onClick={() => navigate("/client-signup")}
                  >
                    Create one
                  </Button>
                </p>
              </div>

              {/* Footer trust badge */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Industry-standard work verification</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
