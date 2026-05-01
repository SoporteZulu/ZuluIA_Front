"use client"

import { useCallback, useEffect, useState } from "react"

import { apiFetch, apiGet } from "@/lib/api"
import type { PagedResult } from "@/lib/types/items"
import type { Reintegro } from "@/lib/types/tesoreria"

interface UseReintegrosOptions {
  sucursalId?: number
  cajaId?: number
  terceroId?: number
  pageSize?: number
}

function normalizeReintegro(reintegro: Reintegro): Reintegro {
  return {
    ...reintegro,
    cajaCuentaDescripcion: reintegro.cajaCuentaDescripcion ?? "",
    terceroId: reintegro.terceroId ?? null,
    terceroNombre: reintegro.terceroNombre ?? null,
    importe: Number(reintegro.importe ?? 0),
    cotizacion: Number(reintegro.cotizacion ?? 0),
    referenciaId: reintegro.referenciaId ?? null,
    valeId: reintegro.valeId ?? reintegro.referenciaId ?? null,
    observacion: reintegro.observacion ?? null,
    monedaCodigo: reintegro.monedaCodigo ?? "",
  }
}

function buildQueryString(options: UseReintegrosOptions) {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(options.pageSize ?? 100),
  })

  if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
  if (options.cajaId) params.set("cajaId", String(options.cajaId))
  if (options.terceroId) params.set("terceroId", String(options.terceroId))

  return params.toString()
}

export function useReintegros(options: UseReintegrosOptions = {}) {
  const sucursalId = options.sucursalId
  const cajaId = options.cajaId
  const terceroId = options.terceroId
  const pageSize = options.pageSize

  const [reintegros, setReintegros] = useState<Reintegro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const fetchReintegros = useCallback(async () => {
    if (!sucursalId) {
      setReintegros([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await apiGet<PagedResult<Reintegro>>(
        `/api/reintegros?${buildQueryString({ sucursalId, cajaId, terceroId, pageSize })}`
      )
      setReintegros((result.items ?? []).map(normalizeReintegro))
      setTotalCount(result.totalCount ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar reintegros")
    } finally {
      setLoading(false)
    }
  }, [cajaId, pageSize, sucursalId, terceroId])

  useEffect(() => {
    fetchReintegros()
  }, [fetchReintegros])

  const anular = async (id: number, motivo?: string): Promise<boolean> => {
    try {
      setError(null)
      await apiFetch<void>(`/api/reintegros/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ motivo: motivo?.trim() || null }),
      })
      await fetchReintegros()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al anular reintegro")
      return false
    }
  }

  return {
    reintegros,
    loading,
    error,
    totalCount,
    anular,
    refetch: fetchReintegros,
  }
}