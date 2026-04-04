"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost } from "@/lib/api"
import type { Cobro, CobroDetalle, RegistrarCobroDto } from "@/lib/types/cobros"
import type { PagedResult } from "@/lib/types/items"

interface UseCobrosOptions {
  sucursalId?: number
  terceroId?: number
}

export function useCobros(options: UseCobrosOptions = {}) {
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")

  const fetchCobros = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
      })
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.terceroId) params.set("terceroId", String(options.terceroId))
      if (desde) params.set("desde", desde)
      if (hasta) params.set("hasta", hasta)

      const result = await apiGet<PagedResult<Cobro>>(`/api/cobros?${params.toString()}`)
      const raw = Array.isArray(result) ? result : (result.items ?? [])
      const items = raw.map((c: Cobro) => ({ ...c, total: Number(c.total ?? 0) }))
      setCobros(items)
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cobros")
    } finally {
      setLoading(false)
    }
  }, [page, desde, hasta, options.sucursalId, options.terceroId])

  useEffect(() => {
    fetchCobros()
  }, [fetchCobros])

  const getById = async (id: number): Promise<CobroDetalle | null> => {
    try {
      return await apiGet<CobroDetalle>(`/api/cobros/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cobro")
      return null
    }
  }

  const registrar = async (dto: RegistrarCobroDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>("/api/cobros", dto)
      await fetchCobros()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar cobro")
      return false
    }
  }

  const anular = async (id: number): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/cobros/${id}/anular`, {})
      await fetchCobros()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al anular cobro")
      return false
    }
  }

  return {
    cobros,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    desde,
    setDesde,
    hasta,
    setHasta,
    getById,
    registrar,
    anular,
    refetch: fetchCobros,
  }
}
