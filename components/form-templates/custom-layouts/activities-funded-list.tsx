"use client"

import { Field } from "@/types/forms"
import { useState, useEffect, useMemo } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"

interface ActivitiesFundedListProps {
  inputField: Field
  lda_id?: number
  lda_form_id?: number | string
}

interface QuarterForm {
  id: number
  title: string
  templateName: string
  templateType: string
  status: string
  activityDate: string | null
  fundingStart: string
  fundingEnd: string
  amount: string
}

export function ActivitiesFundedList({ inputField, lda_id, lda_form_id }: ActivitiesFundedListProps) {
  const [forms, setForms] = useState<QuarterForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [reportDates, setReportDates] = useState<{ fundingStart: string; fundingEnd: string } | null>(null)

  // Memoize config values to prevent infinite loops
  const formCategoriesStr = useMemo(() => 
    ((inputField.config?.formCategories as string[]) || []).join(","), 
    [inputField.config?.formCategories]
  )

  // Fetch report dates from the parent form
  useEffect(() => {
    if (!lda_form_id) return

    const fetchReportDates = async () => {
      try {
        const res = await fetch(`/api/lda-form/${lda_form_id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.fundingStart && data.fundingEnd) {
            setReportDates({
              fundingStart: data.fundingStart,
              fundingEnd: data.fundingEnd
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch report dates:", error)
      }
    }

    fetchReportDates()
  }, [lda_form_id])

  // Fetch forms when we have dates
  useEffect(() => {
    if (!lda_id || !reportDates) {
      if (!lda_id) setIsLoading(false)
      return
    }

    const fetchForms = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          quarterStart: reportDates.fundingStart.split('T')[0],
          quarterEnd: reportDates.fundingEnd.split('T')[0],
        })
        // Only add filter if it has values
        if (formCategoriesStr) params.set('formCategories', formCategoriesStr)
        const res = await fetch(`/api/lda/${lda_id}/quarter-forms?${params}`)
        if (res.ok) {
          const data = await res.json()
          setForms(data)
        }
      } catch (error) {
        console.error("Failed to fetch forms:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchForms()
  }, [lda_id, reportDates, formCategoriesStr])

  if (!inputField.show) return null

  return (
    <div className="space-y-2 px-4 mb-4">
      <h3 className="text-lg font-medium text-slate-900">{inputField.label}</h3>
      <p className="text-sm text-slate-500 mb-3">
        These activities have been pulled from the FRIS and DFT reports you have submitted during this reporting period.
      </p>

      {isLoading ? (
        <div className="text-sm text-slate-400">Loading activities...</div>
      ) : forms.length === 0 ? (
        <div className="text-sm text-slate-400 italic p-3 bg-slate-50 rounded-md">
          No activities found for this period.
        </div>
      ) : (
        <div className="space-y-2">
          {forms.map((form) => (
            <div key={form.id} className="border rounded-md overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3 py-4 text-left transition-colors"
                onClick={() => setExpandedId(expandedId === form.id ? null : form.id)}
              >
                <div className="flex-1">
                  <span className="text-sm text-slate-900">
                    <strong>{form.templateName?.includes('FRIS') ? 'FRIS Event' : form.templateName?.includes('DFT') ? 'DFT Event' : form.templateName}</strong> - {form.title}
                    {form.activityDate && (
                      <>
                        {" "}
                        ({format(new Date(form.activityDate), "d MMM, yyyy")})
                      </>
                    )}
                  </span>
                  
                </div>
                {expandedId === form.id ? (
                  <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                )}
              </button>
              {expandedId === form.id && (
                <div className="p-4 border-t bg-white space-y-1">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Status:</span> {form.status}
                  </p>
                  {form.activityDate && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Activity Date:</span> {format(new Date(form.activityDate), "d MMM yyyy")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
