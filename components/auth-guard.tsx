"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const mounted = typeof window !== "undefined"
  const authenticated = mounted ? isAuthenticated() : false

  useEffect(() => {
    if (!mounted || authenticated) {
      return
    }

    if (!authenticated) {
      router.replace("/login")
    }
  }, [authenticated, mounted, pathname, router])

  // Before mounting, render nothing on both server and client to avoid
  // hydration mismatch (localStorage is not available during SSR).
  if (!mounted) return null

  if (!authenticated) return null

  return <>{children}</>
}
