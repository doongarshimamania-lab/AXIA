// convex/emails/components/BaseEmail.tsx — shared email layout.
//
// All auth emails extend this base for consistent branding.
// Uses @react-email/components (type-safe React → HTML email renderer).

import React from "react";
import { Html, Body, Container, Section, Preview } from "@react-email/components";

interface BaseEmailProps {
  previewText: string;
  brandName?: string;
  brandTagline?: string;
  brandLogoUrl?: string;
  children: React.ReactNode;
}

export const styles = {
  h1: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: "20px",
  } as const,
  text: {
    fontSize: "14px",
    lineHeight: "24px",
    color: "#cfcfcf",
  } as const,
  link: {
    color: "#f97316",
    textDecoration: "underline",
  } as const,
  code: {
    fontSize: "32px",
    fontWeight: "700",
    letterSpacing: "8px",
    color: "#f97316",
    padding: "16px 24px",
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    display: "inline-block",
    margin: "16px 0",
  } as const,
  footer: {
    fontSize: "12px",
    color: "#6b6b6b",
    marginTop: "32px",
    paddingTop: "16px",
    borderTop: "1px solid #2a2a2a",
  } as const,
};

export function BaseEmail({
  previewText,
  brandName = "Axia",
  brandTagline = "Client portal for freelancers & agencies",
  children,
}: BaseEmailProps) {
  return (
    <Html>
      <Body
        style={{
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          margin: "0",
          padding: "0",
        }}
      >
        <Preview>{previewText}</Preview>
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            padding: "40px 24px",
            backgroundColor: "#0f0f0f",
            border: "1px solid #1f1f1f",
            borderRadius: "12px",
          }}
        >
          <Section style={{ marginBottom: "32px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#f97316",
                margin: "0",
              }}
            >
              {brandName}
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "#6b6b6b",
                margin: "4px 0 0 0",
              }}
            >
              {brandTagline}
            </p>
          </Section>
          {children}
          <Section style={styles.footer}>
            <p style={{ margin: "0", color: "#6b6b6b" }}>
              This email was sent by {brandName}. If you didn't request it,
              you can safely ignore it.
            </p>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
