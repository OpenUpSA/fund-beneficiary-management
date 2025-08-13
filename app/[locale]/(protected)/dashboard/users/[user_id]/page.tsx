import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Overview } from "@/components/users/overview"
import { revalidateTag } from "next/cache"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { fetchUser, fetchLocalDevelopmentAgencies } from "@/lib/data"
import { FormDialog } from "@/components/users/form"
import { DeleteDialog } from "@/components/users/delete"
import { use } from "react"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale, user_id } }: Readonly<{ params: { locale: string, user_id: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'UserPage' })

  const user = await fetchUser(user_id)

  return {
    title: `${user.name} - ${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface UserPageProps {
  params: { user_id: string }
}

export default function Page({ params }: UserPageProps) {
  const { user_id } = params
  const session = use(getServerSession(NEXT_AUTH_OPTIONS))
  const user = use(fetchUser(user_id))
  const ldas = use(fetchLocalDevelopmentAgencies())

  const dataChanged = async () => {
    "use server"
    revalidateTag('users')
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
            <BreadcrumbLink href="/dashboard/users">Users</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{user.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">{user.name}</h1>
        <div className="space-x-2">
          <FormDialog user={user} callback={dataChanged} ldas={ldas} />
          {(session?.user.id !== user.id.toString()) && <DeleteDialog user={user} callback={dataChanged} />}
        </div>
      </div>
      <Tabs defaultValue="overview" className="pt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-2">
          <Overview user={user} />
        </TabsContent>
      </Tabs>
    </div >
  )
}