"use client"
import { usePathname } from "next/navigation"
import { SidebarNav } from "./sidebar-nav"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname?.startsWith("/auth");

  if (isAuth) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50">{children}</div>
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
