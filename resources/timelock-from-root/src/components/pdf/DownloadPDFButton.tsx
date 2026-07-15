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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

function safeFileName(s: string | undefined, fallback: string): string {
  const base = (s ?? "").trim() || fallback;
  return base.replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "_").slice(0, 80);
}

// Brand palette (matches the on-screen HTML version)
const BRAND = {
  ink: "#0f172a" as const,        // slate-900
  sub: "#475569" as const,        // slate-600
  muted: "#64748b" as const,      // slate-500
  hair: "#e2e8f0" as const,       // slate-200
  band: "#f1f5f9" as const,       // slate-100
  accent: "#4f46e5" as const,     // indigo-600
  success: "#15803d" as const,
  danger: "#b91c1c" as const,
};

// ─────────────────────────────────────────────
// jsPDF helpers — fonts, headers, footers
// ─────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function setTextColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function setFillColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function setDrawColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

/**
 * Draws the AXIA brand header at the top of the first page.
 * Returns the Y cursor position after the header (where body content should begin).
 */
function drawBrandHeader(
  doc: jsPDF,
  pageW: number,
  margin: number,
  opts: { kind: "Proposal" | "Invoice"; metaLines: string[] }
): number {
  const topY = margin;

  // Brand wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  setTextColor(doc, BRAND.ink);
  doc.text("AXIA", margin, topY + 14);

  // Brand subtitle (Proposal / Invoice)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, BRAND.muted);
  doc.text(opts.kind.toUpperCase(), margin, topY + 21);

  // Right-aligned meta lines
  doc.setFontSize(10);
  setTextColor(doc, BRAND.sub);
  const metaX = pageW - margin;
  const metaStartY = topY + 10;
  opts.metaLines.forEach((line, i) => {
    const isBold = line.startsWith("**") && line.endsWith("**");
    const text = isBold ? line.slice(2, -2) : line;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(text, metaX, metaStartY + i * 5, { align: "right" });
  });

  // Divider under header
  const dividerY = topY + 28;
  setDrawColor(doc, BRAND.ink);
  doc.setLineWidth(1.5);
  doc.line(margin, dividerY, pageW - margin, dividerY);

  return dividerY + 12;
}

function drawFooter(doc: jsPDF, pageW: number, pageH: number, margin: number) {
  const footerY = pageH - 16;
  setDrawColor(doc, BRAND.hair);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageW - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, BRAND.muted);
  doc.text(
    `Generated from AXIA · ${new Date().toLocaleDateString()}`,
    pageW / 2,
    footerY + 6,
    { align: "center" }
  );

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    setTextColor(doc, BRAND.muted);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 8, {
      align: "right",
    });
  }
}

// ─────────────────────────────────────────────
// Proposal PDF generator
// ─────────────────────────────────────────────

function generateProposalPDF(p: BaseDocument): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  const metaLines: string[] = [];
  metaLines.push(`Date: ${formatDate(p.sentAt ?? Date.now())}`);
  if (p.status === "signed") metaLines.push("**Status: Signed**");

  let y = drawBrandHeader(doc, pageW, margin, {
    kind: "Proposal",
    metaLines,
  });

  // Title block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  setTextColor(doc, BRAND.ink);
  const titleLines = doc.splitTextToSize(p.title || "Untitled Proposal", contentW);
  doc.text(titleLines, margin, y + 8);
  y += 8 + titleLines.length * 22;

  // Client line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  setTextColor(doc, BRAND.sub);
  if (p.clientName) {
    const clientLine = `Prepared for ${p.clientName}${p.clientEmail ? `  <${p.clientEmail}>` : ""}`;
    doc.text(clientLine, margin, y);
    y += 16;
  }
  if (p.totalValue) {
    setTextColor(doc, BRAND.ink);
    doc.setFont("helvetica", "bold");
    doc.text(`Total value: ${formatCurrency(p.totalValue, p.currency)}`, margin, y);
    y += 16;
  }
  y += 8;

  // Body sections
  const sections = p.sections ?? [];

  for (const section of sections) {
    const type = section.type ?? section.data?.type ?? "text";
    const content = section.content ?? section.data?.text ?? "";
    const metadata = section.metadata ?? section.data ?? {};

    // Page-break safety
    if (y > pageH - 80) {
      doc.addPage();
      y = margin + 8;
    }

    if (type === "heading" || type === "header") {
      const level = metadata.level ?? 1;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(level === 1 ? 16 : level === 2 ? 13 : 11);
      setTextColor(doc, BRAND.ink);
      const text = content || metadata.text || "";
      const lines = doc.splitTextToSize(text, contentW);
      doc.text(lines, margin, y + 4);
      y += 4 + lines.length * (level === 1 ? 20 : level === 2 ? 17 : 15) + 4;
      continue;
    }

    if (type === "text") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      setTextColor(doc, BRAND.ink);
      const text = content || metadata.text || "";
      const paragraphs = String(text).split(/\n{2,}/);
      for (const para of paragraphs) {
        const lines = doc.splitTextToSize(para.replace(/\n/g, " "), contentW);
        if (y + lines.length * 15 > pageH - 60) {
          doc.addPage();
          y = margin + 8;
        }
        doc.text(lines, margin, y + 4);
        y += lines.length * 15 + 6;
      }
      y += 4;
      continue;
    }

    if (type === "pricing" || type === "pricing_table") {
      const rows = metadata.rows ?? metadata.items ?? [];
      if (!rows.length) continue;
      const isNamedItems = rows[0].name !== undefined;

      const head = isNamedItems
        ? [["Item", "Price"]]
        : [["Item", "Qty", "Rate", "Amount"]];
      const body = rows.map((r: any) => {
        if (isNamedItems) {
          return [
            r.name || r.item || "",
            formatCurrency(r.price ?? r.amount, p.currency),
          ];
        }
        return [
          r.item || "",
          String(r.quantity ?? 1),
          formatCurrency(r.rate, p.currency),
          formatCurrency(r.amount, p.currency),
        ];
      });

      const totalVal = metadata.total ?? p.totalValue;
      if (totalVal !== undefined) {
        body.push([
          ...(isNamedItems ? [""] : ["", "", ""]),
          isNamedItems ? "Total" : "Total",
          isNamedItems ? formatCurrency(totalVal, p.currency) : formatCurrency(totalVal, p.currency),
        ] as any);
      }

      autoTable(doc, {
        startY: y,
        head: head as any,
        body: body as any,
        theme: "striped",
        margin: { left: margin, right: margin },
        styles: {
          font: "helvetica",
          fontSize: 10,
          cellPadding: 7,
          textColor: hexToRgb(BRAND.ink),
          lineColor: hexToRgb(BRAND.hair),
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: hexToRgb(BRAND.band),
          textColor: hexToRgb(BRAND.sub),
          fontStyle: "bold",
          fontSize: 9,
        },
        alternateRowStyles: { fillColor: hexToRgb(BRAND.band) },
        columnStyles: isNamedItems
          ? { 1: { halign: "right", font: "helvetica" } }
          : {
              1: { halign: "right" },
              2: { halign: "right" },
              3: { halign: "right" },
            },
        didParseCell: (data) => {
          // Bold the totals row
          if (
            totalVal !== undefined &&
            data.row.index === body.length - 1
          ) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 11;
            if (data.column.index === (isNamedItems ? 0 : 2)) {
              data.cell.styles.halign = "right";
              data.cell.styles.textColor = hexToRgb(BRAND.ink);
            }
          }
        },
      });

      // @ts-ignore — autoTable adds lastAutoTable.finalY to the doc
      y = (doc as any).lastAutoTable.finalY + 14;
      continue;
    }

    if (type === "terms") {
      const text = content || metadata.text || "";
      // Light tinted band
      setFillColor(doc, BRAND.band);
      const lines = doc.splitTextToSize(text, contentW - 24);
      const bandH = 24 + lines.length * 14;
      doc.rect(margin, y, contentW, bandH, "F");
      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setTextColor(doc, BRAND.muted);
      doc.text("TERMS", margin + 12, y + 14);
      // Body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setTextColor(doc, BRAND.ink);
      doc.text(lines, margin + 12, y + 28);
      y += bandH + 12;
      continue;
    }

    if (type === "milestone") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setTextColor(doc, BRAND.ink);
      doc.text(metadata.title || content || "Milestone", margin, y + 4);
      y += 18;
      if (metadata.description) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        setTextColor(doc, BRAND.sub);
        const lines = doc.splitTextToSize(metadata.description, contentW);
        doc.text(lines, margin, y + 4);
        y += lines.length * 14 + 6;
      }
      y += 4;
      continue;
    }

    if (type === "divider" || type === "delimiter") {
      setDrawColor(doc, BRAND.hair);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 14;
      continue;
    }

    // Fallback: treat as text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    setTextColor(doc, BRAND.ink);
    const text = content || "";
    const lines = doc.splitTextToSize(text, contentW);
    if (y + lines.length * 15 > pageH - 60) {
      doc.addPage();
      y = margin + 8;
    }
    doc.text(lines, margin, y + 4);
    y += lines.length * 15 + 6;
  }

  drawFooter(doc, pageW, pageH, margin);
  return doc;
}

// ─────────────────────────────────────────────
// Invoice PDF generator
// ─────────────────────────────────────────────

function generateInvoicePDF(inv: BaseDocument): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // Status chip text
  const statusUpper = (inv.status || "").toUpperCase();
  const metaLines: string[] = [
    `**${inv.invoiceNumber || "Invoice"}**`,
    statusUpper ? `Status: ${statusUpper}` : "",
  ].filter(Boolean) as string[];

  let y = drawBrandHeader(doc, pageW, margin, {
    kind: "Invoice",
    metaLines,
  });

  // Billing block: Bill To (left) | Dates (right)
  const billY = y;
  // Bill To label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, BRAND.muted);
  doc.text("BILL TO", margin, billY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setTextColor(doc, BRAND.ink);
  doc.text(inv.clientName || "—", margin, billY + 16);

  if (inv.clientEmail) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTextColor(doc, BRAND.sub);
    doc.text(inv.clientEmail, margin, billY + 30);
  }

  // Right: dates
  const datesX = pageW - margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, BRAND.muted);
  doc.text("ISSUE DATE", datesX, billY, { align: "right" });
  doc.text("DUE DATE", datesX, billY + 24, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setTextColor(doc, BRAND.ink);
  doc.text(formatDate(inv.issueDate), datesX, billY + 12, { align: "right" });

  // Due date color cue
  let dueColor = BRAND.ink;
  if (inv.dueDate) {
    const days = Math.floor((inv.dueDate - Date.now()) / (24 * 60 * 60 * 1000));
    if (days < 0) dueColor = BRAND.danger;
    else if (days <= 3) dueColor = "#b45309";
  }
  setTextColor(doc, dueColor);
  doc.text(formatDate(inv.dueDate), datesX, billY + 36, { align: "right" });

  y = billY + 50;

  // Items table
  const items = inv.lineItems ?? [];
  const body = items.length
    ? items.map((it: any) => [
        it.description || "",
        String(it.quantity ?? 1),
        formatCurrency(it.rate, inv.currency),
        formatCurrency(it.amount, inv.currency),
      ])
    : [["No line items", "", "", ""]];

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Rate", "Amount"]],
    body: body as any,
    theme: "striped",
    margin: { left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 8,
      textColor: hexToRgb(BRAND.ink),
      lineColor: hexToRgb(BRAND.hair),
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: hexToRgb(BRAND.band),
      textColor: hexToRgb(BRAND.sub),
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: hexToRgb(BRAND.band) },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 16;

  // Totals block (right aligned, 260pt wide)
  const totalsX = pageW - margin - 260;
  const totalsW = 260;

  const totalsRows: Array<[string, string, boolean]> = [];
  if (inv.subtotal !== undefined)
    totalsRows.push(["Subtotal", formatCurrency(inv.subtotal, inv.currency), false]);
  if (inv.discountAmount)
    totalsRows.push(["Discount", `−${formatCurrency(inv.discountAmount, inv.currency)}`, false]);
  if (inv.taxAmount)
    totalsRows.push(["Tax", formatCurrency(inv.taxAmount, inv.currency), false]);
  if (inv.total !== undefined)
    totalsRows.push(["Total Due", formatCurrency(inv.total, inv.currency), true]);

  // Background band for totals
  if (totalsRows.length) {
    setFillColor(doc, BRAND.band);
    const bandH = 12 + totalsRows.length * 22;
    doc.roundedRect(totalsX, y, totalsW, bandH, 6, 6, "F");

    let ty = y + 18;
    for (const [label, val, isGrand] of totalsRows) {
      if (isGrand) {
        // Top divider inside the band
        setDrawColor(doc, BRAND.hair);
        doc.setLineWidth(0.8);
        doc.line(totalsX + 12, ty - 8, totalsX + totalsW - 12, ty - 8);
        ty += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        setTextColor(doc, BRAND.ink);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        setTextColor(doc, BRAND.sub);
      }
      doc.text(label, totalsX + 12, ty);
      doc.text(val, totalsX + totalsW - 12, ty, { align: "right" });
      ty += isGrand ? 24 : 18;
    }
    y = ty + 8;
  }

  // Notes + Terms
  y += 12;
  if (inv.notes) {
    if (y > pageH - 100) {
      doc.addPage();
      y = margin + 8;
    }
    setFillColor(doc, BRAND.band);
    const lines = doc.splitTextToSize(inv.notes, contentW - 24);
    const bandH = 26 + lines.length * 13;
    doc.rect(margin, y, contentW, bandH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTextColor(doc, BRAND.muted);
    doc.text("NOTES", margin + 12, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTextColor(doc, BRAND.ink);
    doc.text(lines, margin + 12, y + 28);
    y += bandH + 10;
  }

  if (inv.terms) {
    if (y > pageH - 100) {
      doc.addPage();
      y = margin + 8;
    }
    setFillColor(doc, BRAND.band);
    const lines = doc.splitTextToSize(inv.terms, contentW - 24);
    const bandH = 26 + lines.length * 13;
    doc.rect(margin, y, contentW, bandH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTextColor(doc, BRAND.muted);
    doc.text("TERMS", margin + 12, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTextColor(doc, BRAND.ink);
    doc.text(lines, margin + 12, y + 28);
    y += bandH + 10;
  }

  drawFooter(doc, pageW, pageH, margin);
  return doc;
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

  const triggerDownload = async () => {
    setGenerating(true);
    try {
      // Small delay so the spinner shows for ultra-fast generations
      const doc =
        type === "proposal"
          ? generateProposalPDF(document)
          : generateInvoicePDF(document);

      const fileName =
        type === "proposal"
          ? `Proposal_${safeFileName(document.title, "untitled")}.pdf`
          : `Invoice_${safeFileName(document.invoiceNumber, "untitled")}.pdf`;

      doc.save(fileName);

      toast.success(`${type === "proposal" ? "Proposal" : "Invoice"} downloaded`, {
        description: `Saved as ${fileName}`,
      });
    } catch (err: any) {
      console.error("[DownloadPDFButton] PDF generation failed:", err);
      toast.error("Failed to generate PDF", { description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const triggerPrint = () => {
    setGenerating(true);
    try {
      // Generate PDF and open in new tab for printing
      const doc =
        type === "proposal"
          ? generateProposalPDF(document)
          : generateInvoicePDF(document);

      const blobUrl = doc.output("bloburl");
      const printWindow = window.open(blobUrl as any, "_blank");
      if (!printWindow) {
        toast.error("Pop-up blocked", {
          description: "Please allow pop-ups for AXIA to print the PDF.",
        });
        setGenerating(false);
        return;
      }
      // Try to trigger print after the PDF loads
      printWindow.addEventListener("load", () => {
        try {
          printWindow.print();
        } catch {}
      });

      toast.success(`${type === "proposal" ? "Proposal" : "Invoice"} opened for print`);
    } catch (err: any) {
      toast.error("Failed to open for print", { description: err.message });
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
            Download PDF
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
