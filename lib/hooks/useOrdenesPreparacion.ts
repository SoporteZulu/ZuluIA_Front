"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost } from "@/lib/api"
import type {
  CreateOrdenPreparacionDto,
  DespacharOrdenPreparacionDto,
  OrdenPreparacion,
  OrdenPreparacionDetalle,
  OrdenPreparacionEvento,
  OrdenPreparacionResumen,
  OrdenPreparacionTimelineEvento,
  OrdenPreparacionTrazabilidad,
  OrdenesPreparacionPaged,
  RegistrarPickingOrdenPreparacionDto,
  TransferenciaTrazabilidad,
} from "@/lib/types/ordenes-preparacion"

interface UseOrdenesPreparacionOptions {
  sucursalId?: number
  terceroId?: number
  estado?: string
  desde?: string
  hasta?: string
}

const queryEstadoMap: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "EnProceso",
  COMPLETADA: "Completada",
  ANULADA: "Anulada",
}

function normalizeEstado(value: unknown): OrdenPreparacion["estado"] {
  const raw = String(value ?? "").trim()
  const normalized = raw
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toUpperCase()

  switch (normalized) {
    case "ENPROCESO":
    case "EN_PROCESO":
      return "EN_PROCESO"
    case "COMPLETADA":
    case "COMPLETADO":
      return "COMPLETADA"
    case "ANULADA":
    case "CANCELADA":
    case "CANCELADO":
      return "ANULADA"
    default:
      return "PENDIENTE"
  }
}

function normalizeDetalle(detalle: OrdenPreparacionDetalle): OrdenPreparacionDetalle {
  return {
    ...detalle,
    cantidad: Number(detalle.cantidad ?? 0),
    cantidadEntregada: Number(detalle.cantidadEntregada ?? 0),
    estaCompleto: Boolean(detalle.estaCompleto),
  }
}

function normalizeOrden(orden: OrdenPreparacion): OrdenPreparacion {
  return {
    ...orden,
    estado: normalizeEstado(orden.estado),
    cantidadRenglones: Number(orden.cantidadRenglones ?? orden.detalles?.length ?? 0),
    detalles: Array.isArray(orden.detalles) ? orden.detalles.map(normalizeDetalle) : undefined,
  }
}

function normalizeEvento<T extends OrdenPreparacionEvento>(evento: T): T {
  return {
    ...evento,
    tipo: String(evento.tipo ?? "").toUpperCase(),
  }
}

function normalizeTransferencia(
  transferencia: TransferenciaTrazabilidad
): TransferenciaTrazabilidad {
  return {
    ...transferencia,
    estado: String(transferencia.estado ?? "").toUpperCase(),
    eventos: Array.isArray(transferencia.eventos) ? transferencia.eventos.map(normalizeEvento) : [],
  }
}

function normalizeTrazabilidad(
  trazabilidad: OrdenPreparacionTrazabilidad
): OrdenPreparacionTrazabilidad {
  return {
    ...trazabilidad,
    estado: normalizeEstado(trazabilidad.estado),
    cantidadRenglones: Number(trazabilidad.cantidadRenglones ?? 0),
    cantidadSolicitada: Number(trazabilidad.cantidadSolicitada ?? 0),
    cantidadEntregada: Number(trazabilidad.cantidadEntregada ?? 0),
    transferencias: Array.isArray(trazabilidad.transferencias)
      ? trazabilidad.transferencias.map(normalizeTransferencia)
      : [],
    eventos: Array.isArray(trazabilidad.eventos) ? trazabilidad.eventos.map(normalizeEvento) : [],
    timeline: Array.isArray(trazabilidad.timeline)
      ? trazabilidad.timeline.map((evento: OrdenPreparacionTimelineEvento) =>
          normalizeEvento(evento)
        )
      : [],
  }
}

function normalizeResumen(resumen: OrdenPreparacionResumen): OrdenPreparacionResumen {
  return {
    cantidad: Number(resumen.cantidad ?? 0),
    pendientes: Number(resumen.pendientes ?? 0),
    enProceso: Number(resumen.enProceso ?? 0),
    completadas: Number(resumen.completadas ?? 0),
    anuladas: Number(resumen.anuladas ?? 0),
    cantidadSolicitada: Number(resumen.cantidadSolicitada ?? 0),
    cantidadEntregada: Number(resumen.cantidadEntregada ?? 0),
  }
}

export function useOrdenesPreparacion(options: UseOrdenesPreparacionOptions = {}) {
  const [ordenes, setOrdenes] = useState<OrdenPreparacion[]>([])
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [resumen, setResumen] = useState<OrdenPreparacionResumen | null>(null)

  const fetchOrdenes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" })
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.terceroId) params.set("terceroId", String(options.terceroId))
      if (options.estado) params.set("estado", queryEstadoMap[options.estado] ?? options.estado)
      if (options.desde) params.set("desde", options.desde)
      if (options.hasta) params.set("hasta", options.hasta)

      const result = await apiGet<OrdenesPreparacionPaged>(
        `/api/ordenes-preparacion?${params.toString()}`
      )
      const items = Array.isArray(result) ? result : (result.items ?? [])
      setOrdenes(Array.isArray(items) ? items.map(normalizeOrden) : [])
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar órdenes de preparación")
    } finally {
      setLoading(false)
    }
  }, [page, options.sucursalId, options.terceroId, options.estado, options.desde, options.hasta])

  const fetchResumen = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const params = new URLSearchParams()
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      const suffix = params.toString() ? `?${params.toString()}` : ""
      const result = await apiGet<OrdenPreparacionResumen>(
        `/api/ordenes-preparacion/resumen${suffix}`
      )
      setResumen(normalizeResumen(result))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el resumen de picking")
    } finally {
      setSummaryLoading(false)
    }
  }, [options.sucursalId])

  useEffect(() => {
    fetchOrdenes()
  }, [fetchOrdenes])
  useEffect(() => {
    fetchResumen()
  }, [fetchResumen])

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchOrdenes(), fetchResumen()])
  }, [fetchOrdenes, fetchResumen])

  const crear = async (dto: CreateOrdenPreparacionDto): Promise<number | null> => {
    try {
      const response = await apiPost<{ id: number }>("/api/ordenes-preparacion", dto)
      await refreshAll()
      return Number(response?.id ?? 0) || null
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear orden de preparación")
      return null
    }
  }

  const getById = useCallback(async (id: number): Promise<OrdenPreparacion | null> => {
    try {
      const result = await apiGet<OrdenPreparacion>(`/api/ordenes-preparacion/${id}`)
      return normalizeOrden(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el detalle de picking")
      return null
    }
  }, [])

  const getEventos = useCallback(async (id: number): Promise<OrdenPreparacionEvento[]> => {
    try {
      const result = await apiGet<OrdenPreparacionEvento[]>(
        `/api/ordenes-preparacion/${id}/eventos`
      )
      return Array.isArray(result) ? result.map(normalizeEvento) : []
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar eventos de la orden")
      return []
    }
  }, [])

  const getTrazabilidad = useCallback(
    async (id: number): Promise<OrdenPreparacionTrazabilidad | null> => {
      try {
        const result = await apiGet<OrdenPreparacionTrazabilidad>(
          `/api/ordenes-preparacion/${id}/trazabilidad`
        )
        return normalizeTrazabilidad(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar la trazabilidad de la orden")
        return null
      }
    },
    []
  )

  const iniciar = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await apiPost(`/api/ordenes-preparacion/${id}/iniciar`, {})
        await refreshAll()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al iniciar la orden de preparación")
        return false
      }
    },
    [refreshAll]
  )

  const registrarPicking = useCallback(
    async (id: number, dto: RegistrarPickingOrdenPreparacionDto): Promise<boolean> => {
      try {
        await apiPost(`/api/ordenes-preparacion/${id}/picking`, dto)
        await refreshAll()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al registrar el picking")
        return false
      }
    },
    [refreshAll]
  )

  const confirmar = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await apiPost(`/api/ordenes-preparacion/${id}/confirmar`, {})
        await refreshAll()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al confirmar la orden de preparación")
        return false
      }
    },
    [refreshAll]
  )

  const despachar = useCallback(
    async (id: number, dto: DespacharOrdenPreparacionDto): Promise<boolean> => {
      try {
        await apiPost(`/api/ordenes-preparacion/${id}/despachar`, dto)
        await refreshAll()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al despachar la orden de preparación")
        return false
      }
    },
    [refreshAll]
  )

  const anular = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await apiPost(`/api/ordenes-preparacion/${id}/anular`, {})
        await refreshAll()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al anular la orden de preparación")
        return false
      }
    },
    [refreshAll]
  )

  return {
    ordenes,
    loading,
    summaryLoading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    resumen,
    crear,
    getById,
    getEventos,
    getTrazabilidad,
    iniciar,
    registrarPicking,
    confirmar,
    despachar,
    anular,
    refetch: refreshAll,
  }
}
