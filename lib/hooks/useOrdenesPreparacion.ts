'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { OrdenPreparacion, OrdenesPreparacionPaged, CreateOrdenPreparacionDto } from '@/lib/types/ordenes-preparacion'

interface UseOrdenesPreparacionOptions {
  sucursalId?: number
  terceroId?: number
  estado?: string
  desde?: string
  hasta?: string
}

export function useOrdenesPreparacion(options: UseOrdenesPreparacionOptions = {}) {
  const [ordenes, setOrdenes] = useState<OrdenPreparacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchOrdenes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' })
      if (options.sucursalId) params.set('sucursalId', String(options.sucursalId))
      if (options.terceroId)  params.set('terceroId',  String(options.terceroId))
      if (options.estado)     params.set('estado', options.estado)
      if (options.desde)      params.set('desde', options.desde)
      if (options.hasta)      params.set('hasta', options.hasta)

      const result = await apiGet<OrdenesPreparacionPaged>(`/api/ordenes-preparacion?${params.toString()}`)
      const items = Array.isArray(result) ? result : (result.items ?? [])
      setOrdenes(Array.isArray(items) ? items : [])
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar órdenes de preparación')
    } finally {
      setLoading(false)
    }
  }, [page, options.sucursalId, options.terceroId, options.estado, options.desde, options.hasta])

  useEffect(() => { fetchOrdenes() }, [fetchOrdenes])

  const crear = async (dto: CreateOrdenPreparacionDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/ordenes-preparacion', dto)
      await fetchOrdenes()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear orden de preparación')
      return false
    }
  }

  return {
    ordenes,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    crear,
    refetch: fetchOrdenes,
  }
}
