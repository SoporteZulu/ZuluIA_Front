"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost } from "@/lib/api"
import type { CreateOrdenCompraDto, OrdenCompra } from "@/lib/types/configuracion"

interface UseOrdenesCompraOptions {
  proveedorId?: number
  habilitada?: boolean
}

export function useOrdenesCompra(options: UseOrdenesCompraOptions = {}) {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estado, setEstado] = useState("")

  const fetchOrdenes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.proveedorId) params.set("proveedorId", String(options.proveedorId))
      if (options.habilitada !== undefined) params.set("habilitada", String(options.habilitada))
      if (estado) params.set("estado", estado)

      const qs = params.toString()
      const result = await apiGet<OrdenCompra[]>(`/api/ordenes-compra${qs ? `?${qs}` : ""}`)
      setOrdenes(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar órdenes de compra")
    } finally {
      setLoading(false)
    }
  }, [estado, options.proveedorId, options.habilitada])

  useEffect(() => {
    fetchOrdenes()
  }, [fetchOrdenes])

  const getById = async (id: number): Promise<OrdenCompra | null> => {
    try {
      return await apiGet<OrdenCompra>(`/api/ordenes-compra/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar orden de compra")
      return null
    }
  }

  const recibir = async (id: number): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/ordenes-compra/${id}/recibir`, {})
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al recibir orden de compra")
      return false
    }
  }

  const cancelar = async (id: number): Promise<boolean> => {
    try {
      await apiPost<void>(`/api/ordenes-compra/${id}/cancelar`, {})
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cancelar orden de compra")
      return false
    }
  }

  const crear = async (dto: CreateOrdenCompraDto): Promise<boolean> => {
    try {
      await apiPost<OrdenCompra>("/api/ordenes-compra", dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear orden de compra")
      return false
    }
  }

  return {
    ordenes,
    loading,
    error,
    estado,
    setEstado,
    getById,
    crear,
    recibir,
    cancelar,
    refetch: fetchOrdenes,
  }
}
