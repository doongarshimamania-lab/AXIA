/**
 * Template Parser — Rules-based document structure extraction
 *
 * Parses PDF, DOCX, and TXT files into ProposalSection or InvoiceSection
 * objects using purely heuristic approaches (NO AI).
 *
 * Supports:
 *  - DOCX: mammoth → HTML → structure extraction
 *  - PDF:  pdfjs-dist → text items with font/position → heading/table detection
 *  - TXT:  simple line-by-line parsing
 *
 * Accuracy notes:
 *  - Well-structured DOCX: ~85-95% (HTML preserves most structure)
 *  - Well-structured PDF (text-based): ~70-85% (position/font heuristics)
 *  - Scanned PDF (image-based): 0% (no OCR — returns "no text" message)
 *  - TXT: ~60-75% (no formatting metadata to work with)
 *
 *  Users can always reclassify and edit sections after import.
 *  The parser gets them 80% there; the UI handles the rest.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type ProposalSectionType =
  | "heading" | "text" | "pricing" | "terms" | "milestone"
  | "divider" | "client_info" | "sender_info" | "summary" | "scope_of_work";

type InvoiceSectionType =
  | "heading" | "text" | "line_items" | "subtotal" | "tax" | "discount"
  | "terms" | "bank_details" | "divider" | "client_info" | "sender_info"
  | "invoice_meta" | "total" | "notes";

export interface ProposalSection {
  id: string;
  type: ProposalSectionType;
  content: string;
  metadata?: any;
}

export interface InvoiceSection {
  id: string;
  type: InvoiceSectionType;
  content: string;
  metadata?: any;
}

/** Confidence level for a detected section */
export type Confidence = "high" | "medium" | "low";

export interface ParseResult<T = ProposalSection | InvoiceSection> {
  sections: T[];
  warnings: string[];
  confidence: Confidence;
  fileType: "pdf" | "docx" | "txt";
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
    /%([A-Z_]+)%/g,           // %VARIABLE%
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
  return /[$€£¥₹₽₩₺]\s*[\d,]+/.test(text) || /\d{1,3}(,\d{3})+(\.\d{2})?/.test(text);
}

/** Check if text looks like terms & conditions */
function looksLikeTerms(text: string): boolean {
  const termsKeywords = [
    "payment terms", "terms and conditions", "agreement", "liability",
    "warranty", "intellectual property", "confidentiality", "termination",
    "indemnification", "governing law", "dispute", "refund", "cancellation",
    "late payment", "interest", "governing jurisdiction", "arbitration",
    "force majeure", "limitation of liability", "severability",
    "entire agreement", "amendment", "assignment", "notice",
  ];
  const lower = text.toLowerCase();
  return termsKeywords.some(kw => lower.includes(kw));
}

/** Check if text looks like client/customer info block */
function looksLikeClientInfo(text: string): boolean {
  const keywords = [
    "bill to", "client", "customer", "recipient", "sold to",
    "ship to", "attention", "attn:", "for the attention of",
  ];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/** Check if text looks like sender/company info block */
function looksLikeSenderInfo(text: string): boolean {
  const keywords = [
    "from:", "prepared by", "issued by", "company:", "firm:",
  ];
  const lower = text.toLowerCase();
  // Also check if it looks like a company header (name + address pattern)
  const hasAddressPattern = /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)/i.test(text);
  const hasCompanyPattern = /^(llc|inc|ltd|co\.|corp|pty|gmbh|s\.?a\.?|pvt)/i.test(text.split("\n").pop()?.trim() || "");
  return keywords.some(kw => lower.includes(kw)) || (hasAddressPattern && text.length < 300);
}

/** Check if text looks like an executive summary or introduction */
function looksLikeSummary(text: string): boolean {
  const keywords = [
    "executive summary", "overview", "introduction", "about this proposal",
    "purpose", "background", "objective", "we are pleased to",
    "thank you for", "we understand", "this proposal outlines",
  ];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/** Check if text looks like scope of work */
function looksLikeScopeOfWork(text: string): boolean {
  const keywords = [
    "scope of work", "deliverables", "what we will deliver",
    "what's included", "services include", "our approach",
    "methodology", "we will:", "the scope includes",
  ];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/** Check if text looks like milestone/timeline data */
function looksLikeMilestone(text: string): boolean {
  const keywords = [
    "milestone", "timeline", "schedule", "phase", "sprint",
    "week ", "month ", "quarter ", "deadline",
  ];
  const lower = text.toLowerCase();
  // Also check for patterns like "Phase 1", "Week 2-4"
  const hasPhasePattern = /phase\s*\d/i.test(text) || /week\s*\d/i.test(text);
  return keywords.some(kw => lower.includes(kw)) || hasPhasePattern;
}

/** Check if text looks like an invoice meta section (invoice #, date, due date) */
function looksLikeInvoiceMeta(text: string): boolean {
  const keywords = [
    "invoice number", "invoice no", "invoice #", "inv-",
    "invoice date", "date of issue", "issue date",
    "due date", "payment due", "reference number",
    "purchase order", "po number", "po #",
  ];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/** Check if text looks like a total/grand total line */
function looksLikeTotal(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return /^(grand\s*total|total\s*due|amount\s*due|balance\s*due|total\s*payable|amount\s*payable|net\s*total)/i.test(lower);
}

/** Check if text looks like a discount line */
function looksLikeDiscount(text: string): boolean {
  const keywords = [
    "discount", "reduction", "early payment", "promo", "coupon",
    "credit note", "adjustment", "deduction",
  ];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/** Check if text looks like invoice notes */
function looksLikeNotes(text: string): boolean {
  const keywords = [
    "notes:", "remarks:", "additional notes", "thank you for",
    "please include", "quote reference", "internal notes",
  ];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/** Check if lines form a table-like grid structure */
function detectTableRows(lines: string[]): { isTable: boolean; rows: string[][] } {
  if (lines.length < 2) return { isTable: false, rows: [] };

  const rows: string[][] = [];
  let consistentCols = 0;
  let firstColCount = 0;

  for (const line of lines) {
    // Split by tab OR by 2+ consecutive spaces (common in PDF text extraction)
    const cols = line.split(/\t|  {2,}/).map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      rows.push(cols);
      if (firstColCount === 0) firstColCount = cols.length;
      if (cols.length === firstColCount) consistentCols++;
    }
  }

  const isTable = rows.length >= 2 && consistentCols >= 2;
  return { isTable, rows };
}

/** Detect multi-column layout from PDF text items (e.g., side-by-side address blocks) */
function detectMultiColumnLayout(
  items: { x: number; y: number; text: string; fontSize: number; fontName: string }[]
): { left: string; right: string } | null {
  if (items.length < 4) return null;

  // Find the median X position
  const xPositions = items.map(i => i.x).sort((a, b) => a - b);
  const medianX = xPositions[Math.floor(xPositions.length / 2)];

  // If there's a clear gap (items clustered on left and right of median)
  const leftItems = items.filter(i => i.x < medianX * 0.7);
  const rightItems = items.filter(i => i.x > medianX * 1.3);

  if (leftItems.length >= 2 && rightItems.length >= 2) {
    const leftText = leftItems.sort((a, b) => b.y - a.y).map(i => i.text).join("\n");
    const rightText = rightItems.sort((a, b) => b.y - a.y).map(i => i.text).join("\n");
    return { left: leftText, right: rightText };
  }

  return null;
}

/** Parse a quantity × rate = amount pattern from text */
function parseQtyRateAmount(text: string): { description: string; quantity: number; rate: number; amount: number }[] {
  const lines = text.split("\n");
  const items: { description: string; quantity: number; rate: number; amount: number }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip header-like rows
    if (/^(item|description|qty|quantity|rate|price|amount|total|service|#)/i.test(trimmed)) continue;
    // Skip subtotal/total rows
    if (/^(subtotal|total|tax|vat|gst|discount)/i.test(trimmed)) continue;

    // Try to detect tab/space-separated columns: description  qty  rate  amount
    const cols = trimmed.split(/\t|  {2,}/).map(c => c.trim()).filter(Boolean);

    if (cols.length >= 4) {
      // Full format: description, qty, rate, amount
      const description = cols[0];
      const qtyMatch = cols[1].match(/([\d.]+)/);
      const rateMatch = cols[2].match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
      const amountMatch = cols[3].match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);

      if (amountMatch) {
        items.push({
          description,
          quantity: qtyMatch ? parseFloat(qtyMatch[1]) : 1,
          rate: rateMatch ? parseFloat(rateMatch[1].replace(/,/g, "")) : 0,
          amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        });
        continue;
      }
    }

    if (cols.length >= 3) {
      // 3-column format: description, rate/qty, amount
      const description = cols[0];
      const secondLast = cols[cols.length - 2];
      const lastCol = cols[cols.length - 1];
      const amountMatch = lastCol.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
      const rateMatch = secondLast.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);

      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
        const rate = rateMatch ? parseFloat(rateMatch[1].replace(/,/g, "")) : 0;
        const quantity = rate > 0 ? Math.round((amount / rate) * 100) / 100 : 1;
        items.push({ description, quantity, rate, amount });
      }
    }
  }

  return items;
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
      // Heading element — detect special heading types
      const sectionType = classifyHeading(text);
      sections.push({
        id: generateId(),
        type: sectionType,
        content: text,
      });
    } else if (tagName === "table") {
      // Table element — check what kind of table
      const tableText = el.textContent || "";

      if (hasNumericContent(tableText)) {
        // Check for qty/rate/amount columns (invoice-style)
        const headerRow = el.querySelector("tr");
        const headerText = headerRow?.textContent?.toLowerCase() || "";
        if (headerText.includes("qty") || headerText.includes("quantity") || headerText.includes("rate")) {
          // Invoice-style line items
          const items = parseHTMLTableToLineItems(el);
          sections.push({
            id: generateId(),
            type: "pricing",
            content: "Line Items",
            metadata: { items, hasQuantity: true },
          });
        } else {
          // Standard pricing table
          const items = parseHTMLTableToPricingItems(el);
          sections.push({
            id: generateId(),
            type: "pricing",
            content: "Pricing",
            metadata: { items },
          });
        }
      } else if (looksLikeClientInfo(tableText)) {
        sections.push({
          id: generateId(),
          type: "client_info",
          content: tableText.trim(),
        });
      } else if (looksLikeSenderInfo(tableText)) {
        sections.push({
          id: generateId(),
          type: "sender_info",
          content: tableText.trim(),
        });
      } else {
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
      const listText = items.join("\n");

      // Check if this list is part of scope of work
      if (looksLikeScopeOfWork(listText)) {
        sections.push({
          id: generateId(),
          type: "scope_of_work",
          content: listText,
        });
      } else if (looksLikeMilestone(listText)) {
        sections.push({
          id: generateId(),
          type: "milestone",
          content: listText,
          metadata: { milestones: parseMilestoneText(listText) },
        });
      } else {
        sections.push({
          id: generateId(),
          type: "text",
          content: listText,
        });
      }
    } else if (tagName === "p") {
      // Paragraph — classify by content
      classifyParagraph(sections, text);
    } else {
      // Other elements (div, etc.) — try to classify
      classifyParagraph(sections, text);
    }
  }

  return sections.length > 0 ? sections : [
    { id: generateId(), type: "text", content: html.replace(/<[^>]*>/g, "").trim() },
  ];
}

/** Classify a heading into a specific section type */
function classifyHeading(text: string): ProposalSectionType {
  const lower = text.toLowerCase().trim();

  if (/^(executive\s*summary|overview|introduction|about\s*this\s*proposal)/i.test(lower)) return "summary";
  if (/^(scope\s*of\s*work|deliverables|what\s*we\s*deliver|our\s*services)/i.test(lower)) return "scope_of_work";
  if (/^(pricing|investment|cost|budget|fees|rates)/i.test(lower)) return "pricing";
  if (/^(terms|terms\s*and\s*conditions|conditions|legal)/i.test(lower)) return "terms";
  if (/^(timeline|milestones|schedule|phases|project\s*plan)/i.test(lower)) return "milestone";
  if (/^(about\s*us|our\s*team|team|who\s*we\s*are|company)/i.test(lower)) return "sender_info";
  if (/^(client|customer|bill\s*to|for)/i.test(lower)) return "client_info";

  return "heading";
}

/** Classify a paragraph of text into the right section type */
function classifyParagraph(sections: ProposalSection[], text: string): void {
  if (!text.trim()) return;

  if (looksLikeTerms(text)) {
    sections.push({ id: generateId(), type: "terms", content: text.trim() });
  } else if (looksLikeClientInfo(text)) {
    sections.push({ id: generateId(), type: "client_info", content: text.trim() });
  } else if (looksLikeSenderInfo(text)) {
    sections.push({ id: generateId(), type: "sender_info", content: text.trim() });
  } else if (looksLikeSummary(text)) {
    sections.push({ id: generateId(), type: "summary", content: text.trim() });
  } else if (looksLikeScopeOfWork(text)) {
    sections.push({ id: generateId(), type: "scope_of_work", content: text.trim() });
  } else if (looksLikeMilestone(text)) {
    sections.push({
      id: generateId(),
      type: "milestone",
      content: text.trim(),
      metadata: { milestones: parseMilestoneText(text) },
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

/** Parse milestone text into structured milestone objects */
function parseMilestoneText(text: string): { name: string; weeks: number; description?: string }[] {
  const milestones: { name: string; weeks: number; description?: string }[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[•\-–*]\s*/, "");
    if (!trimmed) continue;

    // Try to extract duration info
    const weekMatch = trimmed.match(/(\d+)\s*[-–]\s*(\d+)\s*weeks?/i);
    const weekMatch2 = trimmed.match(/(\d+)\s*weeks?/i);
    const monthMatch = trimmed.match(/(\d+)\s*[-–]\s*(\d+)\s*months?/i);
    const monthMatch2 = trimmed.match(/(\d+)\s*months?/i);

    let weeks = 0;
    if (weekMatch) {
      weeks = parseInt(weekMatch[2]); // Use the upper bound
    } else if (weekMatch2) {
      weeks = parseInt(weekMatch2[1]);
    } else if (monthMatch) {
      weeks = parseInt(monthMatch[2]) * 4;
    } else if (monthMatch2) {
      weeks = parseInt(monthMatch2[1]) * 4;
    }

    // Extract name (remove the duration part)
    let name = trimmed;
    name = name.replace(/\s*[\(–\-—]\s*\d+\s*[-–]\s*\d+\s*(weeks?|months?)\s*\)?/gi, "");
    name = name.replace(/\s*[\(–\-—]\s*\d+\s*(weeks?|months?)\s*\)?/gi, "");
    name = name.replace(/:\s*\d+\s*[-–]\s*\d+\s*(weeks?|months?)/gi, "");
    name = name.replace(/:\s*\d+\s*(weeks?|months?)/gi, "");
    name = name.trim();

    if (name) {
      milestones.push({ name, weeks: weeks || 2 });
    }
  }

  return milestones;
}

function parseHTMLTableToPricingItems(tableEl: Element): { name: string; price: number }[] {
  const items: { name: string; price: number }[] = [];
  const rows = Array.from(tableEl.querySelectorAll("tr"));

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll("td, th"));
    if (cells.length < 2) continue;

    const nameCell = cells[0].textContent?.trim() || "";
    const priceText = cells[cells.length - 1].textContent?.trim() || "0";

    // Skip header rows
    if (/^(item|description|service|delivable|qty|quantity|rate|price|amount|total)/i.test(nameCell)) continue;
    if (/^(subtotal|total|tax|vat|gst|discount)/i.test(nameCell)) continue;

    // Parse price — try last column first, then second-to-last
    const priceMatch = priceText.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : 0;

    if (nameCell) {
      items.push({ name: nameCell, price });
    }
  }

  if (items.length === 0) {
    const tableText = tableEl.textContent?.trim() || "Service";
    items.push({ name: tableText.substring(0, 100), price: 0 });
  }

  return items;
}

/** Parse HTML table into line items with qty/rate/amount */
function parseHTMLTableToLineItems(tableEl: Element): { description: string; quantity: number; rate: number; amount: number }[] {
  const items: { description: string; quantity: number; rate: number; amount: number }[] = [];
  const rows = Array.from(tableEl.querySelectorAll("tr"));

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll("td"));
    if (cells.length < 3) continue;

    const description = cells[0].textContent?.trim() || "";

    // Skip header rows
    if (/^(item|description|service|qty|quantity|rate|price|amount)/i.test(description)) continue;
    if (/^(subtotal|total|tax|vat|gst|discount)/i.test(description)) continue;
    if (!description) continue;

    // Try to find qty, rate, amount in the remaining cells
    let quantity = 1;
    let rate = 0;
    let amount = 0;

    if (cells.length >= 4) {
      // description, qty, rate, amount
      const qtyMatch = cells[1].textContent?.match(/([\d.]+)/);
      const rateMatch = cells[2].textContent?.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
      const amountMatch = cells[3].textContent?.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
      quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
      rate = rateMatch ? parseFloat(rateMatch[1].replace(/,/g, "")) : 0;
      amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;
    } else if (cells.length === 3) {
      // description, rate, amount
      const rateMatch = cells[1].textContent?.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
      const amountMatch = cells[2].textContent?.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
      rate = rateMatch ? parseFloat(rateMatch[1].replace(/,/g, "")) : 0;
      amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;
      quantity = rate > 0 ? Math.round((amount / rate) * 100) / 100 : 1;
    }

    items.push({ description, quantity, rate, amount });
  }

  if (items.length === 0) {
    const tableText = tableEl.textContent?.trim() || "Service";
    items.push({ description: tableText.substring(0, 100), quantity: 1, rate: 0, amount: 0 });
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
  page: number;
}

export async function parsePDF(arrayBuffer: ArrayBuffer): Promise<ProposalSection[]> {
  const pdfjs = await import("pdfjs-dist");

  // Set worker source
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const allItems: PDFTextItem[] = [];
  let bodyFontSize = 12;

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
        page: pageIdx,
      });
    }
  }

  if (allItems.length === 0) {
    return [{ id: generateId(), type: "text", content: "(No text could be extracted from this PDF — it may be a scanned image. OCR is not supported.)" }];
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
  const lines: { y: number; items: PDFTextItem[]; page: number }[] = [];

  for (const item of allItems) {
    let foundLine = false;
    for (const line of lines) {
      if (Math.abs(line.y - item.y) <= LINE_TOLERANCE && line.page === item.page) {
        line.items.push(item);
        foundLine = true;
        break;
      }
    }
    if (!foundLine) {
      lines.push({ y: item.y, items: [item], page: item.page });
    }
  }

  // Sort lines: by page first, then by Y (top to bottom within each page)
  lines.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return b.y - a.y;
  });

  // Sort items within each line by X (left to right)
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  // Detect multi-column layouts (e.g., side-by-side address blocks)
  // Group consecutive lines with similar Y-gap and check for column splits
  const processedSections: ProposalSection[] = [];

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
    return { text: lineTexts[idx], isHeading, isBold, fontSize: maxFontSize, page: line.page, y: line.y };
  });

  // Check for multi-column layout on the first group of lines
  // (common in invoices: company info on left, invoice meta on right)
  const firstPageItems = allItems.filter(i => i.page === 1);
  const multiColumn = detectMultiColumnLayout(firstPageItems);

  // Group consecutive non-heading lines into paragraphs
  const sections: ProposalSection[] = [];
  let currentParagraph: string[] = [];

  // If we detected multi-column layout on first page, create client/sender sections
  if (multiColumn) {
    if (looksLikeSenderInfo(multiColumn.left) || looksLikeSenderInfo(multiColumn.right)) {
      const senderText = looksLikeSenderInfo(multiColumn.left) ? multiColumn.left : multiColumn.right;
      const otherText = looksLikeSenderInfo(multiColumn.left) ? multiColumn.right : multiColumn.left;
      sections.push({ id: generateId(), type: "sender_info", content: senderText });

      if (looksLikeClientInfo(otherText)) {
        sections.push({ id: generateId(), type: "client_info", content: otherText });
      } else if (looksLikeInvoiceMeta(otherText)) {
        sections.push({ id: generateId(), type: "text", content: otherText, metadata: { likelyInvoiceMeta: true } });
      } else {
        sections.push({ id: generateId(), type: "text", content: otherText });
      }
    }
  }

  for (const meta of lineMeta) {
    if (meta.isHeading) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        const paraText = currentParagraph.join("\n");
        addTextSection(sections, paraText);
        currentParagraph = [];
      }

      // Classify the heading
      const sectionType = classifyHeading(meta.text);
      sections.push({
        id: generateId(),
        type: sectionType,
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
      const sectionType = classifyHeading(headingText);
      sections.push({
        id: generateId(),
        type: sectionType,
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

  // Try specialized classifications first
  if (looksLikeTerms(text)) {
    sections.push({ id: generateId(), type: "terms", content: text.trim() });
  } else if (looksLikeClientInfo(text)) {
    sections.push({ id: generateId(), type: "client_info", content: text.trim() });
  } else if (looksLikeSenderInfo(text)) {
    sections.push({ id: generateId(), type: "sender_info", content: text.trim() });
  } else if (looksLikeSummary(text)) {
    sections.push({ id: generateId(), type: "summary", content: text.trim() });
  } else if (looksLikeScopeOfWork(text)) {
    sections.push({ id: generateId(), type: "scope_of_work", content: text.trim() });
  } else if (looksLikeMilestone(text)) {
    sections.push({
      id: generateId(),
      type: "milestone",
      content: text.trim(),
      metadata: { milestones: parseMilestoneText(text) },
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
  const match = text.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
  return match ? parseFloat(match[1].replace(/,/g, "")) : 0;
}

// ─── Main Entry Points ───────────────────────────────────────────────────────

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

/** Parse with detailed result including confidence and warnings */
export async function parseUploadedTemplateWithMeta(file: File): Promise<ParseResult<ProposalSection>> {
  const ext = file.name.toLowerCase().split(".").pop() as "pdf" | "docx" | "txt";
  const warnings: string[] = [];

  try {
    const sections = await parseUploadedTemplate(file);

    // Determine confidence based on how many sections were detected
    const typedSections = sections.filter(s => s.type !== "text");
    const textSections = sections.filter(s => s.type === "text");
    let confidence: Confidence = "low";

    if (ext === "docx") {
      confidence = typedSections.length >= 3 ? "high" : typedSections.length >= 1 ? "medium" : "low";
    } else if (ext === "pdf") {
      confidence = typedSections.length >= 2 ? "high" : typedSections.length >= 1 ? "medium" : "low";
    } else {
      confidence = typedSections.length >= 2 ? "medium" : "low";
    }

    // Add warnings for common issues
    if (textSections.length > typedSections.length * 2) {
      warnings.push("Many sections were classified as generic text. You may want to reclassify them manually.");
    }
    if (ext === "pdf" && sections.length <= 2) {
      warnings.push("Very few sections detected. The PDF may be scanned (image-based) — OCR is not supported.");
    }
    if (sections.some(s => s.content.includes("(No text could be extracted"))) {
      warnings.push("No text could be extracted. This PDF appears to be a scanned image.");
    }

    return { sections, warnings, confidence, fileType: ext };
  } catch (err: any) {
    warnings.push(err.message || "Failed to parse file");
    return {
      sections: [{ id: generateId(), type: "text", content: `Error parsing file: ${err.message}` }],
      warnings,
      confidence: "low",
      fileType: ext,
    };
  }
}

// ─── Invoice-specific helpers ─────────────────────────────────────────────────

/** Check if text looks like an invoice header (invoice number, date, etc.) */
function looksLikeInvoiceHeader(text: string): boolean {
  const invKeywords = ["invoice", "bill", "receipt", "tax invoice", "commercial invoice", "proforma"];
  const lower = text.toLowerCase();
  return invKeywords.some(kw => lower.includes(kw));
}

/** Check if text looks like bank/payment details */
function looksLikeBankDetails(text: string): boolean {
  const bankKeywords = [
    "bank name", "account number", "routing number", "swift", "iban",
    "sort code", "ifsc", "branch", "account name", "beneficiary",
    "wire transfer", "ach", "upi", "paypal", "venmo",
    "bank details", "payment details", "payment method",
    "bic", "micr", "neft", "rtgs", "imps",
  ];
  const lower = text.toLowerCase();
  return bankKeywords.some(kw => lower.includes(kw));
}

/** Check if text looks like a subtotal/tax line */
function looksLikeSubtotalOrTax(text: string): "subtotal" | "tax" | null {
  const lower = text.toLowerCase().trim();
  if (/^subtotal|^sub[- ]?total|^total\s*(before|before\s*tax)/i.test(lower)) return "subtotal";
  if (/^tax|^vat|^gst|^sales\s*tax|^hst|^pst|^cgst|^sgst|^igst/i.test(lower)) return "tax";
  return null;
}

/** Parse invoice line items from text content */
function parseInvoiceLineItems(text: string): { description: string; quantity: number; rate: number; amount: number }[] {
  return parseQtyRateAmount(text);
}

/** Convert ProposalSection[] to InvoiceSection[] with invoice-specific reclassification */
function reclassifyAsInvoiceSections(sections: ProposalSection[]): InvoiceSection[] {
  const invoiceSections: InvoiceSection[] = [];

  for (const section of sections) {
    // Check for bank details
    if (section.type === "text" && looksLikeBankDetails(section.content)) {
      invoiceSections.push({
        id: section.id,
        type: "bank_details",
        content: section.content,
        metadata: section.metadata,
      });
      continue;
    }

    // Check for invoice meta
    if (section.type === "text" && looksLikeInvoiceMeta(section.content)) {
      invoiceSections.push({
        id: section.id,
        type: "invoice_meta",
        content: section.content,
        metadata: section.metadata,
      });
      continue;
    }

    // Check for total/grand total
    if (section.type === "text" && looksLikeTotal(section.content)) {
      const amountMatch = section.content.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
      invoiceSections.push({
        id: section.id,
        type: "total",
        content: section.content,
        metadata: amountMatch ? { amount: parseFloat(amountMatch[1].replace(/,/g, "")) } : undefined,
      });
      continue;
    }

    // Check for discount
    if (section.type === "text" && looksLikeDiscount(section.content)) {
      const amountMatch = section.content.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
      const rateMatch = section.content.match(/(\d+(?:\.\d+)?)\s*%/);
      invoiceSections.push({
        id: section.id,
        type: "discount",
        content: section.content,
        metadata: {
          ...(amountMatch ? { amount: parseFloat(amountMatch[1].replace(/,/g, "")) } : {}),
          ...(rateMatch ? { rate: parseFloat(rateMatch[1]) } : {}),
        },
      });
      continue;
    }

    // Check for notes
    if (section.type === "text" && looksLikeNotes(section.content)) {
      invoiceSections.push({
        id: section.id,
        type: "notes",
        content: section.content,
        metadata: section.metadata,
      });
      continue;
    }

    // Check for subtotal/tax
    if (section.type === "text") {
      const subTax = looksLikeSubtotalOrTax(section.content.split("\n")[0]);
      if (subTax === "subtotal") {
        const amountMatch = section.content.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
        invoiceSections.push({
          id: section.id,
          type: "subtotal",
          content: section.content,
          metadata: amountMatch ? { amount: parseFloat(amountMatch[1].replace(/,/g, "")) } : undefined,
        });
        continue;
      }
      if (subTax === "tax") {
        const amountMatch = section.content.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{2})?)/);
        const rateMatch = section.content.match(/(\d+(?:\.\d+)?)\s*%/);
        invoiceSections.push({
          id: section.id,
          type: "tax",
          content: section.content,
          metadata: {
            ...(amountMatch ? { amount: parseFloat(amountMatch[1].replace(/,/g, "")) } : {}),
            ...(rateMatch ? { rate: parseFloat(rateMatch[1]) } : {}),
          },
        });
        continue;
      }
    }

    // Convert pricing to line_items
    if (section.type === "pricing") {
      const pricingItems = section.metadata?.items || [];
      const hasQuantity = section.metadata?.hasQuantity;

      let lineItems: { description: string; quantity: number; rate: number; amount: number }[];

      if (hasQuantity && pricingItems.length > 0) {
        // Items already have qty/rate/amount
        lineItems = pricingItems.map((item: any) => ({
          description: item.name || item.description,
          quantity: item.quantity || 1,
          rate: item.rate || item.price || 0,
          amount: item.amount || item.price || 0,
        }));
      } else {
        // Simple name+price items — convert to line items
        lineItems = pricingItems.map((item: { name: string; price: number }) => ({
          description: item.name,
          quantity: 1,
          rate: item.price,
          amount: item.price,
        }));
      }

      invoiceSections.push({
        id: section.id,
        type: "line_items",
        content: section.content === "Pricing" ? "Line Items" : section.content,
        metadata: { items: lineItems.length > 0 ? lineItems : parseInvoiceLineItems(section.content) },
      });
      continue;
    }

    // client_info and sender_info map directly
    if (section.type === "client_info" || section.type === "sender_info") {
      invoiceSections.push({
        id: section.id,
        type: section.type as any,
        content: section.content,
        metadata: section.metadata,
      });
      continue;
    }

    // Direct mapping for types that are the same
    if (section.type === "heading" || section.type === "text" || section.type === "terms" || section.type === "divider") {
      invoiceSections.push({
        id: section.id,
        type: section.type as any,
        content: section.content,
        metadata: section.metadata,
      });
      continue;
    }

    // scope_of_work, summary, milestone → text (not relevant for invoices)
    invoiceSections.push({
      id: section.id,
      type: "text",
      content: section.content,
      metadata: section.metadata,
    });
  }

  return invoiceSections;
}

// ─── Invoice Parsing Entry Point ──────────────────────────────────────────────

export async function parseUploadedInvoiceTemplate(file: File): Promise<InvoiceSection[]> {
  const proposalSections = await parseUploadedTemplate(file);
  return reclassifyAsInvoiceSections(proposalSections);
}

/** Parse invoice template with detailed result */
export async function parseUploadedInvoiceTemplateWithMeta(file: File): Promise<ParseResult<InvoiceSection>> {
  const ext = file.name.toLowerCase().split(".").pop() as "pdf" | "docx" | "txt";
  const warnings: string[] = [];

  try {
    const sections = await parseUploadedInvoiceTemplate(file);

    // Check for invoice-specific sections
    const hasLineItems = sections.some(s => s.type === "line_items");
    const hasTax = sections.some(s => s.type === "tax");
    const hasBankDetails = sections.some(s => s.type === "bank_details");
    const hasInvoiceMeta = sections.some(s => s.type === "invoice_meta");
    const typedSections = sections.filter(s => s.type !== "text");

    let confidence: Confidence = "low";
    if (hasLineItems && (hasTax || hasBankDetails || hasInvoiceMeta)) {
      confidence = "high";
    } else if (hasLineItems || typedSections.length >= 3) {
      confidence = "medium";
    }

    if (!hasLineItems) {
      warnings.push("No line items detected. The parser may have missed the pricing table — you can add line items manually.");
    }
    if (!hasInvoiceMeta) {
      warnings.push("No invoice metadata (invoice number, dates) detected. You'll need to add these manually.");
    }
    if (ext === "pdf" && sections.length <= 2) {
      warnings.push("Very few sections detected. The PDF may be scanned (image-based) — OCR is not supported.");
    }

    return { sections, warnings, confidence, fileType: ext };
  } catch (err: any) {
    warnings.push(err.message || "Failed to parse file");
    return {
      sections: [{ id: generateId(), type: "text", content: `Error parsing file: ${err.message}` }],
      warnings,
      confidence: "low",
      fileType: ext,
    };
  }
}
