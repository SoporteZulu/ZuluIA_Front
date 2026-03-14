import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type {
  ThorProduct,
  AIRecommendation,
  Vendedor,
  VendedorMetrica,
  Cajero,
  CajeroMetrica,
  KPI,
  HistoricoVenta,
  Competidor,
  PrecioCompetidor,
  AnalisisCompetencia,
} from '@/lib/thor-types'

type PagedResult<T> = { items: T[]; total: number; page: number; size: number }

function toArray<T>(r: T[] | PagedResult<T>): T[] {
  return Array.isArray(r) ? r : r.items
}

// ─── Thor Productos ───────────────────────────────────────────────────────────

export function useThorProductos() {
  const [productos, setProductos] = useState<ThorProduct[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchProductos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<ThorProduct[] | PagedResult<ThorProduct>>('/api/thor/productos?size=500')
      setProductos(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando productos')
      setProductos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProductos() }, [fetchProductos])

  return { productos, loading, error, refetch: fetchProductos }
}

// ─── Thor KPIs ────────────────────────────────────────────────────────────────

export function useThorKpis() {
  const [kpis, setKpis]             = useState<KPI[]>([])
  const [historico, setHistorico]   = useState<HistoricoVenta[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const fetchKpis = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [kpisRes, historicoRes] = await Promise.all([
        apiGet<KPI[] | PagedResult<KPI>>('/api/thor/kpis'),
        apiGet<HistoricoVenta[] | PagedResult<HistoricoVenta>>('/api/thor/ventas/historico'),
      ])
      setKpis(toArray(kpisRes))
      setHistorico(toArray(historicoRes))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando KPIs')
      setKpis([])
      setHistorico([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKpis() }, [fetchKpis])

  return { kpis, historico, loading, error, refetch: fetchKpis }
}

// ─── Thor Vendedores ──────────────────────────────────────────────────────────

export function useThorVendedores() {
  const [vendedores, setVendedores]   = useState<Vendedor[]>([])
  const [metricas, setMetricas]       = useState<VendedorMetrica[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const fetchVendedores = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [vendRes, metRes] = await Promise.all([
        apiGet<Vendedor[] | PagedResult<Vendedor>>('/api/thor/vendedores?size=200'),
        apiGet<VendedorMetrica[] | PagedResult<VendedorMetrica>>('/api/thor/vendedores/metricas'),
      ])
      setVendedores(toArray(vendRes))
      setMetricas(toArray(metRes))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando vendedores')
      setVendedores([])
      setMetricas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchVendedores() }, [fetchVendedores])

  async function createVendedor(dto: Omit<Vendedor, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = await apiPost<Vendedor>('/api/thor/vendedores', dto)
    setVendedores(prev => [created, ...prev])
    return created
  }

  async function updateVendedor(id: string, dto: Partial<Vendedor>) {
    const updated = await apiPut<Vendedor>(`/api/thor/vendedores/${id}`, dto)
    setVendedores(prev => prev.map(v => v.id === id ? updated : v))
    return updated
  }

  async function deleteVendedor(id: string) {
    await apiDelete(`/api/thor/vendedores/${id}`)
    setVendedores(prev => prev.filter(v => v.id !== id))
  }

  return { vendedores, metricas, loading, error, createVendedor, updateVendedor, deleteVendedor, refetch: fetchVendedores }
}

// ─── Thor Cajeros ─────────────────────────────────────────────────────────────

export function useThorCajeros() {
  const [cajeros, setCajeros]   = useState<Cajero[]>([])
  const [metricas, setMetricas] = useState<CajeroMetrica[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetchCajeros = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [cajRes, metRes] = await Promise.all([
        apiGet<Cajero[] | PagedResult<Cajero>>('/api/thor/cajeros?size=200'),
        apiGet<CajeroMetrica[] | PagedResult<CajeroMetrica>>('/api/thor/cajeros/metricas'),
      ])
      setCajeros(toArray(cajRes))
      setMetricas(toArray(metRes))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando cajeros')
      setCajeros([])
      setMetricas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCajeros() }, [fetchCajeros])

  async function createCajero(dto: Omit<Cajero, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = await apiPost<Cajero>('/api/thor/cajeros', dto)
    setCajeros(prev => [created, ...prev])
    return created
  }

  async function updateCajero(id: string, dto: Partial<Cajero>) {
    const updated = await apiPut<Cajero>(`/api/thor/cajeros/${id}`, dto)
    setCajeros(prev => prev.map(c => c.id === id ? updated : c))
    return updated
  }

  async function deleteCajero(id: string) {
    await apiDelete(`/api/thor/cajeros/${id}`)
    setCajeros(prev => prev.filter(c => c.id !== id))
  }

  return { cajeros, metricas, loading, error, createCajero, updateCajero, deleteCajero, refetch: fetchCajeros }
}

// ─── Thor Margenes ────────────────────────────────────────────────────────────

export function useThorMargenes() {
  const [productos, setProductos] = useState<ThorProduct[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchMargenes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<ThorProduct[] | PagedResult<ThorProduct>>('/api/thor/margenes?size=500')
      setProductos(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando márgenes')
      setProductos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMargenes() }, [fetchMargenes])

  return { productos, loading, error, refetch: fetchMargenes }
}

// ─── Thor Sugerencias (IA) ────────────────────────────────────────────────────

export function useThorSugerencias() {
  const [sugerencias, setSugerencias] = useState<AIRecommendation[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const fetchSugerencias = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<AIRecommendation[] | PagedResult<AIRecommendation>>('/api/thor/sugerencias?size=200')
      setSugerencias(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando sugerencias IA')
      setSugerencias([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSugerencias() }, [fetchSugerencias])

  return { sugerencias, loading, error, refetch: fetchSugerencias }
}

// ─── Thor Competencia ─────────────────────────────────────────────────────────

export function useThorCompetencia() {
  const [analisis, setAnalisis]         = useState<AnalisisCompetencia[]>([])
  const [competidores, setCompetidores] = useState<Competidor[]>([])
  const [precios, setPrecios]           = useState<PrecioCompetidor[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const fetchCompetencia = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [analRes, compRes, precRes] = await Promise.all([
        apiGet<AnalisisCompetencia[] | PagedResult<AnalisisCompetencia>>('/api/thor/competencia?size=200'),
        apiGet<Competidor[] | PagedResult<Competidor>>('/api/thor/competidores?size=200'),
        apiGet<PrecioCompetidor[] | PagedResult<PrecioCompetidor>>('/api/thor/competencia/precios?size=500'),
      ])
      setAnalisis(toArray(analRes))
      setCompetidores(toArray(compRes))
      setPrecios(toArray(precRes))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando competencia')
      setAnalisis([])
      setCompetidores([])
      setPrecios([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCompetencia() }, [fetchCompetencia])

  return { analisis, competidores, precios, loading, error, refetch: fetchCompetencia }
}
