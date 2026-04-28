"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { apiGet, apiPost } from "@/lib/api"
import type { DesimputarImputacionDto, ImputacionDto } from "@/lib/types/imputaciones"

function normalizeImputacion(entry: ImputacionDto): ImputacionDto {
  return {
    ...entry,
    importe: Number(entry.importe ?? 0),
  }
}

export function useImputacionesHistorial(comprobanteIds: number[]) {
  const [imputaciones, setImputaciones] = useState<ImputacionDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const comprobanteIdsSignature = JSON.stringify(comprobanteIds)

  const stableIds = useMemo(
    () => [
      ...new Set(comprobanteIds.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)),
    ],
    [comprobanteIdsSignature]
  )

  const fetchHistorial = useCallback(async () => {
    if (stableIds.length === 0) {
      setImputaciones((prev) => (prev.length === 0 ? prev : []))
      return
    }

    setLoading(true)
    setError(null)
    try {
      const batches = await Promise.all(
        stableIds.map((id) => apiGet<ImputacionDto[]>(`/api/imputaciones/historial/${id}`))
      )

      const deduped = new Map<number, ImputacionDto>()
      batches.flat().forEach((entry) => {
        deduped.set(entry.id, normalizeImputacion(entry))
      })

      setImputaciones(
        [...deduped.values()].sort((left, right) =>
          String(right.createdAt ?? right.fecha).localeCompare(String(left.createdAt ?? left.fecha))
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar historial de imputaciones")
    } finally {
      setLoading(false)
    }
  }, [stableIds])

  useEffect(() => {
    void fetchHistorial()
  }, [fetchHistorial])

  const desimputar = useCallback(
    async (dto: DesimputarImputacionDto) => {
      try {
        await apiPost("/api/imputaciones/desimputar", {
          imputacionId: dto.imputacionId,
          fecha: dto.fecha,
          motivo: dto.motivo ?? null,
        })
        await fetchHistorial()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al desimputar")
        return false
      }
    },
    [fetchHistorial]
  )

  return {
    imputaciones,
    loading,
    error,
    desimputar,
    refetch: fetchHistorial,
  }
}
