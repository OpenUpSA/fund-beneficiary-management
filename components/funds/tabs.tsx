"use client"

import { TabNav, TabItem } from "@/components/navigation/tab-nav"
import { useSearchParams } from "next/navigation"
import { preserveReferrer } from "@/lib/breadcrumb-utils"

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
      label: "Funded LDAs",
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