"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut } from "@/lib/api"
import type { CentroCosto, CreateCentroCostoDto } from "@/lib/types/centros-costo"

export function useCentrosCosto(soloActivos = true) {
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCentrosCosto = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<CentroCosto[]>(`/api/centroscosto?soloActivos=${soloActivos}`)
      setCentrosCosto(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar centros de costo")
    } finally {
      setLoading(false)
    }
  }, [soloActivos])

  useEffect(() => {
    fetchCentrosCosto()
  }, [fetchCentrosCosto])

  const crear = async (dto: CreateCentroCostoDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>("/api/centroscosto", dto)
      await fetchCentrosCosto()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear centro de costo")
      return false
    }
  }

  const actualizar = async (id: number, dto: Partial<CreateCentroCostoDto>): Promise<boolean> => {
    try {
      await apiPut<void>(`/api/centroscosto/${id}`, dto)
      await fetchCentrosCosto()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar centro de costo")
      return false
    }
  }

  return { centrosCosto, loading, error, crear, actualizar, refetch: fetchCentrosCosto }
}
