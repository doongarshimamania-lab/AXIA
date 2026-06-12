import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  Headphones,
  Phone,
  Bug,
  Lightbulb,
  BookOpen,
  PlayCircle,
  ChevronRight,
  Send,
  Loader2,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  CircleDot,
  ExternalLink,
  ArrowRight,
  HelpCircle,
  Shield,
  FileText,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { PageLayout } from "@/components/design-system/PageLayout";

// --- Types ---
interface HelpArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: number;
  updatedAt: number;
}

// --- Mock Data ---
const MOCK_ARTICLES: HelpArticle[] = [
  { id: "1", title: "How to set up your first project", category: "Getting Started", excerpt: "Learn how to create your first protected project in Axia." },
  { id: "2", title: "Understanding evidence collection", category: "Evidence", excerpt: "How Axia automatically collects and stores work evidence." },
  { id: "3", title: "Dispute resolution walkthrough", category: "Disputes", excerpt: "Step-by-step guide to using Axia evidence in payment disputes." },
  { id: "4", title: "API authentication best practices", category: "API", excerpt: "Secure your API keys and manage access to the Axia API." },
  { id: "5", title: "Platform integration guide", category: "Integrations", excerpt: "Connect Upwork, Fiverr, and other platforms to Axia." },
  { id: "6", title: "Milestone protection explained", category: "Protection", excerpt: "How milestone-based protection keeps your payments safe." },
  { id: "7", title: "Exporting evidence reports", category: "Evidence", excerpt: "Generate professional evidence reports for clients and disputes." },
  { id: "8", title: "Subscription plans comparison", category: "Billing", excerpt: "Compare Free, Starter, Pro, and Expert plans." },
  { id: "9", title: "Time tracking setup", category: "Getting Started", excerpt: "Configure automatic time tracking for your projects." },,
  { id: "10", title: "Client risk assessment", category: "Protection", excerpt: "How Axia evaluates and scores client payment patterns." },
];

const FAQ_DATA = [
  {
    question: "What is Axia and how does it protect agencies?",
    answer:
      "Axia is a professional protection platform that automatically collects work evidence, monitors milestones, and provides dispute resolution support. It continuously captures timestamps, screenshots, and activity logs to create an immutable record of your work, ensuring you have proof if a client disputes payment.",
  },
  {
    question: "How does the evidence collection system work?",
    answer:
      "Axia runs in the background while you work, automatically capturing timestamps, activity patterns, and deliverable snapshots. All evidence is encrypted and stored with tamper-proof verification. You can also manually upload additional evidence like emails and contracts. The system builds a comprehensive timeline that can be exported as a professional report.",
  },
  {
    question: "Can I use Axia with my existing platforms?",
    answer:
      "Yes! Axia integrates directly with popular platforms including Upwork, Fiverr, Toptal, and Freelancer.com. Once connected, it imports your project data, payment history, and client communications automatically to build a complete protection profile.",
  },
  {
    question: "What happens if a client disputes my work?",
    answer:
      "If a dispute arises, Axia generates a comprehensive evidence report including your work timeline, deliverable proof, communication logs, and compliance verification. This report can be shared directly with the platform's dispute resolution team or used in formal proceedings. Pro and Expert users also get AI-powered dispute prediction to identify risks before they escalate.",
  },
  {
    question: "How is my data secured?",
    answer:
      "All data is encrypted at rest and in transit using AES-256 encryption. Evidence records use cryptographic hashing to ensure tamper detection. We never share your data with third parties, and you maintain full ownership of all your work evidence. You can delete your data at any time.",
  },
  {
    question: "What's included in the Free plan?",
    answer:
      "The Free plan includes basic evidence collection for up to 2 projects, manual evidence uploads, and standard report generation. You also get 100 API requests per day and access to the help center. For advanced features like AI dispute prediction, automated compliance checks, and unlimited projects, consider upgrading to Starter or Pro.",
  },
  {
    question: "How do I upgrade or change my subscription?",
    answer:
      "You can upgrade your plan anytime from the Subscription page. Changes take effect immediately, and you'll be prorated for the remainder of your billing cycle. Downgrades take effect at the end of your current billing period, so you won't lose access to features mid-cycle.",
  },
  {
    question: "Does Axia support team or agency accounts?",
    answer:
      "Yes! The Expert plan includes full team support with shared project access, team evidence pooling, and centralized billing. Each team member gets their own protected workspace while contributing to shared project evidence vaults. Agency admins can manage all team members and projects from a unified dashboard.",
  },
];

const VIDEO_TUTORIALS = [
  { id: "v1", title: "Getting Started with Axia", duration: "5:32", thumbnail: "🛡️" },
  { id: "v2", title: "Setting Up Your First Project", duration: "8:15", thumbnail: "📋" },
  { id: "v3", title: "Evidence Collection Deep Dive", duration: "12:04", thumbnail: "📸" },
  { id: "v4", title: "Dispute Resolution Walkthrough", duration: "10:28", thumbnail: "⚖️" },
  { id: "v5", title: "API Integration Tutorial", duration: "15:47", thumbnail: "🔌" },
  { id: "v6", title: "Platform Connections Setup", duration: "6:51", thumbnail: "🔗" },
];

const MOCK_TICKETS: SupportTicket[] = [
  {
    id: "TKT-2847",
    subject: "Evidence not syncing from Upwork",
    status: "in_progress",
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 4 * 60 * 60 * 1000,
  },
  {
    id: "TKT-2831",
    subject: "Cannot generate PDF report",
    status: "resolved",
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: "TKT-2798",
    subject: "Billing question about Pro plan",
    status: "closed",
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
];

// --- Helpers ---
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const statusConfig: Record<
  SupportTicket["status"],
  { label: string; icon: React.ElementType; className: string }
> = {
  open: {
    label: "Open",
    icon: CircleDot,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  closed: {
    label: "Closed",
    icon: AlertCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
};

// --- Component ---
export default function HelpCenter() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter articles by search
  const filteredArticles = searchQuery.trim()
    ? MOCK_ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : MOCK_ARTICLES;

  // Submit contact form
  const handleSubmitContact = async () => {
    if (!contactForm.name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!contactForm.email.trim() || !contactForm.email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!contactForm.subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!contactForm.message.trim()) {
      toast.error("Please enter your message");
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsSubmitting(false);
    setContactForm({ name: "", email: "", subject: "", message: "" });
    toast.success("Message sent! We'll get back to you within 24 hours.");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="w-full min-h-screen bg-background text-foreground">
        <PageLayout narrow>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Help Center
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Find answers, get support, and learn how to make the most of
              Axia
            </p>
          </div>

          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help articles, FAQs, and tutorials..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Badge variant="secondary" className="text-xs">
                    {filteredArticles.length} result
                    {filteredArticles.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchQuery.trim() && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Search Results</CardTitle>
                  <CardDescription>
                    Showing {filteredArticles.length} article
                    {filteredArticles.length !== 1 ? "s" : ""} matching "
                    {searchQuery}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredArticles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>No articles found for "{searchQuery}"</p>
                      <p className="text-sm mt-1">
                        Try different keywords or browse the FAQ below.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredArticles.map((article) => (
                        <button
                          key={article.id}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                          onClick={() =>
                            toast.info("Article viewer coming soon!")
                          }
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground text-sm">
                                {article.title}
                              </p>
                              <Badge
                                variant="secondary"
                                className="text-[10px] flex-shrink-0"
                              >
                                {article.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {article.excerpt}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  title: "Contact Support",
                  desc: "Get help from our team",
                  icon: Headphones,
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                  action: () => {
                    document
                      .getElementById("contact-form")
                      ?.scrollIntoView({ behavior: "smooth" });
                  },
                },
                {
                  title: "Schedule Call",
                  desc: "Book a 1-on-1 session",
                  icon: Phone,
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10",
                  action: () =>
                    toast.info("Call scheduling coming soon!"),
                },
                {
                  title: "Report Bug",
                  desc: "Let us know what's broken",
                  icon: Bug,
                  color: "text-red-500",
                  bg: "bg-red-500/10",
                  action: () => {
                    document
                      .getElementById("contact-form")
                      ?.scrollIntoView({ behavior: "smooth" });
                  },
                },
                {
                  title: "Feature Request",
                  desc: "Suggest improvements",
                  icon: Lightbulb,
                  color: "text-amber-500",
                  bg: "bg-amber-500/10",
                  action: () => {
                    document
                      .getElementById("contact-form")
                      ?.scrollIntoView({ behavior: "smooth" });
                  },
                },
              ].map((item) => (
                <Card
                  key={item.title}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={item.action}
                >
                  <CardContent className="p-4 text-center">
                    <div
                      className={`h-11 w-11 rounded-lg ${item.bg} flex items-center justify-center mx-auto mb-3`}
                    >
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <p className="font-semibold text-foreground text-sm">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* FAQ Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>
                  Quick answers to the most common questions about Axia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {FAQ_DATA.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left text-sm font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Getting Started Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Getting Started Guide
                </CardTitle>
                <CardDescription>
                  Follow these steps to set up Axia and start protecting your
                  work
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: "Create Your Account",
                      desc: "Sign up with your email and complete your professional profile with your skills and hourly rate.",
                      icon: Shield,
                    },
                    {
                      step: 2,
                      title: "Connect Your Platforms",
                      desc: "Link your platforms (Upwork, Fiverr, etc.) to automatically import your projects and clients.",
                      icon: Zap,
                    },
                    {
                      step: 3,
                      title: "Create Your First Project",
                      desc: "Add project details including scope, milestones, and payment terms to start building protection.",
                      icon: FileText,
                    },
                    {
                      step: 4,
                      title: "Start Tracking Time",
                      desc: "Begin tracking your work sessions. Axia will automatically collect evidence as you work.",
                      icon: Clock,
                    },
                    {
                      step: 5,
                      title: "Review Your Evidence Vault",
                      desc: "Check your evidence library to see all captured work proof, health scores, and protection status.",
                      icon: Shield,
                    },
                  ].map((step) => (
                    <div
                      key={step.step}
                      className="flex items-start gap-4 group"
                    >
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-primary/20">
                          {step.step}
                        </div>
                        {step.step < 5 && (
                          <div className="w-0.5 h-6 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pt-1.5">
                        <p className="font-semibold text-foreground text-sm">
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Video Tutorials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Video Tutorials
                </CardTitle>
                <CardDescription>
                  Watch walkthroughs to master Axia features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {VIDEO_TUTORIALS.map((video) => (
                    <button
                      key={video.id}
                      className="group text-left rounded-lg border border-border hover:border-primary/30 transition-colors overflow-hidden"
                      onClick={() =>
                        toast.info("Video player coming soon!")
                      }
                    >
                      <div className="h-32 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center relative">
                        <span className="text-4xl">{video.thumbnail}</span>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                          <div className="h-12 w-12 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                            <PlayCircle className="h-7 w-7 text-foreground" />
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="absolute bottom-2 right-2 text-[10px] bg-black/70 text-white border-0"
                        >
                          {video.duration}
                        </Badge>
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-foreground text-sm line-clamp-2">
                          {video.title}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact Form */}
            <Card id="contact-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Contact Us
                </CardTitle>
                <CardDescription>
                  Can't find what you're looking for? Send us a message and we'll
                  respond within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      placeholder="Your name"
                      value={contactForm.name}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="you@example.com"
                      value={contactForm.email}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-subject">Subject</Label>
                  <Input
                    id="contact-subject"
                    placeholder="What do you need help with?"
                    value={contactForm.subject}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Describe your question or issue in detail..."
                    rows={5}
                    value={contactForm.message}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitContact}
                    disabled={isSubmitting}
                    className="gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Support Ticket Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Your Support Tickets
                </CardTitle>
                <CardDescription>
                  Track the status of your recent support requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_TICKETS.map((ticket) => {
                    const config = statusConfig[ticket.status];
                    const StatusIcon = config.icon;
                    return (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">
                              {ticket.id}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${config.className}`}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <p className="font-medium text-foreground text-sm truncate">
                            {ticket.subject}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Created {formatDate(ticket.createdAt)} &middot;
                            Updated {formatDate(ticket.updatedAt)}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="flex-shrink-0 ml-3 gap-1">
                          View
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <Separator className="my-4" />

                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      toast.info("Full ticket history coming soon!")
                    }
                  >
                    View All Tickets
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageLayout>
      </div>
    </motion.div>
  );
}
