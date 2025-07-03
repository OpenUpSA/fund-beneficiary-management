"use client"

import { TabNav, TabItem } from "@/components/navigation/tab-nav"

interface FunderTabsProps {
  funderId: string
  className?: string
}

export function FunderTabs({ funderId, className }: FunderTabsProps) {
  const tabs: TabItem[] = [
    {
      label: "Overview",
      value: "overview",
      href: `/dashboard/funders/${funderId}/overview`
    },
    {
      label: "Funds",
      value: "funds",
      href: `/dashboard/funders/${funderId}/funds`
    },
    {
      label: "Funded LDAs",
      value: "funded",
      href: `/dashboard/funders/${funderId}/funded`
    },
    {
      label: "Contact",
      value: "contact",
      href: `/dashboard/funders/${funderId}/contact`
    },
    {
      label: "Documents",
      value: "documents",
      href: `/dashboard/funders/${funderId}/documents`
    },
    {
      label: "Media",
      value: "media",
      href: `/dashboard/funders/${funderId}/media`
    }
  ]
  
  return <TabNav tabs={tabs} className={className} />
}
