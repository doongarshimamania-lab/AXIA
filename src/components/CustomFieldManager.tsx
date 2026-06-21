"use client";

import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
  Settings2,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  List,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceContext } from "@/hooks/use-workspace";

// ─── Field type config ────────────────────────────────────────
const FIELD_TYPES = [
  { value: "text", label: "Text", icon: Type, description: "Short text input" },
  { value: "number", label: "Number", icon: Hash, description: "Numeric value" },
  { value: "boolean", label: "Boolean", icon: ToggleLeft, description: "Yes/No toggle" },
  { value: "date", label: "Date", icon: Calendar, description: "Date picker" },
  { value: "select", label: "Select", icon: List, description: "Dropdown with options" },
] as const;

type FieldType = "text" | "number" | "boolean" | "date" | "select";

interface CustomFieldManagerProps {
  workspaceId: string | null;
  tableName: string; // e.g. "clients"
}

export function CustomFieldManager({ workspaceId, tableName }: CustomFieldManagerProps) {
  const { isConvexConnected } = useWorkspaceContext();

  // ─── Queries ────────────────────────────────────────────────────────
  // Try getDefinitions first, fall back to getFields
  const hasCustomFieldsApi = !!(api as any).customFields?.crud;
  const hasGetDefinitions = !!(api as any).customFields?.crud?.getDefinitions;
  const hasGetFields = !!(api as any).customFields?.crud?.getFields;

  const fields = useQuery(
    hasCustomFieldsApi && isConvexConnected && workspaceId
      ? hasGetDefinitions
        ? (api as any).customFields.crud.getDefinitions
        : hasGetFields
        ? (api as any).customFields.crud.getFields
        : "skip"
      : "skip",
    workspaceId ? { workspaceId: workspaceId as any, tableName } : "skip"
  ) as any[] | undefined;

  // ─── Mutations ──────────────────────────────────────────────────────
  const createFieldMutation = useMutation(
    hasCustomFieldsApi ? (api as any).customFields.crud.createField : null
  );
  const updateFieldMutation = useMutation(
    hasCustomFieldsApi ? (api as any).customFields.crud.updateField : null
  );
  const deleteFieldMutation = useMutation(
    hasCustomFieldsApi ? (api as any).customFields.crud.deleteField : null
  );
  const reorderFieldsMutation = useMutation(
    hasCustomFieldsApi ? (api as any).customFields.crud.reorderFields : null
  );

  // ─── State ──────────────────────────────────────────────────────────
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [deletingField, setDeletingField] = useState<any>(null);

  // Create/Edit form state
  const [fieldName, setFieldName] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [fieldRequired, setFieldRequired] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedFields = useMemo(() => {
    if (!fields) return [];
    return [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [fields]);

  // ─── Handlers ───────────────────────────────────────────────────────
  const resetForm = () => {
    setFieldName("");
    setFieldLabel("");
    setFieldType("text");
    setFieldOptions([]);
    setFieldRequired(false);
    setNewOption("");
  };

  const handleCreate = async () => {
    if (!fieldName.trim() || !fieldLabel.trim() || !workspaceId) return;
    if (fieldType === "select" && fieldOptions.length === 0) {
      toast.error("Select type fields must have at least one option");
      return;
    }
    setIsSaving(true);
    try {
      if (createFieldMutation) {
        await createFieldMutation({
          workspaceId: workspaceId as any,
          tableName,
          fieldName: fieldName.trim(),
          label: fieldLabel.trim(),
          type: fieldType,
          options: fieldType === "select" ? fieldOptions : undefined,
          required: fieldRequired,
        });
      }
      toast.success("Custom field created!");
      setShowInlineForm(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to create field");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingField) return;
    setIsSaving(true);
    try {
      if (updateFieldMutation) {
        await updateFieldMutation({
          fieldId: editingField._id,
          fieldName: fieldName.trim() || undefined,
          label: fieldLabel.trim() || undefined,
          type: fieldType || undefined,
          options: fieldType === "select" ? fieldOptions : undefined,
          required: fieldRequired,
        });
      }
      toast.success("Field updated!");
      setEditingField(null);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to update field");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingField) return;
    setIsDeleting(true);
    try {
      if (deleteFieldMutation) {
        await deleteFieldMutation({ fieldId: deletingField._id });
      }
      toast.success("Field deleted");
      setDeletingField(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete field");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveUp = async (field: any, index: number) => {
    if (index === 0 || !workspaceId) return;
    const newOrders = sortedFields.map((f, i) => ({
      fieldId: f._id,
      order: i,
    }));
    [newOrders[index], newOrders[index - 1]] = [newOrders[index - 1], newOrders[index]];
    try {
      if (reorderFieldsMutation) {
        await reorderFieldsMutation({
          workspaceId: workspaceId as any,
          tableName,
          orders: newOrders,
        });
      }
    } catch (err: any) {
      toast.error("Failed to reorder fields");
    }
  };

  const handleMoveDown = async (field: any, index: number) => {
    if (index === sortedFields.length - 1 || !workspaceId) return;
    const newOrders = sortedFields.map((f, i) => ({
      fieldId: f._id,
      order: i,
    }));
    [newOrders[index], newOrders[index + 1]] = [newOrders[index + 1], newOrders[index]];
    try {
      if (reorderFieldsMutation) {
        await reorderFieldsMutation({
          workspaceId: workspaceId as any,
          tableName,
          orders: newOrders,
        });
      }
    } catch (err: any) {
      toast.error("Failed to reorder fields");
    }
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setFieldOptions([...fieldOptions, newOption.trim()]);
    setNewOption("");
  };

  const removeOption = (index: number) => {
    setFieldOptions(fieldOptions.filter((_, i) => i !== index));
  };

  const openEditForm = (field: any) => {
    setEditingField(field);
    setFieldName(field.fieldName);
    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldOptions(field.options || []);
    setFieldRequired(field.required || false);
    setShowInlineForm(true);
  };

  const openCreateForm = () => {
    resetForm();
    setEditingField(null);
    setShowInlineForm(true);
  };

  const cancelForm = () => {
    setShowInlineForm(false);
    setEditingField(null);
    resetForm();
  };

  const getTypeIcon = (type: string) => {
    const config = FIELD_TYPES.find((t) => t.value === type);
    return config ? config.icon : Type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-purple-500" />
            Custom Fields
          </h3>
          <p className="text-sm text-muted-foreground">
            Add custom fields to {tableName} records
          </p>
        </div>
        {workspaceId && !showInlineForm && (
          <Button size="sm" className="gap-1.5" onClick={openCreateForm}>
            <Plus className="w-3.5 h-3.5" />
            Add Field
          </Button>
        )}
      </div>

      {/* ─── Inline Create/Edit Form ──────────────────────────────────────── */}
      {showInlineForm && (
        <Card className="p-4 border-primary/30 dark:border-primary/20 bg-primary/5 dark:bg-primary/5">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              {editingField ? (
                <>
                  <Pencil className="w-4 h-4" />
                  Edit Field: {editingField.label}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  New Custom Field
                </>
              )}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field Label */}
              <div className="space-y-1.5">
                <Label className="text-xs">Field Label *</Label>
                <Input
                  placeholder="e.g. Referral Source"
                  value={fieldLabel}
                  onChange={(e) => {
                    setFieldLabel(e.target.value);
                    if (!editingField) {
                      setFieldName(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "_")
                          .replace(/^_|_$/g, "")
                      );
                    }
                  }}
                  className="text-sm h-9"
                />
              </div>

              {/* Field Name */}
              <div className="space-y-1.5">
                <Label className="text-xs">Field Key *</Label>
                <Input
                  placeholder="e.g. referral_source"
                  value={fieldName}
                  onChange={(e) =>
                    setFieldName(e.target.value.replace(/[^a-z0-9_]/gi, "_"))
                  }
                  className="font-mono text-sm h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  Machine-readable key used in data storage
                </p>
              </div>

              {/* Field Type */}
              <div className="space-y-1.5">
                <Label className="text-xs">Field Type *</Label>
                <Select
                  value={fieldType}
                  onValueChange={(v) => setFieldType(v as FieldType)}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          <div>
                            <div className="font-medium text-xs">
                              {type.label}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {type.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Required toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs">Required</Label>
                <div className="flex items-center gap-3 h-9">
                  <Switch
                    checked={fieldRequired}
                    onCheckedChange={setFieldRequired}
                    id="field-required-toggle"
                  />
                  <Label
                    htmlFor="field-required-toggle"
                    className="text-sm cursor-pointer text-muted-foreground"
                  >
                    {fieldRequired ? "Yes, required" : "Optional"}
                  </Label>
                </div>
              </div>
            </div>

            {/* Options for select type */}
            {fieldType === "select" && (
              <div className="space-y-2">
                <Label className="text-xs">Options *</Label>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {fieldOptions.map((opt, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="gap-1 pr-1 text-xs"
                    >
                      {opt}
                      <button
                        onClick={() => removeOption(idx)}
                        className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add option and press Enter..."
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                    className="text-sm h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    disabled={!newOption.trim()}
                    className="h-8"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button
                size="sm"
                onClick={editingField ? handleUpdate : handleCreate}
                disabled={
                  isSaving || !fieldName.trim() || !fieldLabel.trim()
                }
                className="gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {editingField ? "Update Field" : "Create Field"}
              </Button>
              <Button variant="outline" size="sm" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Field List ──────────────────────────────────────────────────── */}
      {!workspaceId ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Connect to a workspace to manage custom fields
        </p>
      ) : sortedFields.length === 0 && !showInlineForm ? (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No custom fields yet</p>
            <p className="text-xs">
              Add custom fields to extend {tableName} records
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedFields.map((field: any, index: number) => {
            const TypeIcon = getTypeIcon(field.type);
            return (
              <div
                key={field._id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 dark:hover:bg-muted/10 transition"
              >
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    className="p-0.5 hover:bg-muted dark:hover:bg-muted/50 rounded disabled:opacity-30"
                    onClick={() => handleMoveUp(field, index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-0.5 hover:bg-muted dark:hover:bg-muted/50 rounded disabled:opacity-30"
                    onClick={() => handleMoveDown(field, index)}
                    disabled={index === sortedFields.length - 1}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Field info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{field.label}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {field.type}
                    </Badge>
                    {field.required && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                        Required
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground font-mono">
                      #{field.order ?? index}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Key: {field.fieldName}
                    {field.options && field.options.length > 0 && (
                      <span className="ml-2">
                        · Options: {field.options.join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openEditForm(field)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeletingField(field)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Delete Field Confirmation ────────────────────────────────────── */}
      <AlertDialog
        open={!!deletingField}
        onOpenChange={() => setDeletingField(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{deletingField?.label}
              &quot; field? Existing data in this field on records will not be
              removed, but the field definition will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Field"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
