"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, ShoppingCart, Package, BarChart3, Book, Candy } from "lucide-react"

const links = [
  {
    href: "/",
    title: "Punto de Venta",
    icon: ShoppingCart
  },
  {
    href: "/inventory",
    title: "Inventario",
    icon: Package
  },
  {
    href: "/dashboard",
    title: "Panel de Control",
    icon: BarChart3
  },
  {
    href: "/dulceria",
    title: "Dulcería",
    icon: Candy
  },
  {
    href: "/pending",
    title: "Pendientes",
    icon: Book
  }
]

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 space-y-8">
      <div className="flex items-center justify-center text-blue-600">
        <BookOpen className="h-8 w-8" />
      </div>
      <div className="flex flex-col items-center space-y-6">
        {links.map((link) => {
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
      </div>
    </nav>
  )
}