"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ShoppingCart,
  Package,
  BarChart3,
  Book,
  Candy,
  Users,
  DollarSign,
  LogOut,
  Shield,
  User,
  Bookmark,
  Tag,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Newspaper,
  BookOpen,
  Star,
  Mail,
} from "lucide-react"
import { logout } from "@/actions/logout"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { Button } from "./ui/button"

const menuGroups = [
  {
    title: "Principal",
    items: [
      { href: "/", title: "Punto de Venta", icon: ShoppingCart, permission: "POS" },
      { href: "/dashboard", title: "Panel de Control", icon: BarChart3, permission: "DASHBOARD" },
      { href: "/busquedas", title: "Búsquedas Pendientes", icon: Book, permission: "PENDING" },
    ],
  },
  {
    title: "Inventario",
    items: [
      { href: "/inventario", title: "Libros", icon: Package, permission: "INVENTORY" },
      { href: "/consignaciones", title: "Consignaciones", icon: Tag, permission: "INVENTORY" },
      { href: "/dulceria", title: "Dulcería", icon: Candy, permission: "CANDY" },
      { href: "/apartados", title: "Apartados", icon: Bookmark, permission: "APARTADOS" },
    ],
  },
  {
    title: "Gestión",
    items: [
      { href: "/clientes", title: "Clientes", icon: Users, permission: "CLIENTS" },
      { href: "/gastos", title: "Gastos", icon: DollarSign, permission: "EXPENSES" },
      { href: "/admin/cortes", title: "Cortes de Caja", icon: BarChart3, permission: "CASH_CUTS" },
      { href: "/admin", title: "Admin", icon: Shield, permission: "ADMIN" },
      { href: "/cms/noticias", title: "Noticias (CMS)", icon: Newspaper, permission: "CMS" },
      { href: "/cms/libros-del-mes", title: "Libros del Mes", icon: Star, permission: "BOOK_OF_MONTH" },
      { href: "/cms/correos", title: "Correos", icon: Mail, permission: "EMAIL_CAMPAIGNS" },
      { href: "/perfil", title: "Perfil", icon: User, permission: "PROFILE" },
    ],
  },
]

export function SidebarNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const user = session?.user
  const [isOpen, setIsOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Principal: true,
    Inventario: true,
    Gestión: true,
  })

  if (status === "loading") {
    return <div className="hidden w-64 md:block" />
  }

  const isAdmin = user?.role === "ADMIN"
  const permissions = user?.permissions || []
  const userName = user?.name || "Usuario"
  const userRole = user?.role || "Rol"
  const userInitial = userName[0] || "U"

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const canAccess = (permission: string) => {
    if (permission === "PROFILE") return true
    if (permission === "EMAIL_CAMPAIGNS") return user?.role === "ADMIN" || user?.role === "VENDEDOR"
    return isAdmin || permissions.includes(permission)
  }

  const visibleMenuItems = menuGroups.flatMap((group) => group.items.filter((item) => canAccess(item.permission)))

  const isRouteActive = (href: string) => {
    const currentPath = pathname.split("?")[0]
    const linkPath = href.split("?")[0]

    if (linkPath === "/") return currentPath === "/"
    if (currentPath === linkPath) return true
    if (!currentPath.startsWith(`${linkPath}/`)) return false

    const hasMoreSpecificMatch = visibleMenuItems.some((item) => {
      const itemPath = item.href.split("?")[0]
      if (itemPath === linkPath || itemPath === "/") return false
      if (!itemPath.startsWith(`${linkPath}/`)) return false
      return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`)
    })

    return !hasMoreSpecificMatch
  }

  const NavContent = () => (
    <div className="flex h-full flex-col rounded-3xl bg-white/95 p-3 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.75)]">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Image src="/favicon.svg" alt="Logo" width={24} height={24} className="h-6 w-6" style={{ filter: 'invert(35%) sepia(96%) saturate(3332%) hue-rotate(206deg) brightness(98%) contrast(92%)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">El Colegio Invisible</p>
            <p className="text-xs text-slate-500">Inventario</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(false)}>
          <X className="h-5 w-5 text-slate-700" />
        </Button>
      </div>

      <div className="sidebar-nav-scroll mt-3 flex-1 space-y-5 overflow-y-auto px-2 pb-2">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter((item) => canAccess(item.permission))
          if (visibleItems.length === 0) return null

          const isExpanded = expandedGroups[group.title]

          return (
            <div key={group.title} className="space-y-1.5">
              <button
                onClick={() => toggleGroup(group.title)}
                className="flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400"
              >
                {group.title}
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>

              {isExpanded ? (
                <div className="space-y-1">
                  {visibleItems.map((link) => {
                    const isActive = isRouteActive(link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition ${
                          isActive
                            ? "text-blue-600"
                            : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-800"
                        }`}
                      >
                        <link.icon className={`h-4 w-4 ${isActive ? "text-blue-500" : "text-slate-400"}`} />
                        <span className="font-medium">{link.title}</span>
                      </Link>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-2 rounded-2xl bg-slate-50/80 p-2">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-100 text-sm font-semibold text-blue-700">
            {userInitial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
            <p className="truncate text-xs text-slate-500">{userRole}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-center gap-2 text-red-600 hover:bg-red-50" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <div className="fixed left-0 top-0 z-40 flex w-full items-center bg-white/95 p-4 shadow-sm md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
          <Menu className="h-6 w-6 text-slate-700" />
        </Button>
        <span className="ml-3 text-base font-semibold text-slate-800">El Colegio Invisible</span>
      </div>

      <div className="h-16 md:hidden" />

      <div className="sticky top-0 z-30 hidden h-screen w-64 p-3 md:block">
        <NavContent />
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative h-full w-72 p-3">
            <NavContent />
          </div>
        </div>
      ) : null}
    </>
  )
}
