"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import type { PagedResult } from "@/lib/types/items"
import type {
  ListaPrecios,
  ListaPreciosDetalle,
  CreateListaPreciosDto,
  UpsertItemEnListaDto,
} from "@/lib/types/listas-precios"

const listasPreciosApiPath = "/api/ListasPrecios"

export function useListasPrecios(fecha?: string) {
  const [listas, setListas] = useState<ListaPrecios[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchListas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = fecha ? `${listasPreciosApiPath}?fecha=${fecha}` : listasPreciosApiPath
      const result = await apiGet<ListaPrecios[] | PagedResult<ListaPrecios>>(url)
      setListas(Array.isArray(result) ? result : (result.items ?? []))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar listas de precios")
    } finally {
      setLoading(false)
    }
  }, [fecha])

  useEffect(() => {
    fetchListas()
  }, [fetchListas])

  const getById = async (id: number): Promise<ListaPreciosDetalle | null> => {
    try {
      const r = await apiGet<ListaPreciosDetalle>(`${listasPreciosApiPath}/${id}`)
      if (!r) return null
      return {
        ...r,
        items: (r.items ?? []).map((i) => ({
          ...i,
          precio: Number(i.precio ?? 0),
          descuentoPct: Number(i.descuentoPct ?? 0),
        })),
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar lista de precios")
      return null
    }
  }

  const crear = async (dto: CreateListaPreciosDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>(listasPreciosApiPath, dto)
      await fetchListas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear lista de precios")
      return false
    }
  }

  const actualizar = async (id: number, dto: Partial<CreateListaPreciosDto>): Promise<boolean> => {
    try {
      await apiPut<void>(`${listasPreciosApiPath}/${id}`, { ...dto, id })
      await fetchListas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar lista de precios")
      return false
    }
  }

  const eliminar = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`${listasPreciosApiPath}/${id}`)
      await fetchListas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar lista de precios")
      return false
    }
  }

  const upsertItem = async (listaId: number, dto: UpsertItemEnListaDto): Promise<boolean> => {
    try {
      await apiPost<void>(`${listasPreciosApiPath}/${listaId}/items`, dto)
      await fetchListas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar ítem en lista")
      return false
    }
  }

  const removeItem = async (listaId: number, itemId: number): Promise<boolean> => {
    try {
      await apiDelete(`${listasPreciosApiPath}/${listaId}/items/${itemId}`)
      await fetchListas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar ítem de lista")
      return false
    }
  }

  return {
    listas,
    loading,
    error,
    getById,
    crear,
    actualizar,
    eliminar,
    upsertItem,
    removeItem,
    refetch: fetchListas,
  }
}
