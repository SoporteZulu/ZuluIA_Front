'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type {
  Item,
  CreateItemDto,
  PagedResult,
  CategoriaItem,
  UnidadMedida,
  AlicuotaIva,
  Moneda,
} from '@/lib/types/items'

export function useItems() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<PagedResult<Item>>(
        `/api/items?soloActivos=true&page=${page}&pageSize=50&search=${encodeURIComponent(search)}`
      )
      const normalize = (p: Item): Item => ({
        ...p,
        precioCosto:  Number(p.precioCosto  ?? 0),
        precioVenta:  Number(p.precioVenta  ?? 0),
        stockMinimo:  Number(p.stockMinimo  ?? 0),
        stock:        p.stock !== undefined ? Number(p.stock) : undefined,
      })

      // Handle both paged response and plain array
      if (Array.isArray(result.items)) {
        setItems((result.items as Item[]).map(normalize))
        setTotalCount((result.items as Item[]).length)
        setTotalPages(1)
      } else {
        setItems((result.items as unknown as Item[]).map(normalize))
        setTotalCount(result.totalCount)
        setTotalPages(result.totalPages)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchItems() }, [fetchItems])

  const createItem = async (dto: CreateItemDto): Promise<boolean> => {
    try {
      await apiPost<Item>('/api/items', dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear producto')
      return false
    }
  }

  const updateItem = async (id: number, dto: Partial<CreateItemDto>): Promise<boolean> => {
    try {
      await apiPut<Item>(`/api/items/${id}`, dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar producto')
      return false
    }
  }

  const deleteItem = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`/api/items/${id}`)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al desactivar producto')
      return false
    }
  }

  return {
    items,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    createItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
  }
}

export function useItemsConfig() {
  const [categorias, setCategorias] = useState<CategoriaItem[]>([])
  const [unidades, setUnidades] = useState<UnidadMedida[]>([])
  const [alicuotas, setAlicuotas] = useState<AlicuotaIva[]>([])
  const [monedas, setMonedas] = useState<Moneda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGet<CategoriaItem[] | PagedResult<CategoriaItem>>('/api/categorias-items'),
      apiGet<UnidadMedida[] | PagedResult<UnidadMedida>>('/api/configuracion/unidades-medida'),
      apiGet<AlicuotaIva[] | PagedResult<AlicuotaIva>>('/api/configuracion/alicuotas-iva'),
      apiGet<Moneda[] | PagedResult<Moneda>>('/api/configuracion/monedas'),
    ])
      .then(([cats, units, alic, mons]) => {
        const toArray = <T>(r: T[] | PagedResult<T>): T[] =>
          Array.isArray(r) ? r : r.items

        setCategorias(toArray(cats))
        setUnidades(toArray(units))
        setAlicuotas(toArray(alic))
        setMonedas(toArray(mons))
      })
      .catch((e) => {
        console.error('Error cargando datos de configuración de items:', e)
      })
      .finally(() => setLoading(false))
  }, [])

  return { categorias, unidades, alicuotas, monedas, loading }
}
