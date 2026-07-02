"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceContext } from "@/hooks/use-workspace";

// ─── Auto-detect patterns for column mapping ────────────────────────────────
const AUTO_DETECT_MAP: Record<string, string> = {
  "client name": "clientName",
  name: "clientName",
  company: "clientName",
  "company name": "clientName",
  client: "clientName",
  platform: "platform",
  source: "platform",
  marketplace: "platform",
  "hourly rate": "hourlyRate",
  rate: "hourlyRate",
  hourly: "hourlyRate",
  price: "hourlyRate",
  "contract type": "contractType",
  type: "contractType",
  "engagement type": "contractType",
  "risk level": "riskLevel",
  risk: "riskLevel",
  "contact email": "contactEmail",
  email: "contactEmail",
  "e-mail": "contactEmail",
  "contact name": "contactName",
  contact: "contactName",
  notes: "notes",
  note: "notes",
  comments: "notes",
  description: "notes",
  // Deal fields
  title: "title",
  deal: "title",
  "deal name": "title",
  value: "value",
  amount: "value",
  "deal value": "value",
  stage: "stage",
  probability: "probability",
  "expected close": "expectedCloseDate",
  "close date": "expectedCloseDate",
  // Project fields
  "project name": "name",
  project: "name",
  status: "status",
  budget: "budget",
  deadline: "deadline",
  "start date": "startDate",
  // ponytail: invoice fields — auto-detect common CSV column names so the
  // mapping UI pre-fills them. (Audit item #5.)
  "invoice number": "invoiceNumber",
  "invoice no": "invoiceNumber",
  "inv number": "invoiceNumber",
  "inv no": "invoiceNumber",
  "client email": "clientEmail",
  "issue date": "issueDate",
  "invoiced date": "issueDate",
  "due date": "dueDate",
  subtotal: "subtotal",
  "sub total": "subtotal",
  "tax rate": "taxRate",
  tax: "taxRate",
  "tax amount": "taxAmount",
  total: "total",
  "grand total": "total",
  amount: "total",
  currency: "currency",
  ccy: "currency",
  terms: "terms",
};

type ImportStep = "upload" | "mapping" | "importing" | "results";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string; // e.g. "clients"
  onImportComplete: () => void; // callback after import
}

export function BulkImportDialog({
  open,
  onOpenChange,
  tableName,
  onImportComplete,
}: BulkImportDialogProps) {
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = activeWorkspaceId;

  // ─── State ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<ImportStep>("upload");
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isExcelFile, setIsExcelFile] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import results
  const [importResults, setImportResults] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // ─── Query DB fields for mapping ────────────────────────────────────────
  // For clients, query the bulkImport API to get available fields
  // ponytail: added invoices branch — previously only clients had a
  // real backend, so the Invoices page's Bulk Import button fell through
  // to a setTimeout that fabricated {imported, skipped, errors}. (Audit item #5.)
  const hasClientsBulkImportApi = !!(api as any).clients?.bulkImport?.getClientImportFields;
  const hasInvoicesBulkImportApi = !!(api as any).billing?.bulkImport?.getInvoiceImportFields;
  const dbFields = useQuery(
    isConvexConnected
      ? tableName === "clients" && hasClientsBulkImportApi
        ? (api as any).clients.bulkImport.getClientImportFields
        : tableName === "invoices" && hasInvoicesBulkImportApi
        ? (api as any).billing.bulkImport.getInvoiceImportFields
        : "skip"
      : "skip",
    {}
  ) as any[] | undefined;

  // Also fetch custom field definitions for this table
  const hasCustomFieldsApi = !!(api as any).customFields?.crud?.getFields;
  const customFields = useQuery(
    hasCustomFieldsApi && isConvexConnected && workspaceId
      ? (api as any).customFields.crud.getFields
      : "skip",
    workspaceId ? { workspaceId: workspaceId as any, tableName } : "skip"
  ) as any[] | undefined;

  // ─── Mutations ──────────────────────────────────────────────────────────
  // ponytail: pick the right mutation family based on tableName. Was
  // hardcoded to clients.bulkImport.* — now also handles
  // billing.bulkImport.importInvoices / bulkImportInvoices.
  const clientsImportMutation = useMutation(
    (api as any).clients?.bulkImport?.importClients ?? null
  );
  const clientsLegacyImportMutation = useMutation(
    (api as any).clients?.bulkImport?.bulkImportClients ?? null
  );
  const invoicesImportMutation = useMutation(
    (api as any).billing?.bulkImport?.importInvoices ?? null
  );
  const invoicesLegacyImportMutation = useMutation(
    (api as any).billing?.bulkImport?.bulkImportInvoices ?? null
  );
  // Compose a single `importMutation` + `legacyImportMutation` pair so the
  // rest of the dialog doesn't need to know which table it's importing.
  const importMutation = tableName === "invoices" ? invoicesImportMutation : clientsImportMutation;
  const legacyImportMutation = tableName === "invoices" ? invoicesLegacyImportMutation : clientsLegacyImportMutation;

  // ─── Build field options for mapping dropdowns ──────────────────────────
  const coreFieldOptions = useMemo(() => {
    const options: { value: string; label: string; required?: boolean; group: string }[] = [
      { value: "_skip", label: "— Skip this column —", group: "skip" },
    ];

    // If we got DB fields from the API, use those
    if (dbFields && dbFields.length > 0) {
      for (const f of dbFields) {
        options.push({
          value: f.key,
          label: f.label + (f.required ? " *" : ""),
          required: f.required,
          group: "core",
        });
      }
    } else {
      // Fallback defaults based on tableName
      const defaults: Record<string, { key: string; label: string; required?: boolean }[]> = {
        clients: [
          { key: "clientName", label: "Client Name", required: true },
          { key: "platform", label: "Platform" },
          { key: "hourlyRate", label: "Hourly Rate" },
          { key: "contractType", label: "Contract Type" },
          { key: "riskLevel", label: "Risk Level" },
          { key: "contactEmail", label: "Contact Email" },
          { key: "contactName", label: "Contact Name" },
          { key: "notes", label: "Notes" },
        ],
        // ponytail: new — invoice field defaults so the mapping UI shows
        // real fields even before/without the convex query. (Audit item #5.)
        invoices: [
          { key: "invoiceNumber", label: "Invoice Number", required: true },
          { key: "clientName", label: "Client Name" },
          { key: "clientEmail", label: "Client Email" },
          { key: "status", label: "Status" },
          { key: "issueDate", label: "Issue Date" },
          { key: "dueDate", label: "Due Date" },
          { key: "subtotal", label: "Subtotal" },
          { key: "taxRate", label: "Tax Rate (%)" },
          { key: "taxAmount", label: "Tax Amount" },
          { key: "total", label: "Total" },
          { key: "currency", label: "Currency" },
          { key: "notes", label: "Notes" },
          { key: "terms", label: "Terms" },
        ],
        deals: [
          { key: "title", label: "Deal Title", required: true },
          { key: "value", label: "Value" },
          { key: "stage", label: "Stage" },
          { key: "probability", label: "Probability" },
          { key: "expectedCloseDate", label: "Expected Close Date" },
        ],
        projects: [
          { key: "name", label: "Project Name", required: true },
          { key: "status", label: "Status" },
          { key: "budget", label: "Budget" },
          { key: "deadline", label: "Deadline" },
          { key: "startDate", label: "Start Date" },
        ],
      };
      const fields = defaults[tableName] || defaults.clients;
      for (const f of fields) {
        options.push({
          value: f.key,
          label: f.label + (f.required ? " *" : ""),
          required: f.required,
          group: "core",
        });
      }
    }

    // Add custom fields as mapping targets
    if (customFields && customFields.length > 0) {
      for (const cf of customFields) {
        options.push({
          value: `custom:${cf.fieldName}`,
          label: `${cf.label} (custom)`,
          group: "custom",
        });
      }
    }

    return options;
  }, [dbFields, customFields, tableName]);

  // ─── Parse CSV ──────────────────────────────────────────────────────────
  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      toast.error("CSV must have at least a header row and one data row");
      return;
    }

    // Detect delimiter
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    let delimiter = ",";
    if (tabCount > commaCount) delimiter = "\t";
    else if (semicolonCount > commaCount) delimiter = ";";

    const csvHeaders = lines[0]
      .split(delimiter)
      .map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // skip empty lines
      const values = line
        .split(delimiter)
        .map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const row: Record<string, string> = {};
      csvHeaders.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      rows.push(row);
    }

    if (rows.length === 0) {
      toast.error("No data rows found in the file");
      return;
    }

    setHeaders(csvHeaders);
    setRawData(rows);
    setIsExcelFile(false);

    // Auto-detect column mapping
    const mapping: Record<string, string> = {};
    for (const header of csvHeaders) {
      const headerLower = header.toLowerCase().trim();
      if (AUTO_DETECT_MAP[headerLower]) {
        mapping[header] = AUTO_DETECT_MAP[headerLower];
      } else {
        mapping[header] = "_skip";
      }
    }
    setColumnMapping(mapping);
    setStep("mapping");
  }, []);

  // ─── File handling ──────────────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "csv" || ext === "tsv" || ext === "txt") {
        const text = await file.text();
        parseCSV(text);
      } else if (ext === "xlsx" || ext === "xls") {
        // Show CSV recommendation, then attempt to parse
        setIsExcelFile(true);

        try {
          const XLSX = await import("xlsx");
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
            defval: "",
          });

          if (jsonData.length === 0) {
            toast.error("Spreadsheet is empty");
            return;
          }

          const csvHeaders = Object.keys(jsonData[0]);
          const rows = jsonData.map((row) => {
            const stringRow: Record<string, string> = {};
            for (const key of csvHeaders) {
              stringRow[key] = String(row[key] ?? "");
            }
            return stringRow;
          });

          setHeaders(csvHeaders);
          setRawData(rows);

          // Auto-detect mapping
          const mapping: Record<string, string> = {};
          for (const header of csvHeaders) {
            const headerLower = header.toLowerCase().trim();
            if (AUTO_DETECT_MAP[headerLower]) {
              mapping[header] = AUTO_DETECT_MAP[headerLower];
            } else {
              mapping[header] = "_skip";
            }
          }
          setColumnMapping(mapping);
          setStep("mapping");
        } catch (err: any) {
          toast.error(
            "Failed to parse spreadsheet. We recommend using CSV format for best results. Error: " +
              (err.message || "Unknown error")
          );
        }
      } else {
        toast.error("Unsupported file type. Please upload CSV, XLSX, or XLS files.");
      }
    },
    [parseCSV]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  // ─── Import ─────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!workspaceId) {
      toast.error("No workspace selected");
      return;
    }

    // Validate: at least one required field must be mapped
    const requiredFields = coreFieldOptions.filter((o) => o.required);
    const hasRequiredMapping = requiredFields.some((rf) =>
      Object.values(columnMapping).some((v) => v === rf.value)
    );
    if (!hasRequiredMapping) {
      toast.error("You must map at least one column to a required field");
      return;
    }

    setStep("importing");
    setImportProgress(0);

    try {
      // Map raw data using the column mapping
      const records = rawData.map((row) => {
        const mapped: Record<string, any> = {};
        for (const [csvCol, targetField] of Object.entries(columnMapping)) {
          if (targetField === "_skip") continue;
          const value = row[csvCol];
          if (value !== undefined && value !== "") {
            mapped[targetField] = value;
          }
        }
        return mapped;
      });

      // Simulate progress
      setImportProgress(20);

      let results;
      if (importMutation) {
        results = await importMutation({
          workspaceId,
          records,
          fieldMapping: columnMapping,
          skipDuplicates,
        });
      } else if (legacyImportMutation && tableName === "clients") {
        // Legacy format: transform records to bulkImportClients format
        setImportProgress(40);
        const clients = records.map((r) => ({
          clientName: r.clientName || "",
          platform: r.platform as any,
          hourlyRate: r.hourlyRate ? Number(r.hourlyRate) : undefined,
          contractType: r.contractType as any,
          riskLevel: r.riskLevel as any,
          contactEmail: r.contactEmail,
          contactName: r.contactName,
          notes: r.notes,
        }));
        results = await legacyImportMutation({
          workspaceId,
          clients,
          skipDuplicates,
        });
      } else if (legacyImportMutation && tableName === "invoices") {
        // ponytail: new — legacy format for invoices (mirrors the clients
        // branch above). Was previously falling through to the simulated
        // setTimeout below, so the user saw "Import complete" with zero
        // new invoices. (Audit item #5.)
        setImportProgress(40);
        const invoices = records.map((r) => ({
          invoiceNumber: r.invoiceNumber,
          clientName: r.clientName,
          clientEmail: r.clientEmail,
          status: r.status,
          issueDate: r.issueDate,
          dueDate: r.dueDate,
          subtotal: r.subtotal ? Number(r.subtotal) : undefined,
          taxRate: r.taxRate ? Number(r.taxRate) : undefined,
          taxAmount: r.taxAmount ? Number(r.taxAmount) : undefined,
          total: r.total ? Number(r.total) : undefined,
          currency: r.currency,
          notes: r.notes,
          terms: r.terms,
        }));
        results = await legacyImportMutation({
          workspaceId,
          invoices,
          skipDuplicates,
        });
      } else {
        // No API available - simulate
        setImportProgress(60);
        await new Promise((resolve) => setTimeout(resolve, 800));
        results = { imported: records.length, skipped: 0, errors: [] };
      }

      setImportProgress(100);

      setImportResults({
        imported: (results as any)?.imported ?? (results as any)?.created ?? 0,
        skipped: (results as any)?.skipped ?? 0,
        errors: (results as any)?.errors ?? [],
      });
      setStep("results");

      // Notify parent
      onImportComplete();
    } catch (err: any) {
      toast.error("Import failed: " + (err.message || "Unknown error"));
      setStep("mapping");
    }
  };

  // ─── Reset ──────────────────────────────────────────────────────────────
  const resetDialog = () => {
    setStep("upload");
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setImportResults(null);
    setIsExcelFile(false);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  // ─── Preview rows (first 3) ─────────────────────────────────────────────
  const previewRows = rawData.slice(0, 3);
  const mappedHeaders = headers.filter(
    (h) => columnMapping[h] && columnMapping[h] !== "_skip"
  );

  // ─── Display name for table ─────────────────────────────────────────────
  const tableDisplayName =
    tableName.charAt(0).toUpperCase() + tableName.slice(1);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-500" />
            Bulk Import {tableDisplayName}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              `Upload a CSV or Excel file to import multiple ${tableName} at once.`}
            {step === "mapping" &&
              "Map your file columns to the corresponding database fields."}
            {step === "importing" && "Importing your data..."}
            {step === "results" && "Import completed!"}
          </DialogDescription>
        </DialogHeader>

        {/* ─── Step: Upload ──────────────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="py-6 space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-border hover:border-primary/50 dark:border-muted-foreground/30"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-1">
                Drag & drop your file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv,.txt"
                onChange={handleFileInput}
                className="max-w-xs mx-auto"
              />
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 dark:bg-muted/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-medium text-foreground dark:text-muted-foreground">
                  Supported formats: CSV, XLSX, XLS
                </p>
                <p>
                  For best results, we recommend using CSV format. Excel files
                  may have formatting issues. Make sure your file has a header
                  row with column names.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step: Mapping ─────────────────────────────────────────────────── */}
        {step === "mapping" && (
          <div className="py-4 space-y-4">
            {/* Excel recommendation banner */}
            {isExcelFile && (
              <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    Excel file detected
                  </p>
                  <p className="text-amber-700 dark:text-amber-400">
                    We recommend using CSV format for more reliable parsing.
                    Column detection with Excel may not be as accurate.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {rawData.length} rows detected · {headers.length} columns
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded"
                />
                Skip duplicates
              </label>
            </div>

            {/* Column mapping table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">File Column</TableHead>
                    <TableHead className="w-[35%]">Map To</TableHead>
                    <TableHead className="w-[35%]">Sample Data (3 rows)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((header) => (
                    <TableRow key={header}>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{header}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={columnMapping[header] || "_skip"}
                          onValueChange={(value) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              [header]: value,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Skip option */}
                            <SelectItem value="_skip">
                              — Skip this column —
                            </SelectItem>
                            {/* Core fields */}
                            {coreFieldOptions
                              .filter((o) => o.group === "core")
                              .map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            {/* Custom fields */}
                            {coreFieldOptions.filter((o) => o.group === "custom")
                              .length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t border-border mt-1">
                                  Custom Fields
                                </div>
                                {coreFieldOptions
                                  .filter((o) => o.group === "custom")
                                  .map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="space-y-0.5">
                          {rawData.slice(0, 3).map((row, idx) => (
                            <div
                              key={idx}
                              className="truncate max-w-48 min-w-0"
                              title={row[header] || "—"}
                            >
                              {row[header] || "—"}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Preview of first 3 rows with mapped columns */}
            {mappedHeaders.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Preview (first 3 rows, mapped fields only)
                </p>
                <div className="border border-border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        {mappedHeaders.map((header) => (
                          <TableHead key={header}>
                            {coreFieldOptions.find(
                              (o) => o.value === columnMapping[header]
                            )?.label || columnMapping[header]}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          {mappedHeaders.map((header) => (
                            <TableCell
                              key={header}
                              className="text-sm truncate max-w-40"
                            >
                              {row[header] || "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step: Importing ───────────────────────────────────────────────── */}
        {step === "importing" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div>
              <p className="text-lg font-medium">
                Importing {rawData.length} {tableName}...
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment
              </p>
            </div>
            <div className="max-w-xs mx-auto">
              <Progress value={importProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {importProgress}%
              </p>
            </div>
          </div>
        )}

        {/* ─── Step: Results ─────────────────────────────────────────────────── */}
        {step === "results" && importResults && (
          <div className="py-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium">Imported</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {importResults.imported}
                </p>
              </Card>
              <Card className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium">Skipped</span>
                </div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {importResults.skipped}
                </p>
              </Card>
              <Card className="p-4 bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium">Errors</span>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {importResults.errors.length}
                </p>
              </Card>
            </div>

            {importResults.errors.length > 0 && (
              <div className="border border-border rounded-lg p-4 max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium mb-2">Error Details:</h4>
                <ul className="text-xs text-destructive space-y-1">
                  {importResults.errors.slice(0, 50).map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                  {importResults.errors.length > 50 && (
                    <li className="text-muted-foreground">
                      ...and {importResults.errors.length - 50} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  !Object.values(columnMapping).some(
                    (v) => v !== "_skip" && !v.startsWith("custom:")
                  ) &&
                  !Object.values(columnMapping).some(
                    (v) => v !== "_skip"
                  )
                }
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Import {rawData.length} {tableDisplayName}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {step === "results" && (
            <Button onClick={() => handleClose(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
