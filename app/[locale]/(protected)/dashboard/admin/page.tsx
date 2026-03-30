import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { redirect } from "next/navigation"
import { permissions } from "@/lib/permissions"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { fetchLocalDevelopmentAgencies, fetchFormTemplates } from "@/lib/data"
import { AdminPanel } from "@/components/admin/admin-panel"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin - Fund Beneficiary Management',
  description: 'Admin tools for superusers',
}

export default async function AdminPage() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  
  if (!session?.user) {
    redirect('/')
  }

  // Only superusers can access this page
  if (!permissions.isSuperUser(session.user)) {
    redirect('/dashboard')
  }

  // Fetch LDAs and active form templates
  const [ldas, formTemplates] = await Promise.all([
    fetchLocalDevelopmentAgencies(),
    fetchFormTemplates()
  ])

  // Filter to only active templates
  const activeTemplates = formTemplates.filter(t => t.active)

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Admin", isCurrent: true }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-semibold">Admin Tools</h1>
      </div>
      
      <AdminPanel ldas={ldas} formTemplates={activeTemplates} />
    </div>
  )
}
