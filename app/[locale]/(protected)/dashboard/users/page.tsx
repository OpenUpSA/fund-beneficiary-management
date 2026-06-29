import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { fetchUsers, fetchLocalDevelopmentAgencies } from "@/lib/data"
import { UserWithLDAsBasic } from "@/types/models"
import { FormDialog } from "@/components/users/form"
import { FilteredUsers } from "@/components/users/filtered"
import { revalidateTag } from "next/cache"
import { use } from "react"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { LDA_TERMINOLOGY } from "@/constants/lda"

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'UsersPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

export default function Page() {
  const session = use(getServerSession(NEXT_AUTH_OPTIONS))
  
  // Check if user has permission to access users page
  const user = session?.user || null
  const canAccessUsers = user && (permissions.isSuperUser(user) || permissions.isAdmin(user))
  
  // Redirect non-admin/non-superuser users to LDAs dashboard
  if (!canAccessUsers) {
    redirect(LDA_TERMINOLOGY.dashboardPath)
  }
  
  const users: UserWithLDAsBasic[] = use(fetchUsers())
  const ldas = use(fetchLocalDevelopmentAgencies())

  const dataChanged = async () => {
    "use server"
    revalidateTag('users:list')
  }

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Users", isCurrent: true }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Users</h1>
        <div className="space-x-2">
          <FormDialog callback={dataChanged} ldas={ldas} />
        </div>
      </div>
      <FilteredUsers users={users} />
    </div>
  )
}