"use client"

import { Field } from "@/types/forms"

interface DataTableLayoutProps {
  inputField: Field
}

interface Column {
  label: string
  value: string
}

type DataTableRow = Record<string, string | number | boolean | null | undefined>

    

export function DataTableLayout({
  inputField
}: DataTableLayoutProps) {
  // Extract data and columns configuration from the field
  let tableData: DataTableRow[] = []
  
  // Since we know the exact structure of config.columns, we can use a more direct approach
  // Define a type for the raw column data from config
  type RawColumn = { label: string; value: string }
  
  // Extract columns with proper typing
  const columnsConfig: Column[] = Array.isArray(inputField?.config?.columns)
    ? (inputField.config.columns as RawColumn[]).map(item => ({
        label: item.label,
        value: item.value
      }))
    : []

  try {
    if (inputField.value) {
      tableData = JSON.parse(inputField.value) as DataTableRow[]
    }
  } catch (error) {
    console.error("Error parsing data table data:", error)
  }

  return (
    <div className="space-y-8">
      <div className="px-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">{inputField.label} ({tableData.length})</h2>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  {columnsConfig.map((column) => (
                    <th key={column.value} className="px-6 py-3 text-left text-sm font-medium text-slate-700">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tableData.length > 0 ? (
                  tableData.map((row, index) => (
                    <tr key={index} className="bg-white">
                      {columnsConfig.map((column) => (
                        <td key={`${index}-${column.value}`} className="px-6 py-4 text-sm text-slate-900">
                          {row[column.value]}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white">
                    <td colSpan={columnsConfig.length} className="px-6 py-4 text-sm text-slate-500 text-center">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}