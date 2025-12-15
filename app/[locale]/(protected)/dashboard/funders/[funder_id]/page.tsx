import { redirect } from "next/navigation"

interface FunderPageProps {
  params: { funder_id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function Page({ params, searchParams }: FunderPageProps) {
  const { funder_id } = params
  
  // Preserve query parameters (including referrer info) when redirecting
  const queryString = new URLSearchParams(
    Object.entries(searchParams).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = Array.isArray(value) ? value[0] : value
      }
      return acc
    }, {} as Record<string, string>)
  ).toString()
  
  const redirectUrl = queryString 
    ? `/dashboard/funders/${funder_id}/overview?${queryString}`
    : `/dashboard/funders/${funder_id}/overview`
  
  redirect(redirectUrl)
}