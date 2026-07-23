"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { ArrowLeft, CalendarIcon, FilePlus, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { FormTemplateWithRelations, LocalDevelopmentAgencyListItem } from "@/types/models"
import { LDA_TERMINOLOGY } from "@/constants/lda"

interface CreateFormPanelProps {
  ldas: LocalDevelopmentAgencyListItem[]
  formTemplates: FormTemplateWithRelations[]
  onBack: () => void
}

interface SidebarConfig {
  amount?: boolean
  status?: boolean
  startDate?: boolean
  endDate?: boolean
  dueDate?: boolean
}

export function CreateFormPanel({ ldas, formTemplates, onBack }: CreateFormPanelProps) {
  const [loading, setLoading] = useState(false)
  
  // LDA selection state
  const [selectedLDA, setSelectedLDA] = useState<string>("")

  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  
  // Form fields
  const [amount, setAmount] = useState<string>("")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [fundingStart, setFundingStart] = useState<Date | undefined>(undefined)
  const [fundingEnd, setFundingEnd] = useState<Date | undefined>(undefined)

  // Get selected items for display
  const selectedTemplateData = formTemplates.find(t => String(t.id) === selectedTemplate)
  const sidebarConfig: SidebarConfig = selectedTemplateData?.sidebarConfig as SidebarConfig || {}
  const isReportType = selectedTemplateData?.templateType === 'REPORT'
  
  // Context-aware labels based on form type
  const startDateLabel = isReportType ? 'Reporting Start Date' : 'Funding Start Date'
  const endDateLabel = isReportType ? 'Reporting End Date' : 'Funding End Date'

  const handleSubmit = async () => {
    if (!selectedLDA || !selectedTemplate) {
      toast.error("Please select an LDA and a form template")
      return
    }

    setLoading(true)

    try {
      const payload: Record<string, unknown> = {
        localDevelopmentAgencyId: parseInt(selectedLDA, 10),
        formTemplateId: parseInt(selectedTemplate, 10),
        formData: {},
      }

      // Add optional fields based on sidebar config
      if (sidebarConfig.amount && amount) {
        payload.amount = parseFloat(amount)
      }
      if (sidebarConfig.dueDate && dueDate) {
        payload.dueDate = dueDate.toISOString()
      }
      if (sidebarConfig.startDate && fundingStart) {
        payload.fundingStart = fundingStart.toISOString()
      }
      if (sidebarConfig.endDate && fundingEnd) {
        payload.fundingEnd = fundingEnd.toISOString()
      }

      const response = await fetch('/api/lda-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create form')
      }
      toast.success("Form created successfully")
    } catch (error) {
      console.error('Error creating form:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create form')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedLDA("")
    setSelectedTemplate("")
    setAmount("")
    setDueDate(undefined)
    setFundingStart(undefined)
    setFundingEnd(undefined)
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Tools
      </Button>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilePlus className="h-5 w-5" />
            Assign Form
          </CardTitle>
          <CardDescription>
            Assign a form to any {LDA_TERMINOLOGY.shortName} using any active template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* LDA Selection - Searchable */}
          <div className="space-y-2">
            <Label>{LDA_TERMINOLOGY.shortName}</Label>
            <Combobox
              options={ldas.map((lda) => ({
                value: String(lda.id),
                label: lda.name,
              }))}
              value={selectedLDA}
              onChange={setSelectedLDA}
              placeholder={`Select ${LDA_TERMINOLOGY.shortName}...`}
              searchPlaceholder={`Search ${LDA_TERMINOLOGY.shortNamePlural}...`}
              emptyText={`No ${LDA_TERMINOLOGY.shortName} found.`}
            />
          </div>

          {/* Template Selection - Searchable */}
          <div className="space-y-2">
            <Label>Form Template</Label>
            <Combobox
              options={formTemplates.map((template) => ({
                value: String(template.id),
                label: template.name,
                description: template.description ?? undefined,
              }))}
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              placeholder="Select template..."
              searchPlaceholder="Search templates..."
              emptyText="No template found."
            />
          </div>

          {/* Conditional fields based on template sidebar config */}
          {selectedTemplate && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Form Options</h4>
              
              {/* Amount */}
              {sidebarConfig.amount && (
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              )}

              {/* Due Date */}
              {sidebarConfig.dueDate && (
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : "Select due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Start Date */}
              {sidebarConfig.startDate && (
                <div className="space-y-2">
                  <Label>{startDateLabel}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fundingStart ? format(fundingStart, "PPP") : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fundingStart}
                        onSelect={setFundingStart}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* End Date */}
              {sidebarConfig.endDate && (
                <div className="space-y-2">
                  <Label>{endDateLabel}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fundingEnd ? format(fundingEnd, "PPP") : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fundingEnd}
                        onSelect={setFundingEnd}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Show message if no options available */}
              {!sidebarConfig.amount && !sidebarConfig.dueDate && !sidebarConfig.startDate && !sidebarConfig.endDate && (
                <p className="text-sm text-muted-foreground">No additional options for this template.</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedLDA || !selectedTemplate}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Form"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
