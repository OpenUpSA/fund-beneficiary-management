"use client"

import { Fragment } from "react"
import { SidebarTrigger } from "./sidebar"
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "./breadcrumb"

export interface BreadcrumbLink {
  href?: string
  label: string
  isCurrent?: boolean
}

export interface BreadcrumbNavProps {
  links: BreadcrumbLink[]
  className?: string
  showSidebarTrigger?: boolean
}

export function BreadcrumbNav({ links, className, showSidebarTrigger = true }: BreadcrumbNavProps) {
  if (!links || links.length === 0) return null
  
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {links.map((link, index) => (
          <Fragment key={`${link.label}-${index}`}>
            {index === 0 && showSidebarTrigger && (
              <BreadcrumbItem>
                <SidebarTrigger />
              </BreadcrumbItem>
            )}
            <BreadcrumbItem>
              {link.isCurrent ? (
                <BreadcrumbPage>{link.label}</BreadcrumbPage>
              ) : link.href ? (
                <BreadcrumbLink href={link.href}>{link.label}</BreadcrumbLink>
              ) : (
                <span>{link.label}</span>
              )}
            </BreadcrumbItem>
            {index < links.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
