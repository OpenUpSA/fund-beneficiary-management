"use client"

import { TabNav, TabItem } from "@/components/navigation/tab-nav"
import { useSearchParams } from "next/navigation"
import { preserveReferrer } from "@/lib/breadcrumb-utils"

interface LDATabsProps {
  ldaId: string
  className?: string
}

export function LDATabs({ ldaId, className }: LDATabsProps) {
  const searchParams = useSearchParams()
  const tabs: TabItem[] = [
    {
      label: "Overview",
      value: "overview",
      href: preserveReferrer(`/dashboard/ldas/${ldaId}/overview`, searchParams)
    },
    {
      label: "Operations",
      value: "operations",
      href: preserveReferrer(`/dashboard/ldas/${ldaId}/operations`, searchParams)
    },
    {
      label: "Funding & Reports",
      value: "funding-reports",
      href: preserveReferrer(`/dashboard/ldas/${ldaId}/funding-reports`, searchParams)
    },
    {
      label: "Contact List",
      value: "contact",
      href: preserveReferrer(`/dashboard/ldas/${ldaId}/contact`, searchParams)
    },
    {
      label: "Documents",
      value: "documents",
      href: preserveReferrer(`/dashboard/ldas/${ldaId}/documents`, searchParams)
    },
    {
      label: "Media",
      value: "media",
      href: preserveReferrer(`/dashboard/ldas/${ldaId}/media`, searchParams)
    }
  ]
  
  return <TabNav tabs={tabs} className={className} />
}
