export type FieldType = "string" | "number" | "textarea" | "email" | "text" | "radio" | "group" | "select" | "date" | "currency";

export interface Form {
  title: string;
  sections: Section[];
}

export interface Field {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  isValid?: boolean;
  min?: number;
  max?: number;
  show_if?: { field: string; value: string };
  value?: string;
  fields?: Field[];
  layout?: string;
  width?: "half" | "full"; // Add width property to control column width
  prefill?: { source: string; path: string };
  options?: { value: string; label: string }[];
  placeholder?: string;
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
