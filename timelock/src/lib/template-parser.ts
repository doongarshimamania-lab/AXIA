/**
 * Template Parser — Rules-based document structure extraction
 *
 * Parses PDF, DOCX, and TXT files into ProposalSection objects using
 * purely heuristic approaches (NO AI).
 *
 * Supports:
 *  - DOCX: mammoth → HTML → structure extraction
 *  - PDF:  pdfjs-dist → text items with font/position → heading/table detection
 *  - TXT:  simple line-by-line parsing
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionType = "heading" | "text" | "pricing" | "terms" | "milestone" | "divider";

export interface ProposalSection {
  id: string;
  type: SectionType;
  content: string;
  metadata?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/** Detect if a string looks like a placeholder pattern */
function detectPlaceholders(text: string): string[] {
  const patterns = [
    /\{\{([^}]+)\}\}/g,       // {{var}}
    /\[([^\]]+)\]/g,          // [Variable]
    /<([A-Z_]+)>/g,           // <COMPANY>
    /_{3,}/g,                 // ___ (underscores)
  ];
  const found: string[] = [];
  for (const pat of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(text)) !== null) {
      found.push(m[1] || m[0]);
    }
  }
  return found;
}

/** Check if text contains numeric values that suggest pricing */
function hasNumericContent(text: string): boolean {
  // Look for dollar amounts, percentages, or number patterns
  return /[$€£¥]\s*[\d,]+/.test(text) || /\d{1,3}(,\d{3})+(\.\d{2})?/.test(text);
}

/** Check if text looks like terms & conditions */
function looksLikeTerms(text: string): boolean {
  const termsKeywords = [
    "payment terms", "terms and conditions", "agreement", "liability",
    "warranty", "intellectual property", "confidentiality", "termination",
    "indemnification", "governing law", "dispute", "refund", "cancellation",
    "late payment", "interest", "governing jurisdiction",
  ];
  const lower = text.toLowerCase();
  return termsKeywords.some(kw => lower.includes(kw));
}

/** Check if lines form a table-like grid structure */
function detectTableRows(lines: string[]): { isTable: boolean; rows: string[][] } {
  if (lines.length < 2) return { isTable: false, rows: [] };

  // Check for tab-separated or multi-space-separated columns
  const rows: string[][] = [];
  let consistentCols = 0;
  let firstColCount = 0;

  for (const line of lines) {
    const cols = line.split(/\t|  {2,}/).map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      rows.push(cols);
      if (firstColCount === 0) firstColCount = cols.length;
      if (cols.length === firstColCount) consistentCols++;
    }
  }

  // At least 2 rows with consistent column count
  const isTable = rows.length >= 2 && consistentCols >= 2;
  return { isTable, rows };
}

// ─── DOCX Parser ──────────────────────────────────────────────────────────────

export async function parseDOCX(arrayBuffer: ArrayBuffer): Promise<ProposalSection[]> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  return parseHTML(html);
}

function parseHTML(html: string): ProposalSection[] {
  const sections: ProposalSection[] = [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  if (!body) return sections;

  const children = Array.from(body.children);

  for (const el of children) {
    const tagName = el.tagName.toLowerCase();
    const text = el.textContent?.trim() || "";

    if (!text) continue;

    if (tagName.match(/^h[1-6]$/)) {
      // Heading element
      sections.push({
        id: generateId(),
        type: "heading",
        content: text,
      });
    } else if (tagName === "table") {
      // Table element — check if it contains numeric content for pricing
      const tableText = el.textContent || "";
      if (hasNumericContent(tableText)) {
        // Parse as pricing table
        const items = parseHTMLTableToPricingItems(el);
        sections.push({
          id: generateId(),
          type: "pricing",
          content: "Pricing",
          metadata: { items },
        });
      } else {
        // Store as text with table info
        sections.push({
          id: generateId(),
          type: "text",
          content: tableText.trim(),
        });
      }
    } else if (tagName === "ul" || tagName === "ol") {
      // List items — format as text with bullets
      const items = Array.from(el.querySelectorAll("li")).map(
        li => `• ${li.textContent?.trim() || ""}`
      );
      sections.push({
        id: generateId(),
        type: "text",
        content: items.join("\n"),
      });
    } else if (tagName === "p") {
      // Paragraph — detect if it's terms, placeholder, or regular text
      if (looksLikeTerms(text)) {
        sections.push({
          id: generateId(),
          type: "terms",
          content: text,
        });
      } else {
        const placeholders = detectPlaceholders(text);
        sections.push({
          id: generateId(),
          type: "text",
          content: text,
          metadata: placeholders.length > 0 ? { placeholders } : undefined,
        });
      }
    } else {
      // Other elements (div, etc.) — treat as text
      sections.push({
        id: generateId(),
        type: "text",
        content: text,
      });
    }
  }

  return sections.length > 0 ? sections : [
    { id: generateId(), type: "text", content: html.replace(/<[^>]*>/g, "").trim() },
  ];
}

function parseHTMLTableToPricingItems(tableEl: Element): { name: string; price: number }[] {
  const items: { name: string; price: number }[] = [];
  const rows = Array.from(tableEl.querySelectorAll("tr"));

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll("td, th"));
    if (cells.length < 2) continue;

    const nameCell = cells[0].textContent?.trim() || "";
    const priceText = cells[1].textContent?.trim() || "0";

    // Skip header rows
    if (nameCell.toLowerCase().includes("item") || nameCell.toLowerCase().includes("description")) {
      continue;
    }
    if (nameCell.toLowerCase().includes("total")) {
      continue;
    }

    // Parse price
    const priceMatch = priceText.match(/[$€£¥]?\s*([\d,]+(?:\.\d{2})?)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : 0;

    if (nameCell) {
      items.push({ name: nameCell, price });
    }
  }

  // Fallback: if no items parsed, create a single item from table text
  if (items.length === 0) {
    const tableText = tableEl.textContent?.trim() || "Service";
    items.push({ name: tableText.substring(0, 100), price: 0 });
  }

  return items;
}

// ─── PDF Parser ───────────────────────────────────────────────────────────────

interface PDFTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
}

export async function parsePDF(arrayBuffer: ArrayBuffer): Promise<ProposalSection[]> {
  const pdfjs = await import("pdfjs-dist");

  // Set worker source
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const allItems: PDFTextItem[] = [];
  let bodyFontSize = 12; // default, will be recalculated

  // Collect all text items from all pages
  const fontSizes: number[] = [];

  for (let pageIdx = 1; pageIdx <= pdf.numPages; pageIdx++) {
    const page = await pdf.getPage(pageIdx);
    const textContent = await page.getTextContent();

    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;

      const fontSize = item.height || item.transform?.[0] || 12;
      fontSizes.push(fontSize);

      allItems.push({
        text: item.str.trim(),
        x: item.transform?.[4] || 0,
        y: item.transform?.[5] || 0,
        width: item.width || 0,
        height: item.height || fontSize,
        fontSize,
        fontName: item.fontName || "",
      });
    }
  }

  if (allItems.length === 0) {
    return [{ id: generateId(), type: "text", content: "(No text could be extracted from this PDF)" }];
  }

  // Determine body font size (most common)
  if (fontSizes.length > 0) {
    const sizeCounts = new Map<number, number>();
    for (const s of fontSizes) {
      sizeCounts.set(s, (sizeCounts.get(s) || 0) + 1);
    }
    let maxCount = 0;
    for (const [size, count] of sizeCounts) {
      if (count > maxCount) {
        maxCount = count;
        bodyFontSize = size;
      }
    }
  }

  // Group text items into lines by Y position (within tolerance)
  const LINE_TOLERANCE = 3;
  const lines: { y: number; items: PDFTextItem[] }[] = [];

  for (const item of allItems) {
    let foundLine = false;
    for (const line of lines) {
      if (Math.abs(line.y - item.y) <= LINE_TOLERANCE) {
        line.items.push(item);
        foundLine = true;
        break;
      }
    }
    if (!foundLine) {
      lines.push({ y: item.y, items: [item] });
    }
  }

  // Sort lines by Y (top to bottom — in PDF, higher Y is lower on page)
  lines.sort((a, b) => b.y - a.y);

  // Sort items within each line by X (left to right)
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  // Convert lines to text
  const lineTexts = lines.map(line => {
    return line.items.map(i => i.text).join(" ");
  });

  // Detect headings by font size (significantly larger than body text)
  const HEADING_THRESHOLD = bodyFontSize * 1.3;
  const lineMeta = lines.map((line, idx) => {
    const maxFontSize = Math.max(...line.items.map(i => i.fontSize));
    const isBold = line.items.some(i =>
      i.fontName.toLowerCase().includes("bold") ||
      i.fontName.toLowerCase().includes("heavy") ||
      i.fontName.toLowerCase().includes("black")
    );
    const isHeading = maxFontSize >= HEADING_THRESHOLD || (isBold && maxFontSize > bodyFontSize);
    return { text: lineTexts[idx], isHeading, isBold, fontSize: maxFontSize };
  });

  // Group consecutive non-heading lines into paragraphs
  const sections: ProposalSection[] = [];
  let currentParagraph: string[] = [];

  for (const meta of lineMeta) {
    if (meta.isHeading) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        const paraText = currentParagraph.join("\n");
        addTextSection(sections, paraText);
        currentParagraph = [];
      }
      sections.push({
        id: generateId(),
        type: "heading",
        content: meta.text,
      });
    } else {
      currentParagraph.push(meta.text);
    }
  }

  // Flush remaining paragraph
  if (currentParagraph.length > 0) {
    const paraText = currentParagraph.join("\n");
    addTextSection(sections, paraText);
  }

  return sections.length > 0 ? sections : [
    { id: generateId(), type: "text", content: allItems.map(i => i.text).join(" ") },
  ];
}

// ─── TXT Parser ───────────────────────────────────────────────────────────────

export function parseTXT(text: string): ProposalSection[] {
  const sections: ProposalSection[] = [];
  const lines = text.split(/\r?\n/);

  let currentParagraph: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      // Blank line — flush paragraph
      if (currentParagraph.length > 0) {
        const paraText = currentParagraph.join("\n");
        addTextSection(sections, paraText);
        currentParagraph = [];
      }
      continue;
    }

    // Detect headings: short lines, possibly ALL CAPS, or starting with #
    const isMarkdownHeading = /^#{1,6}\s/.test(line);
    const isAllCaps = line === line.toUpperCase() && line.length > 2 && /[A-Z]/.test(line);
    const isShortLine = line.length < 60 && !line.endsWith(".") && !line.endsWith(",");

    if (isMarkdownHeading || (isAllCaps && isShortLine)) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        const paraText = currentParagraph.join("\n");
        addTextSection(sections, paraText);
        currentParagraph = [];
      }

      const headingText = isMarkdownHeading ? line.replace(/^#+\s*/, "") : line;
      sections.push({
        id: generateId(),
        type: "heading",
        content: headingText,
      });
    } else if (line.startsWith("---") || line.startsWith("===") || line.startsWith("***")) {
      // Divider
      if (currentParagraph.length > 0) {
        const paraText = currentParagraph.join("\n");
        addTextSection(sections, paraText);
        currentParagraph = [];
      }
      sections.push({
        id: generateId(),
        type: "divider",
        content: "",
      });
    } else {
      currentParagraph.push(line);
    }
  }

  // Flush remaining paragraph
  if (currentParagraph.length > 0) {
    const paraText = currentParagraph.join("\n");
    addTextSection(sections, paraText);
  }

  return sections.length > 0 ? sections : [
    { id: generateId(), type: "text", content: text },
  ];
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function addTextSection(sections: ProposalSection[], text: string): void {
  if (!text.trim()) return;

  if (looksLikeTerms(text)) {
    sections.push({
      id: generateId(),
      type: "terms",
      content: text.trim(),
    });
  } else if (hasNumericContent(text)) {
    // Check if this looks like tabular pricing data
    const lines = text.split("\n");
    const { isTable, rows } = detectTableRows(lines);

    if (isTable && rows.length > 0) {
      const items = rows.map(row => ({
        name: row[0] || "",
        price: parsePrice(row[1] || row[row.length - 1] || "0"),
      }));
      sections.push({
        id: generateId(),
        type: "pricing",
        content: "Pricing",
        metadata: { items },
      });
    } else {
      const placeholders = detectPlaceholders(text);
      sections.push({
        id: generateId(),
        type: "text",
        content: text.trim(),
        metadata: placeholders.length > 0 ? { placeholders } : undefined,
      });
    }
  } else {
    const placeholders = detectPlaceholders(text);
    sections.push({
      id: generateId(),
      type: "text",
      content: text.trim(),
      metadata: placeholders.length > 0 ? { placeholders } : undefined,
    });
  }
}

function parsePrice(text: string): number {
  const match = text.match(/[$€£¥]?\s*([\d,]+(?:\.\d{2})?)/);
  return match ? parseFloat(match[1].replace(/,/g, "")) : 0;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function parseUploadedTemplate(file: File): Promise<ProposalSection[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    const arrayBuffer = await file.arrayBuffer();
    return parseDOCX(arrayBuffer);
  }

  if (name.endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    return parsePDF(arrayBuffer);
  }

  if (name.endsWith(".txt")) {
    const text = await file.text();
    return parseTXT(text);
  }

  throw new Error(`Unsupported file type: ${name.split(".").pop()}. Supported types: .pdf, .docx, .doc, .txt`);
}
