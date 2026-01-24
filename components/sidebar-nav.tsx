"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, ShoppingCart, Package, BarChart3, Book, Candy, DollarSign, LogOut, Shield, User } from "lucide-react"
import { logout } from "@/actions/logout"
import { useSession } from "next-auth/react"

const links = [
  {
    href: "/",
    title: "Punto de Venta",
    icon: ShoppingCart,
    permission: "POS"
  },
  {
    href: "/inventory",
    title: "Inventario",
    icon: Package,
    permission: "INVENTORY"
  },
  {
    href: "/dashboard",
    title: "Panel de Control",
    icon: BarChart3,
    permission: "DASHBOARD"
  },
  {
    href: "/expenses",
    title: "Gastos",
    icon: DollarSign,
    permission: "EXPENSES"
  },
  {
    href: "/dulceria",
    title: "Dulcería",
    icon: Candy,
    permission: "CANDY"
  },
  {
    href: "/pending",
    title: "Pendientes",
    icon: Book,
    permission: "PENDING"
  }
]

export function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  
  const isAdmin = user?.role === 'ADMIN';
  const permissions = user?.permissions || [];

  return (
    <nav className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 space-y-8">
      <div className="flex items-center justify-center text-blue-600">
        <BookOpen className="h-8 w-8" />
      </div>
      <div className="flex flex-col items-center space-y-6">
        {links.map((link) => {
          if (!isAdmin && !permissions.includes(link.permission)) {
             return null;
          }

          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`p-3 rounded-lg transition-colors ${
                isActive ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"
              }`}
              title={link.title}
            >
              <link.icon className="h-6 w-6" />
            </Link>
          );
        })}
        {isAdmin && (
             <Link
              href="/admin"
              className={`p-3 rounded-lg transition-colors ${
                pathname === "/admin" ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"
              }`}
              title="Administrador"
            >
              <Shield className="h-6 w-6" />
            </Link>
        )}
      </div>
      <div className="mt-auto flex flex-col items-center space-y-4 pb-4">
        <Link
          href="/profile"
          className={`p-3 rounded-lg transition-colors ${
            pathname === "/profile" ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"
          }`}
          title="Mi Perfil"
        >
          <User className="h-6 w-6" />
        </Link>
        <button
            onClick={() => logout()}
            className="p-3 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
            title="Cerrar Sesión"
        >
            <LogOut className="h-6 w-6" />
        </button>
      </div>
    </nav>
  )
}