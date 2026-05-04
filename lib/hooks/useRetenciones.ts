"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost } from "@/lib/api"
import type {
  RetencionesTipo,
  RetencionPorPersona,
  CreateRetencionPorPersonaDto,
} from "@/lib/types/retenciones"

export function useRetencionesTipos(soloActivos = true) {
  const [tipos, setTipos] = useState<RetencionesTipo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTipos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<RetencionesTipo[]>(
        `/api/retencionestipos?soloActivos=${soloActivos}`
      )
      setTipos(
        (Array.isArray(result) ? result : []).map((t) => ({
          ...t,
          porcentaje: Number(t.porcentaje ?? 0),
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar tipos de retención")
    } finally {
      setLoading(false)
    }
  }, [soloActivos])

  useEffect(() => {
    fetchTipos()
  }, [fetchTipos])

  return { tipos, loading, error, refetch: fetchTipos }
}

export function useRetencionesPorPersona(terceroId?: number) {
  const [retenciones, setRetenciones] = useState<RetencionPorPersona[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRetenciones = useCallback(async () => {
    if (!terceroId) {
      setRetenciones([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<RetencionPorPersona[]>(`/api/terceros/${terceroId}/retenciones`)
      setRetenciones(
        (Array.isArray(result) ? result : []).map((r) => ({
          ...r,
          porcentaje: Number(r.porcentaje ?? 0),
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar retenciones")
    } finally {
      setLoading(false)
    }
  }, [terceroId])

  useEffect(() => {
    fetchRetenciones()
  }, [fetchRetenciones])

  const agregar = async (dto: CreateRetencionPorPersonaDto): Promise<boolean> => {
    if (!terceroId) return false
    try {
      await apiPost<void>(`/api/terceros/${terceroId}/retenciones`, dto)
      await fetchRetenciones()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al agregar retención")
      return false
    }
  }

  return { retenciones, loading, error, agregar, refetch: fetchRetenciones }
}
