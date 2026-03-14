'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type {
  MovimientoStock,
  StockResumenItem,
  StockResumenSucursal,
  StockBajoMinimo,
  AjusteStockDto,
  TransferenciaStockDto,
} from '@/lib/types/stock'
import type { PagedResult } from '@/lib/types/items'

export function useStockMovimientos(itemId?: number, depositoId?: number) {
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const fetchMovimientos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' })
      if (itemId) params.set('itemId', String(itemId))
      if (depositoId) params.set('depositoId', String(depositoId))
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)

      const normMovimiento = (m: MovimientoStock): MovimientoStock => ({
        ...m,
        cantidad:        Number(m.cantidad        ?? 0),
        saldoResultante: Number(m.saldoResultante ?? 0),
      })

      const result = await apiGet<PagedResult<MovimientoStock>>(
        `/api/stock/movimientos?${params.toString()}`
      )
      const items = (Array.isArray(result) ? result : result.items ?? []).map(normMovimiento)
      setMovimientos(items)
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar movimientos de stock')
    } finally {
      setLoading(false)
    }
  }, [page, desde, hasta, itemId, depositoId])

  useEffect(() => { fetchMovimientos() }, [fetchMovimientos])

  return {
    movimientos,
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
    refetch: fetchMovimientos,
  }
}

export function useStockItem(itemId?: number) {
  const [stock, setStock] = useState<StockResumenItem | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!itemId) return
    setLoading(true)
    apiGet<StockResumenItem>(`/api/stock/item/${itemId}`)
      .then(setStock)
      .catch((e) => console.error('Error cargando stock del ítem:', e))
      .finally(() => setLoading(false))
  }, [itemId])

  return { stock, loading }
}

export function useStockResumen(sucursalId?: number) {
  const [resumen, setResumen] = useState<StockResumenSucursal | null>(null)
  const [bajoMinimo, setBajoMinimo] = useState<StockBajoMinimo[]>([])
  const [loading, setLoading] = useState(false)

  const fetchResumen = useCallback(async () => {
    if (!sucursalId) return
    setLoading(true)
    try {
      const normBajoMinimo = (b: StockBajoMinimo): StockBajoMinimo => ({
        ...b,
        stockActual: Number(b.stockActual ?? 0),
        stockMinimo: Number(b.stockMinimo ?? 0),
      })

      const [res, bajo] = await Promise.all([
        apiGet<StockResumenSucursal>(`/api/stock/resumen?sucursalId=${sucursalId}`),
        apiGet<StockBajoMinimo[]>(`/api/stock/bajo-minimo?sucursalId=${sucursalId}`),
      ])
      setResumen(res)
      setBajoMinimo((Array.isArray(bajo) ? bajo : []).map(normBajoMinimo))
    } catch (e) {
      console.error('Error cargando resumen de stock:', e)
    } finally {
      setLoading(false)
    }
  }, [sucursalId])

  useEffect(() => { fetchResumen() }, [fetchResumen])

  return { resumen, bajoMinimo, loading, refetch: fetchResumen }
}

export function useStockActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ajustar = async (dto: AjusteStockDto): Promise<boolean> => {
    setLoading(true)
    try {
      await apiPost<{ movimientoId: number; mensaje: string }>('/api/stock/ajuste', dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al ajustar stock')
      return false
    } finally {
      setLoading(false)
    }
  }

  const transferir = async (dto: TransferenciaStockDto): Promise<boolean> => {
    setLoading(true)
    try {
      await apiPost<void>('/api/stock/transferencia', dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al transferir stock')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { ajustar, transferir, loading, error }
}
