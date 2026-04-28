"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut } from "@/lib/api"
import type { Caja, TipoCaja, CreateCajaDto } from "@/lib/types/cajas"

type CajaApi = Partial<Caja> & {
  id: number
  sucursalId: number
  descripcion?: string | null
  activa?: boolean | null
}

function normalizeCaja(caja: CajaApi): Caja {
  const nombre = caja.nombre?.trim() || caja.descripcion?.trim() || `Caja ${caja.id}`

  return {
    id: caja.id,
    sucursalId: caja.sucursalId,
    tipoCajaId: caja.tipoCajaId ?? 0,
    tipoCajaDescripcion: caja.tipoCajaDescripcion,
    nombre,
    descripcion: caja.descripcion?.trim() || nombre,
    monedaId: caja.monedaId,
    activa: caja.activa ?? true,
    saldoActual: Number(caja.saldoActual ?? 0),
    fechaApertura: caja.fechaApertura,
    saldoInicial: Number(caja.saldoInicial ?? 0),
  }
}

export function useCajas(sucursalId?: number) {
  const [cajas, setCajas] = useState<Caja[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCajas = useCallback(async () => {
    if (!sucursalId) {
      setCajas([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<CajaApi[]>(`/api/cajas?sucursalId=${sucursalId}`)
      setCajas((Array.isArray(result) ? result : []).map(normalizeCaja))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cajas")
    } finally {
      setLoading(false)
    }
  }, [sucursalId])

  useEffect(() => {
    fetchCajas()
  }, [fetchCajas])

  const getTipos = async (): Promise<TipoCaja[]> => {
    try {
      const result = await apiGet<TipoCaja[]>("/api/cajas/tipos")
      return Array.isArray(result) ? result : []
    } catch {
      return []
    }
  }

  const crear = async (dto: CreateCajaDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>("/api/cajas", dto)
      await fetchCajas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear caja")
      return false
    }
  }

  const actualizar = async (id: number, dto: Partial<CreateCajaDto>): Promise<boolean> => {
    try {
      await apiPut<void>(`/api/cajas/${id}`, dto)
      await fetchCajas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar caja")
      return false
    }
  }

  return { cajas, loading, error, getTipos, crear, actualizar, refetch: fetchCajas }
}
