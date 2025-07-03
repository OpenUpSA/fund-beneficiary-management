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
  const pathParts = pathname.split('/')
  const currentTab = pathParts[pathParts.length - 1]
  
  return (
    <div className="overflow-x-auto pb-1">
      <Tabs value={currentTab} defaultValue={tabs[0]?.value} className={cn("mb-6", className)}>
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
