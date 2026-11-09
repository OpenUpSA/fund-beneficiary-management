"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowLeft, FileClock, Loader2, RefreshCw } from "lucide-react"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface UpcomingReport {
  parentId: number
  parentTitle: string
  ldaId: number
  ldaName: string
  reportName: string
  label: string
  opensOn: string
  dueOn: string
}

interface RunResult {
  created: number
  skipped: number
  errors: string[]
  createdReports: Array<{ id: number; title: string }>
}

// Report dates are UTC calendar days
const day = (iso: string) => format(new Date(iso.slice(0, 10) + "T12:00:00"), "d MMM yyyy")

/** Admin overview of report generation: run the daily job now and see what opens next. */
export function ReportsPanel({ onBack }: { onBack: () => void }) {
  const [upcoming, setUpcoming] = useState<UpcomingReport[] | null>(null)
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<RunResult | null>(null)

  const load = useCallback(() => {
    fetch("/api/report-rule/upcoming?days=90")
      .then((res) => (res.ok ? res.json() : []))
      .then(setUpcoming)
      .catch(() => setUpcoming([]))
  }, [])

  useEffect(load, [load])

  async function runNow() {
    setRunning(true)
    try {
      const response = await fetch("/api/cron/generate-reports", { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Report generation failed")
      setLastRun(result)
      toast.success(result.created === 1 ? "1 report created" : `${result.created} reports created`)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Report generation failed")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Tools
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileClock className="h-5 w-5" />
                Reports
              </CardTitle>
              <CardDescription>
                Reports come from the report rules on each{" "}
                <Link href="/dashboard/form-templates/categories" className="underline">form category</Link>.
                A daily job creates periodic reports as they open and catches up any it missed;
                reports after a status are created when the status changes.
              </CardDescription>
            </div>
            <Button onClick={runNow} variant="outline" className="gap-2" disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run now
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {lastRun && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <p className="font-medium">
                Created {lastRun.created} report{lastRun.created === 1 ? "" : "s"}
                {lastRun.skipped > 0 && `, skipped ${lastRun.skipped} already created`}
              </p>
              {lastRun.createdReports.length > 0 && (
                <p className="text-muted-foreground">{lastRun.createdReports.map((r) => r.title).join(", ")}</p>
              )}
              {lastRun.errors.map((error) => (
                <p key={error} className="text-destructive">{error}</p>
              ))}
            </div>
          )}

          <div>
            <h3 className="font-medium mb-2">Opening in the next 90 days</h3>
            {upcoming === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : upcoming.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No reports open in the next 90 days.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>For</TableHead>
                    <TableHead>Opens</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.map((u) => (
                    <TableRow key={`${u.parentId}-${u.reportName}-${u.label}`}>
                      <TableCell>{u.reportName} – {u.label}</TableCell>
                      <TableCell>
                        <span className="font-medium">{u.ldaName}</span>
                        <span className="text-muted-foreground"> · {u.parentTitle}</span>
                      </TableCell>
                      <TableCell>{day(u.opensOn)}</TableCell>
                      <TableCell>{day(u.dueOn)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
