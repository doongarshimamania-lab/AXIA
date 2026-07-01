
import { useMemo, useState } from "react";
import { Search, X, MessageCircleQuestion } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "./reveal";

const FAQS = [
  {
    q: "How is Axia different from Asana, Harvest or QuickBooks?",
    a: "Those tools are not your competitors. They are the things Axia replaces. Asana manages tasks. Harvest tracks time. QuickBooks sends invoices. None of them talk to each other, so none of them can prove your work. Axia puts your whole agency in one workspace and captures proof the moment work happens. The proof builds the invoice for you. You never bolt it on after the fact.",
  },
  {
    q: "What exactly is the Truth Layer?",
    a: "It is the core of the product. Every action your team takes, a task moved, a file saved, a commit merged, a client reply, gets captured as a permanent record. Your invoices, reports and client portal all pull from that record. Nobody types anything into a form. That is why an Axia invoice can defend itself and no other tool's invoice can.",
  },
  {
    q: "Do I have to change how my team works?",
    a: "No. That is the whole point. Axia watches the tools your team already uses, GitHub, Figma, Slack, your task board, and builds the verified work log for you. Nobody presses start. Nobody presses stop. The work happens, the log builds itself, and nobody has to remember to fill anything in.",
  },
  {
    q: "How does scope creep protection actually work?",
    a: "Axia reads every client request against the scope you agreed on. When a client asks for something outside that scope, a quick favor, a small addition, Axia flags it the moment it arrives and writes a one-click change order with a suggested price. You approve it, and it lands on the next invoice. You stop giving away work for free.",
  },
  {
    q: "Is my data safe if I leave?",
    a: "Your data is always yours. The Truth Layer keeps a permanent record of everything, and you can export your full evidence library, invoices and reports whenever you want. We never hold your proof hostage.",
  },
  {
    q: "What size agency is Axia built for?",
    a: "Axia is built for B2B agencies with 3 to 50 people running several clients at once. Solo freelancers and consultants use it too. If you juggle multiple clients and multiple seats, Axia fits. It is not a single-user tool.",
  },
  {
    q: "How long does setup take?",
    a: "About five minutes to create your first project with scope and milestones. Connect your tools (GitHub, Figma, Slack, Stripe) and Axia starts capturing verified work right away. Most agencies are fully off their old stack within a day.",
  },
];

export function FAQ() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return FAQS;
    const q = query.toLowerCase();
    return FAQS.filter(
      (f) =>
        f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <section id="faq" className="relative scroll-mt-24 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <span className="eyebrow">Questions</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-4xl">
              Answers, in plain English.
            </h2>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="relative mx-auto mt-8 max-w-lg">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions..."
              aria-label="Search FAQ"
              className="h-12 w-full rounded-xl border border-input bg-white pl-11 pr-10 text-[0.92rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[var(--axia-teal)] focus:ring-2 focus:ring-[var(--axia-teal)]/25"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          {filtered.length > 0 ? (
            <Accordion
              type="single"
              collapsible
              className="mt-10 space-y-3"
              defaultValue="item-0"
            >
              {filtered.map((f, i) => {
                const originalIndex = FAQS.indexOf(f);
                return (
                  <AccordionItem
                    key={originalIndex}
                    value={`item-${originalIndex}`}
                    className="surface px-5 data-[state=open]:border-[var(--axia-teal)]/40"
                  >
                    <AccordionTrigger className="text-left text-[0.98rem] font-medium text-foreground hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-pretty text-[0.9rem] leading-relaxed text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-border bg-white py-14 text-center">
              <MessageCircleQuestion className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-[0.92rem] font-medium text-foreground">
                No questions match &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-[0.82rem] text-muted-foreground">
                Try a different term or{" "}
                <button
                  onClick={() => setQuery("")}
                  className="font-medium text-[var(--axia-teal-bright)] hover:text-foreground"
                >
                  clear the search
                </button>
                .
              </p>
            </div>
          )}
        </Reveal>

        {query && filtered.length > 0 && (
          <p className="mt-5 text-center text-[0.78rem] text-muted-foreground">
            {filtered.length} of {FAQS.length} questions
          </p>
        )}
      </div>
    </section>
  );
}
