'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { Pago, PagoDetalle, RegistrarPagoDto } from '@/lib/types/pagos'
import type { PagedResult } from '@/lib/types/items'

interface UsePagosOptions {
  sucursalId?: number
  terceroId?: number
}

export function usePagos(options: UsePagosOptions = {}) {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const fetchPagos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '50',
      })
      if (options.sucursalId) params.set('sucursalId', String(options.sucursalId))
      if (options.terceroId) params.set('terceroId', String(options.terceroId))
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)

      const result = await apiGet<PagedResult<Pago> | { data: Pago[]; page: number; pageSize: number; totalCount: number; totalPages: number }>(
        `/api/pagos?${params.toString()}`
      )
      // Backend retorna { data, page, pageSize, totalCount, totalPages }
      const normalize = (p: Pago): Pago => ({ ...p, total: Number(p.total ?? 0) })

      if ('data' in result && Array.isArray(result.data)) {
        setPagos(result.data.map(normalize))
        setTotalCount(result.totalCount)
        setTotalPages(result.totalPages)
      } else if ('items' in result) {
        const r = result as PagedResult<Pago>
        setPagos(r.items.map(normalize))
        setTotalCount(r.totalCount)
        setTotalPages(r.totalPages)
      } else {
        const arr = result as unknown as Pago[]
        setPagos(arr.map(normalize))
        setTotalCount(arr.length)
        setTotalPages(1)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar pagos')
    } finally {
      setLoading(false)
    }
  }, [page, desde, hasta, options.sucursalId, options.terceroId])

  useEffect(() => { fetchPagos() }, [fetchPagos])

  const getById = async (id: number): Promise<PagoDetalle | null> => {
    try {
      return await apiGet<PagoDetalle>(`/api/pagos/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar pago')
      return null
    }
  }

  const registrar = async (dto: RegistrarPagoDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/pagos', dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar pago')
      return false
    }
  }

  const anular = async (id: number): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/pagos/${id}/anular`, {})
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al anular pago')
      return false
    }
  }

  return {
    pagos,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    desde,
    setDesde,
    hasta,
    setHasta,
    getById,
    registrar,
    anular,
    refetch: fetchPagos,
  }
}
