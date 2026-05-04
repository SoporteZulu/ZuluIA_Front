"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost } from "@/lib/api"
import type { Cedulon, CedulonesPagedResult, CreateCedulonDto } from "@/lib/types/cedulones"

interface CedulonApiItem {
  id: number
  terceroId: number
  sucursalId?: number
  numero?: string
  nroCedulon?: string
  descripcion?: string
  importe?: number
  importePagado?: number
  saldo?: number
  saldoPendiente?: number
  estado?: string
  fechaEmision?: string
  fechaVencimiento?: string
  vencido?: boolean
}

interface CedulonesApiResult {
  items?: CedulonApiItem[]
  data?: CedulonApiItem[]
  totalCount?: number
  totalPages?: number
}

function normalizeCedulonEstado(rawEstado: string | undefined, vencido: boolean | undefined) {
  const normalized = (rawEstado ?? "").replace(/[\s_]/g, "").toUpperCase()

  if (normalized === "ANULADO") return "ANULADO"
  if (normalized === "PAGADO") return "PAGADO"
  if (normalized === "VENCIDO") return "VENCIDO"
  if (vencido) return "VENCIDO"
  if (normalized === "PAGADOPARCIAL" || normalized === "EMITIDO" || normalized === "PENDIENTE") {
    return "PENDIENTE"
  }

  return (rawEstado ?? "PENDIENTE").toUpperCase()
}

function normalizeCedulon(item: CedulonApiItem): Cedulon {
  const importe = Number(item.importe ?? 0)
  const saldo = Number(
    item.saldo ?? item.saldoPendiente ?? importe - Number(item.importePagado ?? 0)
  )

  return {
    id: item.id,
    terceroId: item.terceroId,
    sucursalId: item.sucursalId,
    numero: item.numero ?? item.nroCedulon,
    descripcion: item.descripcion,
    importe,
    saldo,
    estado: normalizeCedulonEstado(item.estado, item.vencido),
    fechaEmision: item.fechaEmision,
    fechaVencimiento: item.fechaVencimiento,
  }
}

interface UseCedulonesOptions {
  terceroId?: number
  sucursalId?: number
  estado?: string
}

export function useCedulones(options: UseCedulonesOptions = {}) {
  const [cedulones, setCedulones] = useState<Cedulon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCedulones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" })
      if (options.terceroId) params.set("terceroId", String(options.terceroId))
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.estado) params.set("estado", options.estado)

      const result = await apiGet<CedulonesPagedResult | CedulonesApiResult | CedulonApiItem[]>(
        `/api/cedulones?${params.toString()}`
      )
      const pagedResult = Array.isArray(result) ? null : result
      const items = Array.isArray(result)
        ? result
        : ((pagedResult.items ?? pagedResult.data ?? []) as CedulonApiItem[])
      setCedulones(items.map(normalizeCedulon))
      setTotalCount(Array.isArray(result) ? items.length : (pagedResult.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (pagedResult.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cedulones")
    } finally {
      setLoading(false)
    }
  }, [page, options.terceroId, options.sucursalId, options.estado])

  useEffect(() => {
    fetchCedulones()
  }, [fetchCedulones])

  const getVencidos = async (sucursalId?: number): Promise<Cedulon[]> => {
    try {
      const params = sucursalId ? `?sucursalId=${sucursalId}` : ""
      const result = await apiGet<Cedulon[] | CedulonApiItem[]>(`/api/cedulones/vencidos${params}`)
      return (Array.isArray(result) ? result : []).map(normalizeCedulon)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cedulones vencidos")
      return []
    }
  }

  const crear = async (dto: CreateCedulonDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>("/api/cedulones", dto)
      await fetchCedulones()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear cedulón")
      return false
    }
  }

  const pagar = async (id: number, importe: number, cajaId: number): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/cedulones/${id}/pagar`, { importe, cajaId })
      await fetchCedulones()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar pago de cedulón")
      return false
    }
  }

  return {
    cedulones,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    getVencidos,
    crear,
    pagar,
    refetch: fetchCedulones,
  }
}
