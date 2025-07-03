import { redirect } from "next/navigation"

interface FundPageProps {
  params: { fund_id: string }
}

export default function Page({ params }: FundPageProps) {
  const { fund_id } = params
  redirect(`/dashboard/funds/${fund_id}/overview`)
}
