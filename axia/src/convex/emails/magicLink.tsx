// convex/emails/magicLink.tsx — magic-link email (passwordless sign-in).

import { Heading, Link, Text } from "@react-email/components";
import React from "react";
import { BaseEmail, styles } from "./components/BaseEmail";

interface MagicLinkEmailProps {
  url: string;
}

export default function MagicLinkEmail({ url }: MagicLinkEmailProps) {
  return (
    <BaseEmail previewText="Sign in to Axia">
      <Heading style={styles.h1}>Sign in to Axia</Heading>
      <Text style={styles.text}>
        Click the link below to sign in to your Axia account. This link can
        only be used once and expires in 15 minutes.
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
        Sign in to Axia →
      </Link>
      <Text style={{ ...styles.text, color: "#ababab", marginTop: "14px" }}>
        If you didn't request this link, you can safely ignore this email —
        no one has accessed your account.
      </Text>
    </BaseEmail>
  );
}
