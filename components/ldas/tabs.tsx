"use client"

import { TabNav, TabItem } from "@/components/navigation/tab-nav"

interface LDATabsProps {
  ldaId: string
  className?: string
}

export function LDATabs({ ldaId, className }: LDATabsProps) {
  const tabs: TabItem[] = [
    {
      label: "Overview",
      value: "overview",
      href: `/dashboard/ldas/${ldaId}/overview`
    },
    {
      label: "Applications & Reports",
      value: "applicationsAndReports",
      href: `/dashboard/ldas/${ldaId}/applicationsAndReports`
    },
    {
      label: "Contact",
      value: "contact",
      href: `/dashboard/ldas/${ldaId}/contact`
    },
    {
      label: "Documents",
      value: "documents",
      href: `/dashboard/ldas/${ldaId}/documents`
    },
    {
      label: "Media",
      value: "media",
      href: `/dashboard/ldas/${ldaId}/media`
    }
  ]
  
  return <TabNav tabs={tabs} className={className} />
}
