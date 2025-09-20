// NO LLEVA "use client"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { SidebarNav } from "@/components/sidebar-nav"
import "./globals.css"

// Esta es la configuración clave para no indexar
// AHORA SÍ FUNCIONARÁ
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  // Ya no se necesita usePathname aquí

  return (
    <html lang="es"> {/* <-- Cambiado a "es" por consistencia */}
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <div className="flex h-screen">
          
          <SidebarNav /> {/* <-- Usa el nuevo componente aquí */}
          
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
        </div>
        <Analytics />
      </body>
    </html>
  )
}