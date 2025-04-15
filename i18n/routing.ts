import { createNavigation } from 'next-intl/navigation'
import { defineRouting } from 'next-intl/routing'

export const availableLocales = ['en', 'xh']

export const routing = defineRouting({
  locales: availableLocales,
  defaultLocale: availableLocales[0]
})

export type Locale = (typeof routing.locales)[number]

export const { Link, getPathname, redirect, usePathname, useRouter } =
  createNavigation(routing)
