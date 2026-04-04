"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { apiGet, apiPost } from "@/lib/api"
import type {
  RegistrarDevolucionVentaDto,
  VentaDevolucionLiveRecord,
} from "@/lib/types/devoluciones"
import type { Comprobante, ComprobanteDetalle } from "@/lib/types/comprobantes"

function isPotentialReturnDocument(document: Comprobante) {
  const description = (document.tipoComprobanteDescripcion ?? "").toLowerCase()
  return description.includes("credito") || description.includes("devol")
}

function hasReturnMetadata(detail: ComprobanteDetalle) {
  return Boolean(detail.motivoDevolucion || detail.tipoDevolucion || detail.observacionDevolucion)
}

export function useVentasDevoluciones(
  comprobantes: Comprobante[],
  customerNameById: Map<number, string>,
  sucursalNameById: Map<number, string>
) {
  const [records, setRecords] = useState<VentaDevolucionLiveRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidates = useMemo(
    () => comprobantes.filter(isPotentialReturnDocument).slice(0, 60),
    [comprobantes]
  )

  const fetchDevoluciones = useCallback(async () => {
    if (candidates.length === 0) {
      setRecords([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const details = await Promise.all(
        candidates.map((entry) => apiGet<ComprobanteDetalle>(`/api/ventas/documentos/${entry.id}`))
      )

      const liveRecords = details
        .filter(hasReturnMetadata)
        .map((detail) => ({
          detalle: detail,
          cliente: customerNameById.get(detail.terceroId) ?? `Cliente #${detail.terceroId}`,
          sucursal: sucursalNameById.get(detail.sucursalId) ?? `Sucursal #${detail.sucursalId}`,
          deposito:
            detail.items.find((item) => item.depositoDescripcion)?.depositoDescripcion ??
            "Depósito sin informar",
        }))
        .sort((left, right) => right.detalle.fecha.localeCompare(left.detalle.fecha))

      setRecords(liveRecords)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar devoluciones")
    } finally {
      setLoading(false)
    }
  }, [candidates, customerNameById, sucursalNameById])

  useEffect(() => {
    void fetchDevoluciones()
  }, [fetchDevoluciones])

  const registrar = useCallback(
    async (dto: RegistrarDevolucionVentaDto) => {
      try {
        await apiPost<{ id: number }>("/api/ventas/devoluciones", dto)
        await fetchDevoluciones()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al registrar devolución")
        return false
      }
    },
    [fetchDevoluciones]
  )

  return {
    devoluciones: records,
    loading,
    error,
    registrar,
    refetch: fetchDevoluciones,
  }
}
