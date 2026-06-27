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
  Milestone,
  Minus,
  Trash2,
  Save,
  User,
  Building2,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import {
  parseUploadedTemplate,
  parseUploadedTemplateWithMeta,
  type ProposalSection,
  type Confidence,
} from "@/lib/template-parser";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionType = "heading" | "text" | "pricing" | "terms" | "milestone" | "divider" | "client_info" | "sender_info" | "summary" | "scope_of_work";

interface TemplateImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (sections: ProposalSection[]) => void;
}

// ─── Section Type Config ──────────────────────────────────────────────────────

const sectionTypeConfig: Record<
  SectionType,
  { label: string; icon: React.ElementType; color: string }
> = {
  heading: { label: "Heading", icon: Heading, color: "#475569" },
  text: { label: "Text", icon: Type, color: "#6366f1" },
  pricing: { label: "Pricing", icon: DollarSign, color: "#22c55e" },
  terms: { label: "Terms", icon: FileCheck, color: "#f59e0b" },
  milestone: { label: "Milestone", icon: Milestone, color: "#3b82f6" },
  divider: { label: "Divider", icon: Minus, color: "#6b7280" },
  client_info: { label: "Client Info", icon: User, color: "#ec4899" },
  sender_info: { label: "Company Info", icon: Building2, color: "#14b8a6" },
  summary: { label: "Summary", icon: ClipboardList, color: "#f97316" },
  scope_of_work: { label: "Scope", icon: FileText, color: "#06b6d4" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateImportDialog({
  open,
  onOpenChange,
  onApply,
}: TemplateImportDialogProps) {
  const [parsedSections, setParsedSections] = useState<ProposalSection[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [step, setStep] = useState<"upload" | "preview" | "save">("upload");
  const [templateName, setTemplateName] = useState("");
  const [templateIndustry, setTemplateIndustry] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex mutation for saving template
  const saveUploadedTemplate = useMutation(api.proposals.crud.saveUploadedTemplate);

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
      const sections = await parseUploadedTemplate(file);
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

  const updateSectionType = useCallback((id: string, newType: SectionType) => {
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
      await saveUploadedTemplate({
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
      toast.success(`Template "${templateName}" saved!`);
      resetState();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Failed to save template: ${err?.message || "Unknown error"}`);
    }
  }, [templateName, parsedSections, templateIndustry, fileName, saveUploadedTemplate, resetState, onOpenChange]);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#475569]" />
            Import Template
          </DialogTitle>
          <DialogDescription>
            Upload a PDF, DOCX, or TXT file to extract its structure as an editable proposal template.
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
                      ? "border-[#475569] bg-[#475569]/5"
                      : "border-border hover:border-[#475569]/50 hover:bg-muted/30"
                  }
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-[14px] font-medium mb-1">
                  Drag & drop your file here
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
                <File className="h-4 w-4 text-[#475569]" />
                <span className="text-[13px] font-medium">{fileName}</span>
                <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
                  {parsedSections.length} sections
                </Badge>
              </div>

              {isParsing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-[#475569] animate-spin mb-3" />
                  <p className="text-[14px] text-muted-foreground">Parsing document structure...</p>
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
                        const cfg = sectionTypeConfig[section.type] || sectionTypeConfig.text;
                        const Icon = cfg.icon;

                        return (
                          <SectionPreviewItem
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
                        Save as Reusable Template
                      </Label>
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-[12px] text-muted-foreground">Template Name</Label>
                          <Input
                            placeholder="e.g., My Custom Proposal"
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[12px] text-muted-foreground">Industry (optional)</Label>
                          <Input
                            placeholder="e.g., Technology, Design, Consulting"
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
                className="gap-1.5 bg-[#475569] hover:bg-[#334155] text-white"
              >
                <Check className="h-3.5 w-3.5" />
                Apply to Proposal
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
                className="gap-1.5 bg-[#475569] hover:bg-[#334155] text-white"
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

function SectionPreviewItem({
  section,
  index,
  onTypeChange,
  onRemove,
}: {
  section: ProposalSection;
  index: number;
  onTypeChange: (id: string, type: SectionType) => void;
  onRemove: (id: string) => void;
}) {
  const cfg = sectionTypeConfig[section.type] || sectionTypeConfig.text;
  const Icon = cfg.icon;
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="border border-border rounded-lg overflow-hidden group">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cfg.color }} />

        {/* Type selector */}
        <Select
          value={section.type}
          onValueChange={(val) => onTypeChange(section.id, val as SectionType)}
        >
          <SelectTrigger className="h-6 w-[100px] text-[11px] border-0 shadow-none p-0 px-1 bg-transparent hover:bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(sectionTypeConfig) as SectionType[]).map(type => {
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
          {section.content
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
            <p className="whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
              {section.content || "(empty)"}
            </p>
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
