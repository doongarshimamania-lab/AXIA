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
import { Sun, Moon, Mail, Loader2, ArrowRight, Eye, EyeOff, Github } from "lucide-react";
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

  const [step, setStep] = useState<AuthStep>("signIn");
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
      setError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password sign up
  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
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

  // OAuth sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("google");
      toast.success("Signed in with Google!");
      navigate(redirect);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err?.message || "Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("github");
      toast.success("Signed in with GitHub!");
      navigate(redirect);
    } catch (err: any) {
      console.error("GitHub sign-in error:", err);
      setError(err?.message || "Failed to sign in with GitHub. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* OAuth Buttons */}
          <div className="grid grid-cols-1 gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-background text-foreground border-border"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-background text-foreground border-border"
              onClick={handleGitHubSignIn}
              disabled={isLoading}
            >
              <Github className="mr-2 h-4 w-4" />
              Continue with GitHub
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
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
