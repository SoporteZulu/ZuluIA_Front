"use client"

import { useCallback, useEffect, useState } from "react"

import { apiGet, apiPost } from "@/lib/api"
import type {
  CompraAjusteResumen,
  CompraDevolucionResumen,
  CompraNotaCreditoResumen,
  CompraRemitoResumen,
  CompraSolicitudResumen,
  ComprasPagedResult,
  CotizacionCompraDetalle,
  CotizacionCompraListItem,
  CrearCotizacionCompraDto,
  CrearRequisicionCompraDto,
  RequisicionCompraDetalle,
  RequisicionCompraListItem,
} from "@/lib/types/compras-operativa"

function toArray<T>(result: T[] | ComprasPagedResult<T>): T[] {
  return Array.isArray(result) ? result : result.items
}

function toTotals<T>(result: T[] | ComprasPagedResult<T>, fallbackLength: number) {
  if (Array.isArray(result)) {
    return {
      totalCount: fallbackLength,
      totalPages: 1,
    }
  }

  return {
    totalCount: result.totalCount,
    totalPages: result.totalPages,
  }
}

interface UseComprasRemitosOptions {
  sucursalId?: number
  proveedorId?: number
  estado?: string
  tipo?: string
  esValorizado?: boolean
}

export function useComprasRemitos(options: UseComprasRemitosOptions = {}) {
  const [remitos, setRemitos] = useState<CompraRemitoResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRemitos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.proveedorId) params.set("proveedorId", String(options.proveedorId))
      if (options.estado) params.set("estado", options.estado)
      if (options.tipo) params.set("tipo", options.tipo)
      if (options.esValorizado !== undefined) {
        params.set("esValorizado", String(options.esValorizado))
      }

      const query = params.toString()
      const result = await apiGet<CompraRemitoResumen[]>(
        `/api/comprobantes/remitos/compras${query ? `?${query}` : ""}`
      )
      setRemitos(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar remitos de compra")
      setRemitos([])
    } finally {
      setLoading(false)
    }
  }, [options.estado, options.esValorizado, options.proveedorId, options.sucursalId, options.tipo])

  useEffect(() => {
    void fetchRemitos()
  }, [fetchRemitos])

  return {
    remitos,
    loading,
    error,
    refetch: fetchRemitos,
  }
}

interface UseComprasSolicitudesOptions {
  sucursalId?: number
  depositoId?: number
  severidad?: string
}

export function useComprasSolicitudes(options: UseComprasSolicitudesOptions = {}) {
  const [solicitudes, setSolicitudes] = useState<CompraSolicitudResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.depositoId) params.set("depositoId", String(options.depositoId))
      if (options.severidad) params.set("severidad", options.severidad)

      const query = params.toString()
      const result = await apiGet<CompraSolicitudResumen[]>(
        `/api/compras/solicitudes${query ? `?${query}` : ""}`
      )
      setSolicitudes(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar solicitudes de compra")
      setSolicitudes([])
    } finally {
      setLoading(false)
    }
  }, [options.depositoId, options.severidad, options.sucursalId])

  useEffect(() => {
    void fetchSolicitudes()
  }, [fetchSolicitudes])

  return {
    solicitudes,
    loading,
    error,
    refetch: fetchSolicitudes,
  }
}

interface UseComprasDevolucionesOptions {
  sucursalId?: number
  proveedorId?: number
  estado?: string
  tipo?: string
}

export function useComprasDevoluciones(options: UseComprasDevolucionesOptions = {}) {
  const [devoluciones, setDevoluciones] = useState<CompraDevolucionResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDevoluciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.proveedorId) params.set("proveedorId", String(options.proveedorId))
      if (options.estado) params.set("estado", options.estado)
      if (options.tipo) params.set("tipo", options.tipo)

      const query = params.toString()
      const result = await apiGet<CompraDevolucionResumen[]>(
        `/api/comprobantes/devoluciones/compras${query ? `?${query}` : ""}`
      )
      setDevoluciones(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar devoluciones de compra")
      setDevoluciones([])
    } finally {
      setLoading(false)
    }
  }, [options.estado, options.proveedorId, options.sucursalId, options.tipo])

  useEffect(() => {
    void fetchDevoluciones()
  }, [fetchDevoluciones])

  return {
    devoluciones,
    loading,
    error,
    refetch: fetchDevoluciones,
  }
}

interface UseComprasNotasCreditoOptions {
  sucursalId?: number
  proveedorId?: number
  estado?: string
}

export function useComprasNotasCredito(options: UseComprasNotasCreditoOptions = {}) {
  const [notas, setNotas] = useState<CompraNotaCreditoResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.proveedorId) params.set("proveedorId", String(options.proveedorId))
      if (options.estado) params.set("estado", options.estado)

      const query = params.toString()
      const result = await apiGet<CompraNotaCreditoResumen[]>(
        `/api/comprobantes/notas-credito/compras${query ? `?${query}` : ""}`
      )
      setNotas(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar notas de crédito de compra")
      setNotas([])
    } finally {
      setLoading(false)
    }
  }, [options.estado, options.proveedorId, options.sucursalId])

  useEffect(() => {
    void fetchNotas()
  }, [fetchNotas])

  return {
    notas,
    loading,
    error,
    refetch: fetchNotas,
  }
}

interface UseComprasAjustesOptions {
  sucursalId?: number
  proveedorId?: number
  tipo?: string
}

export function useComprasAjustes(options: UseComprasAjustesOptions = {}) {
  const [ajustes, setAjustes] = useState<CompraAjusteResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAjustes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.proveedorId) params.set("proveedorId", String(options.proveedorId))
      if (options.tipo) params.set("tipo", options.tipo)

      const query = params.toString()
      const result = await apiGet<CompraAjusteResumen[]>(
        `/api/comprobantes/ajustes/compras${query ? `?${query}` : ""}`
      )
      setAjustes(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar ajustes de compra")
      setAjustes([])
    } finally {
      setLoading(false)
    }
  }, [options.proveedorId, options.sucursalId, options.tipo])

  useEffect(() => {
    void fetchAjustes()
  }, [fetchAjustes])

  return {
    ajustes,
    loading,
    error,
    refetch: fetchAjustes,
  }
}

interface UseCotizacionesCompraOptions {
  sucursalId?: number
  proveedorId?: number
  estado?: string
}

export function useCotizacionesCompra(options: UseCotizacionesCompraOptions = {}) {
  const [cotizaciones, setCotizaciones] = useState<CotizacionCompraListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCotizaciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
      })
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.proveedorId) params.set("proveedorId", String(options.proveedorId))
      if (options.estado) params.set("estado", options.estado)

      const result = await apiGet<
        CotizacionCompraListItem[] | ComprasPagedResult<CotizacionCompraListItem>
      >(`/api/compras/cotizaciones?${params.toString()}`)
      const items = toArray(result)
      const totals = toTotals(result, items.length)
      setCotizaciones(items)
      setTotalCount(totals.totalCount)
      setTotalPages(totals.totalPages)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cotizaciones de compra")
      setCotizaciones([])
    } finally {
      setLoading(false)
    }
  }, [options.estado, options.proveedorId, options.sucursalId, page])

  useEffect(() => {
    void fetchCotizaciones()
  }, [fetchCotizaciones])

  const getById = useCallback(async (id: number) => {
    return apiGet<CotizacionCompraDetalle>(`/api/compras/cotizaciones/${id}`)
  }, [])

  const crear = useCallback(
    async (dto: CrearCotizacionCompraDto) => {
      try {
        await apiPost<{ id: number }>("/api/compras/cotizaciones", dto)
        await fetchCotizaciones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear cotización de compra")
        return false
      }
    },
    [fetchCotizaciones]
  )

  const aceptar = useCallback(
    async (id: number) => {
      try {
        await apiPost<void>(`/api/compras/cotizaciones/${id}/aceptar`, {})
        await fetchCotizaciones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al aceptar cotización de compra")
        return false
      }
    },
    [fetchCotizaciones]
  )

  const rechazar = useCallback(
    async (id: number) => {
      try {
        await apiPost<void>(`/api/compras/cotizaciones/${id}/rechazar`, {})
        await fetchCotizaciones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al rechazar cotización de compra")
        return false
      }
    },
    [fetchCotizaciones]
  )

  return {
    cotizaciones,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    getById,
    crear,
    aceptar,
    rechazar,
    refetch: fetchCotizaciones,
  }
}

interface UseRequisicionesCompraOptions {
  sucursalId?: number
  solicitanteId?: number
  estado?: string
}

export function useRequisicionesCompra(options: UseRequisicionesCompraOptions = {}) {
  const [requisiciones, setRequisiciones] = useState<RequisicionCompraListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchRequisiciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
      })
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.solicitanteId) params.set("solicitanteId", String(options.solicitanteId))
      if (options.estado) params.set("estado", options.estado)

      const result = await apiGet<
        RequisicionCompraListItem[] | ComprasPagedResult<RequisicionCompraListItem>
      >(`/api/compras/requisiciones?${params.toString()}`)
      const items = toArray(result)
      const totals = toTotals(result, items.length)
      setRequisiciones(items)
      setTotalCount(totals.totalCount)
      setTotalPages(totals.totalPages)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar requisiciones de compra")
      setRequisiciones([])
    } finally {
      setLoading(false)
    }
  }, [options.estado, options.solicitanteId, options.sucursalId, page])

  useEffect(() => {
    void fetchRequisiciones()
  }, [fetchRequisiciones])

  const getById = useCallback(async (id: number) => {
    return apiGet<RequisicionCompraDetalle>(`/api/compras/requisiciones/${id}`)
  }, [])

  const crear = useCallback(
    async (dto: CrearRequisicionCompraDto) => {
      try {
        await apiPost<{ id: number }>("/api/compras/requisiciones", dto)
        await fetchRequisiciones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear requisición de compra")
        return false
      }
    },
    [fetchRequisiciones]
  )

  const enviar = useCallback(
    async (id: number) => {
      try {
        await apiPost<void>(`/api/compras/requisiciones/${id}/enviar`, {})
        await fetchRequisiciones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al enviar requisición de compra")
        return false
      }
    },
    [fetchRequisiciones]
  )

  const aprobar = useCallback(
    async (id: number) => {
      try {
        await apiPost<void>(`/api/compras/requisiciones/${id}/aprobar`, {})
        await fetchRequisiciones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al aprobar requisición de compra")
        return false
      }
    },
    [fetchRequisiciones]
  )

  const rechazar = useCallback(
    async (id: number, motivo?: string | null) => {
      try {
        await apiPost<void>(`/api/compras/requisiciones/${id}/rechazar`, motivo ?? null)
        await fetchRequisiciones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al rechazar requisición de compra")
        return false
      }
    },
    [fetchRequisiciones]
  )

  const cancelar = useCallback(
    async (id: number) => {
      try {
        await apiPost<void>(`/api/compras/requisiciones/${id}/cancelar`, {})
        await fetchRequisiciones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cancelar requisición de compra")
        return false
      }
    },
    [fetchRequisiciones]
  )

  return {
    requisiciones,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    getById,
    crear,
    enviar,
    aprobar,
    rechazar,
    cancelar,
    refetch: fetchRequisiciones,
  }
}
