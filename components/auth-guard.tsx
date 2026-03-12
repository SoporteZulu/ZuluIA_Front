'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
    }
  }, [pathname, router])

  if (!isAuthenticated()) {
    return null
  }

  return <>{children}</>
}
