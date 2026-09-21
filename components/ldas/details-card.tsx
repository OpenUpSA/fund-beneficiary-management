"use client"

import { useId, useState } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DynamicIcon } from "@/components/dynamicIcon"
import { LDA_TERMINOLOGY, OrganisationStatus, RegistrationStatus } from "@/constants/lda"
import { LocalDevelopmentAgencyFull } from "@/types/models"
import { LDALogo } from "./logo"

const DESCRIPTION_PREVIEW_LENGTH = 250

export function LDADetailsCard({ lda }: { lda: LocalDevelopmentAgencyFull }) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const descriptionId = useId()
  const description = lda.about?.trim() ?? ""
  const descriptionCharacters = Array.from(description)
  const hasLongDescription = descriptionCharacters.length > DESCRIPTION_PREVIEW_LENGTH
  const displayedDescription = hasLongDescription && !descriptionExpanded
    ? `${descriptionCharacters.slice(0, DESCRIPTION_PREVIEW_LENGTH).join("").trimEnd()}…`
    : description

  return (
    <Card className="border border-slate-300">
      <CardHeader className="pb-4">
        <h3 className="text-lg font-medium">{LDA_TERMINOLOGY.shortName} Details</h3>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <LDALogo path={lda.logo} name={lda.name} />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <h4 className="break-words text-base font-semibold">{lda.name}</h4>
            <Badge variant="secondary">
              {OrganisationStatus[lda.organisationStatus] ?? lda.organisationStatus}
            </Badge>
          </div>
        </div>

        {description && (
          <p className="whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
            <span id={descriptionId}>{displayedDescription}</span>
            {hasLongDescription && (
              <>
                {" "}
                <Button
                  type="button"
                  variant="link"
                  className="inline h-auto p-0 align-baseline font-normal leading-[inherit] text-muted-foreground underline decoration-muted-foreground/50 underline-offset-4 hover:text-foreground"
                  aria-expanded={descriptionExpanded}
                  aria-controls={descriptionId}
                  onClick={() => setDescriptionExpanded(expanded => !expanded)}
                >
                  {descriptionExpanded ? "View less" : "View more"}
                </Button>
              </>
            )}
          </p>
        )}

        <Separator />

        <dl className="grid grid-cols-1 gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-muted-foreground">Programme officer</dt>
            <dd className="break-words">{lda.programmeOfficer?.name || "Not assigned"}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-muted-foreground">Development stage</dt>
            <dd className="break-words">{lda.developmentStage?.label || "Not specified"}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-muted-foreground">Registration status</dt>
            <dd>{RegistrationStatus[lda.registrationStatus] ?? lda.registrationStatus}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-muted-foreground">Registration code</dt>
            <dd className="break-words">{lda.registrationCode || "Not specified"}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
            <dt className="text-muted-foreground">Registration date</dt>
            <dd>{lda.registrationDate ? format(lda.registrationDate, "dd MMM yyyy") : "Not specified"}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <dt className="text-muted-foreground">Focus areas</dt>
            <dd className="flex flex-wrap gap-2">
              {lda.focusAreas?.length > 0 ? lda.focusAreas.map(area => (
                <Badge key={area.id} variant="outline" className="max-w-full gap-1.5 whitespace-normal">
                  <span aria-hidden="true" className="shrink-0"><DynamicIcon name={area.icon} size={14} /></span>
                  <span className="min-w-0 break-words">{area.label}</span>
                </Badge>
              )) : "None specified"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Staff members</dt>
            <dd>{lda.staffMembers?.filter(member => !member.isCommittee).length ?? 0}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Board members</dt>
            <dd>{lda.staffMembers?.filter(member => member.isCommittee).length ?? 0}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
