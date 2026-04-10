"use client"

import { useCallback, useEffect, useState } from "react"

import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import type {
  ConteoCiclico,
  SeedConteosResponse,
  UpsertConteoCiclicoDto,
} from "@/lib/types/almacenes-maestros"

function normalizeConteo(row: ConteoCiclico): ConteoCiclico {
  return {
    ...row,
    proximoConteo: String(row.proximoConteo ?? "").slice(0, 10),
    divergenciaPct: Number(row.divergenciaPct ?? 0),
    responsable: row.responsable ?? "",
    observacion: row.observacion ?? "",
    nextStep: row.nextStep ?? "",
    executionNote: row.executionNote ?? "",
  }
}

export function useConteosStock() {
  const [conteos, setConteos] = useState<ConteoCiclico[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConteos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<ConteoCiclico[]>("/api/stock/conteos")
      setConteos((Array.isArray(result) ? result : []).map(normalizeConteo))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar conteos cíclicos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConteos()
  }, [fetchConteos])

  const crear = useCallback(
    async (dto: UpsertConteoCiclicoDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPost<{ id: number }>("/api/stock/conteos", dto)
        await fetchConteos()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear el conteo")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchConteos]
  )

  const actualizar = useCallback(
    async (id: number, dto: UpsertConteoCiclicoDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPut(`/api/stock/conteos/${id}`, dto)
        await fetchConteos()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar el conteo")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchConteos]
  )

  const eliminar = useCallback(
    async (id: number) => {
      setSaving(true)
      setError(null)
      try {
        await apiDelete(`/api/stock/conteos/${id}`)
        await fetchConteos()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al eliminar el conteo")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchConteos]
  )

  const seed = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await apiPost<SeedConteosResponse>("/api/stock/conteos/seed", {})
      await fetchConteos()
      return result
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al sembrar conteos base")
      return null
    } finally {
      setSaving(false)
    }
  }, [fetchConteos])

  return {
    conteos,
    loading,
    saving,
    error,
    crear,
    actualizar,
    eliminar,
    seed,
    refetch: fetchConteos,
  }
}
