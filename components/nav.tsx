"use client"

import { useMemo } from "react"
import {
  BanknoteIcon,
  HandCoins,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  MapPinHouse,
  Users,
  Files
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

export function Nav() {
  const tN = useTranslations('navigation')
  const { data: session } = useSession()
  const user = session?.user as { role: string; ldaIds?: number[] } | undefined

  const data = useMemo(() => ({
    navAdmin: [
      {
        title: "Form Templates",
        url: "/dashboard/form-templates",
        icon: LayoutTemplate,
        requiredRoles: ['ADMIN']
      },
      {
        title: "Users",
        url: "/dashboard/users",
        icon: Users,
        requiredRoles: ['ADMIN']
      }
    ],
    navMain: [
      {
        url: '/dashboard',
        title: 'Dashboard',
        icon: LayoutDashboard,
        requiredRoles: ['ADMIN', 'PROGRAMME_OFFICER', 'USER']
      },
      {
        url: user?.role === 'USER' && user?.ldaIds?.length === 1
          ? `/dashboard/ldas/${user.ldaIds[0]}`
          : '/dashboard/ldas',
        title: 'LDAs',
        icon: MapPinHouse,
        requiredRoles: ['ADMIN', 'PROGRAMME_OFFICER', 'USER']
      },
      {
        url: '/dashboard/funders',
        title: 'Funders',
        icon: HandCoins,
        requiredRoles: ['ADMIN', 'PROGRAMME_OFFICER']
      },
      {
        url: '/dashboard/funds',
        title: 'Funds',
        icon: BanknoteIcon,
        requiredRoles: ['ADMIN', 'PROGRAMME_OFFICER']
      },
      // {
      //   url: '/dashboard/applications-reports',
      //   title: 'Applications And Reports',
      //   icon: ClipboardPlus,
      //   requiredRoles: ['ADMIN', 'PROGRAMME_OFFICER']
      // },
      {
        url: '/dashboard/media',
        title: 'Media',
        icon: Images,
        requiredRoles: ['ADMIN', 'PROGRAMME_OFFICER']
      },
      {
        url: '/dashboard/documents',
        title: 'Documents',
        icon: Files,
        requiredRoles: ['ADMIN', 'PROGRAMME_OFFICER']
      }
    ]
  }), [user?.role, user?.ldaIds])

  return (
    <Sidebar id="sidebar">
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
        {session && <NavGroup session={session} items={data.navMain} />}
        {session && session.user.role === 'ADMIN' && <NavGroup session={session} label="Admin" items={data.navAdmin} className="mt-auto" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
