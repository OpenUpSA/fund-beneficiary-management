"use client"

import { FundFull } from "@/types/models"
import React from "react"
import Link from "next/link"

// Skeleton loader for funds
export function FundListSkeleton() {
  return <span className="text-slate-500">Loading funders...</span>
}

// Async component that will suspend
export async function AsyncFundList({ fundsPromise }: { fundsPromise: Promise<FundFull[]> }) {
  const funds = await fundsPromise; // This will suspend until the promise resolves
  
  if (!funds || funds.length === 0) {
    return <span>None</span>
  }

  return (
    <>
      {funds.map((fund, index) => (
        <React.Fragment key={fund.id}>
          <Link 
            href={`/dashboard/funds/${fund.id}`} 
            className="text-slate-700 underline"
          >
            {fund.name}
          </Link>
          {index < funds.length - 1 && <span className="mx-1">,</span>}
        </React.Fragment>
      ))}
    </>
  )
}
