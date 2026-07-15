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
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Mail, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ThemeProvider";

interface AuthProps {
  redirectAfterAuth?: string;
}

type AuthStep = "signIn" | "signUp" | { email: string }; // OTP step

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get redirect from URL params or props
  const redirectParam = searchParams.get("redirect");
  const redirect = redirectParam || redirectAfterAuth || "/dashboard";

  // Honor ?mode=signup to default the form to the sign-up step.
  // This lets the landing page's "Get Started" button deep-link to signup.
  const modeParam = searchParams.get("mode");
  const initialStep: AuthStep = modeParam === "signup" ? "signUp" : "signIn";

  const [step, setStep] = useState<AuthStep>(initialStep);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const { theme, toggleTheme } = useTheme();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && step === "signIn") {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect, step]);

  // Password sign in
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", "signIn");
      await signIn("password", formData);
      toast.success("Signed in successfully!");
      navigate(redirect);
    } catch (err: any) {
      console.error("Sign-in error:", err);
      // Convex Auth returns these internal error codes as the raw error message:
      //   "InvalidSecret"     → email exists, but password is wrong
      //   "InvalidAccountId"  → no account exists for that email
      //   "TooManyFailedAttempts" → rate-limited after too many wrong guesses
      // We translate all of these to a single friendly message that does NOT
      // reveal whether the email exists (security best practice — prevents
      // user-enumeration attacks).
      const rawMessage = String(err?.message ?? "");
      let friendlyMessage: string;
      if (
        rawMessage.includes("InvalidSecret") ||
        rawMessage.includes("InvalidAccountId")
      ) {
        friendlyMessage = "Incorrect email or password. Please try again.";
      } else if (rawMessage.includes("TooManyFailedAttempts")) {
        friendlyMessage =
          "Too many failed sign-in attempts. Please wait a few minutes and try again.";
      } else {
        friendlyMessage = err?.message || "Invalid email or password. Please try again.";
      }
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Password sign up
  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Password length validation — client-side defense.
    // Min 8 (matches Convex Auth's `validateDefaultPasswordRequirements`).
    // Max 1024 (DoS prevention — prevents an attacker from submitting a
    // multi-megabyte password that would burn server CPU on scrypt hashing).
    // Scrypt itself enforces a `maxmem=1GB` cap so longer passwords throw,
    // but we'd rather reject before the network round-trip.
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }
    if (password.length > 1024) {
      setError("Password must be at most 1024 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("name", name);
      formData.set("flow", "signUp");
      await signIn("password", formData);
      toast.success("Account created successfully!");
      navigate(redirect);
    } catch (err: any) {
      console.error("Sign-up error:", err);
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Email OTP sign in
  const handleEmailOtpSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", email);
      await signIn("email-otp", formData);
      setStep({ email });
      setIsLoading(false);
    } catch (err: any) {
      console.error("Email OTP error:", err);
      setError(err?.message || "Failed to send verification code. Please try again.");
      setIsLoading(false);
    }
  };

  // OTP verification
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", (step as { email: string }).email);
      formData.set("code", otp);
      await signIn("email-otp", formData);
      toast.success("Signed in successfully!");
      navigate(redirect);
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError("The verification code you entered is incorrect.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth sign-in handlers removed (2026-06-22).
  // The Google and GitHub providers are commented out in convex/auth.config.ts
  // because AUTH_GOOGLE_ID / AUTH_GITHUB_ID env vars are not set. Calling
  // signIn("google") or signIn("github") would throw a confusing error.
  // To re-enable: set the env vars, uncomment the providers in auth.config.ts,
  // and re-add the OAuth buttons here.

  // OTP verification step
  if (typeof step === "object" && "email" in step) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
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

        <Card className="w-full max-w-md border border-border shadow-none rounded-2xl bg-card">
          <CardHeader className="text-center mt-4">
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We've sent a code to {step.email}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleOtpVerify}>
            <CardContent className="pb-4">
              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                      const form = (e.target as HTMLElement).closest("form");
                      if (form) form.requestSubmit();
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
                <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
              )}
              <p className="text-sm text-muted-foreground text-center mt-4">
                Didn't receive a code?{" "}
                <Button variant="link" className="p-0 h-auto" onClick={() => setStep("signIn")}>
                  Try again
                </Button>
              </p>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
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

          <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-background border-t border-border rounded-b-lg">
            Secured by{" "}
            <a href="https://vly.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
              vly.ai
            </a>
          </div>
        </Card>
      </div>
    );
  }

  // Main sign-in / sign-up form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Theme toggle */}
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

      <Card className="w-full max-w-md border border-border shadow-none rounded-2xl bg-card">
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
          <CardTitle className="text-[28px]">
            {step === "signUp" ? "Create your account" : "Protect Your Freelance Income"}
          </CardTitle>
          <CardDescription className="max-w-[360px] mx-auto text-[16px] text-muted-foreground">
            {step === "signUp"
              ? "Sign up to start protecting your freelance work with dispute-proof evidence."
              : "Axia prevents payment denials by validating your work meets ALL requirements — with dispute-proof evidence."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* OAuth buttons removed (2026-06-22): Google/GitHub providers are not
              configured in convex/auth.config.ts. To re-enable, set the env vars
              (AUTH_GOOGLE_ID / AUTH_GITHUB_ID + secrets), uncomment the providers,
              and re-add the OAuth button JSX here. */}

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">sign in or create account</span>
            </div>
          </div>

          {/* Sign In / Sign Up Form */}
          {step === "signUp" ? (
            <form onSubmit={handlePasswordSignUp} className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-muted-foreground text-sm">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className="mt-1 h-11 bg-background border-border"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div>
                <Label htmlFor="signup-email" className="text-muted-foreground text-sm">Email address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-9 h-11 bg-background border-border"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="signup-password" className="text-muted-foreground text-sm">Password (min 8 characters)</Label>
                <div className="relative mt-1">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="h-11 bg-background border-border pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full h-11 bg-axia-teal-600 hover:bg-axia-teal-600/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSignIn} className="space-y-3">
              <div>
                <Label htmlFor="email" className="text-muted-foreground text-sm">Email address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-9 h-11 bg-background border-border"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-muted-foreground text-sm">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="h-11 bg-background border-border pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full h-11 bg-axia-teal-600 hover:bg-axia-teal-600/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Toggle sign-in / sign-up */}
          <div className="mt-4 text-center text-sm">
            {step === "signUp" ? (
              <span className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline font-semibold"
                  onClick={() => { setStep("signIn"); setError(null); }}
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span className="text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline font-semibold"
                  onClick={() => { setStep("signUp"); setError(null); }}
                >
                  Sign up
                </button>
              </span>
            )}
          </div>

          {/* More options: Email OTP + Anonymous */}
          <div className="mt-4">
            <button
              type="button"
              className="text-[14px] font-semibold text-primary hover:underline"
              onClick={() => setShowMoreOptions((s) => !s)}
            >
              {showMoreOptions ? "Hide options" : "More sign-in options"}
            </button>

            {showMoreOptions && (
              <div className="mt-3 space-y-2">
                {/* Email OTP option */}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Email for OTP code"
                    className="h-11 bg-background border-border"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 whitespace-nowrap"
                    onClick={handleEmailOtpSend}
                    disabled={isLoading || !email}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* Footer branding */}
        <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-background border-t border-border rounded-b-lg">
          Secured by{" "}
          <a href="https://vly.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
            vly.ai
          </a>
        </div>
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
