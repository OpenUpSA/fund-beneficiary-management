import { OrganisationDetail } from "@prisma/client"

interface Props {
  organisationDetail: OrganisationDetail
}

export function OrganisationDetails({ organisationDetail }: Props) {
  return (
    <>
      <div className="flex justify-between">
        <span className="font-medium">Contact number:</span>
        {organisationDetail && <span>{organisationDetail.contactNumber}</span>}
      </div>
      <div className="flex justify-between">
        <span className="font-medium">Email address:</span>
        {organisationDetail && <a href={`mailto:${organisationDetail.email}`} className="hover:underline" target="_blank">{organisationDetail.email}</a>}
      </div>
      <div className="flex justify-between">
        <span className="font-medium">Website:</span>
        {organisationDetail && <a href={organisationDetail.website} className="hover:underline" target="_blank">{organisationDetail.website}</a>}
      </div>
      <div className="flex justify-between">
        <span className="font-medium">Street address:</span>
        {organisationDetail && <span>{organisationDetail.physicalStreet}</span>}
      </div>
      <div className="flex justify-between">
        <span className="font-medium">Complex number:</span>
        {organisationDetail && <span>{organisationDetail.physicalComplexName}</span>}
      </div>
      <div className="flex justify-between">
        <span className="font-medium">City:</span>
        {organisationDetail && <span>{organisationDetail.physicalCity}</span>}
      </div>
      <div className="flex justify-between">
        <span className="font-medium">Province:</span>
        {organisationDetail && <span>{organisationDetail.physicalProvince}</span>}
      </div>
      <div className="flex justify-between">
        <span className="font-medium">GPS co-ordinates:</span>
        {organisationDetail && <span>{organisationDetail.latitude}, {organisationDetail.longitude}</span>}
      </div>
    </>
  )
}