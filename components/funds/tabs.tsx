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
      label: "LDAs",
      value: "ldas",
      href: `/dashboard/funds/${fundId}/ldas`
    },
    {
      label: "Forms",
      value: "forms",
      href: `/dashboard/funds/${fundId}/forms`
    },
    {
      label: "Documents",
      value: "documents",
      href: `/dashboard/funds/${fundId}/documents`
    },
    {
      label: "Media",
      value: "media",
      href: `/dashboard/funds/${fundId}/media`
    }
  ]
  
  return <TabNav tabs={tabs} className={className} />
}