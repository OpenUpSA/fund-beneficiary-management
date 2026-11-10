"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowLeft, FileClock, Loader2, RefreshCw } from "lucide-react"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LDA_TERMINOLOGY } from "@/constants/lda"

interface UpcomingReport {
  id: number
  parentId: number
  parentTitle: string
  ldaId: number
  ldaName: string
  reportName: string
  label: string
  opensOn: string
  dueOn: string | null
}

interface RunResult {
  created: number
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
  const [ldaFilter, setLdaFilter] = useState("all")
  const [formFilter, setFormFilter] = useState("all")

  // Filter choices come from what's upcoming: LDAs, then that LDA's forms
  const ldas = useMemo(
    () => [...new Map((upcoming ?? []).map((u) => [u.ldaId, u.ldaName])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [upcoming]
  )
  // Forms of different LDAs can share a title: with all LDAs shown, say whose each one is
  const forms = useMemo(
    () => [...new Map((upcoming ?? [])
      .filter((u) => ldaFilter === "all" || String(u.ldaId) === ldaFilter)
      .map((u) => [u.parentId, ldaFilter === "all" ? `${u.parentTitle} · ${u.ldaName}` : u.parentTitle])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1])),
    [upcoming, ldaFilter]
  )
  const shown = (upcoming ?? []).filter((u) =>
    (ldaFilter === "all" || String(u.ldaId) === ldaFilter) && (formFilter === "all" || String(u.parentId) === formFilter))

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
                Each form&apos;s reports are planned from the reports attached to its{" "}
                <Link href="/dashboard/form-templates/categories" className="underline">form category</Link>.
                A daily job creates them as they open and catches up any it missed; reports after a status are
                created when the status changes. To change a form&apos;s reports, use Reports in its menu in the forms list.
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">Opening in the next 90 days</h3>
              {upcoming && upcoming.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <div className="w-[220px]">
                    <Combobox
                      options={[
                        { value: "all", label: `All ${LDA_TERMINOLOGY.shortNamePlural}` },
                        ...ldas.map(([id, name]) => ({ value: String(id), label: name })),
                      ]}
                      value={ldaFilter}
                      onChange={(value) => { setLdaFilter(value); setFormFilter("all") }}
                      searchPlaceholder={`Search ${LDA_TERMINOLOGY.shortNamePlural}...`}
                      emptyText={`No ${LDA_TERMINOLOGY.shortName} found.`}
                      className="h-8"
                    />
                  </div>
                  <div className="w-[300px]">
                    <Combobox
                      options={[
                        { value: "all", label: "All forms" },
                        ...forms.map(([id, title]) => ({
                          value: String(id),
                          // Still the same (same LDA, same title): add the form's number
                          label: forms.filter(([, other]) => other === title).length > 1 ? `${title} (#${id})` : title,
                        })),
                      ]}
                      value={formFilter}
                      onChange={setFormFilter}
                      searchPlaceholder="Search forms..."
                      emptyText="No form found."
                      className="h-8"
                    />
                  </div>
                </div>
              )}
            </div>
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
                  {shown.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.label ? `${u.reportName} – ${u.label}` : u.reportName}</TableCell>
                      <TableCell>
                        <span className="font-medium">{u.ldaName}</span>
                        <span className="text-muted-foreground"> · </span>
                        <Link
                          href={`${LDA_TERMINOLOGY.dashboardPath}/${u.ldaId}/funding-reports/${u.parentId}`}
                          className="text-muted-foreground hover:underline"
                        >
                          {u.parentTitle}
                        </Link>
                      </TableCell>
                      <TableCell>{day(u.opensOn)}</TableCell>
                      <TableCell>{u.dueOn ? day(u.dueOn) : "—"}</TableCell>
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
