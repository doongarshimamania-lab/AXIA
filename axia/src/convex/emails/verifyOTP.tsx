// convex/emails/verifyOTP.tsx — OTP code email (passwordless sign-in).

import { Heading, Text } from "@react-email/components";
import React from "react";
import { BaseEmail, styles } from "./components/BaseEmail";

interface VerifyOTPProps {
  code: string;
}

export default function VerifyOTP({ code }: VerifyOTPProps) {
  return (
    <BaseEmail previewText={`Your Axia sign-in code: ${code}`}>
      <Heading style={styles.h1}>Your sign-in code</Heading>
      <Text style={styles.text}>
        Use the code below to sign in to your Axia account. This code expires
        in 15 minutes.
      </Text>
      <Text style={{ textAlign: "center", margin: "24px 0" }}>
        <span style={styles.code}>{code}</span>
      </Text>
      <Text style={{ ...styles.text, color: "#ababab", marginTop: "14px" }}>
        If you didn't request this code, you can safely ignore this email —
        your account is still secure.
      </Text>
    </BaseEmail>
  );
}
