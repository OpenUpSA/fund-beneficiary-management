"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangleIcon, ChevronDownIcon, ChevronRightIcon, FileClockIcon, FolderTreeIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { format } from "date-fns"
import { Link } from "@/i18n/routing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FormCategoryWithTemplates } from "@/types/models"
import { cn } from "@/lib/utils"
import { categoryTiming, describeRule, frequencyLabel } from "@/lib/report-rule-format"
import { formTemplateTypeLabel } from "@/lib/form-template-type"
import { confirmSettingsReplan, detachCount } from "@/lib/confirm-replan"
import { AttachReportDialog, TimingDialog } from "./rule-dialog"
import { ReportSettingsDialog } from "./report-settings-dialog"

type Role = "PRIMARY" | "SECONDARY" | "REPORT"

const ROLE_LABELS: Record<Role, string> = { PRIMARY: "Primary", SECONDARY: "Secondary", REPORT: "Report" }
const ROLE_HINTS: Record<Role, string> = {
  PRIMARY: "Groups the forms of a funding period, e.g. a Grant Funding Application. One per LDA per period.",
  SECONDARY: "Sits under the primary form whose period covers its start date, e.g. a DFT Application.",
  REPORT: "Created by report rules and sits under the form it was created for.",
}

interface StatusOption {
  id: number
  label: string
}

interface TemplateOption {
  id: number
  name: string
  formCategoryId: number | null
  templateType: string
}

/** The response body when the request worked, otherwise null (and an error toast). */
async function send(url: string, method: string, body?: unknown): Promise<Record<string, unknown> | null> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    toast.error(data?.error || "Something went wrong")
    return null
  }
  return data
}

// ─── Create / edit dialog ────────────────────────────────────────────────────

function CategoryDialog({
  open,
  onOpenChange,
  category,
  categories,
  defaultRole = "SECONDARY",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: FormCategoryWithTemplates
  categories: FormCategoryWithTemplates[]
  defaultRole?: Role
}) {
  const router = useRouter()
  const [label, setLabel] = useState(category?.label ?? "")
  const [role, setRole] = useState<Role>((category?.role as Role) ?? defaultRole)
  const [parentId, setParentId] = useState<number | null>(category?.parentCategoryId ?? null)
  const [saving, setSaving] = useState(false)

  const primaries = categories.filter((c) => c.role === "PRIMARY" && c.id !== category?.id)

  async function save() {
    setSaving(true)
    const body = {
      label,
      role,
      parentCategoryId: role === "SECONDARY" ? parentId : null,
    }
    const ok = category
      ? await send(`/api/form-category/${category.id}`, "PUT", body)
      : await send("/api/form-category", "POST", body)
    setSaving(false)
    if (ok) {
      toast.success(category ? "Category updated" : "Category created")
      onOpenChange(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? `Edit ${category.label}` : "New category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-label">Label</Label>
            <Input
              id="category-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{ROLE_HINTS[role]}</p>
          </div>
          {role === "SECONDARY" && (
            <div className="space-y-1.5">
              <Label>Sits under</Label>
              <Select
                value={parentId?.toString() ?? "none"}
                onValueChange={(value) => setParentId(value === "none" ? null : parseInt(value, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a primary category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nothing (not grouped)</SelectItem>
                  {primaries.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !label.trim()}>
            {category ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NewCategoryButton({
  categories,
  defaultRole,
  label,
}: {
  categories: FormCategoryWithTemplates[]
  defaultRole: Role
  label: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="h-4 w-4" />
        {label}
      </Button>
      {open && <CategoryDialog open={open} onOpenChange={setOpen} categories={categories} defaultRole={defaultRole} />}
    </>
  )
}

// ─── Tree ────────────────────────────────────────────────────────────────────

function CategoryNode({
  category,
  categories,
  templates,
  statuses,
  depth,
}: {
  category: FormCategoryWithTemplates
  categories: FormCategoryWithTemplates[]
  templates: TemplateOption[]
  statuses: StatusOption[]
  depth: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [editingTiming, setEditingTiming] = useState(false)
  const [settingsFor, setSettingsFor] = useState<number | null>(null)
  // The template list is hidden until asked for; the header always shows the count
  const [showTemplates, setShowTemplates] = useState(false)
  const [showReports, setShowReports] = useState(false)
  // Reports are filled in with the newest active template of a report category
  const inUseId = category.role === "REPORT"
    ? [...category.templates]
        .filter((t) => t.active)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.id
    : undefined
  const getsReports = category.role !== "REPORT"
  const reportCategories = categories.filter((c) => c.role === "REPORT")
  const categoryLabel = (id: number) => categories.find((c) => c.id === id)?.label ?? "Unknown category"
  // The template a report category's reports are filled in with: its newest active one
  const reportTemplateName = (reportCategoryId: number) =>
    [...(categories.find((c) => c.id === reportCategoryId)?.templates ?? [])]
      .filter((t) => t.active)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.name
  const children = categories.filter((c) => c.parentCategoryId === category.id)
  const assignable = templates.filter((t) => t.formCategoryId !== category.id)

  async function assignTemplate(templateId: number, formCategoryId: number | null) {
    if (!(await confirmSettingsReplan(`templateId=${templateId}`))) return
    if (await send(`/api/form-template/${templateId}`, "PUT", { formCategoryId })) {
      toast.success(formCategoryId ? "Template added to category" : "Template removed from category")
      router.refresh()
    }
  }

  async function setActive(active: boolean) {
    if (await send(`/api/form-category/${category.id}`, "PUT", { active })) router.refresh()
  }

  async function removeRule(ruleId: number, name: string) {
    const removing = await detachCount(ruleId)
    const upcoming = removing ? `${removing} upcoming planned report${removing === 1 ? "" : "s"} will be removed; ` : ""
    if (!window.confirm(`Detach ${name}? Forms stop getting it: ${upcoming}reports already created stay.`)) return
    const detached = await send(`/api/report-rule/${ruleId}`, "DELETE")
    if (detached) {
      const removed = Number(detached.removed) || 0
      toast.success(`Report detached${removed ? ` · ${removed} planned report${removed === 1 ? "" : "s"} removed` : ""}`)
      router.refresh()
    }
  }

  // Report categories: their timing, and the categories they're attached to
  const timing = categoryTiming(category)
  const attachedTo = categories.filter((c) => c.reportRules.some((r) => r.reportCategoryId === category.id))
  const describeCategory = (c: FormCategoryWithTemplates) => {
    const t = categoryTiming(c)
    return t ? describeRule(t, statuses) : "No timing set yet"
  }
  const attachable = reportCategories.filter((c) => !category.reportRules.some((r) => r.reportCategoryId === c.id))

  async function remove() {
    if (!window.confirm(`Delete the "${category.label}" category?`)) return
    if (await send(`/api/form-category/${category.id}`, "DELETE")) {
      toast.success("Category deleted")
      router.refresh()
    }
  }

  return (
    <div className={cn(depth > 0 && "ml-6 border-l pl-4")}>
      <Card className={cn("mb-3", !category.active && "opacity-60")}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 p-4 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{category.label}</h2>
            <Badge variant="outline" className="font-normal">{ROLE_LABELS[category.role as Role]}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Active
              <Switch checked={category.active} onCheckedChange={setActive} />
            </label>
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label={`Edit ${category.label}`}>
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={remove} aria-label={`Delete ${category.label}`}>
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div>
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              aria-expanded={showTemplates}
            >
              {showTemplates ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
              Templates ({category.templates.length})
              {category.role === "REPORT" && category.active && !inUseId && (
                <span className="ml-2 normal-case font-normal tracking-normal text-destructive">No active template: reports of this kind can&apos;t be created</span>
              )}
            </button>
            {showTemplates && (
              <div className="mt-2 space-y-2">
                {category.templates.length === 0 && <p className="text-sm text-muted-foreground">No templates yet.</p>}
                {category.templates.length > 0 && (
                  <ul className="divide-y rounded-md border">
                    {category.templates.map((t) => (
                      <li key={t.id} className={cn("flex flex-wrap items-start justify-between gap-2 p-3 text-sm", !t.active && "bg-muted/40")}>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/dashboard/form-templates/${t.id}`} className="font-medium hover:underline">{t.name}</Link>
                            <Badge variant="outline" className="font-normal">{formTemplateTypeLabel(t.templateType)}</Badge>
                            <Badge variant={t.active ? "outline" : "secondary"} className="font-normal">
                              {t.active ? "Active" : "Inactive"}
                            </Badge>
                            {t.id === inUseId && <Badge className="font-normal">Used for new reports</Badge>}
                          </div>
                          {t.description && <p className="line-clamp-2 text-muted-foreground">{t.description}</p>}
                          <p className="text-xs text-muted-foreground">
                            {t._count.localDevelopmentAgencyForms} form{t._count.localDevelopmentAgencyForms === 1 ? "" : "s"}
                            {" · "}created {format(new Date(t.createdAt), "d MMM yyyy")}
                            {" · "}updated {format(new Date(t.updatedAt), "d MMM yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getsReports && (
                            <button
                              type="button"
                              onClick={() => setSettingsFor(t.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <FileClockIcon className="h-3.5 w-3.5" />
                              {t._count.reportOverrides > 0
                                ? `${t._count.reportOverrides} report${t._count.reportOverrides === 1 ? "" : "s"} changed`
                                : "Reports as category"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => assignTemplate(t.id, null)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`Remove ${t.name} from ${category.label}`}
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {assignable.length > 0 && (
                  <div className="max-w-sm">
                    <Combobox
                      options={assignable.map((t) => ({ value: t.id.toString(), label: t.name }))}
                      value=""
                      onChange={(value) => value && assignTemplate(parseInt(value, 10), category.id)}
                      placeholder="Add template…"
                      searchPlaceholder="Search templates..."
                      emptyText="No templates found."
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          {getsReports && (
            <div>
              <button
                type="button"
                onClick={() => setShowReports((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                aria-expanded={showReports}
              >
                {showReports ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                Reports ({category.reportRules.length})
              </button>
              {showReports && (
                <div className="mt-2 space-y-2">
                  {category.reportRules.length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
                  {category.reportRules.length > 0 && (
                    <ul className="divide-y rounded-md border">
                      {category.reportRules.map((rule) => {
                        const reportCategory = categories.find((c) => c.id === rule.reportCategoryId)
                        const name = categoryLabel(rule.reportCategoryId)
                        const reportTiming = reportCategory ? categoryTiming(reportCategory) : null
                        const templateName = reportTemplateName(rule.reportCategoryId)
                        return (
                          <li key={rule.id} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{name}</span>
                                {reportTiming && (
                                  <Badge variant="outline" className="font-normal">
                                    {reportTiming.kind === "AFTER_STATUS" ? "After a status" : frequencyLabel(reportTiming.periodMonths)}
                                  </Badge>
                                )}
                              </div>
                              <p className={cn("text-muted-foreground", !reportTiming && "text-destructive")}>
                                {reportTiming
                                  ? describeRule(reportTiming, statuses)
                                  : "No timing set: set it on the Reports tab, or forms won't get this report"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {templateName ? (
                                  <>Filled in with {templateName}</>
                                ) : (
                                  <span className="text-destructive">No active {name} template: these reports can&apos;t be created</span>
                                )}
                                {" · "}planned on forms {rule._count.plannedReports} time{rule._count.plannedReports === 1 ? "" : "s"}
                                {rule._count.overrides > 0 &&
                                  ` · changed for ${rule._count.overrides} template${rule._count.overrides === 1 ? "" : "s"}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRule(rule.id, name)} aria-label={`Detach ${name}`}>
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setAttaching(true)} disabled={attachable.length === 0}>
                    <PlusIcon className="h-4 w-4" />
                    Attach report
                  </Button>
                </div>
              )}
            </div>
          )}
          {category.role === "REPORT" && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timing</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={cn(!timing && "text-destructive")}>
                  {timing ? describeRule(timing, statuses) : "Not set: forms won't get this report until it is"}
                </span>
                <Button variant="outline" size="sm" onClick={() => setEditingTiming(true)}>
                  <PencilIcon className="h-3.5 w-3.5" />
                  {timing ? "Edit timing" : "Set timing"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {attachedTo.length > 0
                  ? `Attached to ${attachedTo.map((c) => c.label).join(", ")}`
                  : "Not attached to any application category yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {children.map((child) => (
        <CategoryNode key={child.id} category={child} categories={categories} templates={templates} statuses={statuses} depth={depth + 1} />
      ))}
      {editing && <CategoryDialog open={editing} onOpenChange={setEditing} category={category} categories={categories} />}
      {attaching && (
        <AttachReportDialog
          open
          onOpenChange={setAttaching}
          parentCategory={category}
          reportCategories={attachable.map((c) => ({ id: c.id, label: c.label, timing: describeCategory(c) }))}
        />
      )}
      {editingTiming && <TimingDialog open onOpenChange={setEditingTiming} category={category} statuses={statuses} />}
      {settingsFor !== null && (
        <ReportSettingsDialog
          templateId={settingsFor}
          open
          onOpenChange={(open) => !open && setSettingsFor(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  )
}

type Tab = "applications" | "reports"

interface SetupIssue { text: string; tab: Tab }

/** What still needs setting up before forms get their reports, in plain words. */
function setupIssues(categories: FormCategoryWithTemplates[], templates: TemplateOption[]): SetupIssue[] {
  const issues: SetupIssue[] = []
  const reports = categories.filter((c) => c.role === "REPORT" && c.active)
  const attached = new Set(categories.flatMap((c) => c.reportRules.map((r) => r.reportCategoryId)))
  for (const report of reports) {
    const isAttached = attached.has(report.id)
    if (isAttached && !report.reportKind) {
      issues.push({ text: `${report.label} has no timing, so forms don't get it. Set its timing.`, tab: "reports" })
    }
    if (isAttached && !report.templates.some((t) => t.active)) {
      issues.push({ text: `${report.label} has no active template, so its reports can't be created. Add one.`, tab: "reports" })
    }
    if (!isAttached) {
      issues.push({ text: `${report.label} isn't attached to any application category, so no form gets it.`, tab: "applications" })
    }
  }
  const uncategorised = templates.filter((t) => !t.formCategoryId)
  if (uncategorised.length > 0) {
    const reportTemplates = uncategorised.filter((t) => t.templateType === "REPORT").length
    const applicationTemplates = uncategorised.length - reportTemplates
    if (applicationTemplates > 0) {
      issues.push({ text: `${applicationTemplates} application template${applicationTemplates === 1 ? " has" : "s have"} no category, so their forms aren't grouped and get no reports.`, tab: "applications" })
    }
    if (reportTemplates > 0) {
      issues.push({ text: `${reportTemplates} report template${reportTemplates === 1 ? " has" : "s have"} no category, so ${reportTemplates === 1 ? "it isn't" : "they aren't"} used for planned reports (forms can still be created from ${reportTemplates === 1 ? "it" : "them"} by hand).`, tab: "reports" })
    }
  }
  return issues
}

/** Categories in two tabs: applications (primary/secondary, with their report rules) and report types. */
export function CategoriesTree({
  categories,
  templates,
  statuses,
}: {
  categories: FormCategoryWithTemplates[]
  templates: TemplateOption[]
  statuses: StatusOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab: Tab = searchParams.get("tab") === "reports" ? "reports" : "applications"

  // Keep the tab in the URL so a refresh or a shared link opens the same tab
  const changeTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "reports") params.set("tab", "reports")
    else params.delete("tab")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const ids = new Set(categories.map((c) => c.id))
  const primaries = categories.filter((c) => c.role === "PRIMARY")
  // Secondary categories not placed under a primary still need a home in the tree
  const looseSecondaries = categories.filter(
    (c) => c.role === "SECONDARY" && (!c.parentCategoryId || !ids.has(c.parentCategoryId))
  )
  const reports = categories.filter((c) => c.role === "REPORT")
  const uncategorised = templates.filter((t) => !t.formCategoryId)
  const issues = setupIssues(categories, templates)

  const group = (title: string | null, items: FormCategoryWithTemplates[]) =>
    items.length > 0 && (
      <section className="space-y-1">
        {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>}
        {items.map((c) => (
          <CategoryNode key={c.id} category={c} categories={categories} templates={templates} statuses={statuses} depth={0} />
        ))}
      </section>
    )

  const empty = (text: string) => (
    <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <FolderTreeIcon className="h-8 w-8" />
      {text}
    </div>
  )

  const withoutCategory = (items: TemplateOption[], hint: string) =>
    items.length > 0 && (
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Templates without a category
        </h2>
        <p className="text-sm text-muted-foreground">
          {items.map((t) => t.name).join(", ")}. {hint}
        </p>
      </section>
    )

  return (
    <Tabs value={tab} onValueChange={changeTab} className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="applications">Applications ({primaries.length + categories.filter((c) => c.role === "SECONDARY").length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
        </TabsList>
        {tab === "applications" ? (
          <NewCategoryButton categories={categories} defaultRole="PRIMARY" label="New application category" />
        ) : (
          <NewCategoryButton categories={categories} defaultRole="REPORT" label="New report category" />
        )}
      </div>

      {issues.length > 0 && (
        <Card className="mt-4 border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-4 pb-2">
            <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold">Needs attention ({issues.length})</h2>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ul className="space-y-1 text-sm">
              {issues.map((issue) => (
                <li key={issue.text} className="flex flex-wrap items-baseline gap-x-2">
                  <span>{issue.text}</span>
                  {issue.tab !== tab && (
                    <button type="button" onClick={() => changeTab(issue.tab)} className="text-xs font-medium underline">
                      Go to {issue.tab === "reports" ? "Reports" : "Applications"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <TabsContent value="applications" className="mt-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          Primary forms group a funding period; secondary forms sit under the primary covering their start date.
          Each category&apos;s reports say when reports are created for its forms.
        </p>
        {primaries.length + looseSecondaries.length === 0 && empty("No application categories yet.")}
        {group(null, primaries)}
        {group("Secondary forms not under a primary", looseSecondaries)}
        {withoutCategory(
          uncategorised.filter((t) => t.templateType !== "REPORT"),
          "Add them to a category; until then their forms aren't grouped and get no reports."
        )}
      </TabsContent>

      <TabsContent value="reports" className="mt-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          The kinds of report the application categories create. A report is filled in using the newest active
          template of its kind, so next year&apos;s template only needs to be added here and the old one deactivated.
        </p>
        {reports.length === 0 && empty("No report categories yet.")}
        {group(null, reports)}
        {withoutCategory(
          uncategorised.filter((t) => t.templateType === "REPORT"),
          "Add them to a report category to use them for reports."
        )}
      </TabsContent>
    </Tabs>
  )
}
