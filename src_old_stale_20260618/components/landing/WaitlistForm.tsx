import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { useMutation, useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "react-router";
import { WaitlistSuccessModal } from "@/components/WaitlistSuccessModal";

interface WaitlistFormProps {
  variant?: "light" | "dark";
  ctaText?: string;
  showScarcity?: boolean;
  className?: string;
}

export function WaitlistForm({
  variant = "light",
  ctaText = "Join the Waitlist",
  showScarcity = false,
  className = ""
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null);
  const [queryEmail, setQueryEmail] = useState<string | null>(null);
  const [queryAttempts, setQueryAttempts] = useState(0);
  const [searchParams] = useSearchParams();
  const addToWaitlist = useMutation(api.waitlist.addToWaitlist);

  // Get referral code from URL if present
  const referralCode = searchParams.get("ref") || undefined;

  // Query for entry if timeout occurred
  const delayedEntry = useQuery(
    api.waitlist.getEntryByEmail,
    queryEmail ? { email: queryEmail } : "skip"
  );

  // Handle delayed entry after timeout
  useEffect(() => {
    if (!queryEmail) return;

    console.log("[WAITLIST] Checking delayed entry:", delayedEntry, "attempts:", queryAttempts);

    if (delayedEntry?.referralCode) {
      console.log("[WAITLIST] Delayed entry loaded successfully:", delayedEntry);
      setUserReferralCode(delayedEntry.referralCode);
      setShowModal(true);
      setEmail("");
      setIsLoading(false);
      setQueryEmail(null);
      setQueryAttempts(0);
    } else if (delayedEntry === undefined) {
      // Query is still loading (undefined = loading state in Convex)
      console.log("[WAITLIST] Query still loading...");
    } else {
      // delayedEntry is null - entry not found yet
      console.log("[WAITLIST] Entry not found yet, attempts:", queryAttempts);

      // Give up after 10 attempts (about 10 seconds)
      if (queryAttempts >= 10) {
        console.error("[WAITLIST] Failed to find entry after timeout");
        toast.error("Something went wrong", {
          description: "Please refresh the page to see your status.",
        });
        setIsLoading(false);
        setQueryEmail(null);
        setQueryAttempts(0);
      } else {
        // Retry after 1 second
        const timer = setTimeout(() => {
          setQueryAttempts(prev => prev + 1);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [delayedEntry, queryEmail, queryAttempts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[WAITLIST] Form submitted");

    if (!email || !email.includes('@')) {
      console.log("[WAITLIST] Invalid email");
      toast.error("Please enter a valid email address");
      return;
    }

    console.log("[WAITLIST] Setting loading to true");
    setIsLoading(true);

    try {
      console.log("[WAITLIST] Calling mutation with:", { email: email.trim(), source: variant === "dark" ? "cta" : "hero" });

      // Call the mutation - it will complete on backend even if timeout occurs
      // Promise.race doesn't cancel promises, so the mutation will finish regardless
      const mutationPromise = addToWaitlist({
        email: email.trim(),
        source: variant === "dark" ? "cta" : "hero",
        referredBy: referralCode,
      });

      // Keep the mutation running but timeout the UI after 3 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 3000);
      });

      console.log("[WAITLIST] Waiting for mutation to resolve...");
      const result = await Promise.race([mutationPromise, timeoutPromise]) as any;

      console.log("[WAITLIST] Mutation result:", result);

      // If we get here, mutation resolved before timeout
      if (result?.entry?.referralCode) {
        // Show modal with the user's referral code
        setUserReferralCode(result.entry.referralCode);
        setShowModal(true);
        setEmail("");
        setIsLoading(false);
      } else if (result?.alreadyExists && result?.entry?.referralCode) {
        // If already exists, still show their referral info
        setUserReferralCode(result.entry.referralCode);
        setShowModal(true);
        toast.info("You're already on the waitlist!");
        setEmail("");
        setIsLoading(false);
      } else {
        toast.success("You're on the waitlist!", {
          description: "Check your email for your referral link.",
        });
        setEmail("");
        setIsLoading(false);
      }

      console.log("[WAITLIST] Success, clearing email");
    } catch (error: any) {
      console.error("[WAITLIST] Error caught:", error);

      // If timeout, the mutation is still running on backend
      // Trigger delayed query via useQuery hook
      if (error.message === "Request timeout") {
        console.log("[WAITLIST] Timeout - will query for entry by email");

        // Set queryEmail to trigger the useQuery hook
        // Wait a bit first to let backend complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        setQueryAttempts(0);
        setQueryEmail(email.trim());

        toast.success("Processing your submission...", {
          description: "This will take just a moment.",
        });

        // Keep isLoading true - will be set to false in useEffect when entry loads
        return;
      } else {
        console.error("[WAITLIST] Error message:", error?.message);
        console.error("[WAITLIST] Error data:", error?.data);
        toast.error("Failed to join waitlist", {
          description: error?.message || "Please try again later.",
        });
        setIsLoading(false);
      }
    } finally {
      console.log("[WAITLIST] Finally block");
      // Don't set isLoading here if we're in timeout path
    }
  };

  const isDark = variant === "dark";

  return (
    <>
      <form onSubmit={handleSubmit} className={`w-full max-w-[500px] flex flex-col gap-4 ${className}`}>
      <div className="relative">
        <Input
          type="email"
          placeholder="you@freelancer.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className={`h-14 px-6 text-lg font-medium rounded-xl border-2 shadow-sm ${
            isDark
              ? "bg-white/10 border-white/20 text-white placeholder:text-white/60 focus-visible:border-white"
              : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-primary"
          } transition-all duration-200`}
         
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className={`h-14 px-8 text-lg font-bold rounded-xl shadow-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl ${
          isDark
            ? "bg-white text-primary hover:bg-white/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
       
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Joining...
          </>
        ) : (
          <>
            {ctaText}
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      {showScarcity && (
        <p className={`text-xs font-medium text-center ${isDark ? "text-white/80" : "text-slate-500"}`}>
          <span className="text-amber-500 font-bold">⚠️ Limited spots:</span> only 36 spots left to close the waitlist
        </p>
      )}

      {!showScarcity && (
        <p className={`text-sm text-center ${isDark ? "text-white/60" : "text-slate-500"}`}>
          No credit card required. Free forever tier available.
        </p>
      )}
    </form>

      {/* Success Modal */}
      {userReferralCode && (
        <WaitlistSuccessModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          referralCode={userReferralCode}
        />
      )}
    </>
  );
}