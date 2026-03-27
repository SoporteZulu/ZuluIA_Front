"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut } from "@/lib/api"
import type { Empleado, EmpleadosPagedResult, CreateEmpleadoDto } from "@/lib/types/empleados"

interface UseEmpleadosOptions {
  sucursalId?: number
  estado?: string
  search?: string
}

export function useEmpleados(options: UseEmpleadosOptions = {}) {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState(options.search ?? "")

  const fetchEmpleados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" })
      if (options.sucursalId) params.set("sucursalId", String(options.sucursalId))
      if (options.estado) params.set("estado", options.estado)
      if (search) params.set("search", search)

      const result = await apiGet<EmpleadosPagedResult>(`/api/empleados?${params.toString()}`)
      const items = Array.isArray(result) ? result : (result.items ?? [])
      setEmpleados(
        items.map((e) => ({
          ...e,
          sueldoBasico: Number(e.sueldoBasico ?? 0),
        }))
      )
      setTotalCount(Array.isArray(result) ? items.length : (result.totalCount ?? items.length))
      setTotalPages(Array.isArray(result) ? 1 : (result.totalPages ?? 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar empleados")
    } finally {
      setLoading(false)
    }
  }, [page, options.sucursalId, options.estado, search])

  useEffect(() => {
    fetchEmpleados()
  }, [fetchEmpleados])

  const getById = async (id: number): Promise<Empleado | null> => {
    try {
      return await apiGet<Empleado>(`/api/empleados/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar empleado")
      return null
    }
  }

  const crear = async (dto: CreateEmpleadoDto): Promise<number | null> => {
    try {
      const result = await apiPost<{ id: number }>("/api/empleados", dto)
      await fetchEmpleados()
      return result.id
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear empleado")
      return null
    }
  }

  const actualizar = async (id: number, dto: Partial<CreateEmpleadoDto>): Promise<boolean> => {
    try {
      await apiPut<void>(`/api/empleados/${id}`, dto)
      await fetchEmpleados()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar empleado")
      return false
    }
  }

  return {
    empleados,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    search,
    setSearch,
    getById,
    crear,
    actualizar,
    refetch: fetchEmpleados,
  }
}
