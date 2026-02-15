"use client"
import { usePathname } from "next/navigation"
import { SidebarNav } from "./sidebar-nav"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const isAuth = pathname?.startsWith("/auth");

  if (isAuth) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50">{children}</div>
  }

  // Show loading state while session is initializing to ensure permissions are ready
  if (status === "loading") {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm animate-pulse">Cargando permisos...</p>
          </div>
      )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">
      <SidebarNav />
      <main className="flex-1 overflow-y-auto h-full relative">
         {children}
      </main>
    </div>
  )
}
