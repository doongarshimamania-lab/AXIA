import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "TIMELock - Protect Your Freelance Income",
  description: "TIMELock helps freelancers protect payments across Upwork, Fiverr, and Toptal with real-time compliance monitoring, evidence collection, and AI dispute prediction.",
  keywords: ["TIMELock", "freelancer protection", "payment protection", "Upwork", "Fiverr", "Toptal", "dispute resolution", "compliance monitoring"],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[var(--bg-page)] text-foreground" style={{ fontFamily: '"Geist Sans", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
