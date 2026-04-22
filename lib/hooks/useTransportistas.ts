"use client"

import { useState, useEffect, useCallback } from "react"
import { apiFetch, apiGet, apiPost, apiPut } from "@/lib/api"
import type {
  CreateTransportistaDto,
  Transportista,
  UpdateTransportistaDto,
} from "@/lib/types/transportistas"

export function useTransportistas(soloActivos = true) {
  const [transportistas, setTransportistas] = useState<Transportista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransportistas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<Transportista[]>(`/api/transportistas?soloActivos=${soloActivos}`)
      setTransportistas(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar transportistas")
    } finally {
      setLoading(false)
    }
  }, [soloActivos])

  useEffect(() => {
    fetchTransportistas()
  }, [fetchTransportistas])

  const getById = async (id: number): Promise<Transportista | null> => {
    try {
      return await apiGet<Transportista>(`/api/transportistas/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar transportista")
      return null
    }
  }

  const crear = async (dto: CreateTransportistaDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>("/api/transportistas", dto)
      await fetchTransportistas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear transportista")
      return false
    }
  }

  const actualizar = async (id: number, dto: UpdateTransportistaDto): Promise<boolean> => {
    try {
      await apiPut<void>(`/api/transportistas/${id}`, dto)
      await fetchTransportistas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar transportista")
      return false
    }
  }

  const cambiarEstado = async (id: number, activo: boolean): Promise<boolean> => {
    try {
      await apiFetch(`/api/transportistas/${id}/${activo ? "activar" : "desactivar"}`, {
        method: "PATCH",
      })
      await fetchTransportistas()
      return true
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : `Error al ${activo ? "activar" : "desactivar"} transportista`
      )
      return false
    }
  }

  return {
    transportistas,
    loading,
    error,
    getById,
    crear,
    actualizar,
    cambiarEstado,
    refetch: fetchTransportistas,
  }
}
