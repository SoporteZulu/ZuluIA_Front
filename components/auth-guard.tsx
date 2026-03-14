'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) {
      router.replace('/login')
    }
  }, [pathname, router])

  // Before mounting, render nothing on both server and client to avoid
  // hydration mismatch (localStorage is not available during SSR).
  if (!mounted) return null

  if (!isAuthenticated()) return null

  return <>{children}</>
}
