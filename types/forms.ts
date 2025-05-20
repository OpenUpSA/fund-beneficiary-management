export type FieldType = "string" | "number" | "textarea" | "email" | "datepicker" | "radio";

export interface Form {
  title: string;
  sections: Section[];
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface Field {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  min?: number;
  options?: FieldOption[];
}

export interface Section {
  title: string;
  fields: Field[];
}

export type FormData = Record<string, string>

export const validTypes = ["string", "number", "textarea", "email", "datepicker", "radio"] as const
