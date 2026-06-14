import { Email } from "@convex-dev/auth/providers/Email";
import { Resend } from "resend";
import { alphabet, generateRandomString } from "oslo/crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_NAME = process.env.APP_NAME || "AXIA";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "AXIA <onboarding@resend.dev>";

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  generateVerificationToken() {
    return generateRandomString(6, alphabet("0-9"));
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Your ${APP_NAME} verification code`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #ffffff; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px;">${APP_NAME}</h1>
              <p style="font-size: 16px; color: #6b7280; margin: 0;">Verify your email address</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <div style="display: inline-block; background: #f3f4f6; border-radius: 12px; padding: 20px 40px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827; font-family: 'Courier New', monospace;">${token}</span>
              </div>
            </div>

            <p style="font-size: 15px; color: #374151; text-align: center; line-height: 1.6; margin: 24px 0;">
              Enter this code to verify your email and continue. This code expires in 15 minutes.
            </p>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 32px;">
              <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
        text: `Your ${APP_NAME} verification code is: ${token}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
      });

      if (error) {
        console.error("Resend email error:", error);
        throw new Error(`Failed to send verification email: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Failed to send OTP email:", error);
      throw new Error(
        error?.message || "Failed to send verification email. Please try again."
      );
    }
  },
});
