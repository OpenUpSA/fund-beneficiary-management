"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export interface TabItem {
  label: string
  value: string
  href: string
}

interface TabNavProps {
  tabs: TabItem[]
  className?: string
  baseUrl?: string
}

export function TabNav({ tabs, className, baseUrl = "" }: TabNavProps) {
  const pathname = usePathname()
  
  // Extract the current tab from the URL path
  // For nested routes like /dashboard/ldas/1/applicationsAndReports/2 or /applicationsAndReports/2/fill
  // we need to find which tab value matches the path
  const findActiveTab = () => {
    // Check if any tab value is present in the pathname
    for (const tab of tabs) {
      // Extract the tab segment from the href
      const tabSegment = tab.href.split('/').filter(Boolean).pop() || ''
      
      // Check if this segment exists in the pathname
      if (pathname.includes(`/${tabSegment}/`) || pathname.endsWith(`/${tabSegment}`)) {
        return tab.value
      }
    }
    
    // Fallback to the first tab if no match found
    return tabs[0]?.value
  }
  
  const activeTab = findActiveTab()
  
  return (
    <div className="overflow-x-auto pb-1">
      <Tabs value={activeTab} defaultValue={tabs[0]?.value} className={cn("mb-6", className)}>
        <TabsList className="w-max">
          {tabs.map((tab) => (
            <Link key={tab.value} href={`${baseUrl}${tab.href}`} passHref legacyBehavior>
              <TabsTrigger 
                value={tab.value} 
                asChild 
                className="text-xs sm:text-sm whitespace-nowrap"
              >
                <a>{tab.label}</a>
              </TabsTrigger>
            </Link>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
