export type FieldType = "string" | "number" | "textarea" | "email";

export interface Form {
  title: string;
  sections: Section[];
}

export interface Field {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  min?: number;
}

export interface Section {
  title: string;
  description?: string;
  fields: Field[];
}

export type FormData = Record<string, string | number | boolean | null | undefined>

export const validTypes = ["string", "number", "textarea", "email"] as const
