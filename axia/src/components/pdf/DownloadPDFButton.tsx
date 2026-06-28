import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Download,
  Printer,
  ChevronDown,
  FileText,
  Receipt,
  Loader2,
} from "lucide-react";
// ponytail: direct-download PDF support — the previous version opened a new
// window and called window.print() which made the user manually pick "Save as
// PDF" from the print dialog. Now we render the HTML to an off-screen container,
// snapshot it with html2canvas, then write it into a jsPDF instance and trigger
// a real <a download> click. Both libs are already in node_modules (html2canvas
// is a transitive dep, jspdf is a direct dep). Dynamic-imported so the main
// bundle doesn't pay the ~700KB cost on every page load.
async function downloadPdfFromHtml(html: string, filename: string) {
  // Create an off-screen container so the user never sees the rendered HTML.
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-99999px";
  container.style.left = "-99999px";
  container.style.width = "800px";
  container.style.background = "#ffffff";
  container.style.padding = "32px";
  container.style.color = "#111827";
  container.style.fontFamily = "Inter, system-ui, sans-serif";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    // A4 size in mm: 210 × 297. Use the canvas aspect ratio to compute height.
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

// ─────────────────────────────────────────────
// Types — minimal shape we need from proposal/invoice
// ─────────────────────────────────────────────

interface BaseDocument {
  _id: string;
  title?: string;            // proposal
  invoiceNumber?: string;    // invoice
  clientName?: string;
  clientEmail?: string;
  totalValue?: number;       // proposal
  total?: number;            // invoice
  currency?: string;
  sentAt?: number;
  issueDate?: number;
  dueDate?: number;
  notes?: string;
  terms?: string;
  sections?: any[];          // proposal
  lineItems?: any[];         // invoice
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  status?: string;
}

interface DownloadPDFButtonProps {
  document: BaseDocument;
  type: "proposal" | "invoice";
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
  showDropdown?: boolean; // if true, render as dropdown with "Download PDF" + "Print" options
}

// ─────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────

function formatCurrency(amount: number | undefined, currency = "USD"): string {
  if (amount === undefined || amount === null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(ts: number | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─────────────────────────────────────────────
// HTML document generators
// ─────────────────────────────────────────────

function generateProposalHTML(p: BaseDocument): string {
  const sections = p.sections ?? [];
  const sectionHTML = sections.map((s: any) => {
    const id = s.id ?? "";
    const type = s.type ?? s.data?.type ?? "text";
    const content = s.content ?? s.data?.text ?? "";
    const metadata = s.metadata ?? s.data ?? {};

    if (type === "heading" || type === "header") {
      const level = metadata.level ?? 1;
      return `<h${level} class="doc-heading">${escapeHtml(content || metadata.text || "")}</h${level}>`;
    }
    if (type === "text") {
      return `<p class="doc-text">${escapeHtml(content || metadata.text || "").replace(/\n/g, "<br/>")}</p>`;
    }
    if (type === "pricing" || type === "pricing_table") {
      const rows = metadata.rows ?? metadata.items ?? [];
      if (!rows.length) return "";
      const isNamedItems = rows[0].name !== undefined;
      const rowsHTML = rows
        .map((r: any) => {
          if (isNamedItems) {
            return `<tr>
              <td>${escapeHtml(r.name || r.item || "")}</td>
              <td class="num">${formatCurrency(r.price ?? r.amount, p.currency)}</td>
            </tr>`;
          }
          return `<tr>
            <td>${escapeHtml(r.item || "")}</td>
            <td class="num">${r.quantity ?? 1}</td>
            <td class="num">${formatCurrency(r.rate, p.currency)}</td>
            <td class="num">${formatCurrency(r.amount, p.currency)}</td>
          </tr>`;
        })
        .join("");
      const is4Col = !isNamedItems;
      return `<table class="pricing-table">
        <thead>
          <tr>
            ${is4Col
              ? `<th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th>`
              : `<th>Item</th><th class="num">Price</th>`}
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
        ${metadata.total !== undefined || p.totalValue !== undefined ? `<tfoot><tr><td colspan="${is4Col ? 3 : 1}" class="total-label">Total</td><td class="num total">${formatCurrency(metadata.total ?? p.totalValue, p.currency)}</td></tr></tfoot>` : ""}
      </table>`;
    }
    if (type === "terms") {
      return `<div class="terms-block"><strong>Terms</strong><p>${escapeHtml(content || metadata.text || "").replace(/\n/g, "<br/>")}</p></div>`;
    }
    if (type === "divider" || type === "delimiter") {
      return `<hr class="doc-divider" />`;
    }
    if (type === "milestone") {
      return `<div class="milestone-block"><strong>${escapeHtml(metadata.title || content || "Milestone")}</strong><p>${escapeHtml(metadata.description || "").replace(/\n/g, "<br/>")}</p></div>`;
    }
    return `<p class="doc-text">${escapeHtml(content || "").replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(p.title || "Proposal")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 48px 56px; font-size: 13px; line-height: 1.55; }
  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #0f172a; }
  .doc-brand { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
  .doc-brand-sub { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
  .doc-meta { text-align: right; font-size: 11px; color: #475569; }
  .doc-meta strong { color: #0f172a; }
  .doc-title-block { margin-bottom: 24px; }
  .doc-title-block h1 { font-size: 28px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.01em; }
  .doc-client { font-size: 13px; color: #475569; }
  .doc-client strong { color: #0f172a; }
  h1.doc-heading, h2.doc-heading, h3.doc-heading { margin: 24px 0 8px 0; }
  h1.doc-heading { font-size: 20px; }
  h2.doc-heading { font-size: 16px; }
  h3.doc-heading { font-size: 14px; }
  .doc-text { margin: 8px 0; color: #1e293b; }
  .pricing-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
  .pricing-table th { background: #f1f5f9; color: #475569; text-align: left; padding: 8px 10px; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #cbd5e1; }
  .pricing-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
  .pricing-table td.num, .pricing-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .pricing-table tfoot td { font-weight: 700; border-top: 2px solid #0f172a; border-bottom: none; padding-top: 12px; }
  .pricing-table .total-label { text-align: right; }
  .pricing-table .total { font-size: 14px; }
  .terms-block { background: #f8fafc; border-left: 3px solid #cbd5e1; padding: 12px 16px; margin: 16px 0; }
  .terms-block strong { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 6px; }
  .milestone-block { padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
  .doc-divider { border: none; border-top: 1px solid #cbd5e1; margin: 24px 0; }
  .doc-footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print {
    body { padding: 24px 32px; }
    .doc-header { page-break-after: avoid; }
    .doc-heading, h2.doc-heading { page-break-after: avoid; }
    .pricing-table { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="doc-header">
    <div>
      <div class="doc-brand">AXIA</div>
      <div class="doc-brand-sub">Proposal</div>
    </div>
    <div class="doc-meta">
      <div><strong>Date:</strong> ${formatDate(p.sentAt ?? Date.now())}</div>
      ${p.status === "signed" ? `<div><strong>Signed:</strong> Yes</div>` : ""}
    </div>
  </div>
  <div class="doc-title-block">
    <h1>${escapeHtml(p.title || "Untitled Proposal")}</h1>
    ${p.clientName ? `<div class="doc-client">Prepared for <strong>${escapeHtml(p.clientName)}</strong>${p.clientEmail ? ` &lt;${escapeHtml(p.clientEmail)}&gt;` : ""}</div>` : ""}
    ${p.totalValue ? `<div class="doc-client" style="margin-top:6px;">Total value: <strong>${formatCurrency(p.totalValue, p.currency)}</strong></div>` : ""}
  </div>
  ${sectionHTML}
  <div class="doc-footer">Generated from AXIA · ${new Date().toLocaleDateString()}</div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 300); };
  </script>
</body>
</html>`;
}

function generateInvoiceHTML(inv: BaseDocument): string {
  const items = inv.lineItems ?? [];
  const itemsHTML = items.map((it: any) => `
    <tr>
      <td>${escapeHtml(it.description || "")}</td>
      <td class="num">${it.quantity ?? 1}</td>
      <td class="num">${formatCurrency(it.rate, inv.currency)}</td>
      <td class="num">${formatCurrency(it.amount, inv.currency)}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(inv.invoiceNumber || "Invoice")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 48px 56px; font-size: 13px; line-height: 1.55; }
  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #0f172a; }
  .doc-brand { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
  .doc-brand-sub { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
  .doc-meta { text-align: right; font-size: 12px; color: #475569; }
  .doc-meta strong { color: #0f172a; }
  .doc-meta-row { margin-bottom: 4px; }
  .doc-status { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; background: #f1f5f9; color: #475569; }
  .doc-status.paid { background: #dcfce7; color: #15803d; }
  .doc-status.overdue { background: #fee2e2; color: #b91c1c; }
  .doc-status.sent, .doc-status.viewed { background: #dbeafe; color: #1d4ed8; }
  .doc-billing-block { display: flex; justify-content: space-between; margin-bottom: 32px; }
  .doc-bill-to { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
  .doc-bill-name { font-size: 16px; font-weight: 600; }
  .doc-bill-email { font-size: 12px; color: #475569; }
  .doc-dates { text-align: right; font-size: 12px; }
  .doc-dates .row { margin-bottom: 4px; }
  .doc-dates .label { color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em; margin-right: 8px; }
  .doc-dates .val { font-weight: 600; color: #0f172a; }
  .doc-dates .val.due-soon { color: #b45309; }
  .doc-dates .val.overdue { color: #b91c1c; }
  table.items { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
  table.items th { background: #f1f5f9; color: #475569; text-align: left; padding: 10px; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #cbd5e1; }
  table.items td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  table.items td.num, table.items th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals-block { margin-left: auto; width: 280px; margin-top: 16px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
  .totals-row.divider { border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 12px; }
  .totals-row.grand { font-size: 16px; font-weight: 700; }
  .totals-label { color: #475569; }
  .totals-val { font-variant-numeric: tabular-nums; }
  .notes-block { margin-top: 32px; padding: 12px 16px; background: #f8fafc; border-left: 3px solid #cbd5e1; font-size: 11px; }
  .notes-block strong { display: block; text-transform: uppercase; font-size: 9px; letter-spacing: 0.08em; color: #64748b; margin-bottom: 4px; }
  .doc-footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print {
    body { padding: 24px 32px; }
    .doc-header, .doc-billing-block { page-break-after: avoid; }
    table.items { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="doc-header">
    <div>
      <div class="doc-brand">AXIA</div>
      <div class="doc-brand-sub">Invoice</div>
    </div>
    <div class="doc-meta">
      <div class="doc-meta-row"><strong>${escapeHtml(inv.invoiceNumber || "")}</strong></div>
      <div class="doc-meta-row"><span class="doc-status ${inv.status || ""}">${escapeHtml((inv.status || "").toUpperCase())}</span></div>
    </div>
  </div>
  <div class="doc-billing-block">
    <div>
      <div class="doc-bill-to">Bill To</div>
      <div class="doc-bill-name">${escapeHtml(inv.clientName || "—")}</div>
      ${inv.clientEmail ? `<div class="doc-bill-email">${escapeHtml(inv.clientEmail)}</div>` : ""}
    </div>
    <div class="doc-dates">
      <div class="row"><span class="label">Issue Date</span><span class="val">${formatDate(inv.issueDate)}</span></div>
      <div class="row"><span class="label">Due Date</span><span class="val">${formatDate(inv.dueDate)}</span></div>
    </div>
  </div>
  <table class="items">
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${itemsHTML || `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:24px;">No line items</td></tr>`}</tbody>
  </table>
  <div class="totals-block">
    ${inv.subtotal !== undefined ? `<div class="totals-row"><span class="totals-label">Subtotal</span><span class="totals-val">${formatCurrency(inv.subtotal, inv.currency)}</span></div>` : ""}
    ${inv.discountAmount ? `<div class="totals-row"><span class="totals-label">Discount</span><span class="totals-val">−${formatCurrency(inv.discountAmount, inv.currency)}</span></div>` : ""}
    ${inv.taxAmount ? `<div class="totals-row"><span class="totals-label">Tax</span><span class="totals-val">${formatCurrency(inv.taxAmount, inv.currency)}</span></div>` : ""}
    <div class="totals-row divider grand">
      <span class="totals-label">Total Due</span>
      <span class="totals-val">${formatCurrency(inv.total, inv.currency)}</span>
    </div>
  </div>
  ${inv.notes ? `<div class="notes-block"><strong>Notes</strong>${escapeHtml(inv.notes).replace(/\n/g, "<br/>")}</div>` : ""}
  ${inv.terms ? `<div class="notes-block"><strong>Terms</strong>${escapeHtml(inv.terms).replace(/\n/g, "<br/>")}</div>` : ""}
  <div class="doc-footer">Generated from AXIA · ${new Date().toLocaleDateString()}</div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 300); };
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function DownloadPDFButton({
  document,
  type,
  variant = "outline",
  size = "sm",
  className = "",
  label,
  showDropdown = false,
}: DownloadPDFButtonProps) {
  const [generating, setGenerating] = useState(false);

  // ponytail: the main click handler now downloads a real PDF file directly
  // via jsPDF + html2canvas — no more "open print dialog and let the user pick
  // Save as PDF". Falls back to the legacy print-window approach if the
  // dynamic import fails (e.g. on a slow connection or blocked module).
  const triggerDownload = async () => {
    setGenerating(true);
    try {
      const html =
        type === "proposal"
          ? generateProposalHTML(document)
          : generateInvoiceHTML(document);
      const filename =
        (type === "proposal"
          ? (document.title || "proposal")
          : (document.invoiceNumber || "invoice"))
          .replace(/[^a-z0-9_-]+/gi, "_") + ".pdf";
      await downloadPdfFromHtml(html, filename);
      toast.success(`${type === "proposal" ? "Proposal" : "Invoice"} PDF downloaded`, {
        description: filename,
      });
    } catch (err: any) {
      console.warn("[DownloadPDFButton] direct download failed, falling back to print window:", err?.message);
      // Fallback: legacy print-window approach
      try {
        const html =
          type === "proposal"
            ? generateProposalHTML(document)
            : generateInvoiceHTML(document);
        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (!printWindow) {
          toast.error("Pop-up blocked", {
            description: "Please allow pop-ups for AXIA to download the PDF.",
          });
          return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        toast.info("Print dialog opened", {
          description: "Use your browser's \"Save as PDF\" option to download.",
        });
      } catch (fallbackErr: any) {
        toast.error("Failed to generate PDF", { description: fallbackErr.message });
      }
    } finally {
      setGenerating(false);
    }
  };

  // ponytail: separate print handler for the "Print" dropdown item — keeps the
  // legacy print-window behavior for users who explicitly want to print.
  const triggerPrint = () => {
    setGenerating(true);
    try {
      const html =
        type === "proposal"
          ? generateProposalHTML(document)
          : generateInvoiceHTML(document);

      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) {
        toast.error("Pop-up blocked", {
          description: "Please allow pop-ups for AXIA to print.",
        });
        setGenerating(false);
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success(`${type === "proposal" ? "Proposal" : "Invoice"} opened for print`);
    } catch (err: any) {
      toast.error("Failed to open print preview", { description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const icon = type === "proposal" ? FileText : Receipt;
  const Icon = icon;
  const defaultLabel = label ?? "Download PDF";

  if (showDropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} className={`gap-1.5 ${className}`} disabled={generating}>
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {defaultLabel}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={triggerDownload} className="gap-2 cursor-pointer">
            <Download className="h-3.5 w-3.5" />
            Save as PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={triggerPrint} className="gap-2 cursor-pointer">
            <Printer className="h-3.5 w-3.5" />
            Print
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-1.5 ${className}`}
      onClick={triggerDownload}
      disabled={generating}
    >
      {generating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {defaultLabel}
    </Button>
  );
}
