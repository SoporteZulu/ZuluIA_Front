'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { CotizacionMoneda, CreateCotizacionDto } from '@/lib/types/cotizaciones'

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionMoneda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCotizaciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<CotizacionMoneda[]>('/api/cotizaciones')
      setCotizaciones(
        (Array.isArray(result) ? result : []).map(c => ({
          ...c,
          cotizacion: Number(c.cotizacion ?? 0),
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar cotizaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCotizaciones() }, [fetchCotizaciones])

  const crear = async (dto: CreateCotizacionDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/cotizaciones', dto)
      await fetchCotizaciones()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar cotización')
      return false
    }
  }

  /** Retorna la cotización vigente para una moneda en una fecha dada. */
  const getCotizacionPorFecha = async (
    monedaId: number,
    fecha: string
  ): Promise<number> => {
    try {
      const result = await apiGet<{ cotizacion: number }>(
        `/api/cotizaciones?monedaId=${monedaId}&fecha=${fecha}`
      )
      return Number((result as CotizacionMoneda)?.cotizacion ?? 1)
    } catch {
      return 1
    }
  }

  return { cotizaciones, loading, error, crear, getCotizacionPorFecha, refetch: fetchCotizaciones }
}
