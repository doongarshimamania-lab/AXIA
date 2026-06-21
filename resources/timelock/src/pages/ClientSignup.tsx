import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Building2,
  Mail,
  User,
  Globe,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Shield,
  FileCheck2,
  Users,
  BarChart3,
  Sparkles,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import { useMutation } from "@/lib/safe-convex-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const features = [
  {
    icon: FileCheck2,
    title: "Verified Freelancers",
    description: "Access a pool of pre-verified talent",
  },
  {
    icon: Users,
    title: "Client Protection",
    description: "Safeguard your projects and investments",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time project health and insights",
  },
];

const TOTAL_STEPS = 3;

type FieldErrors = Record<string, string | null>;

export default function ClientSignup() {
  const navigate = useNavigate();
  const registerClientMutation = useMutation(
    "clientAuth:registerClient" as any // eslint-disable-line @typescript-eslint/no-explicit-any
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [formData, setFormData] = useState({
    email: "",
    contactName: "",
    companyName: "",
    industry: "",
    companySize: "",
    website: "",
  });

  const progressValue = (currentStep / TOTAL_STEPS) * 100;

  const updateField = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    },
    []
  );

  const validateStep = (step: number): boolean => {
    const errors: FieldErrors = {};

    if (step === 1) {
      if (!formData.contactName.trim()) {
        errors.contactName = "Contact name is required";
      }
      if (!formData.email.trim()) {
        errors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email address";
      }
    }

    if (step === 2) {
      if (!formData.companyName.trim()) {
        errors.companyName = "Company name is required";
      }
      if (
        formData.website &&
        !/^https?:\/\/.+\..+/.test(formData.website)
      ) {
        errors.website = "Please enter a valid URL (e.g., https://company.com)";
      }
    }

    if (step === 3) {
      if (!termsAccepted) {
        errors.terms = "You must accept the terms and conditions";
      }
    }

    setFieldErrors(errors);
    return Object.values(errors).every((e) => e === null);
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);

    try {
      await registerClientMutation({
        email: formData.email,
        companyName: formData.companyName,
        contactName: formData.contactName,
        industry: formData.industry || undefined,
        companySize: formData.companySize || undefined,
        website: formData.website || undefined,
      });

      localStorage.setItem("axia_client_email", formData.email);
      toast.success("Account created successfully!");

      // Show success animation before redirect
      setShowSuccess(true);
      setTimeout(() => {
        navigate("/client-dashboard");
      }, 2000);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create account"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const stepInfo = [
    { number: 1, label: "Contact Info", icon: User },
    { number: 2, label: "Company Info", icon: Building2 },
    { number: 3, label: "Verification", icon: CheckCircle2 },
  ];

  // Success animation overlay
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", duration: 0.5 }}
            className="mx-auto mb-6 h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: "spring", duration: 0.5 }}
            >
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </motion.div>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold mb-2"
          >
            Welcome to Axia!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-muted-foreground"
          >
            Redirecting to your dashboard...
          </motion.p>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.7, duration: 1.2, ease: "easeInOut" }}
            className="h-1 bg-primary rounded-full mt-6 mx-auto max-w-xs"
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
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
              Join the Network
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-md">
              Create your client account to access verified freelancer profiles,
              protect your projects, and make data-driven decisions.
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
              <span>Trusted by 500+ companies worldwide</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
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
                &mdash; Explore the platform with sample data
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
                  Create your account
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Get started in just a few steps
                </p>
              </div>

              {/* Progress indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  {stepInfo.map((step, index) => (
                    <div
                      key={step.number}
                      className="flex items-center"
                    >
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{
                            backgroundColor:
                              currentStep >= step.number
                                ? "hsl(var(--primary))"
                                : "hsl(var(--muted))",
                            color:
                              currentStep >= step.number
                                ? "hsl(var(--primary-foreground))"
                                : "hsl(var(--muted-foreground))",
                          }}
                          className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                        >
                          {currentStep > step.number ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            step.number
                          )}
                        </motion.div>
                        <span
                          className={`text-xs font-medium hidden sm:inline ${
                            currentStep >= step.number
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {index < stepInfo.length - 1 && (
                        <div
                          className={`mx-3 h-px w-8 sm:w-12 ${
                            currentStep > step.number
                              ? "bg-primary"
                              : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <Progress value={progressValue} className="h-1.5" />
              </div>

              {/* Step content */}
              <AnimatePresence mode="wait">
                {/* Step 1: Contact Info */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="contactName">
                        Contact Name <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="contactName"
                          placeholder="John Doe"
                          value={formData.contactName}
                          onChange={(e) =>
                            updateField("contactName", e.target.value)
                          }
                          className={`pl-9 ${
                            fieldErrors.contactName
                              ? "border-destructive focus-visible:ring-destructive/20"
                              : ""
                          }`}
                        />
                      </div>
                      {fieldErrors.contactName && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                          {fieldErrors.contactName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Company Email <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@company.com"
                          value={formData.email}
                          onChange={(e) =>
                            updateField("email", e.target.value)
                          }
                          className={`pl-9 ${
                            fieldErrors.email
                              ? "border-destructive focus-visible:ring-destructive/20"
                              : ""
                          }`}
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Company Info */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="companyName">
                        Company Name{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="companyName"
                          placeholder="Acme Inc."
                          value={formData.companyName}
                          onChange={(e) =>
                            updateField("companyName", e.target.value)
                          }
                          className={`pl-9 ${
                            fieldErrors.companyName
                              ? "border-destructive focus-visible:ring-destructive/20"
                              : ""
                          }`}
                        />
                      </div>
                      {fieldErrors.companyName && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                          {fieldErrors.companyName}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Select
                          value={formData.industry}
                          onValueChange={(v) =>
                            updateField("industry", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technology">
                              Technology
                            </SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="healthcare">
                              Healthcare
                            </SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companySize">Company Size</Label>
                        <Select
                          value={formData.companySize}
                          onValueChange={(v) =>
                            updateField("companySize", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1-10 employees</SelectItem>
                            <SelectItem value="11-50">
                              11-50 employees
                            </SelectItem>
                            <SelectItem value="51-200">
                              51-200 employees
                            </SelectItem>
                            <SelectItem value="201+">201+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Company Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://company.com"
                          value={formData.website}
                          onChange={(e) =>
                            updateField("website", e.target.value)
                          }
                          className={`pl-9 ${
                            fieldErrors.website
                              ? "border-destructive focus-visible:ring-destructive/20"
                              : ""
                          }`}
                        />
                      </div>
                      {fieldErrors.website && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                          {fieldErrors.website}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Verification & Terms */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    {/* Summary of entered info */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Account Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name</span>
                          <p className="font-medium">
                            {formData.contactName || "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email</span>
                          <p className="font-medium truncate">
                            {formData.email || "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Company</span>
                          <p className="font-medium">
                            {formData.companyName || "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Industry</span>
                          <p className="font-medium capitalize">
                            {formData.industry || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Terms & Conditions */}
                    <div
                      className={`rounded-lg border p-4 transition-colors ${
                        fieldErrors.terms
                          ? "border-destructive bg-destructive/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="terms"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => {
                            setTermsAccepted(checked === true);
                            setFieldErrors((prev) => ({
                              ...prev,
                              terms: null,
                            }));
                          }}
                          className="mt-0.5"
                        />
                        <div>
                          <Label
                            htmlFor="terms"
                            className="text-sm font-normal cursor-pointer leading-relaxed"
                          >
                            I agree to the{" "}
                            <Button
                              variant="link"
                              className="p-0 h-auto font-semibold text-primary"
                              onClick={() =>
                                toast.info("Terms page coming soon!")
                              }
                            >
                              Terms of Service
                            </Button>{" "}
                            and{" "}
                            <Button
                              variant="link"
                              className="p-0 h-auto font-semibold text-primary"
                              onClick={() =>
                                toast.info("Privacy policy coming soon!")
                              }
                            >
                              Privacy Policy
                            </Button>
                          </Label>
                          {fieldErrors.terms && (
                            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                              <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                              {fieldErrors.terms}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Email verification notice */}
                    <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/10 p-4 text-sm">
                      <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Email Verification</p>
                        <p className="text-muted-foreground mt-0.5">
                          A verification link will be sent to your email address
                          after registration. In demo mode, you can proceed
                          immediately.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t">
                {currentStep > 1 ? (
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < TOTAL_STEPS ? (
                  <Button onClick={handleNext} className="gap-1">
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="gap-2"
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
                        Creating account...
                      </span>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Login link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-semibold"
                    onClick={() => navigate("/client-login")}
                  >
                    Sign in
                  </Button>
                </p>
              </div>

              {/* Footer trust badge */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Your data is encrypted and secure</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
