import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { fetchUsers, fetchLocalDevelopmentAgencies } from "@/lib/data"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Link } from "@/i18n/routing"

import { Badge } from "@/components/ui/badge"
import { UserWithLDAsBasic } from "@/types/models"
import { FormDialog } from "@/components/users/form"
import { revalidateTag } from "next/cache"
import { format } from "date-fns"
import { useTranslations } from "next-intl"
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
  const tC = useTranslations('common')
  const session = use(getServerSession(NEXT_AUTH_OPTIONS))
  
  // Check if user has permission to access users page
  const user = session?.user || null
  const canAccessUsers = user && (permissions.isSuperUser(user) || permissions.isAdmin(user))
  
  // Redirect non-admin/non-superuser users to LDAs dashboard
  if (!canAccessUsers) {
    redirect('/dashboard/ldas')
  }
  
  const users: UserWithLDAsBasic[] = use(fetchUsers())
  const ldas = use(fetchLocalDevelopmentAgencies())

  const dataChanged = async () => {
    "use server"
    revalidateTag('users')
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
      <div className="sm:flex sm:space-x-4 mt-4">
        <Card className="w-full">
          <CardContent>
            <Table className="text-xs w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[400px]">{LDA_TERMINOLOGY.shortName}</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-nowrap">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link href={`/dashboard/users/${user.id}`}>
                        {user.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-nowrap">
                      {user.role === 'USER' ? LDA_TERMINOLOGY.userRole : tC(`roles.${user.role}`)}
                    </TableCell>
                    <TableCell className="text-nowrap">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.localDevelopmentAgencies.slice(0, 2)?.map((lda) => (
                          <Badge 
                            key={lda.id} 
                            variant="outline" 
                            className="px-2 py-1 text-xs text-gray-700 rounded-sm"
                          >
                            <span className="max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap" title={lda.name}>{lda.name}</span>
                          </Badge>
                        ))}
                        {user.localDevelopmentAgencies?.length > 2 && (
                          <Badge 
                            variant="outline" 
                            className="px-2 py-1 text-xs rounded-sm"
                          >
                            <span title={`${user.localDevelopmentAgencies.slice(2).map(lda => lda.name).join(', ')}`}>{user.localDevelopmentAgencies.length - 2} more...</span>
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="w-full justify-center" variant={user.approved ? 'default' : 'destructive'}>{user.approved ? 'Yes' : 'No'}</Badge>
                    </TableCell>
                    <TableCell className="text-nowrap">
                      {format(user.updatedAt, 'PPpp')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}