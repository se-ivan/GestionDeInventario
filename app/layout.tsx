"use client"
import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Package, Plus, Search, AlertTriangle, BookOpen, ShoppingCart, BarChart3, Edit, Trash2 } from "lucide-react"
import "./globals.css"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { title } from "process"


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
  }
]

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>

) {
  const pathname = usePathname();

  return (
    
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* Cambiamos el contenedor principal a flex y altura de pantalla completa */}
        <div className="flex h-screen">
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
          
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={null}>{children}</Suspense>
          </main>

        </div>
        <Analytics />
      </body>
    </html>
  )
}