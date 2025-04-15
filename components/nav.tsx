"use client"

import * as React from "react"
import {
  BanknoteIcon,
  ClipboardPlus,
  HandCoins,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  MapPinHouse,
  Users
} from "lucide-react"

import { NavGroup } from "@/components/nav-group"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { useSession } from "next-auth/react"

const data = {
  navAdmin: [
    {
      title: "Form Templates",
      url: "/dashboard/form-templates",
      icon: LayoutTemplate,
    },
    {
      title: "Users",
      url: "/dashboard/users",
      icon: Users,
    }
  ],
  navMain: [
    {
      url: '/dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      url: '/dashboard/ldas',
      title: 'LDAs',
      icon: MapPinHouse
    },
    {
      url: '/dashboard/funders',
      title: 'Funders',
      icon: HandCoins
    },
    {
      url: '/dashboard/funds',
      title: 'Funds',
      icon: BanknoteIcon
    },
    {
      url: '/dashboard/applications-reports',
      title: 'Applications And Reports',
      icon: ClipboardPlus
    },
    {
      url: '/dashboard/media',
      title: 'Media',
      icon: Images
    }
  ],
}

export function Nav() {
  const tN = useTranslations('navigation')
  const {data: session} = useSession()
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" className="flex items-center justify-center rounded-lg bg-white dark:bg-white">
                <img src="/images/logo.webp" className="block h-8" alt={tN('logo alt')} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup items={data.navMain} />
        {session && session.user.role === 'ADMIN' && <NavGroup label="Admin" items={data.navAdmin} className="mt-auto" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
