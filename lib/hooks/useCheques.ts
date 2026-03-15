'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { Cheque, ChequesPagedResult, CreateChequeDto } from '@/lib/types/cheques'

interface UseChequesOptions {
  cajaId?: number
  terceroId?: number
  estado?: string
  desde?: string
  hasta?: string
}

export function useCheques(options: UseChequesOptions = {}) {
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCheques = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' })
      if (options.cajaId)    params.set('cajaId', String(options.cajaId))
      if (options.terceroId) params.set('terceroId', String(options.terceroId))
      if (options.estado)    params.set('estado', options.estado)
      if (options.desde)     params.set('desde', options.desde)
      if (options.hasta)     params.set('hasta', options.hasta)

      const result = await apiGet<ChequesPagedResult>(`/api/cheques?${params.toString()}`)
      const items = Array.isArray(result) ? result : (result.items ?? [])
      setCheques(
        items.map(c => ({
          ...c,
          importe: Number(c.importe ?? 0),
        }))
      )
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar cheques')
    } finally {
      setLoading(false)
    }
  }, [page, options.cajaId, options.terceroId, options.estado, options.desde, options.hasta])

  useEffect(() => { fetchCheques() }, [fetchCheques])

  const getCartera = async (cajaId: number): Promise<Cheque[]> => {
    try {
      const result = await apiGet<Cheque[]>(`/api/cheques/cartera/${cajaId}`)
      return (Array.isArray(result) ? result : []).map(c => ({
        ...c,
        importe: Number(c.importe ?? 0),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar cartera de cheques')
      return []
    }
  }

  const crear = async (dto: CreateChequeDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/cheques', dto)
      await fetchCheques()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar cheque')
      return false
    }
  }

  const depositar = async (
    id: number,
    fechaDeposito: string,
    fechaAcreditacion?: string
  ): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/cheques/${id}/depositar`, { fechaDeposito, fechaAcreditacion })
      await fetchCheques()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al depositar cheque')
      return false
    }
  }

  const acreditar = async (id: number, fechaAcreditacion: string): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/cheques/${id}/acreditar`, { fechaAcreditacion })
      await fetchCheques()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al acreditar cheque')
      return false
    }
  }

  const rechazar = async (id: number, observacion?: string): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/cheques/${id}/rechazar`, { observacion })
      await fetchCheques()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al rechazar cheque')
      return false
    }
  }

  const entregar = async (id: number): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/cheques/${id}/entregar`, {})
      await fetchCheques()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al entregar cheque')
      return false
    }
  }

  return {
    cheques,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    getCartera,
    crear,
    depositar,
    acreditar,
    rechazar,
    entregar,
    refetch: fetchCheques,
  }
}
