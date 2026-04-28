"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet } from "@/lib/api"
import type {
  SaldoCuentaCorriente,
  MovimientoCuentaCorriente,
  Deudor,
} from "@/lib/types/cuenta-corriente"
import type { PagedResult } from "@/lib/types/items"

const cuentaCorrienteApiPath = "/api/CuentaCorriente"

export function useCuentaCorriente(terceroId?: number, sucursalId?: number) {
  const [saldos, setSaldos] = useState<SaldoCuentaCorriente[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSaldos = useCallback(async () => {
    if (!terceroId) return
    setLoading(true)
    setError(null)
    try {
      const url = sucursalId
        ? `${cuentaCorrienteApiPath}/${terceroId}?sucursalId=${sucursalId}`
        : `${cuentaCorrienteApiPath}/${terceroId}`
      const result = await apiGet<SaldoCuentaCorriente[]>(url)
      setSaldos(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cuenta corriente")
    } finally {
      setLoading(false)
    }
  }, [terceroId, sucursalId])

  useEffect(() => {
    fetchSaldos()
  }, [fetchSaldos])

  return { saldos, loading, error, refetch: fetchSaldos }
}

export function useMovimientosCuentaCorriente(terceroId?: number) {
  const [movimientos, setMovimientos] = useState<MovimientoCuentaCorriente[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [sucursalId, setSucursalId] = useState<number | undefined>()
  const [monedaId, setMonedaId] = useState<number | undefined>()
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")

  const fetchMovimientos = useCallback(async () => {
    if (!terceroId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" })
      if (sucursalId) params.set("sucursalId", String(sucursalId))
      if (monedaId) params.set("monedaId", String(monedaId))
      if (desde) params.set("desde", desde)
      if (hasta) params.set("hasta", hasta)

      const result = await apiGet<PagedResult<MovimientoCuentaCorriente>>(
        `${cuentaCorrienteApiPath}/${terceroId}/movimientos?${params.toString()}`
      )
      const items = (Array.isArray(result) ? result : (result.items ?? [])).map(
        (m: MovimientoCuentaCorriente) => ({
          ...m,
          debe: Number(m.debe ?? 0),
          haber: Number(m.haber ?? 0),
          saldo: Number(m.saldo ?? 0),
        })
      )
      setMovimientos(items)
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar movimientos")
    } finally {
      setLoading(false)
    }
  }, [terceroId, page, sucursalId, monedaId, desde, hasta])

  useEffect(() => {
    fetchMovimientos()
  }, [fetchMovimientos])

  return {
    movimientos,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    sucursalId,
    setSucursalId,
    monedaId,
    setMonedaId,
    desde,
    setDesde,
    hasta,
    setHasta,
    refetch: fetchMovimientos,
  }
}

export function useDeudores(sucursalId?: number, monedaId?: number, soloDeudores = true) {
  const [deudores, setDeudores] = useState<Deudor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDeudores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ soloDeudores: String(soloDeudores) })
      if (sucursalId) params.set("sucursalId", String(sucursalId))
      if (monedaId) params.set("monedaId", String(monedaId))

      const result = await apiGet<Deudor[]>(
        `${cuentaCorrienteApiPath}/deudores?${params.toString()}`
      )
      const arr = Array.isArray(result) ? result : []
      setDeudores(arr.map((d: Deudor) => ({ ...d, saldo: Number(d.saldo ?? 0) })))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar deudores")
    } finally {
      setLoading(false)
    }
  }, [sucursalId, monedaId, soloDeudores])

  useEffect(() => {
    fetchDeudores()
  }, [fetchDeudores])

  return { deudores, loading, error, refetch: fetchDeudores }
}
