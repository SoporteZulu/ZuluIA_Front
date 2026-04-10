"use client"

import { useCallback, useEffect, useState } from "react"

import { apiFetch, apiGet, apiPost, apiPut } from "@/lib/api"
import type { ZonaMaestro, ZonaRequest } from "@/lib/types/almacenes-maestros"

type ZoneScope = "all" | "active" | "inactive"

async function fetchZoneSet(scope: Exclude<ZoneScope, "all">) {
  return apiGet<ZonaMaestro[]>(`/api/zonas?soloActivas=${scope === "active"}`)
}

export function useZonas(scope: ZoneScope = "all") {
  const [zonas, setZonas] = useState<ZonaMaestro[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchZonas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (scope === "all") {
        const [activas, inactivas] = await Promise.all([
          fetchZoneSet("active"),
          fetchZoneSet("inactive"),
        ])
        const merged = [...activas, ...inactivas].sort((left, right) =>
          left.descripcion.localeCompare(right.descripcion)
        )
        const unique = merged.filter(
          (row, index, all) => all.findIndex((candidate) => candidate.id === row.id) === index
        )
        setZonas(unique)
      } else {
        const result = await fetchZoneSet(scope)
        setZonas(Array.isArray(result) ? result : [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar zonas")
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    void fetchZonas()
  }, [fetchZonas])

  const crear = useCallback(
    async (dto: ZonaRequest) => {
      setSaving(true)
      setError(null)
      try {
        await apiPost("/api/zonas", dto)
        await fetchZonas()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear la zona")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchZonas]
  )

  const actualizar = useCallback(
    async (id: number, dto: ZonaRequest) => {
      setSaving(true)
      setError(null)
      try {
        await apiPut(`/api/zonas/${id}`, dto)
        await fetchZonas()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar la zona")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchZonas]
  )

  const cambiarEstado = useCallback(
    async (id: number, activo: boolean) => {
      setSaving(true)
      setError(null)
      try {
        await apiFetch(`/api/zonas/${id}/${activo ? "activar" : "desactivar"}`, { method: "PATCH" })
        await fetchZonas()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cambiar el estado de la zona")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchZonas]
  )

  return {
    zonas,
    loading,
    saving,
    error,
    crear,
    actualizar,
    cambiarEstado,
    refetch: fetchZonas,
  }
}
