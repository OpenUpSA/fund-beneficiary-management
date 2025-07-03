import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { fetchUsers, fetchLocalDevelopmentAgencies } from "@/lib/data"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Link } from "@/i18n/routing"

import { Badge } from "@/components/ui/badge"
import { User } from "@prisma/client"
import { FormDialog } from "@/components/users/form"
import { revalidateTag } from "next/cache"
import { format } from "date-fns"
import { useTranslations } from "next-intl"
import { use } from "react"

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'UsersPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description')
  }
}

export default function Page() {
  const tC = useTranslations('common')
  const users: User[] = use(fetchUsers())
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
                  <TableHead className="w-full">Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
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
                      {tC(`roles.${user.role}`)}
                    </TableCell>
                    <TableCell className="text-nowrap">
                      {user.email}
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