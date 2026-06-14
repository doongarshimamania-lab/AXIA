"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceContext } from "@/hooks/use-workspace";

interface CustomFieldValuesProps {
  workspaceId: string | null;
  tableName: string; // e.g. "clients"
  values: Record<string, any> | null | undefined; // current custom field values
  onChange: (values: Record<string, any>) => void; // callback when values change
}

/**
 * Renders custom fields on a record form (e.g., when editing a client).
 * Loads field definitions from Convex and renders appropriate inputs.
 * The values are stored in the record's `customFields` JSON field.
 */
export function CustomFieldValues({
  workspaceId: propWorkspaceId,
  tableName,
  values,
  onChange,
}: CustomFieldValuesProps) {
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = propWorkspaceId || activeWorkspaceId;

  // Fetch custom field definitions — try getDefinitions first, then getFields
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

  // Sort by order
  const sortedFields = useMemo(() => {
    if (!fields) return [];
    return [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [fields]);

  // Handle value change
  const handleChange = (fieldName: string, value: any) => {
    onChange({ ...(values || {}), [fieldName]: value });
  };

  // Loading state
  if (workspaceId && isConvexConnected && fields === undefined) {
    return (
      <div className="space-y-4">
        <div className="border-t border-border pt-4 mt-4">
          <Skeleton className="h-4 w-24 mb-3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No fields to render
  if (!sortedFields || sortedFields.length === 0) {
    return null;
  }

  // Safe values accessor
  const safeValues = values || {};

  return (
    <div className="space-y-4">
      <div className="border-t border-border pt-4 mt-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Custom Fields
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedFields.map((field: any) => {
          const currentValue = safeValues[field.fieldName] ?? "";

          switch (field.type) {
            case "text":
              return (
                <div key={field._id} className="space-y-1.5">
                  <Label className="text-xs">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  <Input
                    value={currentValue}
                    onChange={(e) =>
                      handleChange(field.fieldName, e.target.value)
                    }
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    className="text-sm"
                  />
                </div>
              );

            case "number":
              return (
                <div key={field._id} className="space-y-1.5">
                  <Label className="text-xs">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    value={currentValue}
                    onChange={(e) =>
                      handleChange(
                        field.fieldName,
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    className="text-sm"
                  />
                </div>
              );

            case "boolean":
              return (
                <div key={field._id} className="space-y-1.5">
                  <Label className="text-xs">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  <div className="flex items-center gap-3 h-9">
                    <Switch
                      checked={!!currentValue}
                      onCheckedChange={(checked) =>
                        handleChange(field.fieldName, checked)
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {currentValue ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              );

            case "date":
              return (
                <div key={field._id} className="space-y-1.5">
                  <Label className="text-xs">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  <Input
                    type="date"
                    value={
                      currentValue ? String(currentValue).split("T")[0] : ""
                    }
                    onChange={(e) =>
                      handleChange(field.fieldName, e.target.value)
                    }
                    className="text-sm"
                  />
                </div>
              );

            case "select":
              return (
                <div key={field._id} className="space-y-1.5">
                  <Label className="text-xs">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  <Select
                    value={currentValue || ""}
                    onValueChange={(v) => handleChange(field.fieldName, v)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue
                        placeholder={`Select ${field.label.toLowerCase()}...`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );

            default:
              return (
                <div key={field._id} className="space-y-1.5">
                  <Label className="text-xs">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  <Input
                    value={currentValue}
                    onChange={(e) =>
                      handleChange(field.fieldName, e.target.value)
                    }
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    className="text-sm"
                  />
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}
