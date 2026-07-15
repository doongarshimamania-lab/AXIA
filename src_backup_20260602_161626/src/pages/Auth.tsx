import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Sun, Moon } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Loader2, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface AuthProps {
  redirectAfterAuth?: string;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use global theme from ThemeProvider
  const { theme, toggleTheme } = useTheme();
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showCustomPlatformModal, setShowCustomPlatformModal] = useState(false);

  useEffect(() => {
    // Only redirect if authenticated AND on the initial sign-in page
    // Don't redirect during OTP verification (step is an object) or after OTP submission
    if (!authLoading && isAuthenticated && step === "signIn") {
      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirectAfterAuth, step]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  // Add: platform connection modal state
  const [showPlatformConnectModal, setShowPlatformConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<"google" | "upwork" | "fiverr" | "toptal">("upwork");

  // Add: provider click handler
  const handleProviderClick = (provider: "google" | "upwork" | "fiverr" | "toptal") => {
    setSelectedPlatform(provider);
    setShowPlatformConnectModal(true);
  };

  const handlePlatformConnect = async () => {
    const labels: Record<typeof selectedPlatform, string> = {
      google: "Google",
      upwork: "Upwork",
      fiverr: "Fiverr",
      toptal: "Toptal",
    } as const;
    
    setShowPlatformConnectModal(false);
    
    // For Google, just show toast (not a freelance platform)
    if (selectedPlatform === "google") {
      toast(`Connecting to ${labels[selectedPlatform]}...`, {
        description: "This feature will be enabled after platform approval.",
      });
      return;
    }
    
    // Store the platform to connect after authentication
    localStorage.setItem("axia_pending_platform", selectedPlatform);
    
    toast.success(`${labels[selectedPlatform]} connection will be set up after sign-in`, {
      description: "Your data will be imported automatically.",
    });
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);

      console.log("signed in");

      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);

      setError("The verification code you entered is incorrect.");
      setIsLoading(false);

      setOtp("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        {/* Dark mode toggle per spec (top-right) */}
        <div className="absolute top-6 right-6">
          <button
            aria-label="Toggle theme"
            className="w-[52px] h-[28px] rounded-full bg-muted p-1 flex items-center transition-colors"
            onClick={toggleTheme}
          >
            <span
              className={`w-5 h-5 rounded-full bg-background shadow flex items-center justify-center transform transition-transform ${
                theme === "dark" ? "translate-x-[24px]" : "translate-x-0"
              }`}
            >
              {theme === "dark" ? (
                <Moon className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-primary" />
              )}
            </span>
          </button>
        </div>

        {/* Auth Content */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex items-center justify-center h-full flex-col">
            <Card className="w-[480px] max-w-full pb-0 border border-border shadow-none rounded-2xl bg-card">
              {step === "signIn" ? (
                <>
                  {/* Branded Header */}
                  <CardHeader className="text-center">
                    <div className="flex justify-center">
                      <img
                        src="./logo.svg"
                        alt="Axia Logo"
                        width={64}
                        height={64}
                        className="rounded-lg mb-4 mt-2 cursor-pointer"
                        onClick={() => navigate("/")}
                      />
                    </div>
                    <CardTitle className="text-[28px]" style={{ fontFamily: "Space Grotesk" }}>
                      Protect Your Freelance Income
                    </CardTitle>
                    <CardDescription className="max-w-[360px] mx-auto text-[16px] text-muted-foreground">
                      Axia prevents payment denials by validating your work meets ALL requirements — with dispute‑proof evidence.
                    </CardDescription>
                  </CardHeader>

                  {/* Platform-first Connect Buttons */}
                  <CardContent>
                    <div className="mt-4 mb-2 text-left">
                      <div className="text-[16px] font-semibold text-foreground">
                        Connect your freelance accounts
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-4">
                      <Button
                        type="button"
                        className="w-full h-14 bg-[#5C6AC4] hover:bg-[#4A56B0] text-white"
                        onClick={() => handleProviderClick("upwork")}
                      >
                        Connect with Upwork
                      </Button>
                      <Button
                        type="button"
                        className="w-full h-14 bg-[#5C6AC4] hover:bg-[#4A56B0] text-white"
                        onClick={() => handleProviderClick("fiverr")}
                      >
                        Connect with Fiverr
                      </Button>
                      <Button
                        type="button"
                        className="w-full h-14 bg-[#5C6AC4] hover:bg-[#4A56B0] text-white"
                        onClick={() => handleProviderClick("toptal")}
                      >
                        Connect with Toptal
                      </Button>
                    </div>

                    {/* Divider: Or connect with */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-[40%] border-t" />
                        <span className="w-[20%]" />
                        <span className="w-[40%] border-t" />
                      </div>
                      <div className="relative flex justify-center text-sm uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          Or connect with
                        </span>
                      </div>
                    </div>

                    {/* Google Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-14 bg-background text-foreground border-border"
                      onClick={() => handleProviderClick("google")}
                      disabled={isLoading}
                    >
                      Continue with Google
                    </Button>

                    {/* More options (Email + Password UI; uses OTP flow) */}
                    <div className="mt-4">
                      <button
                        type="button"
                        className="text-[14px] font-semibold text-primary hover:underline"
                        onClick={() => setShowMoreOptions((s) => !s)}
                      >
                        {showMoreOptions ? "Hide options" : "More options"}
                      </button>

                      {showMoreOptions && (
                        <form onSubmit={handleEmailSubmit} className="mt-3">
                          <div className="grid gap-3">
                            <div className="relative">
                              <Label htmlFor="email" className="text-muted-foreground text-sm">
                                Email address
                              </Label>
                              <div className="relative mt-1">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="email"
                                  name="email"
                                  placeholder="name@example.com"
                                  type="email"
                                  className="pl-9 h-11 bg-background border-border"
                                  disabled={isLoading}
                                  required
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="password" className="text-muted-foreground text-sm">
                                Create password
                              </Label>
                              <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="mt-1 h-11 bg-background border-border"
                                // Note: Password not used in Convex OTP flow; UI only per spec
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button
                                type="submit"
                                className="w-full h-14 bg-[#5C6AC4] hover:bg-[#4A56B0] text-white"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending code...
                                  </>
                                ) : (
                                  "Create Account"
                                )}
                              </Button>
                            </div>
                            {error && (
                              <p className="text-sm text-destructive">{error}</p>
                            )}
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Custom Platform Setup */}
                    <div className="mt-6">
                      <div className="text-[16px] font-semibold text-foreground">
                        Using a different platform?
                      </div>
                      <p className="text-[14px] text-muted-foreground">
                        Axia can work with any platform that has time tracking
                      </p>
                      <button
                        type="button"
                        className="mt-2 text-[14px] font-semibold text-primary hover:underline"
                        onClick={() => setShowCustomPlatformModal(true)}
                      >
                        Set up custom platform
                      </button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader className="text-center mt-4">
                    <CardTitle>Check your email</CardTitle>
                    <CardDescription>
                      We've sent a code to {step.email}
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleOtpSubmit}>
                    <CardContent className="pb-4">
                      <input type="hidden" name="email" value={step.email} />
                      <input type="hidden" name="code" value={otp} />

                      <div className="flex justify-center">
                        <InputOTP
                          value={otp}
                          onChange={setOtp}
                          maxLength={6}
                          disabled={isLoading}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                              // Find the closest form and submit it
                              const form = (e.target as HTMLElement).closest("form");
                              if (form) {
                                form.requestSubmit();
                              }
                            }
                          }}
                        >
                          <InputOTPGroup>
                            {Array.from({ length: 6 }).map((_, index) => (
                              <InputOTPSlot key={index} index={index} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      {error && (
                        <p className="mt-2 text-sm text-red-500 text-center">
                          {error}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground text-center mt-4">
                        Didn't receive a code?{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => setStep("signIn")}
                        >
                          Try again
                        </Button>
                      </p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || otp.length !== 6}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify code
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStep("signIn")}
                        disabled={isLoading}
                        className="w-full"
                      >
                        Use different email
                      </Button>
                    </CardFooter>
                  </form>
                </>
              )}

              {/* Footer branding */}
              <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-background border-t border-border rounded-b-lg">
                Secured by{" "}
                <a
                  href="https://vly.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary transition-colors"
                >
                  vly.ai
                </a>
              </div>
            </Card>
          </div>
        </div>

        {/* Platform Connection Modal */}
        <Dialog open={showPlatformConnectModal} onOpenChange={setShowPlatformConnectModal}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-[24px] font-bold text-foreground" style={{ fontFamily: "Space Grotesk" }}>
                Axia needs access to:
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                <p className="text-[16px] text-foreground">
                  View your work activity (to validate protection)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                <p className="text-[16px] text-foreground">
                  Manage time entries (to sync with Axia protection)
                </p>
              </div>
            </div>

            <p className="text-[14px] text-muted-foreground italic py-2">
              This is how Axia verifies your work meets ALL payment protection requirements
            </p>

            <DialogFooter className="flex-row gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 text-[16px] bg-muted hover:bg-muted/80 text-foreground border-border"
                onClick={() => setShowPlatformConnectModal(false)}
              >
                Not now
              </Button>
              <Button
                type="button"
                className="flex-1 h-12 text-[16px] bg-[#5C6AC4] hover:bg-[#4A56B0] text-white"
                onClick={handlePlatformConnect}
              >
                Connect {selectedPlatform === "google" ? "Google" : selectedPlatform === "upwork" ? "upwork" : selectedPlatform === "fiverr" ? "fiverr" : "toptal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Platform Modal */}
        <Dialog open={showCustomPlatformModal} onOpenChange={setShowCustomPlatformModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Custom Platform Setup</DialogTitle>
              <DialogDescription>
                Add a new platform to protect with Axia
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget as HTMLFormElement);
                const platform = data.get("platform_name") as string;
                setShowCustomPlatformModal(false);
                // Notify user and keep it UI-only for now
                // eslint-disable-next-line no-undef
                toast.success(`Added "${platform || "Custom Platform"}" (Basic Protection)`);
              }}
            >
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Platform name</Label>
                  <Input
                    name="platform_name"
                    placeholder="e.g., Platform XYZ"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm">Policy documentation URL</Label>
                  <Input
                    name="policy_url"
                    placeholder="https://example.com/policy"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Compliance requirements</Label>
                  <Input
                    name="compliance_rules"
                    placeholder="e.g., Screenshots every 10 minutes"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setShowCustomPlatformModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#5C6AC4] hover:bg-[#4A56B0] text-white">
                  Add Platform
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}