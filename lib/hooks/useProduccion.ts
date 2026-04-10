"use client"

import { useCallback, useState } from "react"

import { apiGet, apiPost } from "@/lib/api"
import type {
  CrearOrdenEmpaqueDto,
  FinalizarOrdenTrabajoDto,
  OrdenTrabajoProduccionDetalle,
  RegistrarAjusteProduccionDto,
} from "@/lib/types/ordenes-trabajo"

function normalizeDetail(detail: OrdenTrabajoProduccionDetalle): OrdenTrabajoProduccionDetalle {
  return {
    ...detail,
    cantidad: Number(detail.cantidad ?? 0),
    cantidadProducida:
      detail.cantidadProducida === null ? null : Number(detail.cantidadProducida ?? 0),
    consumos: (detail.consumos ?? []).map((consumo) => ({
      ...consumo,
      cantidadPlanificada: Number(consumo.cantidadPlanificada ?? 0),
      cantidadConsumida: Number(consumo.cantidadConsumida ?? 0),
      movimientoStockId: consumo.movimientoStockId ?? null,
      observacion: consumo.observacion ?? null,
    })),
    empaques: (detail.empaques ?? []).map((empaque) => ({
      ...empaque,
      cantidad: Number(empaque.cantidad ?? 0),
      lote: empaque.lote ?? null,
      observacion: empaque.observacion ?? null,
    })),
  }
}

export function useProduccion() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getDetalleOrden = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<OrdenTrabajoProduccionDetalle>(
        `/api/produccion/ordenes-trabajo/${id}`
      )
      return normalizeDetail(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el detalle de producción")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const finalizarOrden = useCallback(async (id: number, dto: FinalizarOrdenTrabajoDto) => {
    setSaving(true)
    setError(null)
    try {
      await apiPost(`/api/produccion/ordenes-trabajo/${id}/finalizar`, dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al finalizar la orden")
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const registrarAjuste = useCallback(async (dto: RegistrarAjusteProduccionDto) => {
    setSaving(true)
    setError(null)
    try {
      await apiPost("/api/produccion/ajustes", dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar ajuste de producción")
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const crearOrdenEmpaque = useCallback(async (dto: CrearOrdenEmpaqueDto) => {
    setSaving(true)
    setError(null)
    try {
      await apiPost("/api/produccion/ordenes-empaque", dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar orden de empaque")
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    loading,
    saving,
    error,
    getDetalleOrden,
    finalizarOrden,
    registrarAjuste,
    crearOrdenEmpaque,
  }
}
