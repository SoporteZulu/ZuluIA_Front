'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { Asiento, AsientoDetalle, PlanCuenta, CreateAsientoDto } from '@/lib/types/asientos'
import type { PagedResult } from '@/lib/types/items'

interface UseAsientosOptions {
  ejercicioId?: number
  sucursalId?: number
}

export function useAsientos(options: UseAsientosOptions = {}) {
  const [asientos, setAsientos] = useState<Asiento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [estado, setEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const fetchAsientos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '50',
        ejercicioId: String(options.ejercicioId ?? 0),
      })
      if (options.sucursalId) params.set('sucursalId', String(options.sucursalId))
      if (estado) params.set('estado', estado)
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)

      const result = await apiGet<PagedResult<Asiento>>(
        `/api/contabilidad/asientos?${params.toString()}`
      )
      const items = (Array.isArray(result) ? result : result.items ?? []).map(
        (a: Asiento) => ({
          ...a,
          totalDebe:  Number(a.totalDebe  ?? 0),
          totalHaber: Number(a.totalHaber ?? 0),
        })
      )
      setAsientos(items)
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar asientos')
    } finally {
      setLoading(false)
    }
  }, [page, estado, desde, hasta, options.ejercicioId, options.sucursalId])

  useEffect(() => { fetchAsientos() }, [fetchAsientos])

  const getById = async (id: number): Promise<AsientoDetalle | null> => {
    try {
      return await apiGet<AsientoDetalle>(`/api/contabilidad/asientos/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar asiento')
      return null
    }
  }

  const crear = async (dto: CreateAsientoDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/contabilidad/asientos', dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear asiento')
      return false
    }
  }

  return {
    asientos,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    estado,
    setEstado,
    desde,
    setDesde,
    hasta,
    setHasta,
    getById,
    crear,
    refetch: fetchAsientos,
  }
}

export function usePlanCuentas(ejercicioId?: number) {
  const [cuentas, setCuentas] = useState<PlanCuenta[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCuentas = useCallback(async () => {
    if (!ejercicioId) return
    setLoading(true)
    try {
      const result = await apiGet<PlanCuenta[]>(
        `/api/plan-cuentas/plano?ejercicioId=${ejercicioId}&soloImputables=true`
      )
      setCuentas(Array.isArray(result) ? result : [])
    } catch (e) {
      console.error('Error cargando plan de cuentas:', e)
    } finally {
      setLoading(false)
    }
  }, [ejercicioId])

  useEffect(() => { fetchCuentas() }, [fetchCuentas])

  const buscar = async (termino: string): Promise<PlanCuenta[]> => {
    if (!ejercicioId || termino.length < 2) return []
    try {
      return await apiGet<PlanCuenta[]>(
        `/api/plan-cuentas/buscar?ejercicioId=${ejercicioId}&termino=${encodeURIComponent(termino)}`
      )
    } catch {
      return []
    }
  }

  return { cuentas, loading, buscar, refetch: fetchCuentas }
}

export function usePlanCuentasAll(ejercicioId?: number) {
  const [cuentas, setCuentas] = useState<PlanCuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCuentas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = ejercicioId
        ? `/api/plan-cuentas/plano?ejercicioId=${ejercicioId}`
        : '/api/plan-cuentas/plano'
      const result = await apiGet<PlanCuenta[] | PagedResult<PlanCuenta>>(url)
      const items = Array.isArray(result) ? result : (result as PagedResult<PlanCuenta>).items ?? []
      setCuentas(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar plan de cuentas')
    } finally {
      setLoading(false)
    }
  }, [ejercicioId])

  useEffect(() => { fetchCuentas() }, [fetchCuentas])

  return { cuentas, loading, error, refetch: fetchCuentas }
}
