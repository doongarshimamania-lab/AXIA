import { Email } from "@convex-dev/auth/providers/Email";
import axios from "axios";
import { alphabet, generateRandomString } from "oslo/crypto";

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  // This function can be asynchronous
  generateVerificationToken() {
    return generateRandomString(6, alphabet("0-9"));
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    try {
      // TODO: Replace with your own email service endpoint
      await axios.post(
        process.env.EMAIL_SERVICE_URL || "https://email.example.com/send_otp",
        {
          to: email,
          otp: token,
          appName: process.env.APP_NAME || "AXIA",
        },
        {
          headers: {
            "x-api-key": process.env.EMAIL_API_KEY || "",
          },
        },
      );
    } catch (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
