"use client"

import * as LucideIcons from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export interface SubFieldOption {
  value: string
  label: string
  iconName?: string
}

export interface RepeatableSubField {
  label: string
  description?: string
  type: string
  /** Pre-resolved display string for plain text / date / toggle / currency */
  resolvedValue: string
  /** For radio / select / multiselect: all available options */
  options?: SubFieldOption[]
  /** For radio / select / multiselect: the raw stored string (comma-sep for multi) */
  rawValue?: string
}

export interface RepeatableItem {
  index: number
  subFields: RepeatableSubField[]
}

// ─── Icon helper ──────────────────────────────────────────────────────────────

function IconByName({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ElementType | undefined>)[name]
  if (!Icon) return null
  return <Icon className={className} />
}

// ─── Per-type answer renderers ────────────────────────────────────────────────

function ToggleChip({ value }: { value: string }) {
  if (!value) return <span className="text-slate-400 italic text-sm">Not answered</span>
  const yes = value === "Yes" || value === "true"
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-sm font-medium ${yes ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
      {yes ? "Yes" : "No"}
    </span>
  )
}

function optionsLayout(count: number) {
  return count <= 3 ? "flex flex-wrap gap-x-8 gap-y-2" : "grid grid-cols-3 gap-x-4 gap-y-2"
}

function RadioSurvey({ options, rawValue }: { options: SubFieldOption[]; rawValue: string }) {
  if (!options.length) return <span className="text-slate-400 italic text-sm">No option selected</span>
  return (
    <div className={optionsLayout(options.length)}>
      {options.map((opt) => {
        const sel = opt.value === rawValue
        return (
          <div key={opt.value} className={`flex items-center gap-2 ${sel ? "text-slate-900" : "text-slate-400"}`}>
            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? "border-slate-700" : "border-slate-300"}`}>
              {sel && <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
            </div>
            {opt.iconName && <IconByName name={opt.iconName} className="h-3.5 w-3.5 shrink-0" />}
            <span className={`text-sm ${sel ? "font-semibold" : ""}`}>{opt.label}</span>
          </div>
        )
      })}
      {!rawValue && <div className="pt-1"><span className="text-slate-400 italic text-sm">No option selected</span></div>}
    </div>
  )
}

function MultiSurvey({ options, rawValue }: { options: SubFieldOption[]; rawValue: string }) {
  const selected = rawValue ? rawValue.split(",").filter(Boolean) : []
  if (!options.length) {
    if (!selected.length) return <span className="text-slate-400 italic text-sm">No options selected</span>
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
            {opt.iconName && <IconByName name={opt.iconName} className="h-3.5 w-3.5 shrink-0" />}
            <span className={`text-sm ${sel ? "font-semibold" : ""}`}>{opt.label}</span>
          </div>
        )
      })}
      {!selected.length && <div className="pt-1"><span className="text-slate-400 italic text-sm">No options selected</span></div>}
    </div>
  )
}

interface UploadedFile { id: string; name: string; size: number; type: string; url: string }

function FileUploadAnswer({ raw }: { raw: string }) {
  if (!raw) return <span className="text-slate-400 italic text-sm">No file uploaded</span>
  let files: UploadedFile[] = []
  try { files = JSON.parse(raw) as UploadedFile[] } catch { /* empty */ }
  if (!files.length) return <span className="text-slate-400 italic text-sm">No file uploaded</span>

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
              <span className="text-slate-400">📎</span>
              {f.name}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function SubFieldAnswer({ sf }: { sf: RepeatableSubField }) {
  const type = sf.type

  if (type === "toggle" || type === "checkbox") {
    return <ToggleChip value={sf.resolvedValue} />
  }

  if ((type === "radio" || type === "select") && sf.options) {
    return <RadioSurvey options={sf.options} rawValue={sf.rawValue ?? ""} />
  }

  if (type === "multiselect" && sf.options) {
    return <MultiSurvey options={sf.options} rawValue={sf.rawValue ?? ""} />
  }

  if (type === "fileUpload") {
    return <FileUploadAnswer raw={sf.rawValue ?? sf.resolvedValue} />
  }

  if (!sf.resolvedValue) {
    const msg =
      type === "date" ? "No date selected"
      : type === "currency" ? "No amount entered"
      : type === "number" ? "No value entered"
      : "No response provided"
    return <span className="text-slate-400 italic text-sm">{msg}</span>
  }

  return <p className="text-base text-slate-700 whitespace-pre-wrap">{sf.resolvedValue}</p>
}

// ─── Item fields list ─────────────────────────────────────────────────────────

function ItemFields({ subFields }: { subFields: RepeatableSubField[] }) {
  return (
    <div className="divide-y divide-slate-100">
      {subFields.map((sf, fi) => (
        <div key={fi} className="py-3">
          <p className="text-sm text-slate-700 font-semibold mb-1">{sf.label}</p>
          {sf.description && (
            <p className="text-xs text-slate-400 mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: sf.description }} />
          )}
          <SubFieldAnswer sf={sf} />
        </div>
      ))}
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export function RepeatablePreview({ items }: { items: RepeatableItem[] }) {
  if (items.length === 0) {
    return <span className="text-slate-400 italic text-base">No items added</span>
  }

  const defaultOpen = items.map((i) => String(i.index))

  return (
    <>
      {/* Screen: accordion, all open by default */}
      <div className="print:hidden">
        <Accordion type="multiple" defaultValue={defaultOpen} className="border rounded-md">
          {items.map((item, ii) => (
            <AccordionItem
              key={item.index}
              value={String(item.index)}
              className={`px-4 border-none ${ii < items.length - 1 ? "border-b border-slate-200" : ""}`}
            >
              <AccordionTrigger className="text-sm font-semibold text-slate-600 py-3 hover:no-underline border-b border-slate-100 data-[state=closed]:border-transparent">
                Item {item.index}
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <ItemFields subFields={item.subFields} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Print: flat boxes */}
      <div className="hidden print:block space-y-3">
        {items.map((item) => (
          <div key={item.index} className="border rounded-md p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Item {item.index}
            </p>
            <ItemFields subFields={item.subFields} />
          </div>
        ))}
      </div>
    </>
  )
}
