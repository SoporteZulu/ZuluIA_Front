'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { DescuentoComercial, CreateDescuentoComercialDto } from '@/lib/types/descuentos-comerciales'

interface UseDescuentosComercialesOptions {
  terceroId?: number
  itemId?: number
  vigenteEn?: string
}

export function useDescuentosComerciales(options: UseDescuentosComercialesOptions = {}) {
  const [descuentos, setDescuentos] = useState<DescuentoComercial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDescuentos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.terceroId) params.set('terceroId', String(options.terceroId))
      if (options.itemId)    params.set('itemId',    String(options.itemId))
      if (options.vigenteEn) params.set('vigenteEn', options.vigenteEn)

      const result = await apiGet<DescuentoComercial[]>(
        `/api/descuentos-comerciales?${params.toString()}`
      )
      setDescuentos(
        (Array.isArray(result) ? result : []).map(d => ({
          ...d,
          porcentaje: Number(d.porcentaje ?? 0),
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar descuentos comerciales')
    } finally {
      setLoading(false)
    }
  }, [options.terceroId, options.itemId, options.vigenteEn])

  useEffect(() => { fetchDescuentos() }, [fetchDescuentos])

  const crear = async (dto: CreateDescuentoComercialDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/descuentos-comerciales', dto)
      await fetchDescuentos()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear descuento comercial')
      return false
    }
  }

  return { descuentos, loading, error, crear, refetch: fetchDescuentos }
}
