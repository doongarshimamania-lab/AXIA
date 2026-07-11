// convex/emails/resetPassword.tsx — password reset email.

import { Heading, Link, Text } from "@react-email/components";
import React from "react";
import { BaseEmail, styles } from "./components/BaseEmail";

interface ResetPasswordEmailProps {
  url: string;
}

export default function ResetPasswordEmail({ url }: ResetPasswordEmailProps) {
  return (
    <BaseEmail previewText="Reset your Axia password">
      <Heading style={styles.h1}>Reset your password</Heading>
      <Text style={styles.text}>
        We received a request to reset the password for your Axia account.
        Click the link below to set a new password. This link expires in 1
        hour and can only be used once.
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
        Reset password →
      </Link>
      <Text style={{ ...styles.text, color: "#ababab", marginTop: "14px" }}>
        If you didn't request a password reset, you can safely ignore this
        email — your password has not been changed.
      </Text>
    </BaseEmail>
  );
}
