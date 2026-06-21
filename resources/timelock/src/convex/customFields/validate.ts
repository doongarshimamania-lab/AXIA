/**
 * Custom field validation utility.
 *
 * Validates a `customFields` object against a set of field definitions
 * (typically fetched from the `customFieldDefinitions` table).
 *
 * Returns `{ valid: boolean, errors: string[] }`.
 */
export interface FieldDefinition {
  fieldName: string;
  label: string;
  type: "text" | "number" | "boolean" | "date" | "select";
  required?: boolean;
  options?: string[];
}

export function validateCustomFields(
  customFields: Record<string, any>,
  definitions: FieldDefinition[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const def of definitions) {
    const value = customFields[def.fieldName];

    // ── Required check ────────────────────────────────────────────────────
    if (def.required && (value === undefined || value === null || value === "")) {
      errors.push(`${def.label} is required`);
      continue; // Skip type checks if value is missing and required
    }

    // If value is not provided and not required, skip further checks
    if (value === undefined || value === null) continue;

    // ── Type checks ──────────────────────────────────────────────────────
    switch (def.type) {
      case "number":
        if (typeof value !== "number" && isNaN(Number(value))) {
          errors.push(`${def.label} must be a number`);
        }
        break;

      case "boolean":
        if (
          value !== true &&
          value !== false &&
          value !== 1 &&
          value !== 0 &&
          String(value).toLowerCase() !== "true" &&
          String(value).toLowerCase() !== "false"
        ) {
          errors.push(`${def.label} must be true or false`);
        }
        break;

      case "date":
        if (typeof value === "number") {
          // Timestamp — valid if positive
          if (value <= 0) {
            errors.push(`${def.label} must be a valid date`);
          }
        } else if (typeof value === "string") {
          const parsed = Date.parse(value);
          if (isNaN(parsed)) {
            errors.push(`${def.label} must be a valid date`);
          }
        } else {
          errors.push(`${def.label} must be a valid date`);
        }
        break;

      case "select":
        if (def.options && def.options.length > 0) {
          const strValue = String(value);
          if (!def.options.includes(strValue)) {
            errors.push(
              `${def.label} must be one of: ${def.options.join(", ")}`
            );
          }
        }
        break;

      case "text":
      default:
        // Text type — anything is fine as long as it's present
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Coerce raw custom field values (e.g. from CSV) into the correct JS types
 * based on their definitions. Returns a new object with coerced values.
 */
export function coerceCustomFields(
  customFields: Record<string, any>,
  definitions: FieldDefinition[]
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const def of definitions) {
    const value = customFields[def.fieldName];
    if (value === undefined || value === null) continue;

    switch (def.type) {
      case "number": {
        const num = Number(value);
        if (!isNaN(num)) result[def.fieldName] = num;
        else result[def.fieldName] = value; // Keep as-is; validation will flag it
        break;
      }
      case "boolean": {
        const str = String(value).toLowerCase();
        if (str === "true" || value === 1) result[def.fieldName] = true;
        else if (str === "false" || value === 0) result[def.fieldName] = false;
        else result[def.fieldName] = value;
        break;
      }
      case "date": {
        if (typeof value === "number" && value > 0) {
          result[def.fieldName] = value; // Already a timestamp
        } else if (typeof value === "string") {
          const parsed = Date.parse(value);
          if (!isNaN(parsed)) result[def.fieldName] = parsed;
          else result[def.fieldName] = value;
        } else {
          result[def.fieldName] = value;
        }
        break;
      }
      case "select":
      case "text":
      default:
        result[def.fieldName] = String(value);
        break;
    }
  }

  // Copy any keys not in definitions as-is (they might be from unmapped columns)
  for (const [key, value] of Object.entries(customFields)) {
    if (!(key in result)) {
      result[key] = value;
    }
  }

  return result;
}
