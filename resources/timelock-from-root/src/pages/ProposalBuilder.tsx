import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Heading,
  Type,
  DollarSign,
  FileCheck,
  Milestone,
  Minus,
  GripVertical,
  Clock,
  FileText,
  User,
  Loader2,
  LayoutTemplate,
  Sparkles,
  X,
  Upload,
} from "lucide-react";
import { TemplateImportDialog } from "@/components/proposals/TemplateImportDialog";

// ─── Types ──────────────────────────────────────────────────────────────────

type SectionType = "heading" | "text" | "pricing" | "terms" | "milestone" | "divider" | "client_info" | "sender_info" | "summary" | "scope_of_work";

interface PricingItem {
  name: string;
  price: number;
}

interface MilestoneItem {
  name: string;
  weeks: number;
}

interface ProposalSection {
  id: string;
  type: SectionType;
  content: string;
  metadata?: {
    items?: PricingItem[];
    milestones?: MilestoneItem[];
  };
}

interface Template {
  _id: string;
  name: string;
  industry?: string;
  description?: string;
  sections: ProposalSection[];
  isSystem?: boolean;
}

// ─── Section Type Config ────────────────────────────────────────────────────

const sectionTypeConfig: Record<
  SectionType,
  { label: string; icon: React.ElementType; description: string }
> = {
  heading: { label: "Heading", icon: Heading, description: "Section title" },
  text: { label: "Text", icon: Type, description: "Paragraph or description" },
  pricing: { label: "Pricing", icon: DollarSign, description: "Pricing table with items" },
  terms: { label: "Terms", icon: FileCheck, description: "Terms and conditions" },
  milestone: { label: "Milestone", icon: Milestone, description: "Project milestones" },
  divider: { label: "Divider", icon: Minus, description: "Visual separator" },
  client_info: { label: "Client Info", icon: User, description: "Client contact details" },
  sender_info: { label: "Sender Info", icon: User, description: "Your contact details" },
  summary: { label: "Summary", icon: FileText, description: "Executive summary" },
  scope_of_work: { label: "Scope", icon: FileCheck, description: "Scope of work" },
};

// ─── Helper ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function createEmptySection(type: SectionType): ProposalSection {
  const section: ProposalSection = {
    id: generateId(),
    type,
    content: "",
  };
  if (type === "pricing") {
    section.content = "Pricing Package";
    section.metadata = { items: [{ name: "", price: 0 }] };
  }
  if (type === "milestone") {
    section.content = "Project Milestones";
    section.metadata = { milestones: [{ name: "", weeks: 1 }] };
  }
  if (type === "heading") {
    section.content = "New Section";
  }
  if (type === "text" || type === "summary" || type === "scope_of_work") {
    section.content = "";
  }
  if (type === "terms") {
    section.content = "Payment terms and conditions...";
  }
  if (type === "client_info" || type === "sender_info") {
    section.content = "Contact details";
  }
  return section;
}

function calculateTotal(sections: ProposalSection[]): number {
  return sections.reduce((total, section) => {
    if (section.type === "pricing" && section.metadata?.items) {
      return total + section.metadata.items.reduce((sum, item) => sum + (item.price || 0), 0);
    }
    return total;
  }, 0);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ProposalBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const fromDealId = searchParams.get("fromDeal");
  const dealIdParam = searchParams.get("dealId");

  // Use fromDeal or dealId param (fromDeal takes priority)
  const activeDealId = fromDealId || dealIdParam;

  const isEditing = !!editId;

  // Convex queries
  const existingProposal = useQuery(
    api.proposals.crud.getProposal,
    editId ? { proposalId: editId as any } : "skip"
  ) as any;

  const dealData = useQuery(
    api.pipeline.crud.getDeal,
    activeDealId ? { dealId: activeDealId as any } : "skip"
  ) as any;

  const templates = useQuery(api.proposals.crud.getTemplates, {}) as Template[] | undefined;

  // Loading timeout for edit mode
  const { isDisconnected } = useConvexConnectionState();
  const editLoading = !!(editId && existingProposal === undefined);
  const editLoadTimedOut = useQueryTimeout(editLoading, 3000);
  const showEditLoading = editLoading && !editLoadTimedOut && !isDisconnected;

  // Convex mutations
  const createProposal = useMutation(api.proposals.crud.createProposal);
  const updateProposal = useMutation(api.proposals.crud.updateProposal);
  const sendProposal = useMutation(api.proposals.crud.sendProposal);

  // Form state
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [sections, setSections] = useState<ProposalSection[]>([
    { id: generateId(), type: "heading", content: "" },
    { id: generateId(), type: "text", content: "" },
  ]);
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showSectionTypeDropdown, setShowSectionTypeDropdown] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [createdProposalId, setCreatedProposalId] = useState<string | null>(null);
  const [dealLoaded, setDealLoaded] = useState(false);

  // Load existing proposal for editing
  useEffect(() => {
    if (existingProposal && isEditing) {
      setTitle(existingProposal.title || "");
      setClientName(existingProposal.clientName || "");
      setClientEmail(existingProposal.clientEmail || "");
      setSections(
        existingProposal.sections?.length > 0
          ? existingProposal.sections
          : [{ id: generateId(), type: "heading", content: "" }]
      );
      setValidUntil(
        existingProposal.validUntil
          ? new Date(existingProposal.validUntil).toISOString().split("T")[0]
          : ""
      );
      setNotes(existingProposal.notes || "");
      setCreatedProposalId(existingProposal._id);
    }
  }, [existingProposal, isEditing]);

  // Load deal data when coming from pipeline (fromDeal param)
  useEffect(() => {
    if (dealData && activeDealId && !dealLoaded && !isEditing) {
      setTitle(`Proposal: ${dealData.title || ""}`);
      setClientName(dealData.contactName || "");
      setClientEmail(dealData.contactEmail || "");
      // Pre-populate sections from deal data
      const dealSections: ProposalSection[] = [
        { id: generateId(), type: "heading", content: dealData.title || "" },
        { id: generateId(), type: "text", content: dealData.description || `Proposal for ${dealData.title || "Project"}` },
        { id: generateId(), type: "pricing", content: "Project Pricing", metadata: { items: [{ name: dealData.title || "Service", price: dealData.value || 0 }] } },
        { id: generateId(), type: "terms", content: "Payment Terms: 30% upfront, 40% at midpoint, 30% on delivery. Project scope changes will be billed at an agreed hourly rate." },
      ];
      setSections(dealSections);
      if (dealData.notes) setNotes(dealData.notes);
      setDealLoaded(true);
    }
  }, [dealData, activeDealId, dealLoaded, isEditing]);

  // Auto-calculate total value
  const totalValue = useMemo(() => calculateTotal(sections), [sections]);

  // ─── Section Management ────────────────────────────────────────────────

  const updateSection = useCallback((id: string, updates: Partial<ProposalSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const deleteSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const moveSection = useCallback((id: string, direction: "up" | "down") => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.length - 1) return prev;

      const newSections = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];
      return newSections;
    });
  }, []);

  const addSection = useCallback((type: SectionType) => {
    setSections((prev) => [...prev, createEmptySection(type)]);
    setShowSectionTypeDropdown(false);
  }, []);

  // Pricing item management
  const addPricingItem = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const items = [...(s.metadata?.items || []), { name: "", price: 0 }];
        return { ...s, metadata: { ...s.metadata, items } };
      })
    );
  }, []);

  const updatePricingItem = useCallback(
    (sectionId: string, itemIdx: number, field: "name" | "price", value: string | number) => {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          const items = [...(s.metadata?.items || [])];
          items[itemIdx] = { ...items[itemIdx], [field]: value };
          return { ...s, metadata: { ...s.metadata, items } };
        })
      );
    },
    []
  );

  const removePricingItem = useCallback((sectionId: string, itemIdx: number) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const items = (s.metadata?.items || []).filter((_, i) => i !== itemIdx);
        return { ...s, metadata: { ...s.metadata, items } };
      })
    );
  }, []);

  // Milestone item management
  const addMilestoneItem = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const milestones = [...(s.metadata?.milestones || []), { name: "", weeks: 1 }];
        return { ...s, metadata: { ...s.metadata, milestones } };
      })
    );
  }, []);

  const updateMilestoneItem = useCallback(
    (sectionId: string, itemIdx: number, field: "name" | "weeks", value: string | number) => {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          const milestones = [...(s.metadata?.milestones || [])];
          milestones[itemIdx] = { ...milestones[itemIdx], [field]: value };
          return { ...s, metadata: { ...s.metadata, milestones } };
        })
      );
    },
    []
  );

  const removeMilestoneItem = useCallback((sectionId: string, itemIdx: number) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const milestones = (s.metadata?.milestones || []).filter((_, i) => i !== itemIdx);
        return { ...s, metadata: { ...s.metadata, milestones } };
      })
    );
  }, []);

  // Apply template
  const applyTemplate = useCallback((template: Template) => {
    setSections(template.sections.map((s) => ({ ...s, id: generateId() })));
    setShowTemplateDialog(false);
    toast.success(`Template "${template.name}" applied`);
  }, []);

  // Apply imported sections
  const applyImportedSections = useCallback((importedSections: ProposalSection[]) => {
    setSections(importedSections.map(s => ({ ...s, id: generateId() })));
    toast.success(`Imported ${importedSections.length} sections`);
  }, []);

  // ─── Save / Send ───────────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error("Please add a proposal title");
      return;
    }

    setIsSaving(true);
    try {
      const sectionData = sections.map(({ id, type, content, metadata }) => ({
        id,
        type,
        content,
        metadata: metadata || undefined,
      }));

      const validUntilTimestamp = validUntil ? new Date(validUntil).getTime() : undefined;

      if (isEditing && createdProposalId) {
        await updateProposal({
          proposalId: createdProposalId as any,
          title,
          sections: sectionData,
          totalValue,
          clientName: clientName || undefined,
          clientEmail: clientEmail || undefined,
          validUntil: validUntilTimestamp,
          notes: notes || undefined,
        });
        toast.success("Proposal updated!");
      } else {
        const newId = await createProposal({
          title,
          sections: sectionData,
          totalValue,
          clientName: clientName || undefined,
          clientEmail: clientEmail || undefined,
          validUntil: validUntilTimestamp,
          notes: notes || undefined,
          currency: "USD",
        });
        setCreatedProposalId(newId as string);
        toast.success("Draft saved!", {
          description: "You can continue editing or send when ready.",
        });
      }
    } catch (err: any) {
      toast.error("Failed to save proposal", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendProposal = async () => {
    if (!title.trim()) {
      toast.error("Please add a proposal title");
      return;
    }
    if (!clientName.trim() && !clientEmail.trim()) {
      toast.error("Please add client name or email before sending");
      return;
    }

    // Save first if not yet saved
    let proposalId = createdProposalId;
    if (!proposalId) {
      setIsSaving(true);
      try {
        const sectionData = sections.map(({ id, type, content, metadata }) => ({
          id,
          type,
          content,
          metadata: metadata || undefined,
        }));
        const validUntilTimestamp = validUntil ? new Date(validUntil).getTime() : undefined;
        const newId = await createProposal({
          title,
          sections: sectionData,
          totalValue,
          clientName: clientName || undefined,
          clientEmail: clientEmail || undefined,
          validUntil: validUntilTimestamp,
          notes: notes || undefined,
          currency: "USD",
        });
        proposalId = newId as string;
        setCreatedProposalId(proposalId);
      } catch (err: any) {
        toast.error("Failed to save proposal", { description: err.message });
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    // Then send
    setIsSending(true);
    try {
      await sendProposal({ proposalId: proposalId as any });
      toast.success("Proposal sent!", {
        description: "Automated follow-ups have been scheduled.",
      });
      navigate("/proposals");
    } catch (err: any) {
      toast.error("Failed to send proposal", { description: err.message });
    } finally {
      setIsSending(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  // Show loading state for edit mode
  if (showEditLoading) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading proposal...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex-1 min-h-screen bg-background text-foreground transition-colors"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* ─── Top Bar ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => navigate("/proposals")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-5 w-px bg-border" />
            <h1
              className="text-[22px] font-bold text-foreground"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              {isEditing ? "Edit Proposal" : "Proposal Builder"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 ${isPreview ? "bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30" : ""}`}
              onClick={() => setIsPreview(!isPreview)}
            >
              <Eye className="h-3.5 w-3.5" />
              {isPreview ? "Edit" : "Preview"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Draft
            </Button>
            <Button
              size="sm"
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-1.5"
              onClick={handleSendProposal}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Send Proposal
            </Button>
          </div>
        </div>

        {isPreview ? (
          <ProposalPreview
            title={title}
            clientName={clientName}
            clientEmail={clientEmail}
            sections={sections}
            totalValue={totalValue}
            validUntil={validUntil}
            notes={notes}
          />
        ) : (
          <div className="space-y-6">
            {/* ─── Title ─────────────────────────────────────────────── */}
            <Card>
              <CardContent className="p-5">
                <Label className="text-[13px] font-medium text-muted-foreground mb-2 block">
                  Proposal Title
                </Label>
                <Input
                  placeholder="e.g., E-commerce Platform Redesign"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-[18px] font-semibold h-12"
                  style={{ fontFamily: "Space Grotesk, sans-serif" }}
                />
              </CardContent>
            </Card>

            {/* ─── Client Info ───────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3 px-5 pt-5">
                <CardTitle className="text-[15px] font-semibold">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[13px] text-muted-foreground mb-1.5 block">
                      Client Name
                    </Label>
                    <Input
                      placeholder="e.g., Acme Corp"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-[13px] text-muted-foreground mb-1.5 block">
                      Client Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="e.g., contact@acme.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ─── Template Selector ─────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3 px-5 pt-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[15px] font-semibold">Template</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-[12px]"
                      onClick={() => setShowImportDialog(true)}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Import Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-[12px]"
                      onClick={() => setShowTemplateDialog(true)}
                    >
                      <LayoutTemplate className="h-3.5 w-3.5" />
                      Choose Template
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-[13px] text-muted-foreground">
                  Start from scratch or apply a template to pre-fill sections.
                  Templates include industry-specific content and pricing structures.
                </p>
              </CardContent>
            </Card>

            {/* ─── Section Editor ────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3 px-5 pt-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                    Sections
                    <Badge variant="secondary" className="text-[11px] h-5">
                      {sections.length}
                    </Badge>
                  </CardTitle>

                  {/* Add Section Dropdown */}
                  <div className="relative">
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                      onClick={() => setShowSectionTypeDropdown(!showSectionTypeDropdown)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Section
                    </Button>
                    <AnimatePresence>
                      {showSectionTypeDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -5, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -5, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 w-56 py-1 overflow-hidden"
                        >
                          {(Object.keys(sectionTypeConfig) as SectionType[]).map((type) => {
                            const cfg = sectionTypeConfig[type];
                            const Icon = cfg.icon;
                            return (
                              <button
                                key={type}
                                className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-muted/50 transition-colors"
                                onClick={() => addSection(type)}
                              >
                                <Icon className="h-4 w-4 text-[#8B5CF6] flex-shrink-0" />
                                <div>
                                  <div className="text-[13px] font-medium text-foreground">
                                    {cfg.label}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {cfg.description}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {sections.map((section, idx) => (
                      <SectionEditor
                        key={section.id}
                        section={section}
                        index={idx}
                        total={sections.length}
                        onUpdate={updateSection}
                        onDelete={deleteSection}
                        onMove={moveSection}
                        onAddPricingItem={addPricingItem}
                        onUpdatePricingItem={updatePricingItem}
                        onRemovePricingItem={removePricingItem}
                        onAddMilestoneItem={addMilestoneItem}
                        onUpdateMilestoneItem={updateMilestoneItem}
                        onRemoveMilestoneItem={removeMilestoneItem}
                      />
                    ))}
                  </AnimatePresence>

                  {sections.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-[14px] font-medium mb-1">No sections yet</p>
                      <p className="text-[13px] mb-3">Add your first section to build the proposal</p>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                        onClick={() => addSection("heading")}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Heading Section
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ─── Valid Until + Notes ───────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3 px-5 pt-5">
                  <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#8B5CF6]" />
                    Valid Until
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 px-5 pt-5">
                  <CardTitle className="text-[15px] font-semibold">Internal Notes</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <Textarea
                    placeholder="Notes for yourself (not visible to client)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            </div>

            {/* ─── Total Value ───────────────────────────────────────── */}
            <Card className="border-[#8B5CF6]/20 bg-[#8B5CF6]/5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-muted-foreground mb-0.5">
                      Auto-calculated Total Value
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Sum of all pricing section items
                    </p>
                  </div>
                  <div className="text-[28px] font-bold text-[#8B5CF6]" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    {formatCurrency(totalValue)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ─── Template Dialog ──────────────────────────────────────────── */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Apply a template to pre-fill sections. This will replace your current sections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {(!templates || templates.length === 0) && (
              <div className="text-center py-6 text-muted-foreground text-[14px]">
                No templates available yet.
              </div>
            )}
            {templates?.map((template) => (
              <div
                key={template._id}
                className="border border-border rounded-lg p-4 hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/5 cursor-pointer transition-all"
                onClick={() => applyTemplate(template)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-[14px] font-semibold text-foreground">
                      {template.name}
                    </h4>
                    {template.industry && (
                      <Badge variant="secondary" className="mt-1 text-[10px] h-4">
                        {template.industry}
                      </Badge>
                    )}
                    {template.description && (
                      <p className="text-[12px] text-muted-foreground mt-1.5">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {template.sections.length} sections
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Close section type dropdown on outside click */}
      {showSectionTypeDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSectionTypeDropdown(false)}
        />
      )}

      {/* Template Import Dialog */}
      <TemplateImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onApply={applyImportedSections}
      />
    </motion.div>
  );
}

// ─── Section Editor Component ───────────────────────────────────────────────

function SectionEditor({
  section,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
  onAddPricingItem,
  onUpdatePricingItem,
  onRemovePricingItem,
  onAddMilestoneItem,
  onUpdateMilestoneItem,
  onRemoveMilestoneItem,
}: {
  section: ProposalSection;
  index: number;
  total: number;
  onUpdate: (id: string, updates: Partial<ProposalSection>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onAddPricingItem: (sectionId: string) => void;
  onUpdatePricingItem: (sectionId: string, itemIdx: number, field: "name" | "price", value: string | number) => void;
  onRemovePricingItem: (sectionId: string, itemIdx: number) => void;
  onAddMilestoneItem: (sectionId: string) => void;
  onUpdateMilestoneItem: (sectionId: string, itemIdx: number, field: "name" | "weeks", value: string | number) => void;
  onRemoveMilestoneItem: (sectionId: string, itemIdx: number) => void;
}) {
  const cfg = sectionTypeConfig[section.type];
  const Icon = cfg.icon;
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.2 }}
      layout
      className="border border-border rounded-lg overflow-hidden group"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab flex-shrink-0" />
        <Icon className="h-4 w-4 text-[#8B5CF6] flex-shrink-0" />
        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
          {cfg.label}
        </Badge>
        <span className="text-[12px] text-muted-foreground truncate flex-1">
          {section.content ? section.content.substring(0, 40) + (section.content.length > 40 ? "..." : "") : `Section ${index + 1}`}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            disabled={index === 0}
            onClick={() => onMove(section.id, "up")}
            title="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            disabled={index === total - 1}
            onClick={() => onMove(section.id, "down")}
            title="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <Eye className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={() => onDelete(section.id)}
            title="Delete section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Section Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {section.type === "divider" ? (
              <div className="text-center text-[12px] text-muted-foreground">
                ── Visual Divider ──
              </div>
            ) : section.type === "heading" ? (
              <Input
                placeholder="Section heading..."
                value={section.content}
                onChange={(e) => onUpdate(section.id, { content: e.target.value })}
                className="text-[16px] font-semibold"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              />
            ) : section.type === "text" ? (
              <Textarea
                placeholder="Write your content here..."
                value={section.content}
                onChange={(e) => onUpdate(section.id, { content: e.target.value })}
                rows={4}
                className="resize-none"
              />
            ) : section.type === "terms" ? (
              <Textarea
                placeholder="Terms and conditions..."
                value={section.content}
                onChange={(e) => onUpdate(section.id, { content: e.target.value })}
                rows={4}
                className="resize-none"
              />
            ) : section.type === "pricing" ? (
              <div className="space-y-3">
                <Input
                  placeholder="Pricing package name..."
                  value={section.content}
                  onChange={(e) => onUpdate(section.id, { content: e.target.value })}
                  className="font-medium"
                />
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                          Item
                        </th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground w-32">
                          Price
                        </th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {(section.metadata?.items || []).map((item, i) => (
                        <tr key={i} className={i < (section.metadata?.items?.length || 0) - 1 ? "border-b border-border" : ""}>
                          <td className="py-1.5 px-2">
                            <Input
                              placeholder="Item name"
                              value={item.name}
                              onChange={(e) =>
                                onUpdatePricingItem(section.id, i, "name", e.target.value)
                              }
                              className="h-8 text-[13px] border-0 shadow-none focus-visible:ring-1 px-1"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.price || ""}
                              onChange={(e) =>
                                onUpdatePricingItem(section.id, i, "price", Number(e.target.value) || 0)
                              }
                              className="h-8 text-[13px] text-right border-0 shadow-none focus-visible:ring-1 px-1"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                              onClick={() => onRemovePricingItem(section.id, i)}
                              disabled={(section.metadata?.items?.length || 0) <= 1}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30">
                        <td className="py-2 px-3 font-semibold text-foreground">Total</td>
                        <td className="py-2 px-3 text-right font-bold text-[#8B5CF6]">
                          {formatCurrency(
                            (section.metadata?.items || []).reduce((s, i) => s + (i.price || 0), 0)
                          )}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-[12px] w-full"
                  onClick={() => onAddPricingItem(section.id)}
                >
                  <Plus className="h-3 w-3" />
                  Add Item
                </Button>
              </div>
            ) : section.type === "milestone" ? (
              <div className="space-y-3">
                <Input
                  placeholder="Milestones section name..."
                  value={section.content}
                  onChange={(e) => onUpdate(section.id, { content: e.target.value })}
                  className="font-medium"
                />
                <div className="space-y-2">
                  {(section.metadata?.milestones || []).map((ms, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] text-[12px] font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <Input
                        placeholder="Milestone name"
                        value={ms.name}
                        onChange={(e) =>
                          onUpdateMilestoneItem(section.id, i, "name", e.target.value)
                        }
                        className="h-8 text-[13px] flex-1"
                      />
                      <div className="flex items-center gap-1.5 w-28">
                        <Input
                          type="number"
                          placeholder="0"
                          value={ms.weeks || ""}
                          onChange={(e) =>
                            onUpdateMilestoneItem(section.id, i, "weeks", Number(e.target.value) || 1)
                          }
                          className="h-8 text-[13px] text-center w-16"
                        />
                        <span className="text-[12px] text-muted-foreground whitespace-nowrap">weeks</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 flex-shrink-0"
                        onClick={() => onRemoveMilestoneItem(section.id, i)}
                        disabled={(section.metadata?.milestones?.length || 0) <= 1}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-[12px] w-full"
                  onClick={() => onAddMilestoneItem(section.id)}
                >
                  <Plus className="h-3 w-3" />
                  Add Milestone
                </Button>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Preview Component ──────────────────────────────────────────────────────

function ProposalPreview({
  title,
  clientName,
  clientEmail,
  sections,
  totalValue,
  validUntil,
  notes,
}: {
  title: string;
  clientName: string;
  clientEmail: string;
  sections: ProposalSection[];
  totalValue: number;
  validUntil: string;
  notes: string;
}) {
  const totalWeeks = useMemo(
    () =>
      sections.reduce((sum, s) => {
        if (s.type === "milestone" && s.metadata?.milestones) {
          return sum + s.metadata.milestones.reduce((w, m) => w + (m.weeks || 0), 0);
        }
        return sum;
      }, 0),
    [sections]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="max-w-3xl mx-auto border border-border shadow-xl">
        <CardContent className="p-8 sm:p-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#8B5CF6] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 6V12C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 12V6L12 2Z" fill="white"/>
                  <path d="M12 8V12L15 14" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h1
                  className="text-[26px] font-bold text-foreground"
                  style={{ fontFamily: "Space Grotesk, sans-serif" }}
                >
                  {title || "Untitled Proposal"}
                </h1>
                {clientName && (
                  <p className="text-[15px] text-muted-foreground">
                    Prepared for <span className="font-medium text-foreground">{clientName}</span>
                    {clientEmail && (
                      <span className="text-muted-foreground"> ({clientEmail})</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 text-[13px] text-muted-foreground">
              {validUntil && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Valid until {new Date(validUntil).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Total: {formatCurrency(totalValue)}
              </span>
              {totalWeeks > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  ~{totalWeeks} weeks
                </span>
              )}
            </div>
          </div>

          <div className="h-px bg-border mb-8" />

          {/* Sections */}
          <div className="space-y-6">
            {sections.length === 0 && (
              <p className="text-center text-muted-foreground py-12 text-[15px]">
                No sections added yet. Switch to Edit mode to build your proposal.
              </p>
            )}
            {sections.map((section) => {
              if (section.type === "divider") {
                return (
                  <div key={section.id} className="flex items-center gap-4 py-2">
                    <div className="h-px flex-1 bg-border" />
                  </div>
                );
              }

              if (section.type === "heading") {
                return (
                  <div key={section.id}>
                    <h2
                      className="text-[20px] font-bold text-foreground"
                      style={{ fontFamily: "Space Grotesk, sans-serif" }}
                    >
                      {section.content || "Untitled Section"}
                    </h2>
                  </div>
                );
              }

              if (section.type === "text") {
                return (
                  <div key={section.id}>
                    <p className="text-[15px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {section.content || "No content yet."}
                    </p>
                  </div>
                );
              }

              if (section.type === "terms") {
                return (
                  <div key={section.id}>
                    <h3
                      className="text-[16px] font-semibold text-foreground mb-2"
                      style={{ fontFamily: "Space Grotesk, sans-serif" }}
                    >
                      Terms & Conditions
                    </h3>
                    <p className="text-[14px] text-foreground/70 leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                      {section.content || "No terms specified."}
                    </p>
                  </div>
                );
              }

              if (section.type === "pricing") {
                const items = section.metadata?.items || [];
                const sectionTotal = items.reduce((s, i) => s + (i.price || 0), 0);
                return (
                  <div key={section.id}>
                    <h3
                      className="text-[16px] font-semibold text-foreground mb-3"
                      style={{ fontFamily: "Space Grotesk, sans-serif" }}
                    >
                      {section.content || "Pricing"}
                    </h3>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-[14px]">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                              Item
                            </th>
                            <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">
                              Price
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, i) => (
                            <tr
                              key={i}
                              className={i < items.length - 1 ? "border-b border-border" : ""}
                            >
                              <td className="py-2.5 px-4 text-foreground">{item.name || "Unnamed"}</td>
                              <td className="py-2.5 px-4 text-right font-medium text-foreground">
                                {formatCurrency(item.price || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border bg-[#8B5CF6]/5">
                            <td className="py-2.5 px-4 font-semibold text-foreground">Total</td>
                            <td className="py-2.5 px-4 text-right font-bold text-[#8B5CF6]">
                              {formatCurrency(sectionTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              }

              if (section.type === "milestone") {
                const milestones = section.metadata?.milestones || [];
                return (
                  <div key={section.id}>
                    <h3
                      className="text-[16px] font-semibold text-foreground mb-3"
                      style={{ fontFamily: "Space Grotesk, sans-serif" }}
                    >
                      {section.content || "Milestones"}
                    </h3>
                    <div className="space-y-3">
                      {milestones.map((ms, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] text-[13px] font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-[14px] font-medium text-foreground">
                              {ms.name || "Unnamed Milestone"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[12px] h-6">
                            {ms.weeks || 1} week{(ms.weeks || 1) !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      ))}
                      {milestones.length > 0 && (
                        <div className="pl-11 text-[13px] text-muted-foreground">
                          Total estimated timeline: {milestones.reduce((s, m) => s + (m.weeks || 0), 0)} weeks
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* Grand Total */}
          {totalValue > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-[18px] font-semibold text-foreground" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  Grand Total
                </span>
                <span className="text-[24px] font-bold text-[#8B5CF6]" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </div>
          )}

          {/* Notes (only visible in preview as a reminder) */}
          {notes && (
            <div className="mt-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mb-1">
                Internal Note (not visible to client)
              </p>
              <p className="text-[13px] text-amber-700 dark:text-amber-300">{notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
