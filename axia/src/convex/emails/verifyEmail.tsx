// convex/emails/verifyEmail.tsx — verification email (sign-up flow).

import { Heading, Link, Text } from "@react-email/components";
import React from "react";
import { BaseEmail, styles } from "./components/BaseEmail";

interface VerifyEmailProps {
  url: string;
}

export default function VerifyEmail({ url }: VerifyEmailProps) {
  return (
    <BaseEmail previewText="Verify your email address">
      <Heading style={styles.h1}>Verify your email</Heading>
      <Text style={styles.text}>
        Welcome to Axia. Click the link below to verify your email address and
        activate your account.
      </Text>
      <Link
        href={url}
        target="_blank"
        style={{
          ...styles.link,
          display: "block",
          marginBottom: "16px",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        Verify email address →
      </Link>
      <Text style={{ ...styles.text, color: "#ababab", marginTop: "14px" }}>
        This link expires in 24 hours. If you didn't create an account, you
        can safely ignore this email.
      </Text>
    </BaseEmail>
  );
}
