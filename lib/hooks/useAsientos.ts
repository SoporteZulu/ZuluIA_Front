"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost } from "@/lib/api"
import type {
  Asiento,
  AsientoDetalle,
  BalanceSumasYSaldos,
  CreateAsientoDto,
  MayorResult,
  PlanCuenta,
} from "@/lib/types/asientos"
import type { PagedResult } from "@/lib/types/items"

interface UseAsientosOptions {
  ejercicioId?: number
  sucursalId?: number
}

interface GetMayorOptions {
  cuentaId: number
  ejercicioId: number
  desde?: string
  hasta?: string
  page?: number
  pageSize?: number
}

function normalizeAsientoTotals<T extends Asiento>(asiento: T): T {
  return {
    ...asiento,
    totalDebe:
      typeof asiento.totalDebe === "number" && Number.isFinite(asiento.totalDebe)
        ? Number(asiento.totalDebe)
        : null,
    totalHaber:
      typeof asiento.totalHaber === "number" && Number.isFinite(asiento.totalHaber)
        ? Number(asiento.totalHaber)
        : null,
  }
}

export function useAsientos(options: UseAsientosOptions = {}) {
  const requiresResolvedEjercicio = Object.prototype.hasOwnProperty.call(options, "ejercicioId")
  const [asientos, setAsientos] = useState<Asiento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [estado, setEstado] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")

  const fetchAsientos = useCallback(async () => {
    if (requiresResolvedEjercicio && !options.ejercicioId) {
      setAsientos([])
      setTotalCount(0)
      setTotalPages(1)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
        ejercicioId: String(options.ejercicioId ?? 0),
      })
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (estado) params.set("estado", estado)
      if (desde) params.set("desde", desde)
      if (hasta) params.set("hasta", hasta)

      const result = await apiGet<PagedResult<Asiento>>(`/api/asientos?${params.toString()}`)
      const items = (Array.isArray(result) ? result : (result.items ?? [])).map(
        normalizeAsientoTotals
      )
      setAsientos(items)
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar asientos")
    } finally {
      setLoading(false)
    }
  }, [
    page,
    estado,
    desde,
    hasta,
    requiresResolvedEjercicio,
    options.ejercicioId,
    options.sucursalId,
  ])

  useEffect(() => {
    fetchAsientos()
  }, [fetchAsientos])

  const getById = useCallback(async (id: number): Promise<AsientoDetalle | null> => {
    try {
      const result = await apiGet<AsientoDetalle>(`/api/asientos/${id}`)
      return normalizeAsientoTotals(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar asiento")
      return null
    }
  }, [])

  const crear = useCallback(async (dto: CreateAsientoDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>("/api/asientos", dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear asiento")
      return false
    }
  }, [])

  const getLibroDiario = useCallback(
    async (
      ejercicioId: number,
      sucursalId: number,
      desde: string,
      hasta: string
    ): Promise<unknown | null> => {
      setError(null)
      try {
        const params = new URLSearchParams({
          ejercicioId: String(ejercicioId),
          sucursalId: String(sucursalId),
          desde,
          hasta,
        })
        const result = await apiGet<unknown>(`/api/asientos/libro-diario?${params.toString()}`)
        setError(null)
        return result
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar libro diario")
        return null
      }
    },
    []
  )

  const getBalance = useCallback(
    async (
      ejercicioId: number,
      desde: string,
      hasta: string,
      sucursalId?: number
    ): Promise<BalanceSumasYSaldos | null> => {
      setError(null)
      try {
        const params = new URLSearchParams({
          ejercicioId: String(ejercicioId),
          desde,
          hasta,
        })

        if (sucursalId) params.set("sucursalId", String(sucursalId))

        const result = await apiGet<BalanceSumasYSaldos>(
          `/api/asientos/balance?${params.toString()}`
        )
        setError(null)
        return result
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar balance de sumas y saldos")
        return null
      }
    },
    []
  )

  const getMayor = useCallback(
    async ({
      cuentaId,
      ejercicioId,
      desde,
      hasta,
      page = 1,
      pageSize = 50,
    }: GetMayorOptions): Promise<MayorResult | null> => {
      setError(null)
      try {
        const params = new URLSearchParams({
          cuentaId: String(cuentaId),
          ejercicioId: String(ejercicioId),
          page: String(page),
          pageSize: String(pageSize),
        })

        if (desde) params.set("desde", desde)
        if (hasta) params.set("hasta", hasta)

        const result = await apiGet<MayorResult>(`/api/contabilidad/mayor?${params.toString()}`)
        setError(null)
        return result
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar libro mayor")
        return null
      }
    },
    []
  )

  const getByOrigen = useCallback(async (origenTabla: string, origenId: number) => {
    try {
      const params = new URLSearchParams({
        origenTabla,
        origenId: String(origenId),
      })
      const result = await apiGet<Asiento[]>(`/api/asientos/por-origen?${params.toString()}`)
      return Array.isArray(result) ? result.map(normalizeAsientoTotals) : []
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar asientos por origen")
      return null
    }
  }, [])

  return {
    asientos,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    estado,
    setEstado,
    desde,
    setDesde,
    hasta,
    setHasta,
    getById,
    crear,
    getLibroDiario,
    getBalance,
    getMayor,
    getByOrigen,
    refetch: fetchAsientos,
  }
}

export function usePlanCuentas(ejercicioId?: number) {
  const [cuentas, setCuentas] = useState<PlanCuenta[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCuentas = useCallback(async () => {
    if (!ejercicioId) return
    setLoading(true)
    try {
      const result = await apiGet<PlanCuenta[]>(
        `/api/plancuentas/plano?ejercicioId=${ejercicioId}&soloImputables=true`
      )
      setCuentas(Array.isArray(result) ? result : [])
    } catch (e) {
      console.error("Error cargando plan de cuentas:", e)
    } finally {
      setLoading(false)
    }
  }, [ejercicioId])

  useEffect(() => {
    fetchCuentas()
  }, [fetchCuentas])

  const buscar = async (termino: string): Promise<PlanCuenta[]> => {
    if (!ejercicioId || termino.length < 2) return []
    try {
      return await apiGet<PlanCuenta[]>(
        `/api/plancuentas/buscar?ejercicioId=${ejercicioId}&termino=${encodeURIComponent(termino)}`
      )
    } catch {
      return []
    }
  }

  return { cuentas, loading, buscar, refetch: fetchCuentas }
}

export function usePlanCuentasAll(ejercicioId?: number) {
  const [cuentas, setCuentas] = useState<PlanCuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCuentas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = ejercicioId
        ? `/api/plancuentas/plano?ejercicioId=${ejercicioId}`
        : "/api/plancuentas/plano"
      const result = await apiGet<PlanCuenta[] | PagedResult<PlanCuenta>>(url)
      const items = Array.isArray(result)
        ? result
        : ((result as PagedResult<PlanCuenta>).items ?? [])
      setCuentas(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar plan de cuentas")
    } finally {
      setLoading(false)
    }
  }, [ejercicioId])

  useEffect(() => {
    fetchCuentas()
  }, [fetchCuentas])

  return { cuentas, loading, error, refetch: fetchCuentas }
}
