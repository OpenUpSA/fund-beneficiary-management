"use client"

import { Badge } from "../ui/badge"
import { Card, CardContent, CardHeader } from "../ui/card"
import { FunderFull } from "@/types/models"
import { FocusArea } from "@prisma/client"
import { format } from "date-fns"
import { DynamicIcon } from "../dynamicIcon"
import dynamic from "next/dynamic"

// Dynamically import the map component to avoid SSR issues with Leaflet
const FunderMap = dynamic(
  () => import("@/components/ldas/map/lda-map"),
  { ssr: false }
);

interface Props {
  funder: FunderFull
  ldaCount?: number
}

export const Overview: React.FC<Props> = ({ funder, ldaCount = 0 }: Props) => {
  // Format address from funder details
  const formatAddress = (): string => {
    const details = funder.organisationDetail;
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

  const funds = funder.fundFunders.map((fundFunder) => fundFunder.fund)

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">Funder Overview</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funder Details Card */}
        <Card className="border border-slate-300">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-medium">Funder Details</h3>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Funding status:</span>
              <Badge 
                variant="outline" 
                className={`${
                  funder.fundingStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                  funder.fundingStatus === 'Paused' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  funder.fundingStatus === 'Cancelled' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {funder.fundingStatus}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Total funding amount:</span>
              <span className="font-medium">R {Number(funder.amount).toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Current funding period:</span>
              <span>{format(funder.fundingStart, 'dd/MM/yyyy')} - {format(funder.fundingEnd, 'dd/MM/yyyy')}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Active funds:</span>
              <span>{funds.length || 0}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">LDAs funded:</span>
              <span>{ldaCount}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Focus area(s):</span>
              <div className="flex gap-2">
                {funder.focusAreas?.length > 0 ? 
                  funder.focusAreas.map((focusArea: FocusArea) => (
                    <Badge key={`focusArea-${focusArea.id}`} variant="outline" className="flex items-center gap-1" title={focusArea.label}>
                      <DynamicIcon name={focusArea.icon} size={16} />
                    </Badge>
                  )) : 
                  "None specified"}
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-slate-900 font-medium mb-2">About this funder:</p>
              <p className="text-slate-700">{funder.about}</p>
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
              {funder.organisationDetail?.latitude && funder.organisationDetail?.longitude ? (
                <FunderMap 
                  ldas={[{
                    id: funder.id,
                    name: funder.name,
                    organisationDetail: funder.organisationDetail
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
              {funder.organisationDetail?.physicalProvince ? (
                <Badge variant="outline">
                  {funder.organisationDetail.physicalProvince}
                </Badge>
              ) : (
                <span>-</span>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Telephone:</span>
              <span className="text-right text-slate-700">{funder.organisationDetail?.contactNumber || "-"}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Website:</span>
              {funder.organisationDetail?.website ? (
                <a 
                  href={funder.organisationDetail.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-700 underline"
                >
                  {funder.organisationDetail.website}
                </a>
              ) : (
                <span>-</span>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Email:</span>
              {funder.organisationDetail?.email ? (
                <a 
                  href={`mailto:${funder.organisationDetail.email}`} 
                  className="text-slate-700 underline"
                >
                  {funder.organisationDetail.email}
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
                <p className="text-sm text-gray-500">Total funding amount</p>
                <h3 className="text-2xl font-bold">R {Number(funder.amount).toLocaleString()}</h3>
                <p className="text-sm text-gray-500">Committed funding</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Active Funds */}
          <Card>  
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Active funds</p>
                <h3 className="text-2xl font-bold">{funds.length || 0}</h3>
                <p className="text-sm text-gray-500">Currently funding</p>
              </div>
            </CardContent>
          </Card>
          
          {/* LDAs Funded */}
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">LDAs funded</p>
                <h3 className="text-2xl font-bold">{ldaCount}</h3>
                <p className="text-sm text-gray-500">Active partnerships</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Funding Period */}
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Funding period</p>
                <h3 className="text-2xl font-bold">{format(funder.fundingStart, 'yyyy')}</h3>
                <p className="text-sm text-gray-500">Until {format(funder.fundingEnd, 'MMM yyyy')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}