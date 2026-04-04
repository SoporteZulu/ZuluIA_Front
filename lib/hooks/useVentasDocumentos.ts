"use client"

import { useCallback, useEffect, useState } from "react"
import { apiGet, apiPost } from "@/lib/api"
import type { CreateNotaDebitoVentaDto, MotivoDebitoVenta } from "@/lib/types/ventas"

export function useMotivosDebito(soloActivos = true) {
  const [motivos, setMotivos] = useState<MotivoDebitoVenta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMotivos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<MotivoDebitoVenta[]>(
        `/api/ventas/notas-debito/motivos?soloActivos=${soloActivos}`
      )
      setMotivos(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar motivos de débito")
      setMotivos([])
    } finally {
      setLoading(false)
    }
  }, [soloActivos])

  useEffect(() => {
    fetchMotivos()
  }, [fetchMotivos])

  return {
    motivos,
    loading,
    error,
    refetch: fetchMotivos,
  }
}

export function useVentasDocumentos() {
  const [error, setError] = useState<string | null>(null)

  const crearNotaDebito = useCallback(async (dto: CreateNotaDebitoVentaDto): Promise<boolean> => {
    try {
      setError(null)
      await apiPost<{ id: number }>("/api/ventas/notas-debito", dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear nota de débito")
      return false
    }
  }, [])

  return {
    error,
    crearNotaDebito,
  }
}
