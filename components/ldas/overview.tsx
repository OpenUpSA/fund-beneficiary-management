"use client"

import { Badge } from "../ui/badge"
import { Card, CardContent, CardHeader } from "../ui/card"
import { LocalDevelopmentAgencyFull, FundFull } from "@/types/models"
import { format } from "date-fns"
import { DynamicIcon } from "../dynamicIcon"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { AsyncFundList, FundListSkeleton } from "./fund-list"

// Dynamically import the map component to avoid SSR issues with Leaflet
const LDAMap = dynamic(
  () => import("@/components/ldas/map/lda-map"),
  { ssr: false }
);

interface Props {
  lda: LocalDevelopmentAgencyFull,
  funds: Promise<FundFull[]>
}

export const Overview: React.FC<Props> = ({ lda, funds }: Props) => {

  // Format address from LDA details
  const formatAddress = (): string => {
    const details = lda.organisationDetail;
    if (!details) return "No address information";
    
    const addressParts = [];
    
    if (details.physicalComplexName) 
      addressParts.push(details.physicalComplexName);
    
    if (details.physicalStreet) 
      addressParts.push(details.physicalStreet);
    
    if (details.physicalCity) 
      addressParts.push(details.physicalCity);
    
    if (details.physicalProvince) 
      addressParts.push(details.physicalProvince);
    
    return addressParts.join(", ");
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">Organisational Overview</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus & Funding Card */}
        <Card className="border border-slate-300">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-medium">Focus & Funding</h3>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Funding status:</span>
              <Badge variant="outline" className="bg-blue-50">{lda.fundingStatus?.label || "Unknown"}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Funding types:</span>
              <div className="space-x-2">
                <Badge variant="outline">Core</Badge>
                <Badge variant="outline">Project</Badge>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Current core funding period:</span>
              <span>{lda.fundingStart && lda.fundingEnd ? 
                `${format(lda.fundingStart, 'dd/MM/yyyy')} - ${format(lda.fundingEnd, 'dd/MM/yyyy')}` : 
                "Not specified"}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Total funding rounds:</span>
              <span>{lda.totalFundingRounds || 0}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Project funders:</span>
              <div>
                <Suspense fallback={<FundListSkeleton />}>
                  <AsyncFundList fundsPromise={funds} />
                </Suspense>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Focus area(s):</span>
              <div className="flex gap-2">
                {lda.focusAreas?.length > 0 ? 
                  lda.focusAreas.map(area => (
                    <Badge key={area.id} variant="outline" className="flex items-center gap-1">
                      <DynamicIcon name={area.icon} size={16} />
                      <span>{area.label}</span>
                    </Badge>
                  )) : 
                  "None specified"}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Development stage:</span>
              <Badge variant="outline">{lda.developmentStage?.label || "Unknown"}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Number of staff members:</span>
              <span>{lda.staffMembers?.filter(sm => !sm.isCommittee).length || "0"}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Number of board members:</span>
              <span>{lda.staffMembers?.filter(sm => sm.isCommittee).length || "0"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Location & Contact Card */}
        <Card className="border border-slate-300">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-medium">Location & Contact</h3>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* Map */}
            <div className="h-[200px] w-full rounded-md overflow-hidden border">
              {lda.organisationDetail?.latitude && lda.organisationDetail?.longitude ? (
                <LDAMap 
                  ldas={[lda]} 
                  height="200px" 
                  width="100%" 
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500">
                  No location data available
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Address:</span>
              <span className="text-right text-slate-700 underline">{formatAddress()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Province:</span>
              {lda.organisationDetail?.physicalProvince ? (
                <Badge variant="outline">
                  {lda.organisationDetail.physicalProvince}
                </Badge>
              ) : (
                <span>-</span>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Telephone:</span>
              <span className="text-right text-slate-700">{lda.organisationDetail?.contactNumber || "-"}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Website:</span>
              {lda.organisationDetail?.website ? (
                <a 
                  href={lda.organisationDetail.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-700 underline"
                >
                  {lda.organisationDetail.website}
                </a>
              ) : (
                <span>-</span>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Email:</span>
              {lda.organisationDetail?.email ? (
                <a 
                  href={`mailto:${lda.organisationDetail.email}`} 
                  className="text-slate-700 underline"
                >
                  {lda.organisationDetail.email}
                </a>
              ) : (
                <span>-</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Funding Overview Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Funding Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Funding Card */}
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Total funded amount</p>
                <h3 className="text-2xl font-bold">R 0</h3>
                <p className="text-sm text-gray-500">{lda.totalFundingRounds || 0} Funding rounds</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Current Year Funding */}
          <Card>  
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Current year funding</p>
                <h3 className="text-2xl font-bold">R 0</h3>
                <p className="text-sm text-gray-500">Financial year {new Date().getFullYear()}</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Funding by Fund Type */}
          {lda.funds?.slice(0, 2).map((fund, index) => (
            <Card key={fund.id || index}>
              <CardContent className="pt-6 pb-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{fund.name || 'Fund'} allocation</p>
                  <h3 className="text-2xl font-bold">R 0</h3>
                  <p className="text-sm text-gray-500">Estimated allocation</p>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Fill in with placeholder cards if needed */}
          {(!lda.funds || lda.funds.length < 2) && 
            [...Array(2 - (lda.funds?.length || 0))].map((_, index) => (
              <Card key={`placeholder-${index}`}>
                <CardContent className="pt-6 pb-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Additional funding</p>
                    <h3 className="text-2xl font-bold">R0</h3>
                    <p className="text-sm text-gray-500">No additional funds</p>
                  </div>
                </CardContent>
              </Card>
            ))
          }
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Total funded amount</p>
                <h3 className="text-2xl font-bold">R 0</h3>
                <p className="text-sm text-gray-500">0 Funding rounds</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Total funded amount</p>
                <h3 className="text-2xl font-bold">R 0</h3>
                <p className="text-sm text-gray-500">0 Funding rounds</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Total funded amount</p>
                <h3 className="text-2xl font-bold">R 0</h3>
                <p className="text-sm text-gray-500">0 Funding rounds</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Total funded amount</p>
                <h3 className="text-2xl font-bold">R 0</h3>
                <p className="text-sm text-gray-500">0 Funding rounds</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}