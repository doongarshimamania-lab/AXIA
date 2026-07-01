
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

const AGENCY_TYPES = [
  "Digital Marketing",
  "Performance / Growth",
  "Web Dev / Software",
  "SEO / SEM",
  "Creative / Branding",
  "Other",
];

type Status = "idle" | "loading" | "success" | "error";

export function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [serverMsg, setServerMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // ponytail: Convex mutation replaces the original Next.js /api/leads route.
  // The mutation returns { ok, id, message } — same shape as the old API.
  const createLead = useMutation(api.leads.createLead);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const name = String(fd.get("name") || "").trim();
    const company = String(fd.get("company") || "").trim();
    const agency = String(fd.get("agency") || "").trim();
    const seatsRaw = String(fd.get("seats") || "").trim();
    const message = String(fd.get("message") || "").trim();

    const nextErr: Record<string, string> = {};
    if (!email) nextErr.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErr.email = "Enter a valid email.";
    if (!name) nextErr.name = "Name is required.";
    if (!agency) nextErr.agency = "Select your agency type.";
    if (seatsRaw && (!/^\d+$/.test(seatsRaw) || Number(seatsRaw) < 1))
      nextErr.seats = "Enter a valid seat count.";

    if (Object.keys(nextErr).length) {
      setErrors(nextErr);
      return;
    }

    setStatus("loading");
    try {
      // ponytail: call Convex mutation instead of fetch('/api/leads').
      // The mutation does its own server-side validation and upserts by email.
      const data = await createLead({
        email,
        name: name || undefined,
        company: company || undefined,
        agency: agency || undefined,
        seats: seatsRaw ? Number(seatsRaw) : undefined,
        message: message || undefined,
      });
      setServerMsg(
        data.message ||
          "Thanks, we'll be in touch within one business day."
      );
      setStatus("success");
      e.currentTarget.reset();
    } catch (err) {
      setServerMsg(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setStatus("error");
    }
  }

  return (
    <section
      id="demo"
      className="relative scroll-mt-24 overflow-hidden py-10 sm:py-14"
    >
      {/* ambient backdrop */}
      
      <div className="pointer-events-none absolute -left-32 top-1/3 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(43,122,107,0.22),transparent)] blur-2xl" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
          {/* left: pitch */}
          <div>
            <Reveal>
              <span className="eyebrow">Book a demo</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-4xl">
                See your first dispute-proof invoice, today.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                One founder-led walkthrough. We connect your first project,
                capture your first verified work log, and generate a live,
                dispute-proof invoice with you. Five minutes to start. One tab
                forever.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <ul className="mt-4 space-y-2">
                {[
                  "Personalized to your agency type & client mix",
                  "Same-week onboarding, your stack migrated in a day",
                  "No credit card. No commitment. Just proof.",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-3 text-[0.92rem] text-foreground/90"
                  >
                    <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-8 flex items-center gap-3 rounded-xl border border-[var(--axia-teal)]/30 bg-[var(--axia-teal-soft)]/10 p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--axia-teal-bright)]" />
                <p className="text-[0.84rem] leading-relaxed text-foreground/90">
                  <span className="font-medium">Your data stays yours.</span>{" "}
                  We use your details only to prepare the demo. No spam, ever.
                </p>
              </div>
            </Reveal>
          </div>

          {/* right: form card */}
          <Reveal delay={0.1}>
            <div className="surface relative overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(43,122,107,0.18),transparent)]" />

              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.1,
                        type: "spring",
                        stiffness: 200,
                        damping: 14,
                      }}
                      className="grid h-16 w-16 place-items-center rounded-full border border-emerald-600/40 bg-emerald-50"
                    >
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </motion.span>
                    <h3 className="mt-5 text-xl font-semibold text-foreground">
                      Request received.
                    </h3>
                    <p className="mt-2 max-w-sm text-pretty text-[0.9rem] leading-relaxed text-muted-foreground">
                      {serverMsg}
                    </p>
                    <button
                      onClick={() => {
                        setStatus("idle");
                        setServerMsg("");
                      }}
                      className="mt-6 inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-[var(--axia-teal-bright)] hover:text-foreground"
                    >
                      Submit another
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={onSubmit}
                    noValidate
                    className="relative space-y-4"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--axia-teal-bright)]" />
                      <span className="text-[0.8rem] font-medium uppercase tracking-wide text-muted-foreground">
                        Request your demo
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Work email"
                        name="email"
                        type="email"
                        placeholder="you@agency.com"
                        error={errors.email}
                        required
                      />
                      <Field
                        label="Name"
                        name="name"
                        type="text"
                        placeholder="Priya Nair"
                        error={errors.name}
                        required
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Company"
                        name="company"
                        type="text"
                        placeholder="Northbeam Studio"
                      />
                      <Field
                        label="Team size"
                        name="seats"
                        type="number"
                        placeholder="12"
                        error={errors.seats}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[0.82rem] font-medium text-foreground">
                        Agency type <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <select
                          name="agency"
                          defaultValue=""
                          className={cn(
                            "h-11 w-full appearance-none rounded-lg border border-input bg-secondary/50 px-3.5 pr-10 text-[0.9rem] text-foreground outline-none transition-all hover:border-[var(--axia-teal)]/40 focus:border-[var(--axia-teal)] focus:ring-2 focus:ring-[var(--axia-teal)]/25",
                            errors.agency
                              ? "border-red-500/60"
                              : "text-foreground"
                          )}
                        >
                          <option value="" disabled className="text-muted-foreground">
                            Select your agency type
                          </option>
                          {AGENCY_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M6 8l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      {errors.agency && (
                        <p className="mt-1.5 text-[0.74rem] text-red-600">
                          {errors.agency}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[0.82rem] font-medium text-foreground">
                        What are you trying to protect?{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <textarea
                        name="message"
                        rows={3}
                        placeholder="e.g. We lose ~$3K/mo to scope creep and disputes on Asana + Harvest."
                        className="w-full resize-none rounded-lg border border-input bg-secondary/50 px-3.5 py-2.5 text-[0.9rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[var(--axia-teal)] focus:ring-2 focus:ring-[var(--axia-teal)]/25"
                      />
                    </div>

                    {status === "error" && (
                      <div className="flex items-start gap-2.5 rounded-lg border border-red-600/30 bg-red-50/70 px-3.5 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                        <p className="text-[0.82rem] text-red-700">
                          {serverMsg}
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[0.95rem] font-medium text-primary-foreground transition-all hover:bg-[var(--axia-teal-bright)] hover:shadow-[0_0_36px_-8px_rgba(43,122,107,0.8)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          Request my demo
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-[0.74rem] text-muted-foreground">
                      By submitting you agree to our terms. We reply within one
                      business day.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
  required,
  error,
}: {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.82rem] font-medium text-foreground">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-[0.9rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[var(--axia-teal)] focus:ring-2 focus:ring-[var(--axia-teal)]/25",
          error && "border-red-500/60"
        )}
      />
      {error && (
        <p className="mt-1.5 text-[0.74rem] text-red-600">{error}</p>
      )}
    </div>
  );
}
