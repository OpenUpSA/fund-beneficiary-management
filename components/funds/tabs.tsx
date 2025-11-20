"use client"

import { TabNav, TabItem } from "@/components/navigation/tab-nav"

interface FundsTabsProps {
  fundId: string
  className?: string
}

export function FundsTabs({ fundId, className }: FundsTabsProps) {
  const tabs: TabItem[] = [
    {
      label: "Overview",
      value: "overview",
      href: `/dashboard/funds/${fundId}/overview`
    },
    {
      label: "Funders",
      value: "funders",
      href: `/dashboard/funds/${fundId}/funders`
    },
    {
      label: "Funded LDAs",
      value: "ldas",
      href: `/dashboard/funds/${fundId}/ldas`
    },
    {
      label: "Applications & Reports",
      value: "applications",
      href: `/dashboard/funds/${fundId}/applications`
    },
    // {
    //   label: "Documents",
    //   value: "documents",
    //   href: `/dashboard/funds/${fundId}/documents`
    // },
    // {
    //   label: "Media",
    //   value: "media",
    //   href: `/dashboard/funds/${fundId}/media`
    // }
  ]
  
  return <TabNav tabs={tabs} className={className} />
}