"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LDATabsProps {
  ldaId: string
  className?: string
}

export function LDATabs({ ldaId, className }: LDATabsProps) {
  const pathname = usePathname()
  
  // Extract the current tab from the URL path
  const pathParts = pathname.split('/')
  const currentTab = pathParts[pathParts.length - 1]
  
  return (
    <Tabs value={currentTab} defaultValue="overview" className={className}>
      <TabsList>
        <Link href={`/dashboard/ldas/${ldaId}/overview`} passHref legacyBehavior>
          <TabsTrigger value="overview" asChild>
            <a>Overview</a>
          </TabsTrigger>
        </Link>
        <Link href={`/dashboard/ldas/${ldaId}/applicationsAndReports`} passHref legacyBehavior>
          <TabsTrigger value="applicationsAndReports" asChild>
            <a>Applications &amp; Reports</a>
          </TabsTrigger>
        </Link>
        <Link href={`/dashboard/ldas/${ldaId}/contact`} passHref legacyBehavior>
          <TabsTrigger value="contact" asChild>
            <a>Contact</a>
          </TabsTrigger>
        </Link>
        <Link href={`/dashboard/ldas/${ldaId}/documents`} passHref legacyBehavior>
          <TabsTrigger value="documents" asChild>
            <a>Documents</a>
          </TabsTrigger>
        </Link>
        <Link href={`/dashboard/ldas/${ldaId}/media`} passHref legacyBehavior>
          <TabsTrigger value="media" asChild>
            <a>Media</a>
          </TabsTrigger>
        </Link>
      </TabsList>
    </Tabs>
  )
}
