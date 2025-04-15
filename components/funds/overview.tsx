"use client"

import { DashboardSection } from "../dashboard/section"
import { Accordion } from "../ui/accordion"
import { Badge } from "../ui/badge"
import { Card, CardContent, CardHeader } from "../ui/card"
import { FundFull } from "@/types/models"
import { Location, FocusArea } from "@prisma/client"
import { format } from "date-fns"
import { DynamicIcon } from "../dynamicIcon"

interface Props {
  fund: FundFull
}

export const Overview: React.FC<Props> = ({ fund }: Props) => {
  return (
    <div className="space-y-4">
      <div className="sm:flex gap-4 ">
        <Card className="w-full sm:w-[0.5]">
          <CardContent className="pt-2 space-y-2 text-sm py-4">
            <div className="flex justify-between">
              <span className="font-medium">Funding status:</span>
              <span>{fund.fundingStatus.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Amount:</span>
              <span>R{Number(fund.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current funding period:</span>
              <span>{format(fund.fundingStart, 'P')} - {format(fund.fundingEnd, 'P')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">LDAs funded (current):</span>
              <span>25</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">LDAs funded (total):</span>
              <span>99</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Locations:</span>
              <span className="flex space-x-2">
                {fund.locations.map((location: Location) => <Badge key={`locaiton-${location.id}`} variant="outline">{location.label}</Badge>)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current focus areas:</span>
              <span className="flex space-x-2">
                {fund.focusAreas.map((focusArea: FocusArea) => (
                  <Badge key={`focusArea-${focusArea.id}`} variant="outline">
                    <DynamicIcon name={focusArea.icon} size={10} />
                    <span>{focusArea.label}</span>
                  </Badge>
                ))}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardHeader>
            About this fund:
          </CardHeader>
          <CardContent>
          {fund.about}
          </CardContent>
        </Card>
      </div>
      <Card className="w-full">
        <CardContent>
          <Accordion type="multiple" defaultValue={['current', 'reporting']}>
            <DashboardSection name="current" title="Current funding breakdown" />
            <DashboardSection name="reporting" title="Reporting breakdown" />
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}