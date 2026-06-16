import { fetchLDAForm } from "@/lib/data"
import { LocalDevelopmentAgencyFormFull } from "@/types/models"
import { Form, Field, Section } from "@/types/forms"
import { FormPreviewActions } from "@/components/lda-forms/form-preview-actions"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import { format } from "date-fns"
import Image from "next/image"
import { notFound } from "next/navigation"

interface Props {
  params: { lda_form_id: string; locale: string }
}

export async function generateMetadata({ params }: Props) {
  const ldaForm = await fetchLDAForm(params.lda_form_id).catch(() => null)
  return { title: ldaForm ? `${ldaForm.formTemplate.name} – Preview` : "Form Preview" }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SKIP_TYPES = new Set(["info", "data-table"])

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

function humanizeStatus(status: string): string {
  return status.replace(/([a-z])([A-Z])/g, "$1 $2")
}

function resolveValue(field: Field, formData: Record<string, string>): string {
  const raw = formData[field.name] ?? ""
  if (field.type === "toggle") return raw === "true" ? "Yes" : raw === "false" ? "No" : ""
  if (field.type === "radio" || field.type === "select") {
    return field.options?.find((o) => o.value === raw)?.label ?? raw ?? ""
  }
  if (field.type === "multiselect") {
    try {
      const values = JSON.parse(raw) as string[]
      return values.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(", ")
    } catch { return raw }
  }
  return raw
}

const EMPTY = (
  <span className="text-slate-400 italic text-base">No answer</span>
)

// ─── Field components ────────────────────────────────────────────────────────

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
    <div className="flex gap-3 mb-5">
      <span className="text-slate-400 mt-1 shrink-0 text-base">•</span>
      <div className="flex-1">
        <p className="text-base text-slate-800 font-semibold leading-snug">
          {field.label}
          <FieldTypeTag type={field.type} />
        </p>
        {field.description && (
          <p className="text-sm text-slate-500 mt-0.5 mb-1">{field.description}</p>
        )}
        <div className="pl-4 mt-1">{children}</div>
      </div>
    </div>
  )
}

function Answer({ value }: { value: string }) {
  if (!value) return EMPTY
  return <p className="text-base text-slate-700 whitespace-pre-wrap">{value}</p>
}

function SectionContent({ section, formData }: { section: Section; formData: Record<string, string> }) {
  return (
    <div className="pl-2">
      {section.fields.map((field, fi) => {
        if (SKIP_TYPES.has(field.type)) return null

        // Group fields — nested bullets for sub-fields
        if (field.type === "group" && field.fields) {
          return (
            <BulletField key={fi} field={field}>
              <div className="pl-4 space-y-3 border-l border-slate-100 mt-2">
                {field.fields.map((sub, si) => {
                  const val = formData[`${field.name}_${sub.name}`] ?? ""
                  return (
                    <div key={si}>
                      <p className="text-sm text-slate-600 font-medium mb-0.5">{sub.label}</p>
                      {sub.description && (
                        <p className="text-xs text-slate-400 mb-0.5">{sub.description}</p>
                      )}
                      <div className="pl-3">
                        <Answer value={val} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </BulletField>
          )
        }

        // Repeatable fields — numbered items with nested bullets
        if (field.type === "repeatable" && field.template) {
          const raw = formData[field.name] ?? ""
          let indices: number[] = []
          try { indices = JSON.parse(raw) as number[] } catch { /* empty */ }

          return (
            <BulletField key={fi} field={field}>
              {indices.length === 0 ? (
                EMPTY
              ) : (
                <div className="space-y-4 mt-2">
                  {indices.map((idx) => (
                    <div key={idx} className="pl-4 border-l-2 border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Item {idx}</p>
                      <div className="space-y-3">
                        {field.template!.map((tmpl, ti) => {
                          const key = `${field.name}_${tmpl.name}_${idx}`
                          const val = resolveValue({ ...tmpl, name: key }, formData)
                          return (
                            <div key={ti}>
                              <p className="text-sm text-slate-600 font-medium mb-0.5">{tmpl.label}</p>
                              {tmpl.description && (
                                <p className="text-xs text-slate-400 mb-0.5">{tmpl.description}</p>
                              )}
                              <div className="pl-3">
                                <Answer value={val} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </BulletField>
          )
        }

        const val = resolveValue(field, formData)
        return (
          <BulletField key={fi} field={field}>
            <Answer value={val} />
          </BulletField>
        )
      })}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function FormPreviewPage({ params }: Props) {
  let ldaForm: LocalDevelopmentAgencyFormFull
  try {
    ldaForm = await fetchLDAForm(params.lda_form_id)
  } catch {
    notFound()
  }

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

  const heading = dateRange
    ? `${ldaForm.formTemplate.name} (${dateRange})`
    : ldaForm.formTemplate.name

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
    {
      label: "Due date",
      value: ldaForm.dueDate
        ? format(new Date(ldaForm.dueDate as unknown as string), "d MMM yyyy")
        : "—",
    },
    {
      label: "Submitted",
      value:
        ldaForm.submitted && typeof ldaForm.submitted !== "boolean"
          ? format(new Date(ldaForm.submitted as unknown as string), "d MMM yyyy, HH:mm")
          : ldaForm.submitted === true
          ? "Yes"
          : "—",
    },
  ]

  return (
    <div className="min-h-screen flex bg-white print:block">
      {/* ── Left sidebar ── */}
      <aside className="w-64 shrink-0 border-r border-slate-100 flex flex-col sticky top-0 h-screen overflow-y-auto print:hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <Image
            src={logoPath}
            alt="Logo"
            width={130}
            height={40}
            className="h-8 w-auto object-contain object-left"
          />
        </div>
        <div className="px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Export</p>
          <FormPreviewActions data={previewData} />
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-10 py-8 max-w-4xl">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 underline underline-offset-4 decoration-slate-300 mb-2">
              {heading}
            </h1>
            <p className="text-base text-slate-500">
              <span className="font-medium text-slate-600">{LDA_TERMINOLOGY.fullName}:</span>{" "}
              {ldaForm.localDevelopmentAgency.name}
            </p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
            {metaItems.map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm text-slate-800 font-medium">{value}</p>
              </div>
            ))}
          </div>

          {/* Sections */}
          {form ? (
            form.sections.map((section, si) => (
              <div key={si} className="mb-8">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-base font-bold text-slate-700 shrink-0">
                    {si + 1}.&nbsp;&nbsp;{section.title.toUpperCase()}
                  </h2>
                  <div className="flex-1 border-t border-slate-200" />
                </div>

                <SectionContent section={section} formData={formData} />
              </div>
            ))
          ) : (
            <p className="text-slate-400 italic">Form template not available.</p>
          )}
        </div>
      </main>
    </div>
  )
}
