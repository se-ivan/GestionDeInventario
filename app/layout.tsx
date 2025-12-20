import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { SidebarNav } from "@/components/sidebar-nav"
import { ClerkProvider } from '@clerk/nextjs'
import { esMX } from '@clerk/localizations'
import "./globals.css"

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

  return (
    <ClerkProvider
      localization={esMX}> {/* <-- Añadido para localización en español */}
      
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
    </ClerkProvider>
  )
}