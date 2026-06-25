"use client"

import { useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import {
  parseCsv,
  pickField,
  splitEmails,
  parseBooleanFlag,
  hasSendEmailColumn,
  SEND_EMAIL_HEADERS,
} from "@/lib/csv"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import { usePermissions } from "@/hooks/use-permissions"
import { getAvailableRolesForCreation, normalizeRole } from "@/lib/permissions"
import type { Role } from "@prisma/client"

interface BulkUserUploadPanelProps {
  onBack: () => void
}

type EmailMode = "none" | "all" | "file"
type RowStatus = "pending" | "ready" | "error" | "created" | "failed" | "skipped"

interface EditableRow {
  firstName: string
  lastName: string
  email: string
  additionalEmails: string[]
  organisation: string
  role: Role
  sendEmail: boolean
  status: RowStatus
  ldaName: string | null
  roleWarning: string | null
  messages: string[]
}

interface ServerRow {
  index: number
  ldaName: string | null
  status: "ready" | "error" | "created" | "failed" | "skipped"
  messages: string[]
}

interface UploadSummary {
  total: number
  ready: number
  errors: number
  created: number
  failed: number
  emailsSent: number
}

function statusBadge(status: RowStatus) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Not validated</Badge>
    case "ready":
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Ready</Badge>
    case "created":
      return <Badge className="bg-green-600 hover:bg-green-600">Created</Badge>
    case "error":
      return <Badge variant="destructive">Error</Badge>
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
    case "skipped":
      return <Badge variant="secondary">Skipped</Badge>
  }
}

export function BulkUserUploadPanel({ onBack }: BulkUserUploadPanelProps) {
  const tC = useTranslations("common")
  const { currentUser } = usePermissions()
  const availableRoles = currentUser ? getAvailableRolesForCreation(currentUser) : []
  const roleLabel = (role: Role) => (role === "USER" ? LDA_TERMINOLOGY.userRole : tC(`roles.${role}`))

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [emailMode, setEmailMode] = useState<EmailMode>("none")
  const [defaultRole, setDefaultRole] = useState<Role>("USER")
  const [approved, setApproved] = useState(true)
  const [rows, setRows] = useState<EditableRow[]>([])
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [validated, setValidated] = useState(false)
  const [imported, setImported] = useState(false)
  const [importSummary, setImportSummary] = useState<UploadSummary | null>(null)

  // Turn parsed CSV records into editable rows, resolving role + sendEmail from
  // the current options. Re-run whenever the file or those options change.
  const normalizeRows = (
    raws: Record<string, string>[],
    mode: EmailMode,
    defRole: Role
  ): EditableRow[] =>
    raws.map((raw) => {
      const emails = splitEmails(pickField(raw, ["Email", "Email Address", "Emails"]))
      const roleCol = pickField(raw, ["Role", "User Role"])
      const sendEmailCol = pickField(raw, SEND_EMAIL_HEADERS)

      let role = defRole
      let roleWarning: string | null = null
      if (roleCol) {
        const resolved = normalizeRole(roleCol)
        if (!resolved) {
          roleWarning = `Unrecognised role "${roleCol}" — defaulted to ${roleLabel(defRole)}`
        } else if (!availableRoles.includes(resolved)) {
          roleWarning = `Role "${roleCol}" not permitted — defaulted to ${roleLabel(defRole)}`
        } else {
          role = resolved
        }
      }

      const sendEmail =
        mode === "all" ? true : mode === "file" ? parseBooleanFlag(sendEmailCol) : false

      return {
        firstName: pickField(raw, ["First Name", "FirstName", "Given Name"]),
        lastName: pickField(raw, ["Last Name", "LastName", "Surname"]),
        email: emails[0] ?? "",
        additionalEmails: emails.slice(1),
        organisation: pickField(raw, ["Organisation", "Organization", "Org"]),
        role,
        sendEmail,
        status: "pending",
        ldaName: null,
        roleWarning,
        messages: [],
      }
    })

  const reNormalize = (mode: EmailMode, defRole: Role) => {
    setRows(normalizeRows(rawRows, mode, defRole))
    setValidated(false)
    setImported(false)
    setImportSummary(null)
  }

  const handleFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseCsv(text)
      if (parsed.length === 0) {
        toast.error("The file is empty or could not be parsed")
        return
      }
      setFileName(file.name)
      setRawRows(parsed)
      setHeaders(Object.keys(parsed[0]))
      setRows(normalizeRows(parsed, emailMode, defaultRole))
      setValidated(false)
      setImported(false)
      setImportSummary(null)
      toast.success(`Loaded ${parsed.length} row${parsed.length === 1 ? "" : "s"}`)
    } catch (error) {
      console.error("Failed to read file:", error)
      toast.error("Failed to read the file")
    }
  }

  const downloadSample = () => {
    const csv =
      emailMode === "file"
        ? `First Name,Last Name,Email,Organisation,Role,Send Email\n` +
          `Jane,Doe,jane.doe@example.org,Example Organisation,USER,yes\n` +
          `John,Smith,john@example.org; john.smith@gmail.com,Another Organisation,,no\n`
        : `First Name,Last Name,Email,Organisation,Role\n` +
          `Jane,Doe,jane.doe@example.org,Example Organisation,USER\n` +
          `John,Smith,john@example.org; john.smith@gmail.com,Another Organisation,\n`

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "user-upload-sample.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  // Per-row edits. Role changes affect validity, so they reset the row to
  // "pending" and require a re-validate; Send Email does not affect validity.
  const updateRowRole = (idx: number, role: Role) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, role, status: "pending", roleWarning: null, messages: [] } : r
      )
    )
    setValidated(false)
  }

  const updateRowSendEmail = (idx: number, sendEmail: boolean) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, sendEmail } : r)))
  }

  const callApi = async (dryRun: boolean) => {
    const payload = {
      dryRun,
      approved,
      rows: rows.map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        additionalEmails: r.additionalEmails,
        organisation: r.organisation,
        role: r.role,
        sendEmail: r.sendEmail,
      })),
    }
    const response = await fetch("/api/user/bulk-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || "Request failed")
    }
    return response.json() as Promise<{ summary: UploadSummary; rows: ServerRow[] }>
  }

  const mergeServerRows = (serverRows: ServerRow[]) => {
    setRows((prev) =>
      prev.map((r, i) => {
        const s = serverRows[i]
        if (!s) return r
        return {
          ...r,
          status: s.status,
          ldaName: s.ldaName,
          // Keep the client-side role warning visible alongside server messages.
          messages: r.roleWarning ? [r.roleWarning, ...s.messages] : s.messages,
        }
      })
    )
  }

  const handleValidate = async () => {
    if (rows.length === 0) return
    setValidating(true)
    try {
      const data = await callApi(true)
      mergeServerRows(data.rows)
      setValidated(true)
      setImported(false)
      setImportSummary(null)
      if (data.summary.errors > 0) {
        toast.warning(`${data.summary.errors} row(s) have issues and will be skipped`)
      } else {
        toast.success("All rows look good")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation failed")
    } finally {
      setValidating(false)
    }
  }

  const handleImport = async () => {
    setConfirmOpen(false)
    setImporting(true)
    try {
      const data = await callApi(false)
      mergeServerRows(data.rows)
      setImportSummary(data.summary)
      setImported(true)
      toast.success(`Created ${data.summary.created} user(s)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const busy = validating || importing
  const missingSendCol = emailMode === "file" && rows.length > 0 && !hasSendEmailColumn(headers)
  const readyCount = rows.filter((r) => r.status === "ready").length
  const errorCount = rows.filter((r) => r.status === "error").length
  const hasPending = rows.some((r) => r.status === "pending")
  const canValidate = rows.length > 0 && !busy && !imported && !missingSendCol
  const canImport = validated && readyCount > 0 && !hasPending && !busy && !imported && !missingSendCol
  const sendEmailCount = rows.filter((r) => r.status === "ready" && r.sendEmail).length

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Bulk Upload
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Upload
          </CardTitle>
          <CardDescription>
            Upload a CSV of users to create them in bulk. {LDA_TERMINOLOGY.userRole}s are linked to an
            existing {LDA_TERMINOLOGY.shortName} by organisation name. After validating, you can adjust
            each row&apos;s role and email option before importing. Rows whose organisation doesn&apos;t
            match an existing {LDA_TERMINOLOGY.shortName}, or whose email already exists, are reported
            and skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: file */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">1. Choose a CSV file</Label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = "" // allow re-selecting the same file
                }}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" />
                {fileName ? "Choose different file" : "Choose file"}
              </Button>
              <Button variant="ghost" onClick={downloadSample} className="gap-2">
                <Download className="h-4 w-4" />
                Download sample CSV
              </Button>
              {fileName && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  {fileName} · {rows.length} row{rows.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Expected columns: <span className="font-mono">First Name</span>,{" "}
              <span className="font-mono">Last Name</span>, <span className="font-mono">Email</span>,{" "}
              <span className="font-mono">Organisation</span>, <span className="font-mono">Role</span>.
              When &ldquo;Read from file&rdquo; is selected, also include a{" "}
              <span className="font-mono">Send Email</span> column. Multiple emails in one cell can be
              separated by <span className="font-mono">;</span> — the first is used as the login. The{" "}
              <span className="font-mono">Role</span> column is optional; blank rows fall back to the
              default role below.
            </p>
          </div>

          {/* Step 2: default role */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">2. Default role</Label>
            <Select
              value={defaultRole}
              onValueChange={(v) => {
                setDefaultRole(v as Role)
                reNormalize(emailMode, v as Role)
              }}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>{roleLabel(role)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for any row whose <span className="font-mono">Role</span> column is empty or missing.
              Rows that specify a role use that value instead (validated against the roles you&apos;re
              allowed to create). Only {LDA_TERMINOLOGY.userRole}s are linked to an{" "}
              {LDA_TERMINOLOGY.shortName} — the <span className="font-mono">Organisation</span> column is
              required only for {LDA_TERMINOLOGY.userRole} rows.
            </p>
          </div>

          {/* Step 3: options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">3. Email & approval options</Label>
            <RadioGroup
              value={emailMode}
              onValueChange={(v) => {
                setEmailMode(v as EmailMode)
                reNormalize(v as EmailMode, defaultRole)
              }}
              className="space-y-2"
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="none" id="email-none" className="mt-1" />
                <div>
                  <Label htmlFor="email-none" className="cursor-pointer">Do not send email</Label>
                  <p className="text-xs text-muted-foreground">
                    Create accounts silently. Users set a password later via &ldquo;forgot password&rdquo;.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="all" id="email-all" className="mt-1" />
                <div>
                  <Label htmlFor="email-all" className="cursor-pointer">Send set-password email to everyone</Label>
                  <p className="text-xs text-muted-foreground">
                    Every newly created user gets an email to set their own password.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="file" id="email-file" className="mt-1" />
                <div>
                  <Label htmlFor="email-file" className="cursor-pointer">Read from file</Label>
                  <p className="text-xs text-muted-foreground">
                    Requires a <span className="font-mono">Send Email</span> column in the CSV (yes/no)
                    to decide per user. Blank = no email.
                  </p>
                </div>
              </div>
            </RadioGroup>

            {missingSendCol && (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                The uploaded file has no <span className="font-mono">Send Email</span> column. Add one
                (or choose a different email option) to continue.
              </p>
            )}

            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="approved"
                checked={approved}
                onCheckedChange={(c) => setApproved(c === true)}
                className="mt-1"
              />
              <div>
                <Label htmlFor="approved" className="cursor-pointer">Mark users as approved</Label>
                <p className="text-xs text-muted-foreground">
                  Approved users can sign in immediately. Uncheck to require manual approval.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4: actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleValidate} disabled={!canValidate} className="gap-2">
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Validate
            </Button>
            <Button variant="default" onClick={() => setConfirmOpen(true)} disabled={!canImport} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import {readyCount > 0 ? `${readyCount} user${readyCount === 1 ? "" : "s"}` : ""}
            </Button>
            {validated && !imported && hasPending && (
              <span className="text-xs text-muted-foreground">Edited rows need re-validating</span>
            )}
          </div>

          {/* Summary */}
          {(validated || imported) && (
            <div className="flex flex-wrap gap-4 rounded-lg border p-4 text-sm">
              <span>Total: <strong>{rows.length}</strong></span>
              <span className="text-blue-600">Ready: <strong>{readyCount}</strong></span>
              <span className="text-destructive">Errors: <strong>{errorCount}</strong></span>
              {imported && importSummary && (
                <>
                  <span className="text-green-600">Created: <strong>{importSummary.created}</strong></span>
                  <span className="text-destructive">Failed: <strong>{importSummary.failed}</strong></span>
                  <span>Emails sent: <strong>{importSummary.emailsSent}</strong></span>
                </>
              )}
            </div>
          )}

          {/* Editable rows table */}
          {rows.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-44">Role</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead className="w-20">Send email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-nowrap">
                        {[row.firstName, row.lastName].filter(Boolean).join(" ") || (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.email || <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.role}
                          onValueChange={(v) => updateRowRole(idx, v as Role)}
                          disabled={imported || busy}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((role) => (
                              <SelectItem key={role} value={role}>{roleLabel(role)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{row.organisation}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={row.sendEmail}
                          onCheckedChange={(c) => updateRowSendEmail(idx, c === true)}
                          disabled={imported || busy}
                          aria-label="Send email"
                        />
                      </TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.messages.length > 0 && (
                          <span className="flex items-start gap-1">
                            {(row.status === "error" || row.status === "failed") && (
                              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-destructive" />
                            )}
                            {row.messages.join("; ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import {readyCount} user{readyCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {readyCount} new user account{readyCount === 1 ? "" : "s"}
              {sendEmailCount > 0
                ? `, sending a set-password email to ${sendEmailCount} of them`
                : " (no emails will be sent)"}
              .{errorCount > 0 ? ` ${errorCount} row(s) with errors will be skipped.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
