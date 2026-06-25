"use client"

import { useState, useEffect, Suspense } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize2 } from "lucide-react"
import { FilteredLDAs } from "@/components/ldas/filtered"
import { LocalDevelopmentAgencyListItem, UserWithLDAsBasic } from "@/types/models"
import { FocusArea, FundingStatus, Province, DevelopmentStage } from "@prisma/client"

const LDAMap = dynamic(
  () => import("@/components/ldas/map/lda-map"),
  { ssr: false }
)

const MAP_MINIMIZED_KEY = "lda-map-minimized"

interface LDAPageContentProps {
  ldas: LocalDevelopmentAgencyListItem[]
  focusAreas: FocusArea[]
  developmentStages: DevelopmentStage[]
  programmeOfficers: UserWithLDAsBasic[]
  provinces: Province[]
  fundingStatus: FundingStatus[]
  callback?: (ldaId?: number) => void
}

export function LDAPageContent({
  ldas,
  focusAreas,
  developmentStages,
  programmeOfficers,
  provinces,
  fundingStatus,
  callback,
}: LDAPageContentProps) {
  const [mapMinimized, setMapMinimized] = useState(false)

  // Remember the user's map minimise/maximise choice for the session. Read
  // after mount (rather than in the initial state) to avoid hydration mismatch.
  useEffect(() => {
    if (sessionStorage.getItem(MAP_MINIMIZED_KEY) === "true") {
      setMapMinimized(true)
    }
  }, [])

  const updateMapMinimized = (minimized: boolean) => {
    setMapMinimized(minimized)
    sessionStorage.setItem(MAP_MINIMIZED_KEY, String(minimized))
  }

  return (
    <>
      {mapMinimized ? (
        <div className="mb-6 hidden md:flex items-center justify-between rounded-lg border bg-card px-4 py-2">
          <span className="text-sm text-muted-foreground">Map</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateMapMinimized(false)}
            className="h-7 px-2 gap-1 text-xs"
          >
            <Maximize2 size={13} /> Show map
          </Button>
        </div>
      ) : (
        <Card className="mb-6 hidden md:block overflow-hidden">
          <CardContent className="p-0">
            <Suspense fallback={<div style={{ height: 400 }} className="w-full animate-pulse bg-muted" />}>
              <LDAMap
                ldas={ldas}
                height="400px"
                width="100%"
                onMinimize={() => updateMapMinimized(true)}
              />
            </Suspense>
          </CardContent>
        </Card>
      )}

      <FilteredLDAs
        ldas={ldas}
        focusAreas={focusAreas}
        developmentStages={developmentStages}
        programmeOfficers={programmeOfficers}
        provinces={provinces}
        fundingStatus={fundingStatus}
        callback={callback}
        mapMinimized={mapMinimized}
      />
    </>
  )
}
