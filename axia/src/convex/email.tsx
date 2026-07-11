// convex/email.ts — Resend email sender for Better Auth flows.
//
// Replaces the prior email.vly.ai/send_otp integration. Uses the official
// @convex-dev/resend Convex Component + resend SDK (Better Auth recommended
// integration pattern).
//
// SENDER DOMAIN:
//   - Default: "Axia <noreply@axia.com>" (override via EMAIL_FROM env var).
//   - In development / before domain verification: set EMAIL_FROM to
//     "Your Name <onboarding@resend.dev>" — Resend allows this without
//     domain verification, but only 100 emails/day.
//   - For production: verify axia.com (or your domain) in Resend dashboard
//     by adding the DNS records Resend shows you (MX, SPF, DKIM). Takes
//     5-30 minutes for DNS to propagate. Then update EMAIL_FROM to your
//     verified address.
//
// TEMPLATES:
//   - All emails use @react-email/components for type-safe React templates.
//   - Templates live in convex/emails/*.tsx.
//   - Each template renders to HTML via `render(<Template />)`.

import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";
import { ActionCtx } from "./_generated/server";
import { render } from "@react-email/components";
import React from "react";
import VerifyEmail from "./emails/verifyEmail";
import MagicLinkEmail from "./emails/magicLink";
import VerifyOTP from "./emails/verifyOTP";
import ResetPasswordEmail from "./emails/resetPassword";

// ─── Sender config ───────────────────────────────────────────────────────────
// Override per-env via EMAIL_FROM. Format: "Display Name <local@domain>"
const DEFAULT_FROM = "Axia <noreply@axia.com>";
const EMAIL_FROM = process.env.EMAIL_FROM ?? DEFAULT_FROM;

// Lazy-init the Resend client (component-scoped, no API key needed in code —
// the @convex-dev/resend component stores the API key as a Convex env var
// set via `npx convex env set RESEND_API_KEY re_...`).
const getResend = (ctx: ActionCtx) => {
  return new Resend(components.resend, { testMode: false });
};

// ─── Internal sender ──────────────────────────────────────────────────────────
const sendEmail = async (
  ctx: ActionCtx,
  {
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }
) => {
  const resend = getResend(ctx);
  await resend.sendEmail(ctx, {
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });
};

// ─── Exported flows (called by convex/auth.ts) ────────────────────────────────

export const sendEmailVerification = async (
  ctx: ActionCtx,
  { to, url }: { to: string; url: string }
) => {
  await sendEmail(ctx, {
    to,
    subject: "Verify your email — Axia",
    html: await render(<VerifyEmail url={url} />),
  });
};

export const sendOTPVerification = async (
  ctx: ActionCtx,
  { to, code }: { to: string; code: string }
) => {
  await sendEmail(ctx, {
    to,
    subject: "Your Axia sign-in code",
    html: await render(<VerifyOTP code={code} />),
  });
};

export const sendMagicLink = async (
  ctx: ActionCtx,
  { to, url }: { to: string; url: string }
) => {
  await sendEmail(ctx, {
    to,
    subject: "Sign in to Axia",
    html: await render(<MagicLinkEmail url={url} />),
  });
};

export const sendResetPassword = async (
  ctx: ActionCtx,
  { to, url }: { to: string; url: string }
) => {
  await sendEmail(ctx, {
    to,
    subject: "Reset your Axia password",
    html: await render(<ResetPasswordEmail url={url} />),
  });
};
