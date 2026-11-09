import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { fetchFormCategories, fetchFormStatuses, fetchFormTemplates } from "@/lib/data"
import { CategoriesTree } from "@/components/form-categories/categories-tree"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Form categories" }

export default async function Page() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user || !permissions.isSuperUser(session.user)) notFound()

  const [categories, formTemplates, statuses] = await Promise.all([
    fetchFormCategories(),
    fetchFormTemplates(),
    fetchFormStatuses(),
  ])

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Form Templates", href: "/dashboard/form-templates" },
          { label: "Categories", isCurrent: true },
        ]}
      />
      <h1 className="text-xl md:text-2xl font-semibold">Form categories</h1>
      <CategoriesTree
        categories={categories}
        templates={formTemplates.map((t) => ({
          id: t.id,
          name: t.name,
          formCategoryId: t.formCategoryId,
          templateType: t.templateType,
        }))}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
      />
    </div>
  )
}
