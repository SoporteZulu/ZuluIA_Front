"use client"

import { useCallback, useEffect, useState } from "react"

import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import type {
  CreateRegionDto,
  RegionMaestro,
  UpdateRegionDto,
} from "@/lib/types/almacenes-maestros"

function normalizeRegion(row: RegionMaestro): RegionMaestro {
  return {
    ...row,
    regionIntegradoraId: row.regionIntegradoraId ?? null,
    codigoEstructura: row.codigoEstructura ?? null,
    observacion: row.observacion ?? null,
  }
}

export function useRegiones(soloIntegradoras = false) {
  const [regiones, setRegiones] = useState<RegionMaestro[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRegiones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<RegionMaestro[]>(
        `/api/regiones?soloIntegradoras=${soloIntegradoras}`
      )
      setRegiones((Array.isArray(result) ? result : []).map(normalizeRegion))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar regiones")
    } finally {
      setLoading(false)
    }
  }, [soloIntegradoras])

  useEffect(() => {
    void fetchRegiones()
  }, [fetchRegiones])

  const crear = useCallback(
    async (dto: CreateRegionDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPost("/api/regiones", dto)
        await fetchRegiones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear la región")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchRegiones]
  )

  const actualizar = useCallback(
    async (id: number, dto: UpdateRegionDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPut(`/api/regiones/${id}`, dto)
        await fetchRegiones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar la región")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchRegiones]
  )

  const eliminar = useCallback(
    async (id: number) => {
      setSaving(true)
      setError(null)
      try {
        await apiDelete(`/api/regiones/${id}`)
        await fetchRegiones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al eliminar la región")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchRegiones]
  )

  return {
    regiones,
    loading,
    saving,
    error,
    crear,
    actualizar,
    eliminar,
    refetch: fetchRegiones,
  }
}
