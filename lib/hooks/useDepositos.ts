'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type { Deposito, CreateDepositoDto } from '@/lib/types/depositos'

export function useDepositos(sucursalId?: number) {
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDepositos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = sucursalId
        ? `/api/depositos?sucursalId=${sucursalId}`
        : '/api/depositos'
      const result = await apiGet<Deposito[]>(url)
      setDepositos(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar depósitos')
    } finally {
      setLoading(false)
    }
  }, [sucursalId])

  useEffect(() => { fetchDepositos() }, [fetchDepositos])

  const crear = async (dto: CreateDepositoDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/depositos', dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear depósito')
      return false
    }
  }

  const actualizar = async (id: number, descripcion: string, esDefault: boolean): Promise<boolean> => {
    try {
      await apiPut<void>(`/api/depositos/${id}`, { descripcion, esDefault })
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar depósito')
      return false
    }
  }

  const eliminar = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`/api/depositos/${id}`)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al desactivar depósito')
      return false
    }
  }

  return {
    depositos,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    refetch: fetchDepositos,
  }
}
