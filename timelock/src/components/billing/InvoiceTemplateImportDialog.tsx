"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  File,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Heading,
  Type,
  DollarSign,
  FileCheck,
  Minus,
  Trash2,
  Save,
  Receipt,
  Landmark,
  Percent,
} from "lucide-react";
import {
  parseUploadedInvoiceTemplate,
  type InvoiceSection,
} from "@/lib/template-parser";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceSectionType = "heading" | "text" | "line_items" | "subtotal" | "tax" | "terms" | "bank_details" | "divider";

interface InvoiceTemplateImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (sections: InvoiceSection[]) => void;
}

// ─── Section Type Config ──────────────────────────────────────────────────────

const sectionTypeConfig: Record<
  InvoiceSectionType,
  { label: string; icon: React.ElementType; color: string }
> = {
  heading: { label: "Heading", icon: Heading, color: "#8B5CF6" },
  text: { label: "Text", icon: Type, color: "#6366f1" },
  line_items: { label: "Line Items", icon: Receipt, color: "#22c55e" },
  subtotal: { label: "Subtotal", icon: DollarSign, color: "#f59e0b" },
  tax: { label: "Tax", icon: Percent, color: "#ef4444" },
  terms: { label: "Terms", icon: FileCheck, color: "#f59e0b" },
  bank_details: { label: "Bank Details", icon: Landmark, color: "#3b82f6" },
  divider: { label: "Divider", icon: Minus, color: "#6b7280" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoiceTemplateImportDialog({
  open,
  onOpenChange,
  onApply,
}: InvoiceTemplateImportDialogProps) {
  const [parsedSections, setParsedSections] = useState<InvoiceSection[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [step, setStep] = useState<"upload" | "preview" | "save">("upload");
  const [templateName, setTemplateName] = useState("");
  const [templateIndustry, setTemplateIndustry] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex mutation for saving invoice template
  const saveUploadedInvoiceTemplate = useMutation(api.billing.crud.saveUploadedInvoiceTemplate);

  const resetState = useCallback(() => {
    setParsedSections([]);
    setIsParsing(false);
    setIsDragOver(false);
    setFileName("");
    setStep("upload");
    setTemplateName("");
    setTemplateIndustry("");
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const validExtensions = [".pdf", ".docx", ".doc", ".txt"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast.error(`Unsupported file type: ${ext}. Please upload PDF, DOCX, or TXT files.`);
      return;
    }

    setFileName(file.name);
    setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
    setIsParsing(true);
    setStep("preview");

    try {
      const sections = await parseUploadedInvoiceTemplate(file);
      setParsedSections(sections);
      if (sections.length === 0) {
        toast.warning("No content could be extracted from this file.");
      } else {
        toast.success(`Extracted ${sections.length} sections from ${file.name}`);
      }
    } catch (err: any) {
      console.error("Failed to parse file:", err);
      toast.error(`Failed to parse file: ${err?.message || "Unknown error"}`);
      setStep("upload");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const updateSectionType = useCallback((id: string, newType: InvoiceSectionType) => {
    setParsedSections(prev =>
      prev.map(s => (s.id === id ? { ...s, type: newType } : s))
    );
  }, []);

  const removeSection = useCallback((id: string) => {
    setParsedSections(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleApply = useCallback(() => {
    if (parsedSections.length === 0) {
      toast.error("No sections to apply");
      return;
    }
    onApply(parsedSections);
    resetState();
    onOpenChange(false);
  }, [parsedSections, onApply, resetState, onOpenChange]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (parsedSections.length === 0) {
      toast.error("No sections to save");
      return;
    }
    try {
      await saveUploadedInvoiceTemplate({
        name: templateName.trim(),
        sections: parsedSections.map(({ id, type, content, metadata }) => ({
          id,
          type,
          content,
          metadata: metadata || undefined,
        })),
        industry: templateIndustry || undefined,
        description: `Imported from ${fileName}`,
      });
      toast.success(`Invoice template "${templateName}" saved!`);
      resetState();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Failed to save template: ${err?.message || "Unknown error"}`);
    }
  }, [templateName, parsedSections, templateIndustry, fileName, saveUploadedInvoiceTemplate, resetState, onOpenChange]);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#8B5CF6]" />
            Import Invoice Template
          </DialogTitle>
          <DialogDescription>
            Upload a PDF, DOCX, or TXT file to extract its structure as an editable invoice template.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-4"
            >
              {/* Drag & Drop Area */}
              <div
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-200
                  ${
                    isDragOver
                      ? "border-[#8B5CF6] bg-[#8B5CF6]/5"
                      : "border-border hover:border-[#8B5CF6]/50 hover:bg-muted/30"
                  }
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-[14px] font-medium mb-1">
                  Drag & drop your invoice file here
                </p>
                <p className="text-[12px] text-muted-foreground mb-3">
                  or click to browse
                </p>
                <div className="flex items-center justify-center gap-2">
                  {[".pdf", ".docx", ".doc", ".txt"].map(ext => (
                    <Badge key={ext} variant="secondary" className="text-[10px] h-5">
                      {ext}
                    </Badge>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </div>

              {/* Info about what gets detected */}
              <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                <p className="text-[11px] text-muted-foreground font-medium mb-2">
                  Automatically detects:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(sectionTypeConfig).map(([type, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <div key={type} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Icon className="h-3 w-3" style={{ color: cfg.color }} />
                        <span>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {(step === "preview" || step === "save") && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* File info */}
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <Receipt className="h-4 w-4 text-[#8B5CF6]" />
                <span className="text-[13px] font-medium">{fileName}</span>
                <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
                  {parsedSections.length} sections
                </Badge>
              </div>

              {isParsing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-[#8B5CF6] animate-spin mb-3" />
                  <p className="text-[14px] text-muted-foreground">Parsing invoice structure...</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Detecting line items, tax, bank details, and terms
                  </p>
                </div>
              ) : (
                <>
                  {/* Section Preview */}
                  <div className="space-y-2">
                    <Label className="text-[13px] font-medium">
                      Extracted Sections
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Review and adjust section types before applying. Click the type badge to change it.
                    </p>

                    <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                      {parsedSections.map((section, idx) => {
                        return (
                          <InvoiceSectionPreviewItem
                            key={section.id}
                            section={section}
                            index={idx}
                            onTypeChange={updateSectionType}
                            onRemove={removeSection}
                          />
                        );
                      })}

                      {parsedSections.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground text-[13px]">
                          No sections extracted. Try a different file.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save as Template Form (shown in save step) */}
                  {step === "save" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3 p-4 bg-muted/30 rounded-lg"
                    >
                      <Label className="text-[13px] font-medium">
                        Save as Reusable Invoice Template
                      </Label>
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-[12px] text-muted-foreground">Template Name</Label>
                          <Input
                            placeholder="e.g., My Standard Invoice"
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[12px] text-muted-foreground">Industry (optional)</Label>
                          <Input
                            placeholder="e.g., Technology, Consulting, Design"
                            value={templateIndustry}
                            onChange={e => setTemplateIndustry(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="gap-2">
          {step === "preview" && !isParsing && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep("save")}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                Save as Template
              </Button>
              <Button
                onClick={handleApply}
                disabled={parsedSections.length === 0}
                className="gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
              >
                <Check className="h-3.5 w-3.5" />
                Apply to Invoice
              </Button>
            </>
          )}

          {step === "save" && !isParsing && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("preview")}
                className="gap-1.5"
              >
                Back
              </Button>
              <Button
                onClick={handleSaveAsTemplate}
                className="gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
              >
                <Save className="h-3.5 w-3.5" />
                Save Template
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Section Preview Item ─────────────────────────────────────────────────────

function InvoiceSectionPreviewItem({
  section,
  index,
  onTypeChange,
  onRemove,
}: {
  section: InvoiceSection;
  index: number;
  onTypeChange: (id: string, type: InvoiceSectionType) => void;
  onRemove: (id: string) => void;
}) {
  const cfg = sectionTypeConfig[section.type];
  const Icon = cfg.icon;
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Show extra info for line_items
  const lineItemCount = section.metadata?.items?.length;

  return (
    <div className="border border-border rounded-lg overflow-hidden group">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cfg.color }} />

        {/* Type selector */}
        <Select
          value={section.type}
          onValueChange={(val) => onTypeChange(section.id, val as InvoiceSectionType)}
        >
          <SelectTrigger className="h-6 w-[110px] text-[11px] border-0 shadow-none p-0 px-1 bg-transparent hover:bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(sectionTypeConfig) as InvoiceSectionType[]).map(type => {
              const tc = sectionTypeConfig[type];
              const TIcon = tc.icon;
              return (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-1.5">
                    <TIcon className="h-3 w-3" style={{ color: tc.color }} />
                    <span className="text-[12px]">{tc.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <span className="text-[12px] text-muted-foreground truncate flex-1">
          {section.type === "line_items" && lineItemCount
            ? `${lineItemCount} item${lineItemCount !== 1 ? "s" : ""}`
            : section.content
              ? section.content.substring(0, 50) + (section.content.length > 50 ? "..." : "")
              : `Section ${index + 1}`}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
            onClick={() => onRemove(section.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-3 py-2 text-[12px] text-muted-foreground border-t border-border bg-background"
          >
            <p className="whitespace-pre-wrap max-h-32 overflow-y-auto">
              {section.content || "(empty)"}
            </p>

            {/* Show line items detail */}
            {section.type === "line_items" && section.metadata?.items && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] font-medium text-foreground">Detected Line Items:</p>
                {section.metadata.items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[11px] bg-muted/30 rounded px-2 py-1">
                    <span>{item.description}</span>
                    <span className="font-medium">${item.amount?.toFixed(2) || item.rate?.toFixed(2) || "0.00"}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Show bank details */}
            {section.type === "bank_details" && (
              <div className="mt-1">
                <Badge variant="outline" className="text-[10px] h-4">
                  <Landmark className="h-2.5 w-2.5 mr-0.5" />
                  Payment info detected
                </Badge>
              </div>
            )}

            {/* Show tax info */}
            {section.type === "tax" && section.metadata?.rate && (
              <div className="mt-1">
                <Badge variant="outline" className="text-[10px] h-4">
                  <Percent className="h-2.5 w-2.5 mr-0.5" />
                  {section.metadata.rate}% detected
                </Badge>
              </div>
            )}

            {section.metadata?.placeholders && (
              <div className="mt-2 flex flex-wrap gap-1">
                {section.metadata.placeholders.map((p: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px] h-4">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
