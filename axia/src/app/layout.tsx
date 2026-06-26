import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axia - Freelance Payment Protection",
  description: "Axia helps freelancers protect payments with real-time monitoring, evidence collection, and AI dispute prediction.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
