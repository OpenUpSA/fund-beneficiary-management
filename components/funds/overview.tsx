"use client"

import { Badge } from "../ui/badge"
import { Card, CardContent, CardHeader } from "../ui/card"
import { LimitedFundModel } from "@/types/models"
import { FocusArea } from "@prisma/client"
import { format } from "date-fns"
import { DynamicIcon } from "../dynamicIcon"
import dynamic from "next/dynamic"
import { LDA_TERMINOLOGY } from "@/constants/lda"

// Dynamically import the map component to avoid SSR issues with Leaflet
const FundMap = dynamic(
  () => import("@/components/ldas/map/lda-map"),
  { ssr: false }
);

interface Props {
  fund: LimitedFundModel
}

export const Overview: React.FC<Props> = ({ fund }: Props) => {
  // Calculate total allocated amount from all FundLocalDevelopmentAgencies
  const totalAllocated = fund.fundLocalDevelopmentAgencies.reduce((sum, lda) => {
    return sum + (lda.amount ? Number(lda.amount) : 0)
  }, 0)

  // Calculate remaining balance
  const remainingBalance = Number(fund.amount) - totalAllocated

  // Format address from fund details
  const formatAddress = (): string => {
    const details = fund.organisationDetail;
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
      <h2 className="text-xl font-semibold">Fund Overview</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fund Details Card */}
        <Card className="border border-slate-300">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-medium">Fund Details</h3>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Funding status:</span>
              <Badge 
                variant="outline" 
                className={`${
                  fund.fundingStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                  fund.fundingStatus === 'Paused' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  fund.fundingStatus === 'Cancelled' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {fund.fundingStatus}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Total fund amount:</span>
              <span className="font-medium">R {Number(fund.amount).toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Current funding period:</span>
              <span>{format(fund.fundingStart, 'dd/MM/yyyy')} - {format(fund.fundingEnd, 'dd/MM/yyyy')}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">{LDA_TERMINOLOGY.shortNamePlural} funded (current):</span>
              <span>{fund.fundLocalDevelopmentAgencies.filter(lda => lda.fundingStatus === 'Active').length || 0}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Total {LDA_TERMINOLOGY.shortNamePlural} funded:</span>
              <span>{fund.fundLocalDevelopmentAgencies?.length || 0}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Focus area(s):</span>
              <div className="flex gap-2">
                {fund.focusAreas?.length > 0 ? 
                  fund.focusAreas.map((focusArea: FocusArea) => (
                    <Badge key={`focusArea-${focusArea.id}`} variant="outline" className="flex items-center gap-1" title={focusArea.label}>
                      <DynamicIcon name={focusArea.icon} size={16} />
                    </Badge>
                  )) : 
                  "None specified"}
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-slate-900 font-medium mb-2">About this fund:</p>
              <p className="text-slate-700">{fund.about}</p>
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
              {fund.organisationDetail?.latitude && fund.organisationDetail?.longitude ? (
                <FundMap 
                  ldas={[{
                    id: fund.id,
                    name: fund.name,
                    organisationDetail: fund.organisationDetail
                  } as unknown as import("@/types/models").LocalDevelopmentAgencyFull]} 
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
              {fund.organisationDetail?.physicalProvince ? (
                <Badge variant="outline">
                  {fund.organisationDetail.physicalProvince}
                </Badge>
              ) : (
                <span>-</span>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Telephone:</span>
              <span className="text-right text-slate-700">{fund.organisationDetail?.contactNumber || "-"}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Website:</span>
              {fund.organisationDetail?.website ? (
                <a 
                  href={fund.organisationDetail.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-700 underline"
                >
                  {fund.organisationDetail.website}
                </a>
              ) : (
                <span>-</span>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Email:</span>
              {fund.organisationDetail?.email ? (
                <a 
                  href={`mailto:${fund.organisationDetail.email}`} 
                  className="text-slate-700 underline"
                >
                  {fund.organisationDetail.email}
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
        <h2 className="text-xl font-semibold">Funding Allocation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Funding Card */}
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Total fund amount</p>
                <h3 className="text-2xl font-bold">R {Number(fund.amount).toLocaleString()}</h3>
                <p className="text-sm text-gray-500">Available for allocation</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Current Allocation */}
          <Card>  
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Current allocation</p>
                <h3 className="text-2xl font-bold">R {totalAllocated.toLocaleString()}</h3>
                <p className="text-sm text-gray-500">Allocated to {LDA_TERMINOLOGY.shortNamePlural}</p>
              </div>
            </CardContent>
          </Card>
          
          {/* LDAs Funded */}
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">{LDA_TERMINOLOGY.shortNamePlural} funded</p>
                <h3 className="text-2xl font-bold">{fund.fundLocalDevelopmentAgencies.length || 0}</h3>
                <p className="text-sm text-gray-500">Active partnerships</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Remaining Balance */}
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">
                  {remainingBalance >= 0 ? "Surplus" : "Shortfall"}
                </p>
                <h3 className={`text-2xl font-bold ${remainingBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  R {Math.abs(remainingBalance).toLocaleString()}
                </h3>
                <p className="text-sm text-gray-500">
                  {remainingBalance >= 0 ? "Unallocated funds" : "Over-allocated"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}