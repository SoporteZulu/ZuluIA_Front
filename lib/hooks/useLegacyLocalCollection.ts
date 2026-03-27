"use client"

import { useEffect, useState } from "react"

export function useLegacyLocalCollection<T>(storageKey: string, seed: T[]) {
  const [rows, setRows] = useState<T[]>(() => {
    if (typeof window === "undefined") {
      return seed
    }

    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return seed
    }

    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as T[]) : seed
    } catch {
      return seed
    }
  })

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(rows))
  }, [rows, storageKey])

  return {
    rows,
    setRows,
    reset: () => setRows(seed),
  }
}
