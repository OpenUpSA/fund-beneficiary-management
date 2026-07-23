import { fetchLDAForm } from "@/lib/data"
import { LocalDevelopmentAgencyFormFull } from "@/types/models"
import { Form, Field, Section } from "@/types/forms"
import { FormPreviewActions } from "@/components/lda-forms/form-preview-actions"
import { RepeatablePreview, RepeatableItem, RepeatableSubField, SubFieldOption } from "@/components/lda-forms/repeatable-preview"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import { format } from "date-fns"
import Image from "next/image"
import { notFound } from "next/navigation"
import { FileIcon } from "lucide-react"
import * as LucideIcons from "lucide-react"
import db from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

interface Props {
  params: { lda_form_id: string; locale: string }
}

export async function generateMetadata({ params }: Props) {
  const ldaForm = await fetchLDAForm(params.lda_form_id).catch(() => null)
  return { title: ldaForm ? `${ldaForm.formTemplate.name} – Preview` : "Form Preview" }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FocusArea { id: number; label: string; icon: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<string, string> = {
  radio: "Radio",
  select: "Dropdown",
  multiselect: "Multi-select",
  toggle: "Yes / No",
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  currency: "Currency",
  date: "Date",
  fileUpload: "File upload",
  group: "Group",
  repeatable: "Repeatable",
}

const EMPTY_BY_TYPE: Record<string, string> = {
  text: "No response provided",
  textarea: "No response provided",
  email: "No response provided",
  string: "No response provided",
  number: "No value entered",
  currency: "No amount entered",
  date: "No date selected",
  radio: "No option selected",
  select: "No option selected",
  multiselect: "No options selected",
  toggle: "Not answered",
  checkbox: "Not answered",
  fileUpload: "No file uploaded",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanizeStatus(s: string) {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2")
}

function emptyMsg(type: string) {
  return <span className="text-slate-400 italic text-base">{EMPTY_BY_TYPE[type] ?? "No answer"}</span>
}

function formatDateValue(raw: string): string {
  if (!raw) return ""
  try { return format(new Date(raw), "d MMM yyyy") } catch { return raw }
}

function splitMulti(raw: string): string[] {
  return raw ? raw.split(",").filter(Boolean) : []
}

function resolveOption(options: SubFieldOption[], val: string): string {
  return options.find((o) => o.value === val)?.label ?? val
}

function buildFocusAreaOptions(areas: FocusArea[]): SubFieldOption[] {
  return areas.map((fa) => ({ value: String(fa.id), label: fa.label, iconName: fa.icon }))
}

// Returns true if a field should be visible given the current formData.
// Mirrors the logic in form-accordion-item.tsx: field hidden when show_if.field's
// value doesn't match show_if.value; show_by_default controls the no-data default.
function shouldShowField(field: Field, formData: Record<string, string>): boolean {
  if (field.show === false) return false
  if (!field.show_if) return true
  const { field: condField, value: condValue, show_by_default } = field.show_if
  const actual = formData[condField]
  if (actual === undefined || actual === "") return show_by_default === true
  return actual === condValue
}

// For repeatable sub-fields the controlling field name is namespaced per-item.
function shouldShowSubField(
  tmpl: Field,
  parentName: string,
  idx: number,
  formData: Record<string, string>,
): boolean {
  if (tmpl.show === false) return false
  if (!tmpl.show_if) return true
  const { field: condField, value: condValue, show_by_default } = tmpl.show_if
  const namespacedField = `${parentName}_${condField}_${idx}`
  const actual = formData[namespacedField]
  if (actual === undefined || actual === "") return show_by_default === true
  return actual === condValue
}

function getFieldOptions(field: Field, focusAreas: FocusArea[]): SubFieldOption[] | undefined {
  if (field.config?.dynamicOptionTable === "focus_areas") {
    return buildFocusAreaOptions(focusAreas)
  }
  return field.options as SubFieldOption[] | undefined
}

// ─── Server-side icon renderer ────────────────────────────────────────────────

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ElementType | undefined>)[name]
  if (!Icon) return null
  return <Icon className={className} />
}

// ─── Answer components ────────────────────────────────────────────────────────

function PlainAnswer({ value, type }: { value: string; type: string }) {
  if (!value) return emptyMsg(type)
  return <p className="text-base text-slate-700 whitespace-pre-wrap">{value}</p>
}

function ToggleAnswer({ value }: { value: string }) {
  if (!value) return emptyMsg("toggle")
  const yes = value === "true"
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-sm font-medium ${yes ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
      {yes ? "Yes" : "No"}
    </span>
  )
}

function optionsLayout(count: number) {
  return count <= 3 ? "flex flex-wrap gap-x-8 gap-y-2" : "grid grid-cols-3 gap-x-4 gap-y-2"
}

function RadioAnswer({ field, raw, options }: { field: Field; raw: string; options: SubFieldOption[] }) {
  if (!options.length) return <PlainAnswer value={resolveOption(options, raw)} type={field.type} />
  return (
    <div className={optionsLayout(options.length)}>
      {options.map((opt) => {
        const sel = opt.value === raw
        return (
          <div key={opt.value} className={`flex items-center gap-2 ${sel ? "text-slate-900" : "text-slate-400"}`}>
            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? "border-slate-700" : "border-slate-300"}`}>
              {sel && <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
            </div>
            {opt.iconName && <LucideIcon name={opt.iconName} className="h-3.5 w-3.5 shrink-0" />}
            <span className={`text-sm ${sel ? "font-semibold" : ""}`}>{opt.label}</span>
          </div>
        )
      })}
      {!raw && <div className="pt-1">{emptyMsg("radio")}</div>}
    </div>
  )
}

function MultiAnswer({ raw, options }: { field: Field; raw: string; options: SubFieldOption[] }) {
  const selected = splitMulti(raw)
  if (!options.length) {
    if (!selected.length) return emptyMsg("multiselect")
    return <p className="text-base text-slate-700">{selected.join(", ")}</p>
  }
  return (
    <div className={optionsLayout(options.length)}>
      {options.map((opt) => {
        const sel = selected.includes(opt.value)
        return (
          <div key={opt.value} className={`flex items-center gap-2 ${sel ? "text-slate-900" : "text-slate-400"}`}>
            <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${sel ? "border-slate-700 bg-slate-700" : "border-slate-300"}`}>
              {sel && <span className="text-white text-[9px] leading-none font-bold">✓</span>}
            </div>
            {opt.iconName && <LucideIcon name={opt.iconName} className="h-3.5 w-3.5 shrink-0" />}
            <span className={`text-sm ${sel ? "font-semibold" : ""}`}>{opt.label}</span>
          </div>
        )
      })}
      {!selected.length && <div className="pt-1">{emptyMsg("multiselect")}</div>}
    </div>
  )
}

interface UploadedFile { id: string; name: string; size: number; type: string; url: string }

function FileAnswer({ raw }: { raw: string }) {
  if (!raw) return emptyMsg("fileUpload")
  let files: UploadedFile[] = []
  try { files = JSON.parse(raw) as UploadedFile[] } catch { /* empty */ }
  if (!files.length) return emptyMsg("fileUpload")

  const images = files.filter((f) => f.type?.startsWith("image/"))
  const docs = files.filter((f) => !f.type?.startsWith("image/"))

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((f) => (
            <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="block group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.name} className="h-24 w-24 object-cover rounded-md border border-slate-200 group-hover:opacity-80 transition-opacity" />
              <p className="text-xs text-center mt-1 text-slate-500 truncate w-24">{f.name}</p>
            </a>
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map((f) => (
            <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline">
              <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
              {f.name}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

interface DataTableRow { [key: string]: string | number | boolean | null | undefined }
interface DataTableColumn { label: string; value: string }

function DataTableAnswer({ field, raw }: { field: Field; raw: string }) {
  const columns = (field.config?.columns as DataTableColumn[] | undefined) ?? []
  let rows: DataTableRow[] = []
  try { rows = JSON.parse(raw) as DataTableRow[] } catch { /* empty */ }
  return (
    <div className="border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th key={col.value} className="px-4 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length > 0 ? rows.map((row, ri) => (
            <tr key={ri} className="bg-white">
              {columns.map((col) => (
                <td key={col.value} className="px-4 py-2.5 text-slate-700">{String(row[col.value] ?? "—")}</td>
              ))}
            </tr>
          )) : (
            <tr><td colSpan={columns.length} className="px-4 py-4 text-center text-slate-400 italic">No data available</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Dispatch by type ─────────────────────────────────────────────────────────

function FieldAnswer({ field, formData, focusAreas }: { field: Field; formData: Record<string, string>; focusAreas: FocusArea[] }) {
  const raw = formData[field.name] ?? ""
  const opts = getFieldOptions(field, focusAreas)

  switch (field.type) {
    case "toggle":
    case "checkbox":
      return <ToggleAnswer value={raw} />
    case "radio":
    case "select":
      return <RadioAnswer field={field} raw={raw} options={opts ?? []} />
    case "multiselect":
      return <MultiAnswer field={field} raw={raw} options={opts ?? []} />
    case "fileUpload":
      return <FileAnswer raw={raw} />
    case "date": {
      const d = formatDateValue(raw)
      return d ? <p className="text-base text-slate-700">{d}</p> : emptyMsg("date")
    }
    default:
      return <PlainAnswer value={raw} type={field.type} />
  }
}

// ─── Layout wrappers ──────────────────────────────────────────────────────────

function FieldTypeTag({ type }: { type: string }) {
  const label = FIELD_TYPE_LABELS[type]
  if (!label) return null
  return (
    <span className="inline-block text-[11px] font-medium text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 ml-2 align-middle">
      {label}
    </span>
  )
}

function BulletField({ field, children }: { field: Field; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-5">
      <span className="text-slate-300 mt-1 shrink-0 select-none">•</span>
      <div className="flex-1 min-w-0">
        {field.label && (
          <p className="text-base text-slate-800 font-semibold leading-snug mb-1">
            {field.label}
            <FieldTypeTag type={field.type} />
          </p>
        )}
        {field.description && (
          <p className="text-sm text-slate-500 mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: field.description }} />
        )}
        <div>{children}</div>
      </div>
    </div>
  )
}

function InfoBlock({ field }: { field: Field }) {
  const text = field.description || field.label
  if (!text) return null
  return (
    <p className="text-sm text-slate-500 italic mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
  )
}

// ─── Repeatable sub-field resolution ─────────────────────────────────────────

function resolveSubField(tmpl: Field, rawVal: string, focusAreas: FocusArea[]): RepeatableSubField {
  const base = { label: tmpl.label, description: tmpl.description, type: tmpl.type }

  if (tmpl.type === "toggle" || tmpl.type === "checkbox") {
    return { ...base, resolvedValue: rawVal === "true" ? "Yes" : rawVal === "false" ? "No" : "" }
  }

  if (tmpl.type === "date") {
    return { ...base, resolvedValue: formatDateValue(rawVal) }
  }

  if (tmpl.type === "radio" || tmpl.type === "select") {
    const opts = getFieldOptions(tmpl, focusAreas) ?? []
    return { ...base, resolvedValue: "", options: opts, rawValue: rawVal }
  }

  if (tmpl.type === "multiselect") {
    const opts = getFieldOptions(tmpl, focusAreas) ?? []
    return { ...base, resolvedValue: "", options: opts, rawValue: rawVal }
  }

  if (tmpl.type === "fileUpload") {
    return { ...base, resolvedValue: "", rawValue: rawVal }
  }

  return { ...base, resolvedValue: rawVal }
}

// ─── Section renderer ─────────────────────────────────────────────────────────

function SectionContent({ section, formData, focusAreas }: { section: Section; formData: Record<string, string>; focusAreas: FocusArea[] }) {
  return (
    <div className="divide-y divide-slate-100">
      {section.fields.map((field, fi) => {
        // Respect show_if visibility for all top-level fields
        if (!shouldShowField(field, formData)) return null

        if (field.type === "info") {
          return <InfoBlock key={fi} field={field} />
        }

        if (field.type === ("data-table" as string) || field.layout === "data-table") {
          return (
            <BulletField key={fi} field={field}>
              <DataTableAnswer field={field} raw={formData[field.name] ?? ""} />
            </BulletField>
          )
        }

        if (field.type === "group" && field.fields) {
          return (
            <BulletField key={fi} field={field}>
              <div className="pl-4 space-y-4 border-l-2 border-slate-100 mt-1">
                {field.fields.map((sub, si) => {
                  const subKey = `${field.name}_${sub.name}`
                  if (!shouldShowField({ ...sub, name: subKey }, formData)) return null
                  return (
                    <div key={si}>
                      <p className="text-sm text-slate-700 font-semibold">{sub.label}</p>
                      {sub.description && <p className="text-xs text-slate-400 mt-0.5 mb-1" dangerouslySetInnerHTML={{ __html: sub.description }} />}
                      <div className="pl-4 mt-1">
                        <FieldAnswer field={{ ...sub, name: subKey }} formData={formData} focusAreas={focusAreas} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </BulletField>
          )
        }

        if (field.type === "repeatable" && field.template) {
          const raw = formData[field.name] ?? ""
          let indices: number[] = []
          try { indices = JSON.parse(raw) as number[] } catch { /* empty */ }

          const items: RepeatableItem[] = indices.map((idx) => ({
            index: idx,
            subFields: (field.template ?? [])
              .filter((tmpl) => shouldShowSubField(tmpl, field.name, idx, formData))
              .map((tmpl) => {
                const key = `${field.name}_${tmpl.name}_${idx}`
                const rawVal = formData[key] ?? ""
                return resolveSubField(tmpl, rawVal, focusAreas)
              }),
          }))

          return (
            <BulletField key={fi} field={field}>
              <RepeatablePreview items={items} />
            </BulletField>
          )
        }

        return (
          <BulletField key={fi} field={field}>
            <FieldAnswer field={field} formData={formData} focusAreas={focusAreas} />
          </BulletField>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FormPreviewPage({ params }: Props) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) notFound()

  let ldaForm: LocalDevelopmentAgencyFormFull
  try {
    ldaForm = await fetchLDAForm(params.lda_form_id)
  } catch {
    notFound()
  }

  // No id means the API denied access (403) or the form is missing — block the page
  if (!ldaForm?.id) notFound()

  // Check LDA access
  const ldaId = ldaForm.localDevelopmentAgencyId
  if (!permissions.canViewLDA(session.user, ldaId)) notFound()

  const [focusAreas] = await Promise.all([
    db.focusArea.findMany({ orderBy: { label: "asc" } }),
  ])

  const form = ldaForm.formTemplate.form as unknown as Form | null
  const formData = (ldaForm.formData as Record<string, string>) ?? {}
  const logoPath = process.env.NEXT_PUBLIC_LOGO_PATH || "/images/soarlogo.svg"

  const fundingStart = ldaForm.fundingStart
    ? format(new Date(ldaForm.fundingStart as unknown as string), "d MMM yyyy")
    : null
  const fundingEnd = ldaForm.fundingEnd
    ? format(new Date(ldaForm.fundingEnd as unknown as string), "d MMM yyyy")
    : null
  const dateRange = fundingStart && fundingEnd ? `${fundingStart} – ${fundingEnd}` : fundingStart ?? fundingEnd ?? null
  const heading = dateRange ? `${ldaForm.formTemplate.name} (${dateRange})` : ldaForm.formTemplate.name

  const previewData = {
    title: ldaForm.title,
    ldaName: ldaForm.localDevelopmentAgency.name,
    statusLabel: ldaForm.formStatus.label,
    form: form!,
    formData,
  }

  const metaItems = [
    { label: LDA_TERMINOLOGY.fullName, value: ldaForm.localDevelopmentAgency.name },
    { label: "Status", value: humanizeStatus(ldaForm.formStatus.label) },
    { label: "Funding start", value: fundingStart ?? "—" },
    { label: "Funding end", value: fundingEnd ?? "—" },
    { label: "Due date", value: ldaForm.dueDate ? format(new Date(ldaForm.dueDate as unknown as string), "d MMM yyyy") : "—" },
    {
      label: "Submitted",
      value: ldaForm.submitted && typeof ldaForm.submitted !== "boolean"
        ? format(new Date(ldaForm.submitted as unknown as string), "d MMM yyyy, HH:mm")
        : ldaForm.submitted === true ? "Yes" : "—",
    },
  ]

  return (
    // print-color-adjust keeps backgrounds (radio dots, checkbox fills) in print output
    <div className="min-h-screen flex bg-white print:block [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 border-r border-slate-100 flex flex-col sticky top-0 h-screen overflow-y-auto print:hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <Image src={logoPath} alt="Logo" width={130} height={40} className="h-8 w-auto object-contain object-left" />
        </div>
        <div className="px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Export</p>
          <FormPreviewActions data={previewData} />
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-10 py-8 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 underline underline-offset-4 decoration-slate-300 mb-2">{heading}</h1>
            <p className="text-base text-slate-500">
              <span className="font-medium text-slate-600">{LDA_TERMINOLOGY.fullName}:</span>{" "}
              {ldaForm.localDevelopmentAgency.name}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
            {metaItems.map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm text-slate-800 font-medium">{value}</p>
              </div>
            ))}
          </div>

          {form ? form.sections.map((section, si) => {
            // Respect section-level show_if
            if (section.show_if) {
              const { field: condField, value: condValue } = section.show_if
              if (formData[condField] !== condValue) return null
            }
            return (
              <div key={si} className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-base font-bold text-slate-700 shrink-0">
                    {si + 1}.&nbsp;&nbsp;{section.title.toUpperCase()}
                  </h2>
                  <div className="flex-1 border-t border-slate-200" />
                </div>
                {section.description && (
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.description }} />
                )}
                {section.notice && (
                  <p className="text-sm text-slate-500 italic mb-4 leading-relaxed">{section.notice}</p>
                )}
                <SectionContent section={section} formData={formData} focusAreas={focusAreas} />
              </div>
            )
          }) : (
            <p className="text-slate-400 italic">Form template not available.</p>
          )}
        </div>
      </main>
    </div>
  )
}
