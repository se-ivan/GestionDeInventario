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
    <div className="flex h-screen">
      <SidebarNav />
      <main className="flex-1 overflow-y-auto">
         {children}
      </main>
    </div>
  )
}
