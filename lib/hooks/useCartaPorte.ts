"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost } from "@/lib/api"
import type {
  AnularCartaPorteDto,
  CartaPorte,
  CartaPorteEvento,
  CartaPortePaged,
  ConsultarCtgCartaPorteDto,
  CrearOrdenCargaDto,
  CreateCartaPorteDto,
  EstadoCartaPorte,
  OrdenCarga,
  SolicitarCtgCartaPorteDto,
} from "@/lib/types/carta-porte"

interface UseCartaPorteOptions {
  comprobanteId?: number
  transportistaId?: number
  estado?: string
  soloConErrorCtg?: boolean
  desde?: string
  hasta?: string
}

function normalizeEstado(value: unknown): EstadoCartaPorte {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[\s-]+/g, "")
    .toUpperCase()

  switch (normalized) {
    case "ORDENCARGAASIGNADA":
      return "ORDEN_CARGA_ASIGNADA"
    case "CTGSOLICITADO":
      return "CTG_SOLICITADO"
    case "CTGERROR":
      return "CTG_ERROR"
    case "ACTIVA":
      return "ACTIVA"
    case "CONFIRMADA":
      return "CONFIRMADA"
    case "ANULADA":
      return "ANULADA"
    default:
      return "PENDIENTE"
  }
}

function normalizeCarta(carta: CartaPorte): CartaPorte {
  return {
    ...carta,
    estado: normalizeEstado(carta.estado),
    intentosCtg: Number(carta.intentosCtg ?? 0),
  }
}

function normalizeOrdenCarga(orden: OrdenCarga): OrdenCarga {
  return {
    ...orden,
    confirmada: Boolean(orden.confirmada),
  }
}

function normalizeEvento(evento: CartaPorteEvento): CartaPorteEvento {
  return {
    ...evento,
    tipoEvento: String(evento.tipoEvento ?? "").toUpperCase(),
    estadoAnterior: evento.estadoAnterior ? normalizeEstado(evento.estadoAnterior) : undefined,
    estadoNuevo: normalizeEstado(evento.estadoNuevo),
    intentoCtg: Number(evento.intentoCtg ?? 0),
  }
}

export function useCartaPorte(options: UseCartaPorteOptions = {}) {
  const [cartas, setCartas] = useState<CartaPorte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCartas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" })
      if (options.comprobanteId) params.set("comprobanteId", String(options.comprobanteId))
      if (options.transportistaId) params.set("transportistaId", String(options.transportistaId))
      if (options.estado) params.set("estado", options.estado)
      if (options.soloConErrorCtg) params.set("soloConErrorCtg", "true")
      if (options.desde) params.set("desde", options.desde)
      if (options.hasta) params.set("hasta", options.hasta)

      const result = await apiGet<CartaPortePaged>(`/api/carta-porte?${params.toString()}`)
      const items = Array.isArray(result) ? result : (result.items ?? [])
      setCartas(Array.isArray(items) ? items.map(normalizeCarta) : [])
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cartas de porte")
    } finally {
      setLoading(false)
    }
  }, [
    page,
    options.comprobanteId,
    options.transportistaId,
    options.estado,
    options.soloConErrorCtg,
    options.desde,
    options.hasta,
  ])

  useEffect(() => {
    fetchCartas()
  }, [fetchCartas])

  const getById = async (id: number): Promise<CartaPorte | null> => {
    try {
      const result = await apiGet<CartaPorte>(`/api/carta-porte/${id}`)
      return normalizeCarta(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar carta de porte")
      return null
    }
  }

  const crear = async (dto: CreateCartaPorteDto): Promise<number | null> => {
    try {
      const result = await apiPost<{ id: number }>("/api/carta-porte", dto)
      await fetchCartas()
      return Number(result?.id ?? 0) || null
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear carta de porte")
      return null
    }
  }

  const asignarCtg = async (id: number, nroCtg: string): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/carta-porte/${id}/asignar-ctg`, { nroCtg })
      await fetchCartas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al asignar CTG")
      return false
    }
  }

  const getOrdenCarga = async (id: number): Promise<OrdenCarga | null> => {
    try {
      const result = await apiGet<OrdenCarga>(`/api/carta-porte/${id}/orden-carga`)
      return normalizeOrdenCarga(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar la orden de carga")
      return null
    }
  }

  const crearOrdenCarga = async (id: number, dto: CrearOrdenCargaDto): Promise<boolean> => {
    try {
      await apiPost(`/api/carta-porte/${id}/orden-carga`, dto)
      await fetchCartas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la orden de carga")
      return false
    }
  }

  const solicitarCtg = async (id: number, dto: SolicitarCtgCartaPorteDto): Promise<boolean> => {
    try {
      await apiPost(`/api/carta-porte/${id}/ctg/solicitar`, dto)
      await fetchCartas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al solicitar CTG")
      return false
    }
  }

  const reintentarCtg = async (id: number, dto: SolicitarCtgCartaPorteDto): Promise<boolean> => {
    try {
      await apiPost(`/api/carta-porte/${id}/ctg/reintentar`, dto)
      await fetchCartas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al reintentar CTG")
      return false
    }
  }

  const consultarCtg = async (id: number, dto: ConsultarCtgCartaPorteDto): Promise<boolean> => {
    try {
      await apiPost(`/api/carta-porte/${id}/ctg/consultar`, dto)
      await fetchCartas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al consultar CTG")
      return false
    }
  }

  const confirmar = async (id: number): Promise<boolean> => {
    try {
      await apiPost(`/api/carta-porte/${id}/confirmar`, {})
      await fetchCartas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al confirmar carta de porte")
      return false
    }
  }

  const anular = async (id: number, dto: AnularCartaPorteDto): Promise<boolean> => {
    try {
      await apiPost(`/api/carta-porte/${id}/anular`, dto)
      await fetchCartas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al anular carta de porte")
      return false
    }
  }

  const getHistorial = async (id: number): Promise<CartaPorteEvento[]> => {
    try {
      const result = await apiGet<CartaPorteEvento[]>(`/api/carta-porte/${id}/historial`)
      return Array.isArray(result) ? result.map(normalizeEvento) : []
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar historial de carta de porte")
      return []
    }
  }

  return {
    cartas,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    getById,
    getOrdenCarga,
    getHistorial,
    crear,
    asignarCtg,
    crearOrdenCarga,
    solicitarCtg,
    reintentarCtg,
    consultarCtg,
    confirmar,
    anular,
    refetch: fetchCartas,
  }
}
