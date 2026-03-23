"use client"

import { useState, useCallback, useEffect } from "react"
import { apiGet } from "@/lib/api"
import type { Pais, Provincia, Localidad, Barrio } from "@/lib/types/geografia"

interface UseGeografiaOptions {
  autoFetchLocalidades?: boolean
  localidadId?: number | null
}

export function useGeografia(options: UseGeografiaOptions = {}) {
  const [paises, setPaises] = useState<Pais[]>([])
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [localidades, setLocalidades] = useState<Localidad[]>([])
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPaises = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<Pais[]>("/api/geografia/paises")
      setPaises(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar países")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProvincias = useCallback(async (paisId?: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = paisId ? `?paisId=${paisId}` : ""
      const result = await apiGet<Provincia[]>(`/api/geografia/provincias${params}`)
      setProvincias(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar provincias")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLocalidades = useCallback(async (provinciaId?: number, search?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (provinciaId) params.set("provinciaId", String(provinciaId))
      if (search) params.set("search", search)
      const result = await apiGet<Localidad[]>(`/api/geografia/localidades?${params.toString()}`)
      setLocalidades(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar localidades")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBarrios = useCallback(async (localidadId: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<Barrio[]>(`/api/geografia/barrios?localidadId=${localidadId}`)
      setBarrios(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar barrios")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!options.autoFetchLocalidades) return
    void fetchLocalidades()
  }, [fetchLocalidades, options.autoFetchLocalidades])

  useEffect(() => {
    if (!options.localidadId) {
      setBarrios([])
      return
    }

    void fetchBarrios(options.localidadId)
  }, [fetchBarrios, options.localidadId])

  return {
    paises,
    provincias,
    localidades,
    barrios,
    loading,
    error,
    fetchPaises,
    fetchProvincias,
    fetchLocalidades,
    fetchBarrios,
  }
}
