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
  fields: Field[];
}