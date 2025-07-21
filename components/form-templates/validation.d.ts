/**
 * TypeScript definitions for validation utility functions
 */
import { ValidationResult, FieldSchema } from "@/types/forms";

export interface FieldValidationSchema {
  type: string;
  required?: boolean;
  label?: string;
  errorMessage?: string;
  schema?: Record<string, FieldValidationSchema>;
  [key: string]: unknown;
}

/**
 * Main validation function that checks if a response is valid for a given field
 */
export function validateResponse(response: unknown, field: FieldSchema): ValidationResult;

/**
 * Type-specific validation functions
 */
export function isValidEmail(email: string): ValidationResult;
export function isValidUrl(url: string): ValidationResult;
export function isValidDate(dateStr: string): ValidationResult;
export function isValidTime(timeStr: string): ValidationResult;
export function isValidNumber(value: string | number): ValidationResult;
export function isValidSelection(value: string | string[]): ValidationResult;
export function isValidCheckbox(value: boolean | string[]): ValidationResult;
export function isValidCustomerDetail(customerDetail: Record<string, unknown>, schema: Record<string, FieldSchema>): ValidationResult;
export function isValidByType(value: unknown, type: string, fieldSchema?: FieldSchema): ValidationResult;
