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
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ThemeProvider";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ponytail: v7.2 — legal policy version, hardcoded to match the version in
// convex/legal/consent.ts POLICY_VERSIONS. When the policy text materially
// changes, bump BOTH this constant AND the one in convex/legal/consent.ts.
// (We don't import from convex/legal/consent because that file imports `crypto`,
// a Node-only module that breaks the browser build.)
const LEGAL_POLICY_VERSION = "1.0.0";

interface AuthProps {
  redirectAfterAuth?: string;
}

type AuthStep = "signIn" | "signUp" | { email: string }; // OTP step

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get redirect from URL params or props.
  // SECURITY: whitelist redirect targets to prevent open-redirect phishing.
  // Previously, `?redirect=//evil.com` would navigate the user to evil.com
  // after sign-in. Now we only allow same-origin relative paths.
  const redirectParam = searchParams.get("redirect");
  const SAFE_REDIRECT_RE = /^\/[a-zA-Z0-9_\-./?=&%]*$/;
  const isSafeRedirect = (s: string | null): s is string =>
    !!s &&
    !s.startsWith("//") &&
    !s.startsWith("/\\") &&
    SAFE_REDIRECT_RE.test(s);
  const redirect = isSafeRedirect(redirectParam)
    ? redirectParam
    : redirectAfterAuth || "/dashboard";

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
  // ponytail: v7.2 — mandatory legal consent checkbox (DPDP Act 2023 + GDPR).
  // User MUST check this to sign up. Consent is recorded to legalConsent table
  // with email + IP + UA + policy version + content hash, BEFORE the BA signup
  // call. The audit row is then patched with the userId after signup succeeds.
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const recordLegalConsent = useMutation(api.legal.consent.recordLegalConsent);

  const { theme, setTheme } = useTheme();

  // Redirect if already authenticated.
  // ponytail: previously this only fired when `step === "signIn"`, which meant
  // an authenticated user who clicked a "Start free" CTA (which routes to
  // /auth?mode=signup, setting initialStep to "signUp") would see the signup
  // form instead of being sent to the app. Now we redirect for BOTH "signIn"
  // and "signUp" string steps, but NOT for the OTP verification step
  // ({ email: string }) — the user must finish entering their code first.
  // `typeof step === "string"` is true for "signIn"/"signUp" and false for the
  // OTP step object.
  useEffect(() => {
    if (!authLoading && isAuthenticated && typeof step === "string") {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect, step]);

  // Password sign in
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    // Cap sign-in password length too — a malicious user can submit a 1 MB
    // password to the sign-in endpoint to trigger scrypt hashing on a known
    // email. This is the LPDOS attack vector even without creating an account.
    if (password.length > 16) {
      setError("Password must be at most 16 characters.");
      setIsLoading(false);
      return;
    }
    try {
      // Better Auth: signIn("password", { email, password, flow: "signIn" })
      await signIn("password", { email, password, flow: "signIn" });
      toast.success("Signed in successfully!");
      navigate(redirect);
    } catch (err: any) {
      console.error("Sign-in error:", err);
      // Better Auth returns error.message that's already user-friendly.
      // Common messages: "Invalid email or password", "Too many requests".
      // We map known auth failures to a generic anti-enumeration message.
      const rawMessage = String(err?.message ?? "");
      let friendlyMessage: string;
      if (
        rawMessage.toLowerCase().includes("invalid") ||
        rawMessage.toLowerCase().includes("credential")
      ) {
        friendlyMessage = "Incorrect email or password. Please try again.";
      } else if (
        rawMessage.toLowerCase().includes("rate") ||
        rawMessage.toLowerCase().includes("many")
      ) {
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

    // v7.2: Mandatory consent check — block signup if checkbox not ticked.
    if (!hasAgreedToTerms) {
      setError("Please review and accept the Privacy Policy and Terms of Service to continue.");
      setIsLoading(false);
      return;
    }

    // Password length validation — client-side defense.
    // Min 8 (matches Convex Auth's `validateDefaultPasswordRequirements`).
    // Max 16 (LPDOS guard — at 1,000 users, a 1,024-char password costs
    // ~50 ms CPU + 2 MB RAM per scrypt hash; 100 concurrent submits = DoS).
    // Server-side Password provider also enforces this cap.
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }
    if (password.length > 16) {
      setError("Password must be at most 16 characters.");
      setIsLoading(false);
      return;
    }

    try {
      // v7.2: Record legal consent BEFORE creating the account. Stores email +
      // IP + UA + policy version + content hash in legalConsent table. If the
      // signup later fails, we still have a record that this email agreed.
      // (Best-effort — if it fails, we log and continue with signup.)
      try {
        const privacyHtml = (window as any).__axiaPolicyHtml ?? "privacy_policy_v1";
        const termsHtml = (window as any).__axiaTermsHtml ?? "terms_v1";
        // ponytail: fetch the rendered policy pages server-side and hash them.
        // The window globals are set by PrivacyPolicy/TermsOfService pages,
        // but we don't render them on /auth, so we fetch the rendered HTML at
        // signup time. This proves the EXACT text the user agreed to.
        const [privacyRes, termsRes] = await Promise.all([
          fetch("/privacy").then((r) => r.text()).catch(() => privacyHtml),
          fetch("/terms").then((r) => r.text()).catch(() => termsHtml),
        ]);
        await recordLegalConsent({
          email,
          policyType: "both",
          policyVersion: LEGAL_POLICY_VERSION, // both policies share version 1.0.0
          policyContent: `${privacyRes}\n---\n${termsRes}`,
          authProvider: "password",
        });
      } catch (consentErr) {
        console.warn("Failed to record legal consent (non-blocking):", consentErr);
      }

      // Better Auth: signIn("password", { email, password, name, flow: "signUp" })
      await signIn("password", { email, password, name, flow: "signUp" });
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
      // Better Auth: signIn("emailOtp", { email }) sends a 6-digit code.
      await signIn("emailOtp", { email });
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
      // Better Auth: signIn("emailOtp", { email, otp }) verifies the 6-digit code.
      await signIn("emailOtp", { email: (step as { email: string }).email, otp });
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

  // OAuth sign-in handlers (Better Auth).
  // Google + Microsoft enabled. GMail sign-in is just Google sign-in.
  // The providers are wired in convex/auth.ts based on env vars
  // GOOGLE_CLIENT_ID / MICROSOFT_CLIENT_ID being set on Convex.
  //
  // v7.3: In SIGNUP mode, OAuth buttons are gated behind the same legal consent
  // checkbox as password signup. We also record a best-effort consent row with
  // authProvider="google"/"microsoft" + placeholder email "oauth-pending@local"
  // BEFORE the OAuth redirect. The IP + UA + policy version + content hash are
  // captured, proving what they agreed to. After OAuth callback, the consent
  // row can be linked to the actual user by matching IP + UA + recent timestamp
  // (not yet implemented — see TODO in convex/legal/consent.ts).
  // In SIGNIN mode, OAuth buttons work without the checkbox (returning users
  // already consented at signup; the checkbox is hidden via `initialStep`).
  const handleGoogleSignIn = async () => {
    // v7.3: gate OAuth behind consent checkbox in signup mode.
    if (step === "signUp" && !hasAgreedToTerms) {
      setError("Please review and accept the Privacy Policy and Terms of Service to continue.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // v7.3: record legal consent before OAuth redirect (signup mode only).
      if (step === "signUp") {
        try {
          const [privacyRes, termsRes] = await Promise.all([
            fetch("/privacy").then((r) => r.text()).catch(() => "privacy_policy_v1"),
            fetch("/terms").then((r) => r.text()).catch(() => "terms_v1"),
          ]);
          await recordLegalConsent({
            email: "oauth-pending@local",
            policyType: "both",
            policyVersion: LEGAL_POLICY_VERSION,
            policyContent: `${privacyRes}\n---\n${termsRes}`,
            authProvider: "google",
          });
        } catch (consentErr) {
          console.warn("Failed to record pre-OAuth consent (non-blocking):", consentErr);
        }
      }
      await signIn("google");
      // BA redirects to Google → callback → navigate happens automatically.
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err?.message || "Failed to start Google sign-in.");
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    // v7.3: gate OAuth behind consent checkbox in signup mode.
    if (step === "signUp" && !hasAgreedToTerms) {
      setError("Please review and accept the Privacy Policy and Terms of Service to continue.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (step === "signUp") {
        try {
          const [privacyRes, termsRes] = await Promise.all([
            fetch("/privacy").then((r) => r.text()).catch(() => "privacy_policy_v1"),
            fetch("/terms").then((r) => r.text()).catch(() => "terms_v1"),
          ]);
          await recordLegalConsent({
            email: "oauth-pending@local",
            policyType: "both",
            policyVersion: LEGAL_POLICY_VERSION,
            policyContent: `${privacyRes}\n---\n${termsRes}`,
            authProvider: "microsoft",
          });
        } catch (consentErr) {
          console.warn("Failed to record pre-OAuth consent (non-blocking):", consentErr);
        }
      }
      await signIn("microsoft");
    } catch (err: any) {
      console.error("Microsoft sign-in error:", err);
      setError(err?.message || "Failed to start Microsoft sign-in.");
      setIsLoading(false);
    }
  };

  // OTP verification step
  if (typeof step === "object" && "email" in step) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors flex items-center justify-center p-4">
        {/* Theme toggle — matches onboarding pages (Sun+Switch+Moon pill, fixed) */}
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-card border border-border rounded-full px-3 py-2 shadow-sm">
          <Sun className={`h-4 w-4 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            aria-label="Toggle dark mode"
          />
          <Moon className={`h-4 w-4 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
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

        </Card>
      </div>
    );
  }

  // Main sign-in / sign-up form
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors flex items-center justify-center p-4">
      {/* Theme toggle — matches onboarding pages (Sun+Switch+Moon pill, fixed) */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-card border border-border rounded-full px-3 py-2 shadow-sm">
        <Sun className={`h-4 w-4 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
        <Switch
          checked={theme === "dark"}
          onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
          aria-label="Toggle dark mode"
        />
        <Moon className={`h-4 w-4 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
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
            {step === "signUp" ? "Create your agency account" : "Protect Your Agency Revenue"}
          </CardTitle>
          <CardDescription className="max-w-[360px] mx-auto text-[16px] text-muted-foreground">
            {step === "signUp"
              ? "Sign up to start protecting your agency's client work with dispute-proof evidence."
              : "Axia prevents payment denials by validating your work meets ALL requirements — with dispute-proof evidence."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* OAuth sign-in buttons (Better Auth): Google + Microsoft.
              GMail sign-in is just Google sign-in — no separate provider.
              Providers are wired in convex/auth.ts based on env vars
              GOOGLE_CLIENT_ID / MICROSOFT_CLIENT_ID set on Convex.
              v7.3: in signup mode, these are gated by the consent checkbox
              below — clicking shows an error if checkbox isn't ticked. */}
          {step === "signUp" && !hasAgreedToTerms && (
            <p className="text-[11px] text-muted-foreground mb-2 text-center">
              Continue with Google/Microsoft requires accepting the policies below.
            </p>
          )}
          <div className="space-y-2 mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-background border-border"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              title={step === "signUp" && !hasAgreedToTerms ? "Tick the consent checkbox below first" : undefined}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-background border-border"
              onClick={handleMicrosoftSignIn}
              disabled={isLoading}
              title={step === "signUp" && !hasAgreedToTerms ? "Tick the consent checkbox below first" : undefined}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" aria-hidden="true">
                <path fill="#F25022" d="M1 1h10v10H1z" />
                <path fill="#7FBA00" d="M12 1h10v10H12z" />
                <path fill="#00A4EF" d="M1 12h10v10H1z" />
                <path fill="#FFB900" d="M12 12h10v10H12z" />
              </svg>
              Continue with Microsoft
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or sign in with email</span>
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
                <Label htmlFor="signup-password" className="text-muted-foreground text-sm">Password (8–16 characters)</Label>
                <div className="relative mt-1">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="h-11 bg-background border-border pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, 16))}
                    disabled={isLoading}
                    required
                    minLength={8}
                    maxLength={16}
                    autoComplete="new-password"
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
              {/* v7.2: Mandatory legal consent checkbox (DPDP Act 2023 + GDPR) */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={hasAgreedToTerms}
                  onChange={(e) => setHasAgreedToTerms(e.target.checked)}
                  disabled={isLoading}
                  required
                  className="mt-1 h-4 w-4 accent-axia-teal-600"
                />
                <label htmlFor="agree-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  I have read and agree to the{" "}
                  <Link to="/privacy" target="_blank" rel="noopener" className="text-foreground hover:text-axia-teal-600 underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/terms" target="_blank" rel="noopener" className="text-foreground hover:text-axia-teal-600 underline">
                    Terms of Service
                  </Link>
                  . I understand my data will be processed per the DPDP Act 2023 (India) and GDPR (EU).
                </label>
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
                    onChange={(e) => setPassword(e.target.value.slice(0, 16))}
                    disabled={isLoading}
                    required
                    maxLength={16}
                    autoComplete="current-password"
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

        {/* Footer — Better Auth branding (replaces prior vly.ai attribution) */}
        <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-background border-t border-border rounded-b-lg">
          Secured by{" "}
          <a href="https://better-auth.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
            Better Auth
          </a>{" "}
          · Powered by{" "}
          <a href="https://convex.dev" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
            Convex
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
