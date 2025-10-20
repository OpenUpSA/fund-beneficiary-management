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
      label: "Operations",
      value: "operations",
      href: `/dashboard/ldas/${ldaId}/operations`
    },
    {
      label: "Funding & Reports",
      value: "funding-reports",
      href: `/dashboard/ldas/${ldaId}/funding-reports`
    },
    {
      label: "Contact List",
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
