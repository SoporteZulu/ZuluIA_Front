"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import type {
  Item,
  CreateItemDto,
  PagedResult,
  CategoriaItem,
  UnidadMedida,
  AlicuotaIva,
  Moneda,
} from "@/lib/types/items"

interface UseItemsOptions {
  enabled?: boolean
}

export function useItems(options: UseItemsOptions = {}) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(options.enabled ?? true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const fetchItems = useCallback(async () => {
    if (options.enabled === false) {
      setLoading(false)
      setItems([])
      setTotalCount(0)
      setTotalPages(1)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<PagedResult<Item>>(
        `/api/items?soloActivos=true&page=${page}&pageSize=50&search=${encodeURIComponent(search)}`
      )
      const normalize = (p: Item): Item => ({
        ...p,
        precioCosto: Number(p.precioCosto ?? 0),
        precioVenta: Number(p.precioVenta ?? 0),
        stockMinimo: Number(p.stockMinimo ?? 0),
        stock: p.stock !== undefined ? Number(p.stock) : undefined,
      })

      const itemsList = Array.isArray(result) ? result : (result.items ?? [])
      setItems(itemsList.map(normalize))
      setTotalCount(
        Array.isArray(result) ? itemsList.length : (result.totalCount ?? itemsList.length)
      )
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }, [options.enabled, page, search])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const createItem = async (dto: CreateItemDto): Promise<boolean> => {
    try {
      await apiPost<Item>("/api/items", dto)
      await fetchItems()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear producto")
      return false
    }
  }

  const updateItem = async (id: number, dto: Partial<CreateItemDto>): Promise<boolean> => {
    try {
      await apiPut<Item>(`/api/items/${id}`, dto)
      await fetchItems()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar producto")
      return false
    }
  }

  const deleteItem = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`/api/items/${id}`)
      await fetchItems()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al desactivar producto")
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
      apiGet<CategoriaItem[] | PagedResult<CategoriaItem>>("/api/categorias-items"),
      apiGet<UnidadMedida[] | PagedResult<UnidadMedida>>("/api/configuracion/unidades-medida"),
      apiGet<AlicuotaIva[] | PagedResult<AlicuotaIva>>("/api/configuracion/alicuotas-iva"),
      apiGet<Moneda[] | PagedResult<Moneda>>("/api/configuracion/monedas"),
    ])
      .then(([cats, units, alic, mons]) => {
        const toArray = <T>(r: T[] | PagedResult<T>): T[] => (Array.isArray(r) ? r : r.items)

        setCategorias(toArray(cats))
        setUnidades(toArray(units))
        setAlicuotas(toArray(alic))
        setMonedas(toArray(mons))
      })
      .catch((e) => {
        console.error("Error cargando datos de configuración de items:", e)
      })
      .finally(() => setLoading(false))
  }, [])

  return { categorias, unidades, alicuotas, monedas, loading }
}
