import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { fetchFormCategories, fetchFormTemplates } from "@/lib/data"
import { CategoriesTree, NewCategoryButton } from "@/components/form-categories/categories-tree"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Form categories" }

export default async function Page() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user || !permissions.isSuperUser(session.user)) notFound()

  const [categories, formTemplates] = await Promise.all([fetchFormCategories(), fetchFormTemplates()])

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Form Templates", href: "/dashboard/form-templates" },
          { label: "Categories", isCurrent: true },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Form categories</h1>
          <p className="text-sm text-muted-foreground">
            Primary forms group a funding period, secondary forms sit under the primary covering their start date,
            and reports sit under the form they were created for.
          </p>
        </div>
        <NewCategoryButton categories={categories} />
      </div>
      <CategoriesTree
        categories={categories}
        templates={formTemplates.map((t) => ({ id: t.id, name: t.name, formCategoryId: t.formCategoryId }))}
      />
    </div>
  )
}
