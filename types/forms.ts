export type FieldType = "string" | "number" | "textarea" | "email" | "text" | "radio" | "group" | "select" | "date" | "currency" | "repeatable" | "multiselect" | "fileUpload" | "toggle";

export interface Form {
  title: string;
  sections: Section[];
}

export interface DependsOnRule {
  when: string;
  options?: { value: string; label: string }[];
  enabled?: boolean;
  label?: string;
}

export interface DependsOn {
  field: string;
  rules?: DependsOnRule[];
  enabled_when?: string | string[];
  disabled_when?: string | string[];
  default_disabled?: boolean;
  default_options?: { value: string; label: string }[];
  label?: string;
}

export interface Field {
  name: string;
  type: FieldType;
  notice?: string;
  label: string;
  required?: boolean;
  description?: string;
  isValid?: boolean;
  min?: number;
  max?: number;
  show_if?: { field: string; value: string };
  depends_on?: DependsOn;
  value?: string;
  fields?: Field[];
  template?: Field[];
  cardLabel?: string;
  layout?: string;
  width?: "half" | "full"; // Add width property to control column width
  prefill?: { source: string; path: string };
  options?: { value: string; label: string }[];
  placeholder?: string;
  icon?: string;
  show?: boolean;
  groupIndex?: number;
  isLast?: boolean;
  config?: Record<string, string | number | boolean | string[] | Record<string, unknown>[] | Record<string, unknown>>; // For custom component configurations
}

export interface Section {
  title: string;
  description?: string;
  notice?: string;
  fields: Field[];
  editable_by?: string[];
}

export type FormData = Record<string, string | number | boolean | null | undefined>

export const validTypes = ["string", "number", "textarea", "email", "text", "radio", "select", "date", "currency"] as const
