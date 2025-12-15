"use client"

import { TabNav, TabItem } from "@/components/navigation/tab-nav"
import { useSearchParams } from "next/navigation"
import { preserveReferrer } from "@/lib/breadcrumb-utils"

interface FunderTabsProps {
  funderId: string
  className?: string
}

export function FunderTabs({ funderId, className }: FunderTabsProps) {
  const searchParams = useSearchParams()
  const tabs: TabItem[] = [
    {
      label: "Overview",
      value: "overview",
      href: preserveReferrer(`/dashboard/funders/${funderId}/overview`, searchParams)
    },
    {
      label: "Funds",
      value: "funds",
      href: preserveReferrer(`/dashboard/funders/${funderId}/funds`, searchParams)
    },
    {
      label: "Funded LDAs",
      value: "funded",
      href: preserveReferrer(`/dashboard/funders/${funderId}/funded`, searchParams)
    },
    {
      label: "Applications & Reports",
      value: "applications",
      href: preserveReferrer(`/dashboard/funders/${funderId}/applications`, searchParams)
    },
    {
      label: "Documents",
      value: "documents",
      href: preserveReferrer(`/dashboard/funders/${funderId}/documents`, searchParams)
    },
    {
      label: "Media",
      value: "media",
      href: preserveReferrer(`/dashboard/funders/${funderId}/media`, searchParams)
    }
  ]
  
  return <TabNav tabs={tabs} className={className} />
}
