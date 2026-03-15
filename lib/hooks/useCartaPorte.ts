'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { CartaPorte, CartaPortePaged, CreateCartaPorteDto } from '@/lib/types/carta-porte'

interface UseCartaPorteOptions {
  comprobanteId?: number
  estado?: string
  desde?: string
  hasta?: string
}

export function useCartaPorte(options: UseCartaPorteOptions = {}) {
  const [cartas, setCartas] = useState<CartaPorte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCartas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' })
      if (options.comprobanteId) params.set('comprobanteId', String(options.comprobanteId))
      if (options.estado)        params.set('estado', options.estado)
      if (options.desde)         params.set('desde', options.desde)
      if (options.hasta)         params.set('hasta', options.hasta)

      const result = await apiGet<CartaPortePaged>(`/api/carta-porte?${params.toString()}`)
      const items = Array.isArray(result) ? result : (result.items ?? [])
      setCartas(Array.isArray(items) ? items : [])
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar cartas de porte')
    } finally {
      setLoading(false)
    }
  }, [page, options.comprobanteId, options.estado, options.desde, options.hasta])

  useEffect(() => { fetchCartas() }, [fetchCartas])

  const getById = async (id: number): Promise<CartaPorte | null> => {
    try {
      return await apiGet<CartaPorte>(`/api/carta-porte/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar carta de porte')
      return null
    }
  }

  const crear = async (dto: CreateCartaPorteDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/carta-porte', dto)
      await fetchCartas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear carta de porte')
      return false
    }
  }

  const asignarCtg = async (id: number, ctg: string, coe?: string): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/carta-porte/${id}/asignar-ctg`, { ctg, coe })
      await fetchCartas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al asignar CTG')
      return false
    }
  }

  return {
    cartas,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    getById,
    crear,
    asignarCtg,
    refetch: fetchCartas,
  }
}
