'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type {
  PuntoFacturacion,
  TipoPuntoFacturacion,
  CreatePuntoFacturacionDto,
} from '@/lib/types/puntos-facturacion'

export function usePuntosFacturacion(sucursalId?: number) {
  const [puntos, setPuntos] = useState<PuntoFacturacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPuntos = useCallback(async () => {
    if (!sucursalId) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<PuntoFacturacion[]>(
        `/api/puntos-facturacion?sucursalId=${sucursalId}`
      )
      setPuntos(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar puntos de facturación')
    } finally {
      setLoading(false)
    }
  }, [sucursalId])

  useEffect(() => { fetchPuntos() }, [fetchPuntos])

  const crear = async (dto: CreatePuntoFacturacionDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/puntos-facturacion', dto)
      await fetchPuntos()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear punto de facturación')
      return false
    }
  }

  const actualizar = async (
    id: number,
    dto: { descripcion: string; tipoPuntoFacturacionId: number }
  ): Promise<boolean> => {
    try {
      await apiPut<void>(`/api/puntos-facturacion/${id}`, dto)
      await fetchPuntos()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar punto de facturación')
      return false
    }
  }

  const eliminar = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`/api/puntos-facturacion/${id}`)
      await fetchPuntos()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al desactivar punto de facturación')
      return false
    }
  }

  const getProximoNumero = async (
    puntoId: number,
    tipoComprobanteId: number
  ): Promise<number | null> => {
    try {
      const result = await apiGet<{ proximoNumero: number }>(
        `/api/puntos-facturacion/${puntoId}/proximo-numero?tipoComprobanteId=${tipoComprobanteId}`
      )
      return result.proximoNumero
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al obtener próximo número')
      return null
    }
  }

  return {
    puntos,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    getProximoNumero,
    refetch: fetchPuntos,
  }
}

export function useTiposPuntoFacturacion() {
  const [tipos, setTipos] = useState<TipoPuntoFacturacion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<TipoPuntoFacturacion[]>('/api/puntos-facturacion/tipos')
      .then((r) => setTipos(Array.isArray(r) ? r : []))
      .catch((e) => console.error('Error cargando tipos de punto de facturación:', e))
      .finally(() => setLoading(false))
  }, [])

  return { tipos, loading }
}
