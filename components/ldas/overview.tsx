"use client"

import { DashboardSection } from "../dashboard/section"
import { Accordion } from "../ui/accordion"
import { Badge } from "../ui/badge"
import { Card, CardContent, CardHeader } from "../ui/card"
import { LocalDevelopmentAgencyFull } from "@/types/models"
import { format } from "date-fns"
import { DynamicIcon } from "../dynamicIcon"
import { FocusArea, Fund } from '@prisma/client'
// import { Map } from "../leaflet/maps"



interface Props {
  lda: LocalDevelopmentAgencyFull
}

export const Overview: React.FC<Props> = ({ lda }: Props) => {

  return (
    <div className="space-y-4">
      <div className="sm:flex gap-4 ">
        <Card className="w-full sm:w-1/2">
          <CardContent className="pt-2 space-y-2 text-sm py-4">
            <div className="flex justify-between">
              <span className="font-medium">Funding status:</span>
              <span>{lda.fundingStatus.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current funding period:</span>
              <span>{format(lda.fundingStart, 'P')} - {format(lda.fundingEnd, 'P')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total funding rounds:</span>
              <span>{lda.totalFundingRounds}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Development stage:</span>
              <span><Badge variant="outline">{lda.developmentStage.label}</Badge></span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Location:</span>
              <span><Badge variant="outline">{lda.location.label}</Badge></span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current focus areas:</span>
              <span className="flex space-x-2">
                {lda.focusAreas.map((focusArea: FocusArea) => (
                  <Badge key={`focusArea-${focusArea.id}`} variant="outline">
                    <DynamicIcon name={focusArea.icon} size={10} />
                    <span>{focusArea.label}</span>
                  </Badge>
                ))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Funders:</span>
              <span className="flex space-x-2">
                {lda.funds.flatMap((fund) =>
                  fund.funders.map((funder) =>
                    <Badge key={`funder-${fund.id}-${funder.id}`} variant="outline">{funder.name}</Badge>
                  )
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Funds:</span>
              <span className="flex space-x-2">
                {lda.funds.map((fund: Fund) => <Badge key={`fund-${fund.id}`} variant="outline">{fund.name}</Badge>)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardHeader>
            About this LDA:
          </CardHeader>
          <CardContent>
            {lda.about}
          </CardContent>
        </Card>
      </div>
      <Card className="w-full">
        <CardContent>
          <Accordion type="multiple" defaultValue={['current', 'all']}>
            <DashboardSection name="current" title="Current funding breakdown" />
            <DashboardSection name="all" title="All funding breakdown" />
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}