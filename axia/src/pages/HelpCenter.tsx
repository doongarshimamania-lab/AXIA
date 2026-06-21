import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  HelpCircle,
  Mail,
  Send,
  Loader2,
  BookOpen,
  Clock,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageLayout } from "@/components/design-system/PageLayout";

export default function HelpCenter() {
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // TODO: Replace with real Convex mutation when support ticket system is implemented
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
              Support and resources for Axia
            </p>
          </div>

          <div className="space-y-6">
            {/* Coming Soon Banner */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-12 flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Help Center is Coming Soon
                </h2>
                <p className="text-muted-foreground max-w-md mb-2">
                  We're working on bringing you comprehensive documentation,
                  tutorials, and support resources.
                </p>
                <p className="text-sm text-muted-foreground">
                  In the meantime, if you need help, reach out to us directly
                  using the form below.
                </p>

                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>24h response time</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a
                      href="mailto:support@axia.pro"
                      className="text-primary hover:underline"
                    >
                      support@axia.pro
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What's Coming */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: BookOpen,
                  title: "Documentation",
                  description:
                    "Comprehensive guides for every feature and workflow",
                },
                {
                  icon: HelpCircle,
                  title: "FAQ & Tutorials",
                  description:
                    "Quick answers and step-by-step video walkthroughs",
                },
                {
                  icon: MessageSquare,
                  title: "Community Forum",
                  description:
                    "Connect with other users and share best practices",
                },
              ].map((item) => (
                <Card key={item.title} className="border-border">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Contact Form */}
            <Card id="contact-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Contact Support
                </CardTitle>
                <CardDescription>
                  Can't find what you're looking for? Send us a message and
                  we'll respond within 24 hours.
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
          </div>
        </PageLayout>
      </div>
    </motion.div>
  );
}
