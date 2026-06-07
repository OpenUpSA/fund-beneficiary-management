import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

export default async function Layout({ children }: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  if (!session || !session.user) {
    // Send unauthenticated users to sign-in. Redirecting to "/" would loop,
    // since the home page redirects back to /dashboard.
    redirect('/sign-in');
  }

  return (
    <>
      {children}
    </>
  )
}