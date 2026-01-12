"use client"

import { TabNav, TabItem } from "@/components/navigation/tab-nav"
import { useSearchParams } from "next/navigation"
import { preserveReferrer } from "@/lib/breadcrumb-utils"
import { LDA_TERMINOLOGY } from "@/constants/lda"

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
      href: preserveReferrer(`${LDA_TERMINOLOGY.dashboardPath}/${ldaId}/overview`, searchParams)
    },
    {
      label: "Operations",
      value: "operations",
      href: preserveReferrer(`${LDA_TERMINOLOGY.dashboardPath}/${ldaId}/operations`, searchParams)
    },
    {
      label: "Funding & Reports",
      value: "funding-reports",
      href: preserveReferrer(`${LDA_TERMINOLOGY.dashboardPath}/${ldaId}/funding-reports`, searchParams)
    },
    {
      label: "Contact List",
      value: "contact",
      href: preserveReferrer(`${LDA_TERMINOLOGY.dashboardPath}/${ldaId}/contact`, searchParams)
    },
    {
      label: "Documents",
      value: "documents",
      href: preserveReferrer(`${LDA_TERMINOLOGY.dashboardPath}/${ldaId}/documents`, searchParams)
    },
    {
      label: "Media",
      value: "media",
      href: preserveReferrer(`${LDA_TERMINOLOGY.dashboardPath}/${ldaId}/media`, searchParams)
    }
  ]
  
  return <TabNav tabs={tabs} className={className} />
}
