"use client"

import { useState, useEffect, useCallback } from "react"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import type {
  DescuentoComercial,
  CreateDescuentoComercialDto,
} from "@/lib/types/descuentos-comerciales"

interface UseDescuentosComercialesOptions {
  terceroId?: number
  itemId?: number
  vigenteEn?: string
}

type DescuentoComercialApiItem = {
  id: number
  terceroId?: number
  itemId?: number
  porcentaje?: number
  fechaDesde?: string
  fechaHasta?: string | null
}

const descuentosComercialesApiPath = "/api/DescuentosComerciales"

function normalizeDescuento(item: DescuentoComercialApiItem): DescuentoComercial {
  return {
    id: item.id,
    terceroId: item.terceroId,
    itemId: item.itemId,
    porcentaje: Number(item.porcentaje ?? 0),
    desde: item.fechaDesde,
    hasta: item.fechaHasta ?? undefined,
    activo: true,
  }
}

export function useDescuentosComerciales(options: UseDescuentosComercialesOptions = {}) {
  const [descuentos, setDescuentos] = useState<DescuentoComercial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDescuentos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.terceroId) params.set("terceroId", String(options.terceroId))
      if (options.itemId) params.set("itemId", String(options.itemId))
      if (options.vigenteEn) params.set("vigenteEn", options.vigenteEn)

      const result = await apiGet<DescuentoComercialApiItem[]>(
        `${descuentosComercialesApiPath}?${params.toString()}`
      )
      setDescuentos((Array.isArray(result) ? result : []).map(normalizeDescuento))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar descuentos comerciales")
    } finally {
      setLoading(false)
    }
  }, [options.terceroId, options.itemId, options.vigenteEn])

  useEffect(() => {
    fetchDescuentos()
  }, [fetchDescuentos])

  const crear = async (dto: CreateDescuentoComercialDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>(descuentosComercialesApiPath, {
        terceroId: dto.terceroId ?? 0,
        itemId: dto.itemId ?? 0,
        fechaDesde: dto.desde,
        fechaHasta: dto.hasta ?? null,
        porcentaje: dto.porcentaje,
      })
      await fetchDescuentos()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear descuento comercial")
      return false
    }
  }

  const actualizar = async (
    id: number,
    dto: Partial<CreateDescuentoComercialDto> & { activo?: boolean }
  ): Promise<boolean> => {
    try {
      await apiPut<void>(`${descuentosComercialesApiPath}/${id}`, {
        id,
        fechaDesde: dto.desde,
        fechaHasta: dto.hasta ?? null,
        porcentaje: dto.porcentaje,
      })
      await fetchDescuentos()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar descuento comercial")
      return false
    }
  }

  const eliminar = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`${descuentosComercialesApiPath}/${id}`)
      await fetchDescuentos()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar descuento comercial")
      return false
    }
  }

  return { descuentos, loading, error, crear, actualizar, eliminar, refetch: fetchDescuentos }
}
