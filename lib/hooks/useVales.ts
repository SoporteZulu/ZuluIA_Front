"use client"

import { useCallback, useEffect, useState } from "react"

import { apiFetch, apiGet, apiPost } from "@/lib/api"
import type { PagedResult } from "@/lib/types/items"
import type { RegistrarReintegroValeDto, RegistrarValeDto, Vale } from "@/lib/types/tesoreria"

interface UseValesOptions {
  sucursalId?: number
  cajaId?: number
  terceroId?: number
  soloNoReintegrados?: boolean
  pageSize?: number
}

function normalizeVale(vale: Vale): Vale {
  return {
    ...vale,
    cajaCuentaDescripcion: vale.cajaCuentaDescripcion ?? "",
    terceroId: vale.terceroId ?? null,
    terceroNombre: vale.terceroNombre ?? null,
    importe: Number(vale.importe ?? 0),
    cotizacion: Number(vale.cotizacion ?? 0),
    referenciaId: vale.referenciaId ?? null,
    observacion: vale.observacion ?? null,
    fechaReintegro: vale.fechaReintegro ?? null,
    monedaCodigo: vale.monedaCodigo ?? "",
  }
}

function buildQueryString(options: UseValesOptions) {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(options.pageSize ?? 100),
  })

  if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
  if (options.cajaId) params.set("cajaId", String(options.cajaId))
  if (options.terceroId) params.set("terceroId", String(options.terceroId))
  if (options.soloNoReintegrados) params.set("soloNoReintegrados", "true")

  return params.toString()
}

function buildPendientesQueryString(options: Pick<UseValesOptions, "cajaId" | "terceroId">) {
  const params = new URLSearchParams()
  if (options.cajaId) params.set("cajaId", String(options.cajaId))
  if (options.terceroId) params.set("terceroId", String(options.terceroId))
  return params.toString()
}

export function useVales(options: UseValesOptions = {}) {
  const sucursalId = options.sucursalId
  const cajaId = options.cajaId
  const terceroId = options.terceroId
  const soloNoReintegrados = options.soloNoReintegrados
  const pageSize = options.pageSize

  const [vales, setVales] = useState<Vale[]>([])
  const [pendientes, setPendientes] = useState<Vale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const fetchVales = useCallback(async () => {
    if (!sucursalId) {
      setVales([])
      setPendientes([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const queryOptions = {
        sucursalId,
        cajaId,
        terceroId,
        soloNoReintegrados,
        pageSize,
      }

      const [valesResult, pendientesResult] = await Promise.all([
        apiGet<PagedResult<Vale>>(`/api/vales?${buildQueryString(queryOptions)}`),
        apiGet<Vale[]>(
          `/api/vales/pendientes?${buildPendientesQueryString({ cajaId, terceroId })}`
        ),
      ])

      setVales((valesResult.items ?? []).map(normalizeVale))
      setPendientes((Array.isArray(pendientesResult) ? pendientesResult : []).map(normalizeVale))
      setTotalCount(valesResult.totalCount ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar vales")
    } finally {
      setLoading(false)
    }
  }, [cajaId, pageSize, soloNoReintegrados, sucursalId, terceroId])

  useEffect(() => {
    fetchVales()
  }, [fetchVales])

  const registrar = async (dto: RegistrarValeDto): Promise<boolean> => {
    try {
      setError(null)
      await apiPost<unknown>("/api/vales", {
        ...dto,
        terceroId: dto.terceroId ?? null,
        observacion: dto.observacion?.trim() || null,
      })
      await fetchVales()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar vale")
      return false
    }
  }

  const reintegrar = async (valeId: number, dto: RegistrarReintegroValeDto): Promise<boolean> => {
    try {
      setError(null)
      await apiPost<unknown>(`/api/vales/${valeId}/reintegrar`, {
        ...dto,
        terceroId: dto.terceroId ?? null,
        observacion: dto.observacion?.trim() || null,
      })
      await fetchVales()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar reintegro")
      return false
    }
  }

  const anular = async (id: number, motivo?: string): Promise<boolean> => {
    try {
      setError(null)
      await apiFetch<void>(`/api/vales/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ motivo: motivo?.trim() || null }),
      })
      await fetchVales()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al anular vale")
      return false
    }
  }

  return {
    vales,
    pendientes,
    loading,
    error,
    totalCount,
    registrar,
    reintegrar,
    anular,
    refetch: fetchVales,
  }
}
