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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { ArrowLeft, CalendarIcon, Check, ChevronsUpDown, FilePlus, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { FormTemplateWithRelations, LocalDevelopmentAgencyListItem } from "@/types/models"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import { cn } from "@/lib/utils"

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
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // LDA selection state
  const [ldaOpen, setLdaOpen] = useState(false)
  const [selectedLDA, setSelectedLDA] = useState<string>("")
  
  // Template selection state
  const [templateOpen, setTemplateOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  
  // Form fields
  const [amount, setAmount] = useState<string>("")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [fundingStart, setFundingStart] = useState<Date | undefined>(undefined)
  const [fundingEnd, setFundingEnd] = useState<Date | undefined>(undefined)

  // Get selected items for display
  const selectedLDAData = ldas.find(l => String(l.id) === selectedLDA)
  const selectedTemplateData = formTemplates.find(t => String(t.id) === selectedTemplate)
  const sidebarConfig: SidebarConfig = selectedTemplateData?.sidebarConfig as SidebarConfig || {}

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

      const result = await response.json()
      toast.success("Form created successfully")
      
      // Navigate to the new form
      router.push(`/dashboard/ldas/${selectedLDA}/forms/${result.id}`)
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
            Create Form
          </CardTitle>
          <CardDescription>
            Create a new form for any {LDA_TERMINOLOGY.shortName} using any active template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* LDA Selection - Searchable */}
          <div className="space-y-2">
            <Label>{LDA_TERMINOLOGY.shortName}</Label>
            <Popover open={ldaOpen} onOpenChange={setLdaOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={ldaOpen}
                  className="w-full justify-between"
                >
                  {selectedLDAData ? selectedLDAData.name : `Select ${LDA_TERMINOLOGY.shortName}...`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder={`Search ${LDA_TERMINOLOGY.shortNamePlural}...`} />
                  <CommandList>
                    <CommandEmpty>No {LDA_TERMINOLOGY.shortName} found.</CommandEmpty>
                    <CommandGroup>
                      {ldas.map((lda) => (
                        <CommandItem
                          key={lda.id}
                          value={lda.name}
                          onSelect={() => {
                            setSelectedLDA(String(lda.id))
                            setLdaOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedLDA === String(lda.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {lda.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Template Selection - Searchable */}
          <div className="space-y-2">
            <Label>Form Template</Label>
            <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={templateOpen}
                  className="w-full justify-between"
                >
                  {selectedTemplateData ? selectedTemplateData.name : "Select template..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search templates..." />
                  <CommandList>
                    <CommandEmpty>No template found.</CommandEmpty>
                    <CommandGroup>
                      {formTemplates.map((template) => (
                        <CommandItem
                          key={template.id}
                          value={template.name}
                          onSelect={() => {
                            setSelectedTemplate(String(template.id))
                            setTemplateOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedTemplate === String(template.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{template.name}</span>
                            {template.description && (
                              <span className="text-xs text-muted-foreground">{template.description}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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

              {/* Funding Start Date */}
              {sidebarConfig.startDate && (
                <div className="space-y-2">
                  <Label>Funding Start Date</Label>
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

              {/* Funding End Date */}
              {sidebarConfig.endDate && (
                <div className="space-y-2">
                  <Label>Funding End Date</Label>
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
                  Creating...
                </>
              ) : (
                "Create Form"
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
