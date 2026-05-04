import React from "react"
import type { Metadata } from "next"
import "./globals.css"

import { ConditionalLayout } from "@/components/conditional-layout"

import { Inter } from "next/font/google"

// Initialize fonts - ZULU ERP Design System
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })
const appBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "")
const withBasePath = (path: string) => `${appBasePath}${path}`

export const metadata: Metadata = {
  title: "ZULU ERP - Sistema de Gestion Empresarial",
  description: "Sistema ERP integral con modulos de Inventario, Ventas, Compras y Contabilidad",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: withBasePath("/icon-light-32x32.png"),
        media: "(prefers-color-scheme: light)",
      },
      {
        url: withBasePath("/icon-dark-32x32.png"),
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: withBasePath("/icon.svg"),
        type: "image/svg+xml",
      },
    ],
    apple: withBasePath("/apple-icon.png"),
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  )
}
