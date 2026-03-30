"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Calendar as CalendarIcon, Check, ChevronsUpDown, Edit, Loader2, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LocalDevelopmentAgencyFull } from "@/types/models"
import { LDA_TERMINOLOGY } from "@/constants/lda"

interface ReportSchedulesPanelProps {
  ldas: LocalDevelopmentAgencyFull[]
  onBack: () => void
}

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
  applicationTemplate: { id: number; name: string }
  reportTemplate: { id: number; name: string }
  frequency: string
  availableDaysBefore: number
  dueDaysAfterPeriodEnd: number
  active: boolean
  periodSchedules: PeriodSchedule[]
}

interface GeneratedReport {
  id: number
  title: string
  localDevelopmentAgency: { id: number; name: string }
  formTemplate: { id: number; name: string }
  formStatus: { id: number; label: string }
  fundingStart: string
  fundingEnd: string
  dueDate: string
  createdAt: string
}

export function ReportSchedulesPanel({ ldas, onBack }: ReportSchedulesPanelProps) {
  const [loading, setLoading] = useState(true)
  const [configs, setConfigs] = useState<ReportConfig[]>([])
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([])
  const [selectedLDA, setSelectedLDA] = useState<string>("all")
  const [ldaOpen, setLdaOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<PeriodSchedule | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    availableDate: undefined as Date | undefined,
    dueDate: undefined as Date | undefined,
    note: ""
  })

  const selectedLDAData = ldas.find(l => String(l.id) === selectedLDA)

  // Refetch configs after updates
  const refetchConfigs = async () => {
    try {
      const response = await fetch('/api/report-schedule-config')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setConfigs(data)
    } catch (error) {
      console.error('Error fetching configs:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/report-schedule-config')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setConfigs(data)
      } catch (error) {
        console.error('Error fetching configs:', error)
        toast.error('Failed to load report schedules')
      }
      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    const loadReports = async () => {
      try {
        let url = '/api/lda-form?templateType=REPORT'
        if (selectedLDA !== 'all') {
          url = `/api/lda/${selectedLDA}/lda-form?templateType=REPORT`
        }
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setGeneratedReports(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching reports:', error)
      }
    }
    loadReports()
  }, [selectedLDA])

  // Get upcoming schedules (next 6 months)
  const getUpcomingSchedules = () => {
    const today = new Date()
    const sixMonthsLater = new Date()
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6)

    const upcoming: (PeriodSchedule & { config: ReportConfig })[] = []
    
    configs.forEach(config => {
      if (!config.active) return
      config.periodSchedules.forEach(schedule => {
        const availableDate = new Date(schedule.availableDate)
        if (availableDate >= today && availableDate <= sixMonthsLater) {
          upcoming.push({ ...schedule, config })
        }
      })
    })

    return upcoming.sort((a, b) => 
      new Date(a.availableDate).getTime() - new Date(b.availableDate).getTime()
    )
  }

  // Get past schedules
  const getPastSchedules = () => {
    const today = new Date()
    const past: (PeriodSchedule & { config: ReportConfig })[] = []
    
    configs.forEach(config => {
      config.periodSchedules.forEach(schedule => {
        const dueDate = new Date(schedule.dueDate)
        if (dueDate < today) {
          past.push({ ...schedule, config })
        }
      })
    })

    return past.sort((a, b) => 
      new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    ).slice(0, 50) // Last 50
  }

  const handleEditSchedule = (schedule: PeriodSchedule) => {
    setEditingSchedule(schedule)
    setEditForm({
      availableDate: new Date(schedule.availableDate),
      dueDate: new Date(schedule.dueDate),
      note: schedule.note || ""
    })
    setEditDialogOpen(true)
  }

  const handleSaveSchedule = async () => {
    if (!editingSchedule) return
    
    setSaving(true)
    try {
      // Find the config that contains this schedule
      const config = configs.find(c => 
        c.periodSchedules.some(s => s.id === editingSchedule.id)
      )
      
      if (!config) throw new Error('Config not found')

      const response = await fetch(`/api/report-schedule-config/${config.id}/schedule/${editingSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableDate: editForm.availableDate?.toISOString(),
          dueDate: editForm.dueDate?.toISOString(),
          note: editForm.note || null,
          isCustomized: true
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update')
      }

      toast.success('Schedule updated')
      setEditDialogOpen(false)
      refetchConfigs()
    } catch (error) {
      console.error('Error updating schedule:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const triggerCronManually = async () => {
    if (!confirm('This will run the report generation cron job. Continue?')) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/cron/generate-reports')
      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Cron completed: ${result.results?.created || 0} reports created, ${result.results?.skipped || 0} skipped`)
        // Reports will refresh on next filter change
      } else {
        throw new Error(result.error || 'Cron failed')
      }
    } catch (error) {
      console.error('Error running cron:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to run cron')
    } finally {
      setLoading(false)
    }
  }

  const upcomingSchedules = getUpcomingSchedules()
  const pastSchedules = getPastSchedules()

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Tools
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Report Schedules
              </CardTitle>
              <CardDescription>
                View and manage upcoming report schedules and past generated reports
              </CardDescription>
            </div>
            <Button onClick={triggerCronManually} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Run Cron Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="upcoming">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming ({upcomingSchedules.length})</TabsTrigger>
                <TabsTrigger value="past">Past Schedules</TabsTrigger>
                <TabsTrigger value="generated">Generated Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-4">
                {upcomingSchedules.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No upcoming schedules in the next 6 months</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report Template</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Available Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingSchedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell>{schedule.config.reportTemplate.name}</TableCell>
                          <TableCell>
                            {schedule.config.frequency === 'QUARTERLY' ? `Q${schedule.period}` : `P${schedule.period}`} {schedule.year}
                          </TableCell>
                          <TableCell>{format(new Date(schedule.availableDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{format(new Date(schedule.dueDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {schedule.isCustomized ? (
                              <Badge variant="secondary">Customized</Badge>
                            ) : (
                              <Badge variant="outline">Default</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleEditSchedule(schedule)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-4">
                {pastSchedules.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No past schedules</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report Template</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Period Dates</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastSchedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell>{schedule.config.reportTemplate.name}</TableCell>
                          <TableCell>
                            {schedule.config.frequency === 'QUARTERLY' ? `Q${schedule.period}` : `P${schedule.period}`} {schedule.year}
                          </TableCell>
                          <TableCell>
                            {format(new Date(schedule.periodStart), 'MMM d')} - {format(new Date(schedule.periodEnd), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{format(new Date(schedule.dueDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Completed</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="generated" className="mt-4 space-y-4">
                {/* LDA Filter */}
                <div className="flex items-center gap-4">
                  <Label>Filter by {LDA_TERMINOLOGY.shortName}:</Label>
                  <Popover open={ldaOpen} onOpenChange={setLdaOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-[300px] justify-between">
                        {selectedLDA === 'all' ? `All ${LDA_TERMINOLOGY.shortNamePlural}` : selectedLDAData?.name || 'Select...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder={`Search ${LDA_TERMINOLOGY.shortNamePlural}...`} />
                        <CommandList>
                          <CommandEmpty>No results found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="all" onSelect={() => { setSelectedLDA('all'); setLdaOpen(false) }}>
                              <Check className={cn("mr-2 h-4 w-4", selectedLDA === 'all' ? "opacity-100" : "opacity-0")} />
                              All {LDA_TERMINOLOGY.shortNamePlural}
                            </CommandItem>
                            {ldas.map((lda) => (
                              <CommandItem
                                key={lda.id}
                                value={lda.name}
                                onSelect={() => { setSelectedLDA(String(lda.id)); setLdaOpen(false) }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedLDA === String(lda.id) ? "opacity-100" : "opacity-0")} />
                                {lda.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {generatedReports.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No generated reports found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{LDA_TERMINOLOGY.shortName}</TableHead>
                        <TableHead>Report</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>{report.localDevelopmentAgency?.name}</TableCell>
                          <TableCell>{report.title}</TableCell>
                          <TableCell>
                            {format(new Date(report.fundingStart), 'MMM d')} - {format(new Date(report.fundingEnd), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{format(new Date(report.dueDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={report.formStatus?.label === 'Approved' ? 'default' : 'secondary'}>
                              {report.formStatus?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(report.createdAt), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Edit Schedule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Customize the dates for this reporting period
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Available Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editForm.availableDate ? format(editForm.availableDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editForm.availableDate}
                    onSelect={(date) => setEditForm(prev => ({ ...prev, availableDate: date }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editForm.dueDate ? format(editForm.dueDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editForm.dueDate}
                    onSelect={(date) => setEditForm(prev => ({ ...prev, dueDate: date }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                value={editForm.note}
                onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="e.g., Holiday adjustment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
