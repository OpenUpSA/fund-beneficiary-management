import * as React from "react"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link } from "@/i18n/routing"
import { Session } from "next-auth"

interface NavGroupProps extends React.ComponentPropsWithoutRef<typeof SidebarGroup> {
  label?: string,
  session: Session,
  items: {
    title: string
    url: string
    icon: LucideIcon,
    requiredRoles: string[]
  }[]
}

export function NavGroup({ label, items, session, ...props }: NavGroupProps) {
  return (
    <SidebarGroup {...props}>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}

      <SidebarGroupContent>
        <SidebarMenu>
          {items.filter((item) => item.requiredRoles?.includes(session?.user?.role || '')).map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild size="sm">
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
