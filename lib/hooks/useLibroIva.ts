'use client'

import { useState, useCallback } from 'react'
import { apiGet } from '@/lib/api'
import type { LibroIvaDto } from '@/lib/types/libro-iva'

export function useLibroIva() {
  const [libroVentas, setLibroVentas] = useState<LibroIvaDto | null>(null)
  const [libroCompras, setLibroCompras] = useState<LibroIvaDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVentas = useCallback(async (
    sucursalId: number,
    desde: string,
    hasta: string
  ) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        sucursalId: String(sucursalId),
        desde,
        hasta,
      })
      const result = await apiGet<LibroIvaDto>(`/api/libro-iva/ventas?${params.toString()}`)
      setLibroVentas(result ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar Libro IVA Ventas')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCompras = useCallback(async (
    sucursalId: number,
    desde: string,
    hasta: string
  ) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        sucursalId: String(sucursalId),
        desde,
        hasta,
      })
      const result = await apiGet<LibroIvaDto>(`/api/libro-iva/compras?${params.toString()}`)
      setLibroCompras(result ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar Libro IVA Compras')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    libroVentas,
    libroCompras,
    loading,
    error,
    fetchVentas,
    fetchCompras,
  }
}
