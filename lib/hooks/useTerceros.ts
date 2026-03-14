'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type {
  Tercero,
  CreateTerceroDto,
  CondicionIva,
} from '@/lib/types/terceros'
import type { PagedResult } from '@/lib/types/items'
import type { Moneda } from '@/lib/types/items'

export function useTerceros() {
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const fetchTerceros = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<PagedResult<Tercero>>(
        `/api/terceros?soloClientes=true&soloActivos=true&page=${page}&pageSize=50&search=${encodeURIComponent(search)}`
      )
      setTerceros(result.items)
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchTerceros() }, [fetchTerceros])

  const createTercero = async (dto: CreateTerceroDto): Promise<boolean> => {
    try {
      await apiPost<Tercero>('/api/terceros', dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear cliente')
      return false
    }
  }

  const updateTercero = async (id: number, dto: Partial<CreateTerceroDto>): Promise<boolean> => {
    try {
      await apiPut<Tercero>(`/api/terceros/${id}`, dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar cliente')
      return false
    }
  }

  const deleteTercero = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`/api/terceros/${id}`)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al desactivar cliente')
      return false
    }
  }

  return {
    terceros,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    createTercero,
    updateTercero,
    deleteTercero,
    refetch: fetchTerceros,
  }
}

export function useTercerosConfig() {
  const [condicionesIva, setCondicionesIva] = useState<CondicionIva[]>([])
  const [monedas, setMonedas] = useState<Moneda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGet<CondicionIva[] | PagedResult<CondicionIva>>('/api/configuracion/condiciones-iva'),
      apiGet<Moneda[] | PagedResult<Moneda>>('/api/configuracion/monedas'),
    ])
      .then(([conds, mons]) => {
        const toArray = <T>(r: T[] | PagedResult<T>): T[] =>
          Array.isArray(r) ? r : r.items

        setCondicionesIva(toArray(conds))
        setMonedas(toArray(mons))
      })
      .catch((e) => {
        console.error('Error cargando datos de configuración de terceros:', e)
      })
      .finally(() => setLoading(false))
  }, [])

  return { condicionesIva, monedas, loading }
}

export function useProveedores() {
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const fetchProveedores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<PagedResult<Tercero>>(
        `/api/terceros?soloProveedores=true&soloActivos=true&page=${page}&pageSize=50&search=${encodeURIComponent(search)}`
      )
      setTerceros(result.items)
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar proveedores')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchProveedores() }, [fetchProveedores])

  const createProveedor = async (dto: CreateTerceroDto): Promise<boolean> => {
    try {
      await apiPost<Tercero>('/api/terceros', dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear proveedor')
      return false
    }
  }

  const updateProveedor = async (id: number, dto: Partial<CreateTerceroDto>): Promise<boolean> => {
    try {
      await apiPut<Tercero>(`/api/terceros/${id}`, dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar proveedor')
      return false
    }
  }

  const deleteProveedor = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`/api/terceros/${id}`)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al desactivar proveedor')
      return false
    }
  }

  return {
    terceros,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    createProveedor,
    updateProveedor,
    deleteProveedor,
    refetch: fetchProveedores,
  }
}
