'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { PeriodoIvaDto, AbrirPeriodoIvaDto } from '@/lib/types/periodos-iva'

export function usePeriodosIva(sucursalId?: number, ejercicioId?: number) {
  const [periodos, setPeriodos] = useState<PeriodoIvaDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPeriodos = useCallback(async () => {
    if (!sucursalId) {
      setPeriodos([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ sucursalId: String(sucursalId) })
      if (ejercicioId) params.set('ejercicioId', String(ejercicioId))
      const result = await apiGet<PeriodoIvaDto[]>(`/api/periodos-iva?${params.toString()}`)
      setPeriodos(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar períodos IVA')
    } finally {
      setLoading(false)
    }
  }, [sucursalId, ejercicioId])

  useEffect(() => { fetchPeriodos() }, [fetchPeriodos])

  const getEstado = async (sucursalId: number, fecha: string): Promise<boolean> => {
    try {
      const result = await apiGet<{ abierto: boolean }>(
        `/api/periodos-iva/estado?sucursalId=${sucursalId}&fecha=${fecha}`
      )
      return (result as { abierto?: boolean })?.abierto ?? false
    } catch {
      return false
    }
  }

  const abrir = async (dto: AbrirPeriodoIvaDto): Promise<boolean> => {
    try {
      await apiPost<void>('/api/periodos-iva/abrir', dto)
      await fetchPeriodos()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al abrir período IVA')
      return false
    }
  }

  const cerrar = async (dto: { sucursalId: number; ejercicioId: number; periodo: string }): Promise<boolean> => {
    try {
      await apiPost<void>('/api/periodos-iva/cerrar', dto)
      await fetchPeriodos()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cerrar período IVA')
      return false
    }
  }

  return { periodos, loading, error, getEstado, abrir, cerrar, refetch: fetchPeriodos }
}
