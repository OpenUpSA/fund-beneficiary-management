"use client"

import { FundFull } from "@/types/models"
import React from "react"
import Link from "next/link"
import { buildReferrerUrl } from "@/lib/breadcrumb-utils"

// Skeleton loader for funds
export function FundListSkeleton() {
  return <span className="text-slate-500">Loading funders...</span>
}

interface FundListRendererProps {
  funds: FundFull[]
  canViewFunds: boolean
  ldaId?: string | number
  ldaName?: string
}

// Regular component for rendering fund list
function FundListRenderer({ funds, canViewFunds, ldaId, ldaName }: FundListRendererProps) {
  if (!funds || funds.length === 0) {
    return <span>None</span>
  }

  return (
    <>
      {funds.map((fund, index) => (
        <React.Fragment key={fund.id}>
          {canViewFunds ? (
            <Link 
              href={
                ldaId && ldaName
                  ? buildReferrerUrl(`/dashboard/funds/${fund.id}`, {
                      type: 'lda',
                      id: ldaId,
                      name: ldaName
                    })
                  : `/dashboard/funds/${fund.id}`
              }
              className="text-slate-700 underline"
            >
              {fund.name}
            </Link>
          ) : (
            <span className="text-slate-700">{fund.name}</span>
          )}
          {index < funds.length - 1 && <span className="mx-1">,</span>}
        </React.Fragment>
      ))}
    </>
  )
}

interface AsyncFundListProps {
  fundsPromise: Promise<FundFull[]>
  canViewFunds: () => boolean
  ldaId?: string | number
  ldaName?: string
}

// Async component that will suspend
export async function AsyncFundList({ fundsPromise, canViewFunds, ldaId, ldaName }: AsyncFundListProps) {
  const funds = await fundsPromise; // This will suspend until the promise resolves
  
  return <FundListRenderer funds={funds} canViewFunds={canViewFunds()} ldaId={ldaId} ldaName={ldaName} />
}
