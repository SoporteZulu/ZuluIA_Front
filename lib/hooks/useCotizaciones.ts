"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost } from "@/lib/api"
import type { CotizacionMoneda, CreateCotizacionDto } from "@/lib/types/cotizaciones"
import type { Moneda } from "@/lib/types/configuracion"
import type { PagedResult } from "@/lib/types/items"

type CotizacionHistorica = CotizacionMoneda & {
  createdAt?: string
}

function normalizeCotizacion(cotizacion: CotizacionMoneda): CotizacionMoneda {
  return {
    ...cotizacion,
    cotizacion: Number(cotizacion.cotizacion ?? 0),
  }
}

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionMoneda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCotizaciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      try {
        const result = await apiGet<CotizacionMoneda[] | PagedResult<CotizacionMoneda>>(
          "/api/cotizaciones"
        )
        const items = Array.isArray(result) ? result : (result.items ?? [])
        setCotizaciones(items.map(normalizeCotizacion))
        return
      } catch {
        // Fallback para entornos donde aun no exista el endpoint consolidado.
      }

      const monedasResult = await apiGet<Moneda[] | PagedResult<Moneda>>(
        "/api/configuracion/monedas"
      )
      const monedas = Array.isArray(monedasResult) ? monedasResult : (monedasResult.items ?? [])

      const historicosPorMoneda = await Promise.all(
        monedas.map(async (moneda) => {
          try {
            const result = await apiGet<CotizacionHistorica[]>(
              `/api/cotizaciones/${moneda.id}/historico`
            )

            return (Array.isArray(result) ? result : []).map((cotizacion) =>
              normalizeCotizacion({
                ...cotizacion,
                monedaDescripcion: moneda.descripcion,
                monedaCodigo: moneda.codigo,
              })
            )
          } catch {
            return []
          }
        })
      )

      setCotizaciones(historicosPorMoneda.flat())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cotizaciones")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCotizaciones()
  }, [fetchCotizaciones])

  const crear = async (dto: CreateCotizacionDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>("/api/cotizaciones", dto)
      await fetchCotizaciones()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar cotización")
      return false
    }
  }

  /** Retorna la cotización vigente para una moneda en una fecha dada. */
  const getCotizacionPorFecha = async (monedaId: number, fecha: string): Promise<number> => {
    try {
      const result = await apiGet<CotizacionMoneda>(
        `/api/cotizaciones/${monedaId}/vigente?fecha=${fecha}`
      )
      return Number(result?.cotizacion ?? 1)
    } catch {
      return 1
    }
  }

  return { cotizaciones, loading, error, crear, getCotizacionPorFecha, refetch: fetchCotizaciones }
}
