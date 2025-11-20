"use server"
import { revalidateTag } from 'next/cache'
import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { FilteredFunds } from "@/components/funds/filtered"
import { fetchFocusAreas, fetchFunds, fetchProvinces } from "@/lib/data"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canViewFunds } from "@/lib/permissions"

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundsPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

export default async function Page() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;

  if (!canViewFunds(user)) {
    redirect('/404')
  }

  const funds = await fetchFunds()
  const focusAreas = await fetchFocusAreas()
  const provinces = await fetchProvinces()

  const dataChanged = async () => {
    "use server"
    revalidateTag('funds')
  }

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Funds", isCurrent: true }
        ]}
      />
      <FilteredFunds
        funds={funds}
        provinces={provinces}
        callback={dataChanged}
        focusAreas={focusAreas}
      />
    </div>
  )
}