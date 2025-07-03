import { redirect } from "next/navigation"

export default function Page({ params }: { params: { funder_id: string } }) {
  const { funder_id } = params
  redirect(`/dashboard/funders/${funder_id}/overview`)
}