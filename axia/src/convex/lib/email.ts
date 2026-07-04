// ──────────────────────────────────────────────────────────────────────────────
// lib/email.ts — Email provider interface + mock + Resend stub.
//
// WHY PROVIDER-AGNOSTIC: User has no email provider yet. Mock provider writes
// to emailLog + console.log so the portal flow (change order → email client →
// audit) works end-to-end without an external email service.
//
// WHEN RESEND IS READY: Set env EMAIL_PROVIDER=resend + RESEND_API_KEY +
// FROM_EMAIL, and the existing code path activates — no portal changes needed.
//
// WHY RESEND: 3,000 free emails/month, simple HTTP API, no SMTP headaches.
// ──────────────────────────────────────────────────────────────────────────────

import { MutationCtx } from "../_generated/server";
import { renderTemplate, EmailTemplateId, EmailTemplateArgs } from "./emailTemplates";

export interface EmailSendResult {
  provider: "mock" | "resend";
  providerMessageId?: string;
  status: "queued" | "sent" | "bounced" | "failed";
  errorMessage?: string;
}

export interface SendEmailArgs {
  toEmail: string;
  toName?: string;
  templateId: EmailTemplateId;
  variables: EmailTemplateArgs[EmailTemplateId];
  // Optional links back to records (for audit trail)
  workspaceId?: string;
  relatedChangeOrderId?: string;
  relatedInvoiceId?: string;
  relatedDeliverableId?: string;
}

export async function sendEmail(ctx: MutationCtx, args: SendEmailArgs): Promise<EmailSendResult> {
  const provider = process.env.EMAIL_PROVIDER ?? "mock";
  const fromEmail = process.env.FROM_EMAIL ?? "portal@axia.local";

  const { subject, html, text } = renderTemplate(args.templateId, args.variables);

  let result: EmailSendResult;

  if (provider === "resend") {
    if (!process.env.RESEND_API_KEY) {
      // ponytail: don't silently fall back to mock — surface the misconfig
      throw new Error(
        "EMAIL_PROVIDER=resend but RESEND_API_KEY is not set. " +
          "Set RESEND_API_KEY or change EMAIL_PROVIDER to 'mock'."
      );
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: args.toEmail,
          subject,
          html,
          text,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        result = {
          provider: "resend",
          status: "failed",
          errorMessage: `Resend API ${res.status}: ${errText.slice(0, 500)}`,
        };
      } else {
        const body = (await res.json()) as { id?: string };
        result = {
          provider: "resend",
          providerMessageId: body.id,
          status: "queued",
        };
      }
    } catch (e: any) {
      result = {
        provider: "resend",
        status: "failed",
        errorMessage: e?.message ?? "Network error",
      };
    }
  } else {
    // Mock provider — log + return success
    // ponytail: this lets the full portal flow work in dev without an email
    // service. The email content is in the emailLog row so the freelancer can
    // see what would have been sent.
    console.log(`[MOCK EMAIL] To: ${args.toEmail} | Subject: ${subject}`);
    result = {
      provider: "mock",
      providerMessageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "sent",
    };
  }

  // Audit to emailLog (always — success or failure)
  await ctx.db.insert("emailLog", {
    workspaceId: args.workspaceId as any,
    toEmail: args.toEmail,
    toName: args.toName,
    fromEmail,
    templateId: args.templateId,
    variables: args.variables as any,
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    status: result.status,
    errorMessage: result.errorMessage,
    relatedChangeOrderId: args.relatedChangeOrderId as any,
    relatedInvoiceId: args.relatedInvoiceId as any,
    relatedDeliverableId: args.relatedDeliverableId,
    sentAt: Date.now(),
  });

  return result;
}
