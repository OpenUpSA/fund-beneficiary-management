import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { Nav } from "@/components/nav"
import { SidebarProvider } from "@/components/ui/sidebar"
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";

export default async function Layout({ children }: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  if (!session || !session.user) {
    redirect('/');
  }

  return (
    <>
      <SidebarProvider>
        <Nav />
        <main className="p-4 w-full">
          {children}
          <Toaster />
        </main>
      </SidebarProvider>
    </>
  )
}