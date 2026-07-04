// ──────────────────────────────────────────────────────────────────────────────
// lib/emailTemplates.ts — Type-safe email templates.
//
// Each template has:
//   - subject: string
//   - html: string (sanitized on render — no script tags, no inline event handlers)
//   - text: string (plaintext fallback)
//
// WHY TYPE-SAFE: TypeScript enforces that the caller passes the right variables
// for each template. No more "undefined" appearing in emails because someone
// forgot to pass `clientName`.
// ──────────────────────────────────────────────────────────────────────────────

export type EmailTemplateId =
  | "change_order_requested"
  | "change_order_approved"
  | "change_order_declined"
  | "invoice_issued"
  | "invoice_paid"
  | "portal_link_issued"
  | "welcome_client";

export interface EmailTemplateArgs {
  change_order_requested: {
    clientName: string;
    freelancerName: string;
    changeOrderTitle: string;
    changeOrderDescription: string;
    impactHours: number;
    impactCost: number;
    portalUrl: string;
  };
  change_order_approved: {
    freelancerName: string;
    clientName: string;
    changeOrderTitle: string;
    portalUrl: string;
  };
  change_order_declined: {
    freelancerName: string;
    clientName: string;
    changeOrderTitle: string;
    declineReason?: string;
    portalUrl: string;
  };
  invoice_issued: {
    clientName: string;
    freelancerName: string;
    invoiceNumber: string;
    amount: string;
    currency: string;
    dueDate: string;
    portalUrl: string;
  };
  invoice_paid: {
    freelancerName: string;
    clientName: string;
    invoiceNumber: string;
    amount: string;
    currency: string;
    paidAt: string;
  };
  portal_link_issued: {
    clientName: string;
    freelancerName: string;
    portalUrl: string;
    expiresAt: string;
  };
  welcome_client: {
    clientName: string;
    freelancerName: string;
    portalUrl: string;
  };
}

export function renderTemplate<T extends EmailTemplateId>(
  id: T,
  vars: EmailTemplateArgs[T],
): { subject: string; html: string; text: string } {
  switch (id) {
    case "change_order_requested":
      return renderChangeOrderRequested(vars as EmailTemplateArgs["change_order_requested"]);
    case "change_order_approved":
      return renderChangeOrderApproved(vars as EmailTemplateArgs["change_order_approved"]);
    case "change_order_declined":
      return renderChangeOrderDeclined(vars as EmailTemplateArgs["change_order_declined"]);
    case "invoice_issued":
      return renderInvoiceIssued(vars as EmailTemplateArgs["invoice_issued"]);
    case "invoice_paid":
      return renderInvoicePaid(vars as EmailTemplateArgs["invoice_paid"]);
    case "portal_link_issued":
      return renderPortalLinkIssued(vars as EmailTemplateArgs["portal_link_issued"]);
    case "welcome_client":
      return renderWelcomeClient(vars as EmailTemplateArgs["welcome_client"]);
  }
}

// ─── Individual template renderers ────────────────────────────────────────────

function renderChangeOrderRequested(v: EmailTemplateArgs["change_order_requested"]) {
  const subject = `[Axia] New change order requested: ${v.changeOrderTitle}`;
  const text = `Hi ${v.clientName},

${v.freelancerName} has requested a change order on your project.

Title: ${v.changeOrderTitle}
Description: ${v.changeOrderDescription}
Impact: +${v.impactHours}h, +$${v.impactCost}

Review and approve/decline here:
${v.portalUrl}

— Axia`;
  const html = `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #111;">New change order requested</h2>
  <p>Hi ${escapeHtml(v.clientName)},</p>
  <p><strong>${escapeHtml(v.freelancerName)}</strong> has requested a change order on your project.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: 600;">Title</td><td style="padding: 8px; border: 1px solid #eee;">${escapeHtml(v.changeOrderTitle)}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: 600;">Description</td><td style="padding: 8px; border: 1px solid #eee;">${escapeHtml(v.changeOrderDescription)}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: 600;">Impact</td><td style="padding: 8px; border: 1px solid #eee;">+${v.impactHours}h, +$${v.impactCost}</td></tr>
  </table>
  <p><a href="${escapeHtml(v.portalUrl)}" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 6px;">Review and approve</a></p>
  <p style="color: #666; font-size: 13px; margin-top: 24px;">— Axia</p>
</div>`;
  return { subject, html, text };
}

function renderChangeOrderApproved(v: EmailTemplateArgs["change_order_approved"]) {
  const subject = `[Axia] ${v.clientName} approved your change order`;
  const text = `Hi ${v.freelancerName},

${v.clientName} approved the change order: ${v.changeOrderTitle}

View in portal: ${v.portalUrl}

— Axia`;
  const html = `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #10b981;">✓ Change order approved</h2>
  <p>Hi ${escapeHtml(v.freelancerName)},</p>
  <p><strong>${escapeHtml(v.clientName)}</strong> approved your change order: <em>${escapeHtml(v.changeOrderTitle)}</em></p>
  <p><a href="${escapeHtml(v.portalUrl)}" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 6px;">View in portal</a></p>
</div>`;
  return { subject, html, text };
}

function renderChangeOrderDeclined(v: EmailTemplateArgs["change_order_declined"]) {
  const subject = `[Axia] ${v.clientName} declined your change order`;
  const text = `Hi ${v.freelancerName},

${v.clientName} declined the change order: ${v.changeOrderTitle}
${v.declineReason ? `Reason: ${v.declineReason}` : ""}

View in portal: ${v.portalUrl}

— Axia`;
  const html = `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #ef4444;">Change order declined</h2>
  <p>Hi ${escapeHtml(v.freelancerName)},</p>
  <p><strong>${escapeHtml(v.clientName)}</strong> declined your change order: <em>${escapeHtml(v.changeOrderTitle)}</em></p>
  ${v.declineReason ? `<p>Reason: ${escapeHtml(v.declineReason)}</p>` : ""}
  <p><a href="${escapeHtml(v.portalUrl)}" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 6px;">View in portal</a></p>
</div>`;
  return { subject, html, text };
}

function renderInvoiceIssued(v: EmailTemplateArgs["invoice_issued"]) {
  const subject = `[Axia] Invoice ${v.invoiceNumber} for ${v.amount} ${v.currency}`;
  const text = `Hi ${v.clientName},

${v.freelancerName} has issued invoice ${v.invoiceNumber} for ${v.amount} ${v.currency}, due ${v.dueDate}.

Pay securely in the portal: ${v.portalUrl}

— Axia`;
  const html = `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #111;">Invoice ${escapeHtml(v.invoiceNumber)}</h2>
  <p>Hi ${escapeHtml(v.clientName)},</p>
  <p><strong>${escapeHtml(v.freelancerName)}</strong> has issued an invoice for <strong>${escapeHtml(v.amount)} ${escapeHtml(v.currency)}</strong>, due ${escapeHtml(v.dueDate)}.</p>
  <p><a href="${escapeHtml(v.portalUrl)}" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px;">Pay invoice</a></p>
</div>`;
  return { subject, html, text };
}

function renderInvoicePaid(v: EmailTemplateArgs["invoice_paid"]) {
  const subject = `[Axia] Invoice ${v.invoiceNumber} paid`;
  const text = `Hi ${v.freelancerName},

${v.clientName} paid invoice ${v.invoiceNumber} for ${v.amount} ${v.currency} on ${v.paidAt}.

— Axia`;
  const html = `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #10b981;">✓ Payment received</h2>
  <p>Hi ${escapeHtml(v.freelancerName)},</p>
  <p><strong>${escapeHtml(v.clientName)}</strong> paid invoice <strong>${escapeHtml(v.invoiceNumber)}</strong> for ${escapeHtml(v.amount)} ${escapeHtml(v.currency)}.</p>
  <p style="color: #666; font-size: 13px;">Paid at: ${escapeHtml(v.paidAt)}</p>
</div>`;
  return { subject, html, text };
}

function renderPortalLinkIssued(v: EmailTemplateArgs["portal_link_issued"]) {
  const subject = `[Axia] Your client portal link from ${v.freelancerName}`;
  const text = `Hi ${v.clientName},

${v.freelancerName} has invited you to the Axia client portal.

Open your portal: ${v.portalUrl}

This link expires on ${v.expiresAt}.

— Axia`;
  const html = `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #111;">Your client portal is ready</h2>
  <p>Hi ${escapeHtml(v.clientName)},</p>
  <p><strong>${escapeHtml(v.freelancerName)}</strong> has invited you to the Axia client portal.</p>
  <p><a href="${escapeHtml(v.portalUrl)}" style="display: inline-block; padding: 14px 28px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 6px; font-size: 16px;">Open my portal</a></p>
  <p style="color: #666; font-size: 13px; margin-top: 16px;">This link expires on ${escapeHtml(v.expiresAt)}.</p>
</div>`;
  return { subject, html, text };
}

function renderWelcomeClient(v: EmailTemplateArgs["welcome_client"]) {
  const subject = `Welcome to Axia, ${v.clientName}`;
  const text = `Hi ${v.clientName},

${v.freelancerName} is using Axia to keep your project on track — transparent deliverables, clear change orders, and secure payments.

Open your portal: ${v.portalUrl}

— Axia`;
  const html = `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #111;">Welcome to Axia</h2>
  <p>Hi ${escapeHtml(v.clientName)},</p>
  <p><strong>${escapeHtml(v.freelancerName)}</strong> is using Axia to keep your project on track — transparent deliverables, clear change orders, and secure payments.</p>
  <p><a href="${escapeHtml(v.portalUrl)}" style="display: inline-block; padding: 14px 28px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 6px;">Open my portal</a></p>
</div>`;
  return { subject, html, text };
}

// ─── HTML escape (defense in depth) ───────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
