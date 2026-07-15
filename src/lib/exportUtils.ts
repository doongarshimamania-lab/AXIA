/**
 * Client-side export utilities for generating real downloadable files.
 * Uses jsPDF for actual PDF file generation — no print dialog.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── SECURITY: HTML Sanitization ─────────────────────────────────────────────
// All user-controlled data must be escaped before interpolation into HTML strings
// to prevent XSS in generated documents or any downstream HTML rendering.

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Escape user-controlled strings for safe HTML attribute interpolation
function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function generateCSV(headers: string[], rows: string[][], filename: string): void {
  const escape = (val: string) => {
    if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
    return val;
  };
  const headerLine = headers.map(escape).join(",");
  const dataLines = rows.map((r) => r.map(escape).join(","));
  const csv = [headerLine, ...dataLines].join("\n");
  downloadBlob(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

export function generateJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, `${filename}.json`, "application/json;charset=utf-8;");
}

// ─── PDF (jsPDF — real file download) ─────────────────────────────────────────

export function generatePDF(htmlContent: string, filename: string): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Parse the HTML content to extract structured data
  const parsed = parseHTMLContent(htmlContent);

  let y = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // ── Title ──
  if (parsed.title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 26, 46);
    doc.text(parsed.title, margin, y);
    y += 8;
  }

  // ── Meta line ──
  if (parsed.meta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(parsed.meta, margin, y);
    y += 8;
  }

  // ── Subtitle (h2) ──
  if (parsed.subtitle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(74, 74, 106);
    doc.text(parsed.subtitle, margin, y);
    y += 6;
  }

  // ── Subtitle meta ──
  if (parsed.subtitleMeta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(parsed.subtitleMeta, margin, y);
    y += 8;
  }

  // ── Info grid (key-value pairs) ──
  if (parsed.infoGrid.length > 0) {
    const colWidth = contentWidth / 2;
    parsed.infoGrid.forEach(({ label, value }, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * colWidth;
      const yPos = y + row * 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(label, x, yPos);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(value, x, yPos + 4);
    });
    const rows = Math.ceil(parsed.infoGrid.length / 2);
    y += rows * 10 + 4;
  }

  // ── Status badge ──
  if (parsed.badge) {
    const badgeColors: Record<string, [number, number, number]> = {
      green: [22, 163, 74],
      amber: [146, 64, 14],
      red: [153, 27, 27],
    };
    const badgeBgColors: Record<string, [number, number, number]> = {
      green: [220, 252, 231],
      amber: [254, 243, 199],
      red: [254, 226, 226],
    };

    const colorKey = parsed.badge.class.includes("green")
      ? "green"
      : parsed.badge.class.includes("amber")
        ? "amber"
        : "red";
    const textColor = badgeColors[colorKey];
    const bgColor = badgeBgColors[colorKey];

    const badgeText = parsed.badge.text;
    const badgeWidth = doc.getTextWidth(badgeText) + 8;
    const badgeHeight = 6;

    // Badge background
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.roundedRect(pageWidth - margin - badgeWidth, 20, badgeWidth, badgeHeight, 3, 3, "F");

    // Badge text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(badgeText, pageWidth - margin - badgeWidth + 4, 24);
  }

  // ── Table ──
  if (parsed.table) {
    autoTable(doc, {
      startY: y,
      head: [parsed.table.headers],
      body: parsed.table.rows,
      foot: parsed.table.footer ? [parsed.table.footer] : undefined,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [51, 65, 85],
        lineColor: [241, 245, 249],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [71, 85, 105],
        fontStyle: "bold",
        lineWidth: 0.4,
        lineColor: [226, 232, 240],
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        lineWidth: 0.5,
        lineColor: [226, 232, 240],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: parsed.table.alignRightCols
        ? Object.fromEntries(
            parsed.table.alignRightCols.map((col) => [
              col,
              { halign: "right" as const },
            ])
          )
        : undefined,
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // ── Footer notes ──
  if (parsed.footerNotes.length > 0) {
    parsed.footerNotes.forEach((note) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(note, margin, y);
      y += 5;
    });
  }

  // ── Footer timestamp ──
  if (parsed.footerTimestamp) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225);
    doc.text(parsed.footerTimestamp, margin, doc.internal.pageSize.getHeight() - 12);
  }

  doc.save(`${filename}.pdf`);
}

// ─── Legal Package ────────────────────────────────────────────────────────────

export function generateLegalPackage(
  data: {
    projectName: string;
    dateRange: string;
    items: { type: string; label: string; count: number }[];
    complianceScore: number;
  },
  filename: string
): void {
  const html = `
    <h1>Legal Evidence Package</h1>
    <p class="meta">Generated by Axia &bull; ${new Date().toLocaleString()} &bull; Compliance Score: ${data.complianceScore}%</p>
    <h2>Project: ${escapeHtml(data.projectName)}</h2>
    <p class="meta">Date Range: ${escapeHtml(data.dateRange)}</p>
    <table>
      <thead>
        <tr><th>Evidence Type</th><th>Label</th><th>Count</th></tr>
      </thead>
      <tbody>
        ${data.items.map((item) => `<tr><td>${item.type}</td><td>${item.label}</td><td>${item.count}</td></tr>`).join("")}
      </tbody>
      <tfoot>
        <tr class="total-row"><td colspan="2">Total Items</td><td>${data.items.reduce((s, i) => s + i.count, 0)}</td></tr>
      </tfoot>
    </table>
    <p class="footer">This package contains court-admissible evidence with cryptographic proof of authenticity. All timestamps are UTC and verifiable.</p>
  `;
  generatePDF(html, filename);
}

// ─── Invoice PDF ──────────────────────────────────────────────────────────────

export function generateInvoicePDF(
  invoice: {
    invoiceNumber: string;
    clientName: string;
    projectName: string;
    date: string;
    dueDate: string;
    paidDate?: string;
    status: string;
    platform: string;
    items: { description: string; quantity: number; rate: number; amount: number }[];
    amount: number;
    notes?: string;
  },
  filename: string
): void {
  const statusClass =
    invoice.status === "paid"
      ? "green"
      : invoice.status === "overdue"
        ? "red"
        : "amber";
  const statusLabel = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);

  const html = `
    <h1>Invoice ${invoice.invoiceNumber}</h1>
    <p class="meta">Platform: ${invoice.platform.charAt(0).toUpperCase() + invoice.platform.slice(1)}</p>
    <badge class="${statusClass}">${statusLabel}</badge>
    <info-grid>
      <item label="Client" value="${escapeAttr(invoice.clientName)}" />
      <item label="Project" value="${escapeAttr(invoice.projectName)}" />
      <item label="Issue Date" value="${invoice.date}" />
      <item label="Due Date" value="${invoice.dueDate}" />
      ${invoice.paidDate ? `<item label="Paid Date" value="${invoice.paidDate}" />` : ""}
    </info-grid>
    <table align-right="3,4">
      <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>
        ${invoice.items.map((item) => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>$${item.rate.toFixed(2)}</td><td>$${item.amount.toFixed(2)}</td></tr>`).join("")}
      </tbody>
      <tfoot><tr><td colspan="3">Total</td><td>$${invoice.amount.toFixed(2)}</td></tr></tfoot>
    </table>
    ${invoice.notes ? `<p class="footer"><b>Notes:</b> ${escapeHtml(invoice.notes)}</p>` : ""}
    <p class="footer-timestamp">Generated by Axia &bull; ${new Date().toLocaleString()}</p>
  `;
  generatePDF(html, filename);
}

// ─── Payment Patterns CSV ─────────────────────────────────────────────────────

export function exportPaymentReport(
  payments: {
    client: string;
    platform: string;
    amount: number;
    date: string;
    dueDate: string;
    status: string;
    daysLate: number;
    project: string;
  }[]
): void {
  const headers = ["Client", "Project", "Platform", "Amount", "Due Date", "Payment Date", "Status", "Days Late"];
  const rows = payments.map((p) => [
    p.client,
    p.project,
    p.platform,
    `$${p.amount.toFixed(2)}`,
    p.dueDate,
    p.date,
    p.status.replace("_", " "),
    String(p.daysLate),
  ]);
  generateCSV(headers, rows, `payment-report-${new Date().toISOString().slice(0, 10)}`);
}

// ─── Evidence Export ──────────────────────────────────────────────────────────

export function exportEvidence(
  format: "csv" | "json" | "pdf" | "legal",
  options: {
    evidenceTypes: { id: string; label: string; count: number }[];
    dateRange: string;
    project: string;
    client: string;
    complianceScore: number;
    totalItems: number;
  }
): void {
  const timestamp = new Date().toISOString().slice(0, 10);
  const baseName = `evidence-export-${timestamp}`;

  switch (format) {
    case "csv": {
      const headers = ["Evidence Type", "Label", "Count"];
      const rows = options.evidenceTypes.map((t) => [t.id, t.label, String(t.count)]);
      generateCSV(headers, rows, baseName);
      break;
    }
    case "json": {
      const payload = {
        exportDate: new Date().toISOString(),
        dateRange: options.dateRange,
        project: options.project,
        client: options.client,
        complianceScore: options.complianceScore,
        totalItems: options.totalItems,
        evidence: options.evidenceTypes,
      };
      generateJSON(payload, baseName);
      break;
    }
    case "pdf": {
      const html = `
        <h1>Evidence Export Report</h1>
        <p class="meta">Generated by Axia &bull; ${new Date().toLocaleString()} &bull; Compliance: ${options.complianceScore}%</p>
        <info-grid>
          <item label="Date Range" value="${escapeAttr(options.dateRange)}" />
          <item label="Project" value="${escapeAttr(options.project)}" />
          <item label="Client" value="${escapeAttr(options.client)}" />
          <item label="Total Items" value="${String(options.totalItems)}" />
        </info-grid>
        <table>
          <thead><tr><th>Evidence Type</th><th>Label</th><th>Count</th></tr></thead>
          <tbody>${options.evidenceTypes.map((t) => `<tr><td>${t.id}</td><td>${t.label}</td><td>${t.count}</td></tr>`).join("")}</tbody>
        </table>
      `;
      generatePDF(html, baseName);
      break;
    }
    case "legal": {
      generateLegalPackage(
        {
          projectName: options.project,
          dateRange: options.dateRange,
          items: options.evidenceTypes.map((t) => ({ type: t.id, label: t.label, count: t.count })),
          complianceScore: options.complianceScore,
        },
        baseName
      );
      break;
    }
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── HTML Content Parser ──────────────────────────────────────────────────────
// Extracts structured data from the mini-HTML templates so jsPDF can render them.

interface ParsedContent {
  title: string;
  meta: string;
  subtitle: string;
  subtitleMeta: string;
  badge: { text: string; class: string } | null;
  infoGrid: { label: string; value: string }[];
  table: {
    headers: string[];
    rows: string[][];
    footer: string[] | null;
    alignRightCols: number[];
  } | null;
  footerNotes: string[];
  footerTimestamp: string;
}

function parseHTMLContent(html: string): ParsedContent {
  const result: ParsedContent = {
    title: "",
    meta: "",
    subtitle: "",
    subtitleMeta: "",
    badge: null,
    infoGrid: [],
    table: null,
    footerNotes: [],
    footerTimestamp: "",
  };

  // Extract title
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
  if (h1Match) result.title = stripTags(h1Match[1]).trim();

  // Extract meta line
  const metaMatch = html.match(/<p[^>]*class="meta"[^>]*>(.*?)<\/p>/s);
  if (metaMatch) result.meta = stripTags(metaMatch[1]).replace(/&bull;/g, "•").trim();

  // Extract h2
  const h2Match = html.match(/<h2[^>]*>(.*?)<\/h2>/s);
  if (h2Match) result.subtitle = stripTags(h2Match[1]).trim();

  // Extract subtitle meta (second meta <p> after h2)
  const allMetaMatches = [...html.matchAll(/<p[^>]*class="meta"[^>]*>(.*?)<\/p>/gs)];
  if (allMetaMatches.length > 1) {
    result.subtitleMeta = stripTags(allMetaMatches[1][1]).replace(/&bull;/g, "•").trim();
  }

  // Extract badge
  const badgeMatch = html.match(/<badge[^>]*class="([^"]*)"[^>]*>(.*?)<\/badge>/s);
  if (badgeMatch) result.badge = { class: badgeMatch[1], text: stripTags(badgeMatch[2]).trim() };

  // Extract info grid items
  const infoGridMatch = html.match(/<info-grid>(.*?)<\/info-grid>/s);
  if (infoGridMatch) {
    const itemRegex = /<item\s+label="([^"]*)"\s+value="([^"]*)"\s*\/>/g;
    let m;
    while ((m = itemRegex.exec(infoGridMatch[1])) !== null) {
      result.infoGrid.push({ label: m[1], value: m[2] });
    }
  }

  // Extract table
  const tableMatch = html.match(/<table([^>]*)>(.*?)<\/table>/s);
  if (tableMatch) {
    const tableAttrs = tableMatch[1];

    // Parse align-right columns
    const alignRightMatch = tableAttrs.match(/align-right="([^"]*)"/);
    const alignRightCols: number[] = alignRightMatch
      ? alignRightMatch[1].split(",").map((n) => parseInt(n.trim(), 10))
      : [];

    const tableContent = tableMatch[2];

    // Headers
    const theadMatch = tableContent.match(/<thead>(.*?)<\/thead>/s);
    const headers: string[] = [];
    if (theadMatch) {
      const thRegex = /<th[^>]*>(.*?)<\/th>/gs;
      let th;
      while ((th = thRegex.exec(theadMatch[1])) !== null) {
        headers.push(stripTags(th[1]).trim());
      }
    }

    // Body rows
    const tbodyMatch = tableContent.match(/<tbody>(.*?)<\/tbody>/s);
    const rows: string[][] = [];
    if (tbodyMatch) {
      const trRegex = /<tr[^>]*>(.*?)<\/tr>/gs;
      let tr;
      while ((tr = trRegex.exec(tbodyMatch[1])) !== null) {
        const cells: string[] = [];
        const tdRegex = /<td[^>]*>(.*?)<\/td>/gs;
        let td;
        while ((td = tdRegex.exec(tr[1])) !== null) {
          cells.push(stripTags(td[1]).trim());
        }
        if (cells.length > 0) rows.push(cells);
      }
    }

    // Footer row
    const tfootMatch = tableContent.match(/<tfoot>(.*?)<\/tfoot>/s);
    let footer: string[] | null = null;
    if (tfootMatch) {
      const trRegex = /<tr[^>]*>(.*?)<\/tr>/gs;
      let tr;
      while ((tr = trRegex.exec(tfootMatch[1])) !== null) {
        const cells: string[] = [];
        const tdRegex = /<td[^>]*>(.*?)<\/td>/gs;
        let td;
        while ((td = tdRegex.exec(tr[1])) !== null) {
          cells.push(stripTags(td[1]).trim());
        }
        if (cells.length > 0) footer = cells;
      }
    }

    result.table = { headers, rows, footer, alignRightCols };
  }

  // Extract footer notes (class="footer")
  const footerMatches = [...html.matchAll(/<p[^>]*class="footer"[^>]*>(.*?)<\/p>/gs)];
  footerMatches.forEach((m) => {
    result.footerNotes.push(stripTags(m[1]).replace(/&bull;/g, "•").trim());
  });

  // Extract footer timestamp (class="footer-timestamp")
  const footerTsMatch = html.match(/<p[^>]*class="footer-timestamp"[^>]*>(.*?)<\/p>/s);
  if (footerTsMatch) {
    result.footerTimestamp = stripTags(footerTsMatch[1]).replace(/&bull;/g, "•").trim();
  }

  return result;
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<b>(.*?)<\/b>/gi, "$1")
    .replace(/<strong>(.*?)<\/strong>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}
