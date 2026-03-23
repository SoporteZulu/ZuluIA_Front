"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { apiGet, apiPost } from "@/lib/api"
import type {
  Comprobante,
  ComprobanteDetalle,
  EmitirComprobanteDto,
  EstadisticasComprobantes,
  TipoComprobante,
} from "@/lib/types/comprobantes"
import type { PagedResult } from "@/lib/types/items"

// Module-level cache so tipos aren't re-fetched across multiple hook instances
let tiposCache: TipoComprobante[] | null = null

async function getTipos(): Promise<TipoComprobante[]> {
  if (tiposCache) return tiposCache
  const result = await apiGet<TipoComprobante[]>("/api/comprobantes/tipos")
  tiposCache = Array.isArray(result) ? result : []
  return tiposCache
}

interface UseComprobantesOptions {
  esVenta?: boolean
  esCompra?: boolean
  tipoComprobanteId?: number
  terceroId?: number
  sucursalId?: number
}

export function useComprobantes(options: UseComprobantesOptions = {}) {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [estado, setEstado] = useState("")

  // Determine if esVenta/esCompra filtering is needed
  const needsTypeFilter = options.esVenta !== undefined || options.esCompra !== undefined
  const esVentaRef = useRef(options.esVenta)
  const esCompraRef = useRef(options.esCompra)
  esVentaRef.current = options.esVenta
  esCompraRef.current = options.esCompra

  const fetchComprobantes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
      })
      if (options.tipoComprobanteId)
        params.set("tipoComprobanteId", String(options.tipoComprobanteId))
      if (options.terceroId) params.set("terceroId", String(options.terceroId))
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (estado) params.set("estado", estado)

      const [result, tipos] = await Promise.all([
        apiGet<PagedResult<Comprobante>>(`/api/comprobantes?${params.toString()}`),
        needsTypeFilter ? getTipos() : Promise.resolve<TipoComprobante[]>([]),
      ])

      const normalize = (c: Comprobante): Comprobante => ({
        ...c,
        netoGravado: Number(c.netoGravado ?? 0),
        netoNoGravado: Number(c.netoNoGravado ?? 0),
        ivaRi: Number(c.ivaRi ?? 0),
        ivaRni: Number(c.ivaRni ?? 0),
        total: Number(c.total ?? 0),
        saldo: Number(c.saldo ?? 0),
      })

      let items = (Array.isArray(result) ? result : (result.items ?? [])).map(normalize)

      // Client-side filter by esVenta / esCompra since the backend doesn't support these params
      if (needsTypeFilter && tipos.length > 0) {
        const validIds = new Set(
          tipos
            .filter(
              (t) =>
                (esVentaRef.current !== undefined ? t.esVenta === esVentaRef.current : true) &&
                (esCompraRef.current !== undefined ? t.esCompra === esCompraRef.current : true)
            )
            .map((t) => t.id)
        )
        items = items.filter((c) => validIds.has(c.tipoComprobanteId))
      }

      setComprobantes(items)
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar comprobantes")
    } finally {
      setLoading(false)
    }
  }, [
    page,
    estado,
    options.tipoComprobanteId,
    options.terceroId,
    options.sucursalId,
    needsTypeFilter,
  ])

  useEffect(() => {
    fetchComprobantes()
  }, [fetchComprobantes])

  const getById = async (id: number): Promise<ComprobanteDetalle | null> => {
    try {
      return await apiGet<ComprobanteDetalle>(`/api/comprobantes/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar comprobante")
      return null
    }
  }

  const emitir = async (dto: EmitirComprobanteDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>("/api/comprobantes", dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al emitir comprobante")
      return false
    }
  }

  const anular = async (id: number, revertirStock = true): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/comprobantes/${id}/anular`, { revertirStock })
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al anular comprobante")
      return false
    }
  }

  const asignarCae = async (
    id: number,
    cae: string,
    fechaVto: string,
    qrData?: string
  ): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/comprobantes/${id}/cae`, { cae, fechaVto, qrData })
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al asignar CAE")
      return false
    }
  }

  return {
    comprobantes,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    estado,
    setEstado,
    getById,
    emitir,
    anular,
    asignarCae,
    refetch: fetchComprobantes,
  }
}

export function useComprobantesConfig() {
  const [tipos, setTipos] = useState<TipoComprobante[]>([])
  const [estados, setEstados] = useState<{ valor: string; descripcion: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGet<TipoComprobante[]>("/api/comprobantes/tipos"),
      apiGet<{ valor: string; descripcion: string }[]>("/api/comprobantes/estados"),
    ])
      .then(([t, e]) => {
        setTipos(Array.isArray(t) ? t : [])
        setEstados(Array.isArray(e) ? e : [])
      })
      .catch((e) => console.error("Error cargando config comprobantes:", e))
      .finally(() => setLoading(false))
  }, [])

  return { tipos, estados, loading }
}

export function useComprobantesEstadisticas(sucursalId?: number, desde?: string, hasta?: string) {
  const [estadisticas, setEstadisticas] = useState<EstadisticasComprobantes | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!sucursalId || !desde || !hasta) return
    setLoading(true)
    try {
      const result = await apiGet<EstadisticasComprobantes>(
        `/api/comprobantes/estadisticas?sucursalId=${sucursalId}&desde=${desde}&hasta=${hasta}`
      )
      setEstadisticas(result)
    } catch (e) {
      console.error("Error cargando estadísticas:", e)
    } finally {
      setLoading(false)
    }
  }, [sucursalId, desde, hasta])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { estadisticas, loading, refetch: fetch }
}
