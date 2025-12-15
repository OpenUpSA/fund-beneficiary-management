"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

interface DynamicBreadcrumbProps {
  basePath: string // e.g., "/dashboard/funds"
  entityName: string
  entityPath: string // e.g., "/dashboard/funds/123"
  tabLabels: Record<string, string>
}

export function DynamicBreadcrumb({
  basePath,
  entityName,
  entityPath,
  tabLabels
}: DynamicBreadcrumbProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Extract the current tab from the pathname
  const segments = pathname.split('/').filter(Boolean)
  const currentTab = segments[segments.length - 1] || 'overview'
  
  // Get the appropriate label
  const tabLabel = tabLabels[currentTab] || 'Overview'
  
  // Check for referrer information in query params
  const fromType = searchParams.get('from') // 'lda', 'fund', or 'funder'
  const fromId = searchParams.get('from_id')
  const fromName = searchParams.get('from_name')
  
  // Build the breadcrumb links
  const links = []
  
  // Add referrer breadcrumbs if present
  if (fromType && fromId && fromName) {
    const referrerBasePath = `/dashboard/${fromType}s`
    const referrerLabel = fromType === 'lda' ? 'LDAs' : fromType === 'fund' ? 'Funds' : 'Funders'
    
    links.push(
      { label: referrerLabel, href: referrerBasePath },
      { label: decodeURIComponent(fromName), href: `${referrerBasePath}/${fromId}` }
    )
    
    // When coming from a referrer, skip the intermediate list page (e.g., "Funds")
    // and go directly to: LDAs > LDA Name > Fund Name > Tab
    links.push(
      { label: entityName, href: entityPath },
      { label: tabLabel, isCurrent: true }
    )
  } else {
    // No referrer: show normal breadcrumbs: Funds > Fund Name > Tab
    const pathSegment = basePath.split('/').pop() || ''
    const baseLabelMap: Record<string, string> = {
      'funds': 'Funds',
      'funders': 'Funders',
      'ldas': 'LDAs'
    }
    const baseLabel = baseLabelMap[pathSegment] || pathSegment.charAt(0).toUpperCase() + pathSegment.slice(1)
    
    links.push(
      { label: baseLabel, href: basePath },
      { label: entityName, href: entityPath },
      { label: tabLabel, isCurrent: true }
    )
  }

  return <BreadcrumbNav className="mb-4" links={links} />
}
