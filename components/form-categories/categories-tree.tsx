"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FolderTreeIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
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
import { FormCategoryWithTemplates } from "@/types/models"
import { cn } from "@/lib/utils"

type Role = "PRIMARY" | "SECONDARY" | "REPORT"

const ROLE_LABELS: Record<Role, string> = { PRIMARY: "Primary", SECONDARY: "Secondary", REPORT: "Report" }
const ROLE_HINTS: Record<Role, string> = {
  PRIMARY: "Groups the forms of a funding period, e.g. a Grant Funding Application. One per LDA per period.",
  SECONDARY: "Sits under the primary form whose period covers its start date, e.g. a DFT Application.",
  REPORT: "Created by report rules and sits under the form it was created for.",
}

interface TemplateOption {
  id: number
  name: string
  formCategoryId: number | null
}

async function send(url: string, method: string, body?: unknown): Promise<boolean> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    toast.error(error?.error || "Something went wrong")
    return false
  }
  return true
}

const slugify = (label: string) =>
  label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "c_$1")

// ─── Create / edit dialog ────────────────────────────────────────────────────

function CategoryDialog({
  open,
  onOpenChange,
  category,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: FormCategoryWithTemplates
  categories: FormCategoryWithTemplates[]
}) {
  const router = useRouter()
  const [label, setLabel] = useState(category?.label ?? "")
  const [key, setKey] = useState(category?.key ?? "")
  const [keyEdited, setKeyEdited] = useState(false)
  const [role, setRole] = useState<Role>((category?.role as Role) ?? "SECONDARY")
  const [parentId, setParentId] = useState<number | null>(category?.parentCategoryId ?? null)
  const [saving, setSaving] = useState(false)

  const primaries = categories.filter((c) => c.role === "PRIMARY" && c.id !== category?.id)

  async function save() {
    setSaving(true)
    const body = {
      ...(!category && { key }),
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
              onChange={(e) => {
                setLabel(e.target.value)
                if (!category && !keyEdited) setKey(slugify(e.target.value))
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-key">Key</Label>
            <Input
              id="category-key"
              value={key}
              disabled={!!category}
              onChange={(e) => {
                setKeyEdited(true)
                setKey(e.target.value)
              }}
            />
            <p className="text-xs text-muted-foreground">
              {category ? "Fixed once created: code looks categories up by key." : "Lowercase letters, numbers and underscores."}
            </p>
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
          <Button onClick={save} disabled={saving || !label.trim() || !key}>
            {category ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function NewCategoryButton({ categories }: { categories: FormCategoryWithTemplates[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="h-4 w-4" />
        New category
      </Button>
      {open && <CategoryDialog open={open} onOpenChange={setOpen} categories={categories} />}
    </>
  )
}

// ─── Tree ────────────────────────────────────────────────────────────────────

function CategoryNode({
  category,
  categories,
  templates,
  depth,
}: {
  category: FormCategoryWithTemplates
  categories: FormCategoryWithTemplates[]
  templates: TemplateOption[]
  depth: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const children = categories.filter((c) => c.parentCategoryId === category.id)
  const assignable = templates.filter((t) => t.formCategoryId !== category.id)

  async function assignTemplate(templateId: number, formCategoryId: number | null) {
    if (await send(`/api/form-template/${templateId}`, "PUT", { formCategoryId })) {
      toast.success(formCategoryId ? "Template added to category" : "Template removed from category")
      router.refresh()
    }
  }

  async function setActive(active: boolean) {
    if (await send(`/api/form-category/${category.id}`, "PUT", { active })) router.refresh()
  }

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
            <code className="text-xs text-muted-foreground">{category.key}</code>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Templates</p>
            {category.templates.length === 0 && <p className="text-sm text-muted-foreground">No templates yet.</p>}
            <ul className="space-y-1">
              {category.templates.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <Link href={`/dashboard/form-templates/${t.id}`} className="hover:underline">{t.name}</Link>
                  {!t.active && <Badge variant="secondary" className="font-normal">Inactive</Badge>}
                  <button
                    type="button"
                    onClick={() => assignTemplate(t.id, null)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${t.name} from ${category.label}`}
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            {assignable.length > 0 && (
              <div className="mt-2 max-w-sm">
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
        </CardContent>
      </Card>
      {children.map((child) => (
        <CategoryNode key={child.id} category={child} categories={categories} templates={templates} depth={depth + 1} />
      ))}
      {editing && <CategoryDialog open={editing} onOpenChange={setEditing} category={category} categories={categories} />}
    </div>
  )
}

export function CategoriesTree({
  categories,
  templates,
}: {
  categories: FormCategoryWithTemplates[]
  templates: TemplateOption[]
}) {
  const ids = new Set(categories.map((c) => c.id))
  const primaries = categories.filter((c) => c.role === "PRIMARY")
  // Secondary categories not placed under a primary still need a home in the tree
  const looseSecondaries = categories.filter(
    (c) => c.role === "SECONDARY" && (!c.parentCategoryId || !ids.has(c.parentCategoryId))
  )
  const reports = categories.filter((c) => c.role === "REPORT")
  const uncategorised = templates.filter((t) => !t.formCategoryId)

  const group = (title: string, items: FormCategoryWithTemplates[]) =>
    items.length > 0 && (
      <section className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {items.map((c) => (
          <CategoryNode key={c.id} category={c} categories={categories} templates={templates} depth={0} />
        ))}
      </section>
    )

  return (
    <div className="mt-6 space-y-6">
      {categories.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <FolderTreeIcon className="h-8 w-8" />
          No categories yet.
        </div>
      )}
      {group("Primary forms", primaries)}
      {group("Secondary forms not under a primary", looseSecondaries)}
      {group("Reports", reports)}
      {uncategorised.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Templates without a category
          </h2>
          <p className="text-sm text-muted-foreground">
            {uncategorised.map((t) => t.name).join(", ")}. Add them to a category above; until then their forms aren&apos;t grouped and get no reports.
          </p>
        </section>
      )}
    </div>
  )
}
