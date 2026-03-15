'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { OrdenTrabajo, OrdenesTrabajoPaged, CreateOrdenTrabajoDto } from '@/lib/types/ordenes-trabajo'

interface UseOrdenesTrabajOptions {
  sucursalId?: number
  formulaId?: number
  estado?: string
  desde?: string
  hasta?: string
}

export function useOrdenesTrabajo(options: UseOrdenesTrabajOptions = {}) {
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
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
      if (options.formulaId)  params.set('formulaId',  String(options.formulaId))
      if (options.estado)     params.set('estado', options.estado)
      if (options.desde)      params.set('desde', options.desde)
      if (options.hasta)      params.set('hasta', options.hasta)

      const result = await apiGet<OrdenesTrabajoPaged>(`/api/ordenes-trabajos?${params.toString()}`)
      const items = Array.isArray(result) ? result : (result.items ?? [])
      setOrdenes(
        items.map(o => ({
          ...o,
          cantidad: Number(o.cantidad ?? 0),
        }))
      )
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar órdenes de trabajo')
    } finally {
      setLoading(false)
    }
  }, [page, options.sucursalId, options.formulaId, options.estado, options.desde, options.hasta])

  useEffect(() => { fetchOrdenes() }, [fetchOrdenes])

  const getById = async (id: number): Promise<OrdenTrabajo | null> => {
    try {
      return await apiGet<OrdenTrabajo>(`/api/ordenes-trabajos/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar orden de trabajo')
      return null
    }
  }

  const crear = async (dto: CreateOrdenTrabajoDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/ordenes-trabajos', dto)
      await fetchOrdenes()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear orden de trabajo')
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
    getById,
    crear,
    refetch: fetchOrdenes,
  }
}
