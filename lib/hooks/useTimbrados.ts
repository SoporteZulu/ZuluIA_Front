"use client"

import { useCallback, useEffect, useState } from "react"

import { apiGet } from "@/lib/api"
import type { Timbrado, TimbradoDetalle } from "@/lib/types/timbrado"

interface UseTimbradosOptions {
  sucursalId?: number
  puntoFacturacionId?: number
}

type PuntoVentaTimbradoResponse = {
  id: number
  sucursalId: number
  puntoFacturacionId: number
  numeroTimbrado: string
  vigenciaDesde: string
  vigenciaHasta: string
  activo: boolean
  observacion?: string | null
  createdAt?: string
  updatedAt?: string | null
}

function normalizeTimbrado(item: Timbrado | PuntoVentaTimbradoResponse): Timbrado {
  if ("nroTimbrado" in item) {
    return item
  }

  return {
    id: item.id,
    sucursalId: item.sucursalId,
    puntoFacturacionId: item.puntoFacturacionId,
    nroTimbrado: item.numeroTimbrado,
    fechaInicio: item.vigenciaDesde,
    fechaFin: item.vigenciaHasta,
    activo: item.activo,
    observacion: item.observacion ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt ?? null,
  }
}

export function useTimbrados(options: UseTimbradosOptions = {}) {
  const [timbrados, setTimbrados] = useState<Timbrado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTimbrados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.puntoFacturacionId) {
        params.set("puntoFacturacionId", String(options.puntoFacturacionId))
      }

      const query = params.toString()
      const result = await apiGet<Array<Timbrado | PuntoVentaTimbradoResponse>>(
        `/api/puntoventa/timbrados${query ? `?${query}` : ""}`
      )
      setTimbrados(Array.isArray(result) ? result.map(normalizeTimbrado) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar timbrados")
    } finally {
      setLoading(false)
    }
  }, [options.puntoFacturacionId, options.sucursalId])

  useEffect(() => {
    fetchTimbrados()
  }, [fetchTimbrados])

  const getById = useCallback(async (id: number): Promise<TimbradoDetalle | null> => {
    try {
      const result = await apiGet<Timbrado | PuntoVentaTimbradoResponse>(
        `/api/puntoventa/timbrados/${id}`
      )
      return normalizeTimbrado(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar timbrado")
      return null
    }
  }, [])

  return {
    timbrados,
    loading,
    error,
    totalCount: timbrados.length,
    getById,
    refetch: fetchTimbrados,
  }
}
