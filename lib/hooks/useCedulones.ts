'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { Cedulon, CedulonesPagedResult, CreateCedulonDto } from '@/lib/types/cedulones'

interface UseCedulonesOptions {
  terceroId?: number
  sucursalId?: number
  estado?: string
}

export function useCedulones(options: UseCedulonesOptions = {}) {
  const [cedulones, setCedulones] = useState<Cedulon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCedulones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' })
      if (options.terceroId)  params.set('terceroId', String(options.terceroId))
      if (options.sucursalId) params.set('sucursalId', String(options.sucursalId))
      if (options.estado)     params.set('estado', options.estado)

      const result = await apiGet<CedulonesPagedResult>(`/api/cedulones?${params.toString()}`)
      const items = Array.isArray(result) ? result : (result.items ?? [])
      setCedulones(
        items.map(c => ({
          ...c,
          importe: Number(c.importe ?? 0),
          saldo:   Number(c.saldo   ?? 0),
        }))
      )
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar cedulones')
    } finally {
      setLoading(false)
    }
  }, [page, options.terceroId, options.sucursalId, options.estado])

  useEffect(() => { fetchCedulones() }, [fetchCedulones])

  const getVencidos = async (sucursalId?: number): Promise<Cedulon[]> => {
    try {
      const params = sucursalId ? `?sucursalId=${sucursalId}` : ''
      const result = await apiGet<Cedulon[]>(`/api/cedulones/vencidos${params}`)
      return (Array.isArray(result) ? result : []).map(c => ({
        ...c,
        importe: Number(c.importe ?? 0),
        saldo:   Number(c.saldo   ?? 0),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar cedulones vencidos')
      return []
    }
  }

  const crear = async (dto: CreateCedulonDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/cedulones', dto)
      await fetchCedulones()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear cedulón')
      return false
    }
  }

  const pagar = async (id: number, importe: number, cajaId: number): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/cedulones/${id}/pagar`, { importe, cajaId })
      await fetchCedulones()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar pago de cedulón')
      return false
    }
  }

  return {
    cedulones,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    getVencidos,
    crear,
    pagar,
    refetch: fetchCedulones,
  }
}
