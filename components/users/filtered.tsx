"use client"

import { useState, useMemo, useCallback, useDeferredValue, useTransition } from "react"
import { format } from "date-fns"
import { useTranslations } from "next-intl"

import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import { Link } from "@/i18n/routing"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import { UserWithLDAsBasic } from "@/types/models"

const ROLES = ['USER', 'PROGRAMME_OFFICER', 'ADMIN', 'SUPER_USER'] as const

interface FilteredUsersProps {
  users: UserWithLDAsBasic[]
}

export function FilteredUsers({ users }: FilteredUsersProps) {
  const tC = useTranslations('common')
  const [, startTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})

  // Defer filtering while the user types -> smoother input
  const deferredSearch = useDeferredValue(searchTerm)

  // Role label matches the table (LDA terminology for USER, translations otherwise)
  const roleLabel = useCallback(
    (role: string) => (role === 'USER' ? LDA_TERMINOLOGY.userRole : tC(`roles.${role}`)),
    [tC]
  )

  const filterConfigs = useMemo(
    () => [
      {
        type: 'role',
        label: 'Role',
        options: ROLES.map((role) => ({ id: role, label: roleLabel(role) })),
      },
      {
        type: 'approved',
        label: 'Approved',
        options: [
          { id: 'true', label: 'Yes' },
          { id: 'false', label: 'No' },
        ] as FilterOption[],
      },
    ],
    [roleLabel]
  )

  const filteredUsers = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    return users.filter((user) => {
      // Search matches name, email or any linked LDA name
      const searchMatch =
        query === "" ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.localDevelopmentAgencies.some((lda) => lda.name.toLowerCase().includes(query))

      const filtersMatch = Object.entries(activeFilters).every(([filterKey, selectedOptions]) => {
        if (selectedOptions.length === 0) return true
        switch (filterKey) {
          case 'role':
            return selectedOptions.some((option) => String(option.id) === user.role)
          case 'approved':
            return selectedOptions.some((option) => String(option.id) === String(user.approved))
          default:
            return true
        }
      })

      return searchMatch && filtersMatch
    })
  }, [users, deferredSearch, activeFilters])

  const handleSearch = useCallback((value: string) => {
    startTransition(() => setSearchTerm(value))
  }, [])

  const handleFilterChange = useCallback((filterKey: string, selectedOptions: FilterOption[]) => {
    startTransition(() => {
      setActiveFilters((prev) => ({ ...prev, [filterKey]: selectedOptions }))
    })
  }, [])

  const handleResetFilters = useCallback(() => {
    startTransition(() => setActiveFilters({}))
  }, [])

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="search"
          placeholder="Filter users..."
          className="pr-8 h-9 max-w-xs"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <FilterBar
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          filterConfigs={filterConfigs}
          activeFilters={activeFilters}
        />
      </div>

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
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link href={`/dashboard/users/${user.id}`}>{user.name}</Link>
                  </TableCell>
                  <TableCell className="text-nowrap">{roleLabel(user.role)}</TableCell>
                  <TableCell className="text-nowrap">{user.email}</TableCell>
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
                        <Badge variant="outline" className="px-2 py-1 text-xs rounded-sm">
                          <span title={`${user.localDevelopmentAgencies.slice(2).map((lda) => lda.name).join(', ')}`}>{user.localDevelopmentAgencies.length - 2} more...</span>
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="w-full justify-center" variant={user.approved ? 'default' : 'destructive'}>{user.approved ? 'Yes' : 'No'}</Badge>
                  </TableCell>
                  <TableCell className="text-nowrap">{format(user.updatedAt, 'PPpp')}</TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
