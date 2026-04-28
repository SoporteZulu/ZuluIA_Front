"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import type { Sucursal, CreateSucursalDto } from "@/lib/types/sucursales"

type SucursalApi = Partial<Sucursal> & {
  id: number
  nombreFantasia?: string | null
  activa?: boolean | null
}

function normalizeSucursal(sucursal: SucursalApi): Sucursal {
  const descripcion =
    sucursal.descripcion?.trim() ||
    sucursal.nombreFantasia?.trim() ||
    sucursal.razonSocial?.trim() ||
    `Sucursal ${sucursal.id}`

  return {
    id: sucursal.id,
    descripcion,
    activo: sucursal.activo ?? sucursal.activa ?? true,
    direccion: sucursal.direccion ?? null,
    cuit: sucursal.cuit ?? null,
    codigoPostal: sucursal.codigoPostal ?? null,
    telefono: sucursal.telefono ?? null,
    email: sucursal.email ?? null,
    razonSocial: sucursal.razonSocial?.trim() || descripcion,
  }
}

export function useSucursales(soloActivas = true) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSucursales = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<SucursalApi[]>(`/api/sucursales?soloActivas=${soloActivas}`)
      setSucursales((Array.isArray(result) ? result : []).map(normalizeSucursal))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar sucursales")
    } finally {
      setLoading(false)
    }
  }, [soloActivas])

  useEffect(() => {
    fetchSucursales()
  }, [fetchSucursales])

  const crear = async (dto: CreateSucursalDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>("/api/sucursales", dto)
      await fetchSucursales()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear sucursal")
      return false
    }
  }

  const actualizar = async (id: number, dto: Partial<CreateSucursalDto>): Promise<boolean> => {
    try {
      await apiPut<void>(`/api/sucursales/${id}`, dto)
      await fetchSucursales()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar sucursal")
      return false
    }
  }

  const eliminar = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`/api/sucursales/${id}`)
      await fetchSucursales()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al desactivar sucursal")
      return false
    }
  }

  return {
    sucursales,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    refetch: fetchSucursales,
  }
}

/** Retorna el ID de la primera sucursal activa disponible, o undefined mientras carga. */
export function useDefaultSucursalId(): number | undefined {
  const { sucursales, loading } = useSucursales()
  if (loading || sucursales.length === 0) return undefined
  return sucursales[0].id
}
