import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { MainLayout } from "@/components/main-layout"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/auth"
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

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
    <html lang="es">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <MainLayout>
          {children}
        </MainLayout>
        <Analytics />
      </body>
    </html>
    </SessionProvider>
  )
}