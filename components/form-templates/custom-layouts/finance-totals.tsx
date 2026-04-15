"use client"

import { Field } from "@/types/forms"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Lock, CircleSmall } from "lucide-react"
import { useFormValues } from "@/components/form-templates/form-values-context"
import { useEffect, useRef } from "react"

interface FinanceTotalsLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

function parseNumeric(val: string | undefined): number {
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FinanceTotalsLayout({ inputField, isEditing, onValueChange }: FinanceTotalsLayoutProps) {
  const { values } = useFormValues();
  const prevTotalsRef = useRef<{ income: string; expenditure: string }>({ income: "", expenditure: "" });

  // Get subfields — these have prefixed names (e.g., finance_totals_total_income)
  const subfields = inputField.fields || [];
  const incomeField = subfields.find((f) => f.name.endsWith("total_income"));
  const expenditureField = subfields.find((f) => f.name.endsWith("total_expenditure"));
  const confirmationField = subfields.find((f) => f.name.endsWith("totals_confirmation"));

  // Compute totals from live values — sourceFields use unprefixed names
  const incomeSourceFields = (incomeField?.config?.sourceFields as string[]) || [];
  const expenditureSourceFields = (expenditureField?.config?.sourceFields as string[]) || [];

  const totalIncome = incomeSourceFields.reduce((sum, name) => sum + parseNumeric(values[name]), 0);
  const totalExpenditure = expenditureSourceFields.reduce((sum, name) => sum + parseNumeric(values[name]), 0);

  const incomeStr = String(totalIncome);
  const expenditureStr = String(totalExpenditure);

  // Save computed values and handle unchecking confirmation when totals change
  useEffect(() => {
    const prev = prevTotalsRef.current;
    let changed = false;

    if (prev.income !== incomeStr && incomeField) {
      changed = true;
      if (onValueChange) {
        onValueChange(incomeField, incomeStr);
      }
    }
    if (prev.expenditure !== expenditureStr && expenditureField) {
      changed = true;
      if (onValueChange) {
        onValueChange(expenditureField, expenditureStr);
      }
    }

    // If totals changed and confirmation was checked, uncheck it
    if (changed && prev.income !== "" && prev.expenditure !== "" && confirmationField) {
      const confirmName = confirmationField.name;
      const currentConfirmation = values[confirmName] || confirmationField.value;
      if (currentConfirmation === "true" && onValueChange) {
        onValueChange(confirmationField, "false");
      }
    }

    prevTotalsRef.current = { income: incomeStr, expenditure: expenditureStr };
  }, [incomeStr, expenditureStr, incomeField, expenditureField, confirmationField, onValueChange, values]);

  const confirmName = confirmationField?.name || "";
  const isConfirmed = values[confirmName] === "true" || confirmationField?.value === "true";

  if (!inputField.show) return null;

  return (
    <div className="space-y-4">
      {/* Total Income */}
      <div className="px-4">
        <div className="flex items-center justify-between w-full mb-1">
          <label className="block text-sm font-medium text-slate-900">
            {incomeField?.label || "Total income"}
          </label>
          <div className="flex items-center">
            <CircleSmall className="h-4 w-4 mr-1" fill="#22C55E" strokeWidth={0} />
            <span className="text-slate-700 text-xs">Complete</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span className="text-gray-500">R</span>
          </div>
          <Input
            type="text"
            disabled
            value={formatCurrency(totalIncome)}
            className="pl-8 pr-10 bg-slate-50 text-slate-700"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Total Expenditure */}
      <div className="px-4">
        <div className="flex items-center justify-between w-full mb-1">
          <label className="block text-sm font-medium text-slate-900">
            {expenditureField?.label || "Total expenditure for this period"}
          </label>
          <div className="flex items-center">
            <CircleSmall className="h-4 w-4 mr-1" fill="#22C55E" strokeWidth={0} />
            <span className="text-slate-700 text-xs">Complete</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span className="text-gray-500">R</span>
          </div>
          <Input
            type="text"
            disabled
            value={formatCurrency(totalExpenditure)}
            className="pl-8 pr-10 bg-slate-50 text-slate-700"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Confirmation Checkbox */}
      {confirmationField && (
        <div className="px-4">
          <div className="flex items-start space-x-3 pt-2">
            <Checkbox
              id={confirmName}
              checked={isConfirmed}
              disabled={!isEditing}
              onCheckedChange={(checked) => {
                if (onValueChange) {
                  onValueChange(confirmationField, String(checked));
                }
              }}
              className="mt-0.5"
            />
            <div className="flex items-start justify-between w-full">
              <label
                htmlFor={confirmName}
                className="text-sm font-medium text-gray-700 cursor-pointer leading-snug"
              >
                {confirmationField.label}
              </label>
              <div className="flex items-center flex-shrink-0 ml-2">
                <CircleSmall
                  className="h-4 w-4 mr-1"
                  fill={isConfirmed ? "#22C55E" : "#EF4444"}
                  strokeWidth={0}
                />
                <span className="text-slate-700 text-xs">
                  {isConfirmed ? "Complete" : "Required"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
