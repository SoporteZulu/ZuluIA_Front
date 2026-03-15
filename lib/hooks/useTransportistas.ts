'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut } from '@/lib/api'
import type { Transportista, CreateTransportistaDto } from '@/lib/types/transportistas'

export function useTransportistas(soloActivos = true) {
  const [transportistas, setTransportistas] = useState<Transportista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransportistas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<Transportista[]>(
        `/api/transportistas?soloActivos=${soloActivos}`
      )
      setTransportistas(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar transportistas')
    } finally {
      setLoading(false)
    }
  }, [soloActivos])

  useEffect(() => { fetchTransportistas() }, [fetchTransportistas])

  const getById = async (id: number): Promise<Transportista | null> => {
    try {
      return await apiGet<Transportista>(`/api/transportistas/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar transportista')
      return null
    }
  }

  const crear = async (dto: CreateTransportistaDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/transportistas', dto)
      await fetchTransportistas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear transportista')
      return false
    }
  }

  const actualizar = async (id: number, dto: Partial<CreateTransportistaDto>): Promise<boolean> => {
    try {
      await apiPut<void>(`/api/transportistas/${id}`, dto)
      await fetchTransportistas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar transportista')
      return false
    }
  }

  return { transportistas, loading, error, getById, crear, actualizar, refetch: fetchTransportistas }
}
