"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { CalendarIcon, PlusIcon, SettingsIcon, Trash2Icon } from "lucide-react"
import { FormTemplate } from "@prisma/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type ReportFrequency = "MONTHLY" | "QUARTERLY" | "BIANNUALLY" | "ANNUALLY"

interface PeriodSchedule {
  id: number
  year: number
  period: number
  periodStart: string
  periodEnd: string
  availableDate: string
  dueDate: string
  isCustomized: boolean
  note: string | null
}

interface ReportConfig {
  id: number
  applicationTemplateId: number
  reportTemplateId: number
  frequency: ReportFrequency
  availableDaysBefore: number
  dueDaysAfterPeriodEnd: number
  active: boolean
  applicationTemplate: { id: number; name: string }
  reportTemplate: { id: number; name: string }
  periodSchedules: PeriodSchedule[]
}

interface ReportScheduleConfigProps {
  applicationTemplate: FormTemplate
  reportTemplates: FormTemplate[]
}

const frequencyOptions = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "BIANNUALLY", label: "Every 6 months" },
  { value: "ANNUALLY", label: "Annually" },
]

const getPeriodLabel = (frequency: ReportFrequency, period: number): string => {
  switch (frequency) {
    case "MONTHLY":
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return months[period - 1] || `Month ${period}`
    case "QUARTERLY":
      return `Q${period}`
    case "BIANNUALLY":
      return period === 1 ? "H1 (Jan-Jun)" : "H2 (Jul-Dec)"
    case "ANNUALLY":
      return "Full Year"
    default:
      return `Period ${period}`
  }
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const formatDateForInput = (dateStr: string): string => {
  return new Date(dateStr).toISOString().split("T")[0]
}

export function ReportScheduleConfigDialog({
  applicationTemplate,
  reportTemplates,
}: ReportScheduleConfigProps) {
  const [open, setOpen] = useState(false)
  const [configs, setConfigs] = useState<ReportConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // New config form state
  const [newConfig, setNewConfig] = useState({
    reportTemplateId: "",
    frequency: "QUARTERLY" as ReportFrequency,
    availableDaysBefore: 14,
    dueDaysAfterPeriodEnd: 0,
  })

  // Fetch existing configs when dialog opens
  useEffect(() => {
    if (open) {
      fetchConfigs()
    }
  }, [open])

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/report-schedule-config?applicationTemplateId=${applicationTemplate.id}`
      )
      if (res.ok) {
        const data = await res.json()
        setConfigs(data)
      }
    } catch (error) {
      console.error("Failed to fetch configs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddConfig = async () => {
    if (!newConfig.reportTemplateId) {
      toast({ title: "Please select a report template", variant: "destructive" })
      return
    }

    try {
      toast({ title: "Creating schedule config...", variant: "processing" })

      const res = await fetch("/api/report-schedule-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationTemplateId: applicationTemplate.id,
          reportTemplateId: parseInt(newConfig.reportTemplateId),
          frequency: newConfig.frequency,
          availableDaysBefore: newConfig.availableDaysBefore,
          dueDaysAfterPeriodEnd: newConfig.dueDaysAfterPeriodEnd,
          generateForYear: new Date().getFullYear(),
        }),
      })

      if (res.ok) {
        toast({ title: "Schedule config created", variant: "success" })
        setShowAddForm(false)
        setNewConfig({
          reportTemplateId: "",
          frequency: "QUARTERLY",
          availableDaysBefore: 14,
          dueDaysAfterPeriodEnd: 0,
        })
        fetchConfigs()
      } else {
        const error = await res.json()
        toast({ title: error.error || "Failed to create", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Failed to create config", variant: "destructive" })
    }
  }

  const handleDeleteConfig = async (configId: number) => {
    if (!confirm("Are you sure you want to delete this schedule config?")) return

    try {
      const res = await fetch(`/api/report-schedule-config/${configId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast({ title: "Config deleted", variant: "success" })
        fetchConfigs()
      } else {
        toast({ title: "Failed to delete", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Failed to delete", variant: "destructive" })
    }
  }

  const handleUpdateSchedule = async (
    configId: number,
    scheduleId: number,
    field: "availableDate" | "dueDate",
    value: string
  ) => {
    try {
      const res = await fetch(`/api/report-schedule-config/${configId}/schedules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          [field]: new Date(value).toISOString(),
        }),
      })

      if (res.ok) {
        toast({ title: "Schedule updated", variant: "success" })
        fetchConfigs()
      } else {
        toast({ title: "Failed to update", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" })
    }
  }

  const handleGenerateYear = async (configId: number, year: number) => {
    try {
      toast({ title: `Generating ${year} schedules...`, variant: "processing" })

      const res = await fetch(`/api/report-schedule-config/${configId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      })

      if (res.ok) {
        toast({ title: `${year} schedules generated`, variant: "success" })
        fetchConfigs()
      } else {
        const error = await res.json()
        toast({ title: error.error || "Failed to generate", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Failed to generate schedules", variant: "destructive" })
    }
  }

  // Group schedules by year
  const groupSchedulesByYear = (schedules: PeriodSchedule[]) => {
    return schedules.reduce((acc, schedule) => {
      if (!acc[schedule.year]) {
        acc[schedule.year] = []
      }
      acc[schedule.year].push(schedule)
      return acc
    }, {} as Record<number, PeriodSchedule[]>)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SettingsIcon className="h-4 w-4 mr-2" />
          Report Schedules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl w-full p-0 gap-0 flex flex-col">
        <DialogHeader className="p-5 border-b">
          <DialogTitle>
            Report Schedule Configuration - {applicationTemplate.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <>
              {/* Existing Configs */}
              {configs.length > 0 ? (
                <div className="space-y-4">
                  {configs.map((config) => {
                    const schedulesByYear = groupSchedulesByYear(config.periodSchedules)
                    const years = Object.keys(schedulesByYear)
                      .map(Number)
                      .sort((a, b) => b - a)
                    const nextYear =
                      years.length > 0 ? Math.max(...years) + 1 : new Date().getFullYear()

                    return (
                      <div key={config.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{config.reportTemplate.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {frequencyOptions.find((f) => f.value === config.frequency)?.label} •
                              Available {config.availableDaysBefore} days before period end •
                              Due {config.dueDaysAfterPeriodEnd === 0
                                ? "on period end"
                                : config.dueDaysAfterPeriodEnd > 0
                                ? `${config.dueDaysAfterPeriodEnd} days after period end`
                                : `${Math.abs(config.dueDaysAfterPeriodEnd)} days before period end`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateYear(config.id, nextYear)}
                            >
                              <PlusIcon className="h-4 w-4 mr-1" />
                              Generate {nextYear}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteConfig(config.id)}
                            >
                              <Trash2Icon className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {/* Schedules by Year */}
                        <Accordion type="multiple" defaultValue={[new Date().getFullYear().toString()]}>
                          {years.map((year) => (
                            <AccordionItem key={year} value={year.toString()}>
                              <AccordionTrigger className="text-sm font-medium">
                                {year} Schedule
                              </AccordionTrigger>
                              <AccordionContent>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Period</TableHead>
                                      <TableHead>Period Dates</TableHead>
                                      <TableHead>Available Date</TableHead>
                                      <TableHead>Due Date</TableHead>
                                      <TableHead></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {schedulesByYear[year].map((schedule) => (
                                      <TableRow key={schedule.id}>
                                        <TableCell className="font-medium">
                                          {getPeriodLabel(config.frequency, schedule.period)}
                                          {schedule.isCustomized && (
                                            <Badge variant="outline" className="ml-2 text-xs">
                                              Customized
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                          {formatDate(schedule.periodStart)} -{" "}
                                          {formatDate(schedule.periodEnd)}
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="date"
                                            className="w-36"
                                            defaultValue={formatDateForInput(schedule.availableDate)}
                                            onBlur={(e) =>
                                              handleUpdateSchedule(
                                                config.id,
                                                schedule.id,
                                                "availableDate",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="date"
                                            className="w-36"
                                            defaultValue={formatDateForInput(schedule.dueDate)}
                                            onBlur={(e) =>
                                              handleUpdateSchedule(
                                                config.id,
                                                schedule.id,
                                                "dueDate",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {schedule.note && (
                                            <span className="text-xs text-muted-foreground">
                                              {schedule.note}
                                            </span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No report schedules configured yet.
                </div>
              )}

              {/* Add New Config Form */}
              {showAddForm ? (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                  <h3 className="font-medium">Add Report Schedule</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Report Template</Label>
                      <Select
                        value={newConfig.reportTemplateId}
                        onValueChange={(val) =>
                          setNewConfig({ ...newConfig, reportTemplateId: val })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select report template" />
                        </SelectTrigger>
                        <SelectContent>
                          {reportTemplates
                            .filter((t) => t.templateType === "REPORT")
                            .map((t) => (
                              <SelectItem key={t.id} value={t.id.toString()}>
                                {t.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select
                        value={newConfig.frequency}
                        onValueChange={(val) =>
                          setNewConfig({ ...newConfig, frequency: val as ReportFrequency })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencyOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Available (days before period end)</Label>
                      <Input
                        type="number"
                        value={newConfig.availableDaysBefore}
                        onChange={(e) =>
                          setNewConfig({
                            ...newConfig,
                            availableDaysBefore: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Due (days after period end)</Label>
                      <Input
                        type="number"
                        value={newConfig.dueDaysAfterPeriodEnd}
                        onChange={(e) =>
                          setNewConfig({
                            ...newConfig,
                            dueDaysAfterPeriodEnd: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Use negative for before period end (e.g., -15 for 15 days before)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddConfig}>Create Schedule</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowAddForm(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Report Schedule
                </Button>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-4 pb-4 pt-2 border-t">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
