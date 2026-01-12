"use client"

import { TabNav, TabItem } from "@/components/navigation/tab-nav"
import { useSearchParams } from "next/navigation"
import { preserveReferrer } from "@/lib/breadcrumb-utils"
import { LDA_TERMINOLOGY } from "@/constants/lda"

interface FundsTabsProps {
  fundId: string
  className?: string
}

export function FundsTabs({ fundId, className }: FundsTabsProps) {
  const searchParams = useSearchParams()
  
  const tabs: TabItem[] = [
    {
      label: "Overview",
      value: "overview",
      href: preserveReferrer(`/dashboard/funds/${fundId}/overview`, searchParams)
    },
    {
      label: "Funders",
      value: "funders",
      href: preserveReferrer(`/dashboard/funds/${fundId}/funders`, searchParams)
    },
    {
      label: LDA_TERMINOLOGY.fundedLabel,
      value: "ldas",
      href: preserveReferrer(`/dashboard/funds/${fundId}/ldas`, searchParams)
    },
    {
      label: "Applications & Reports",
      value: "applications",
      href: preserveReferrer(`/dashboard/funds/${fundId}/applications`, searchParams)
    },
    {
      label: "Documents",
      value: "documents",
      href: preserveReferrer(`/dashboard/funds/${fundId}/documents`, searchParams)
    },
    {
      label: "Media",
      value: "media",
      href: preserveReferrer(`/dashboard/funds/${fundId}/media`, searchParams)
    }
  ]
  
  return <TabNav tabs={tabs} className={className} />
}