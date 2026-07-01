
import { AxiaLogo } from "./brand";
import { ShieldCheck } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: ["Truth Layer", "Features", "Calculator", "Pricing", "FAQ"],
  },
  {
    title: "For agencies",
    links: [
      "Digital Marketing",
      "Growth / Performance",
      "Web Dev Shops",
      "SEO / SEM",
      "Creative / Branding",
    ],
  },
  {
    title: "Company",
    links: ["About", "Brand Bible", "Careers", "Contact", "Security"],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-auto border-t border-border bg-secondary">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--axia-teal)]/40 to-transparent" />
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* brand */}
          <div>
            <AxiaLogo />
            <p className="mt-4 max-w-xs text-pretty text-[0.86rem] leading-relaxed text-muted-foreground">
              The all-in-one agency management platform anchored by a Truth
              Layer that verifies work as it happens. Your business, one tab.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-50/60 px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-[0.78rem] text-emerald-700">
                Event-sourced, dispute-proof
              </span>
            </div>
          </div>

          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h4 className="text-[0.74rem] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {c.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="group relative text-[0.86rem] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l}
                      <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[var(--axia-teal-bright)] transition-all duration-300 group-hover:w-full" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-[0.78rem] text-muted-foreground">
            © {new Date().getFullYear()} Axia. Built in Mumbai. Protection,
            not productivity.
          </p>
          <div className="flex items-center gap-5 text-[0.78rem] text-muted-foreground">
            <a href="#" className="transition-colors hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Status
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
