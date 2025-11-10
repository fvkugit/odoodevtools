import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { ConnectionsProvider } from "@/lib/connections-context"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageProvider } from "@/lib/language-context"
import { LanguageToggle } from "@/components/language-toggle"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OdooTools - Utilities dev Tools",
  description: "Developer utilities for Odoo - Execute SQL queries via XML-RPC",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LanguageProvider>
            <ConnectionsProvider>
              {children}
              <Toaster />
              <Analytics />
              <LanguageToggle />
              <ThemeToggle />
            </ConnectionsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
