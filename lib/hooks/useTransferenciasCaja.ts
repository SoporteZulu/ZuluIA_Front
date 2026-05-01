"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { apiGet, apiPost } from "@/lib/api"
import type { Caja } from "@/lib/types/cajas"
import type {
  RegistrarTransferenciaCajaDto,
  TransferenciaCaja,
  TransferenciaCajaApiItem,
} from "@/lib/types/transferencias-caja"

interface UseTransferenciasCajaOptions {
  cajas: Array<Pick<Caja, "id" | "nombre" | "descripcion">>
  enabled?: boolean
  desde?: string
  hasta?: string
}

function buildQueryString(desde?: string, hasta?: string) {
  const params = new URLSearchParams()

  if (desde) {
    params.set("desde", desde)
  }

  if (hasta) {
    params.set("hasta", hasta)
  }

  const query = params.toString()
  return query ? `?${query}` : ""
}

function getCajaLabel(caja: Pick<Caja, "id" | "nombre" | "descripcion">) {
  return caja.descripcion?.trim() || caja.nombre?.trim() || `Caja ${caja.id}`
}

function normalizeTransferencia(
  item: TransferenciaCajaApiItem,
  cajaLabels: Map<number, string>
): TransferenciaCaja {
  const importe = Number(item.importe ?? 0)
  const cotizacion = Number(item.cotizacion ?? 1)

  return {
    id: item.id,
    fecha: item.fecha,
    cajaOrigenId: item.cajaOrigenId,
    cajaDestinoId: item.cajaDestinoId,
    origenNombre: cajaLabels.get(item.cajaOrigenId) || `Caja ${item.cajaOrigenId}`,
    destinoNombre: cajaLabels.get(item.cajaDestinoId) || `Caja ${item.cajaDestinoId}`,
    importe,
    monedaId: item.monedaId,
    cotizacion,
    concepto: item.concepto?.trim() || "Sin concepto informado",
    equivalenteArs: importe * cotizacion,
  }
}

function sortTransferencias(a: TransferenciaCaja, b: TransferenciaCaja) {
  const aDate = new Date(a.fecha).getTime()
  const bDate = new Date(b.fecha).getTime()

  if (aDate !== bDate) {
    return bDate - aDate
  }

  return b.id - a.id
}

export function useTransferenciasCaja({
  cajas,
  enabled = true,
  desde,
  hasta,
}: UseTransferenciasCajaOptions) {
  const [transferencias, setTransferencias] = useState<TransferenciaCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cajaLabels = useMemo(
    () => new Map(cajas.map((caja) => [caja.id, getCajaLabel(caja)])),
    [cajas]
  )
  const cajasKey = useMemo(
    () =>
      cajas
        .map((caja) => caja.id)
        .sort((left, right) => left - right)
        .join(","),
    [cajas]
  )

  const fetchTransferencias = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    if (cajas.length === 0) {
      setTransferencias([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = buildQueryString(desde, hasta)
      const histories = await Promise.all(
        cajas.map(async (caja) => {
          const result = await apiGet<TransferenciaCajaApiItem[]>(
            `/api/cajas/${caja.id}/transferencias${query}`
          )

          return Array.isArray(result) ? result : []
        })
      )

      const merged = new Map<number, TransferenciaCaja>()

      for (const history of histories) {
        for (const item of history) {
          if (!merged.has(item.id)) {
            merged.set(item.id, normalizeTransferencia(item, cajaLabels))
          }
        }
      }

      setTransferencias(Array.from(merged.values()).sort(sortTransferencias))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al cargar transferencias")
    } finally {
      setLoading(false)
    }
  }, [enabled, cajas, cajaLabels, desde, hasta])

  useEffect(() => {
    fetchTransferencias()
  }, [fetchTransferencias, cajasKey])

  const registrar = useCallback(
    async (dto: RegistrarTransferenciaCajaDto): Promise<number> => {
      setError(null)

      try {
        const result = await apiPost<{ id?: number }>("/api/cajas/transferencias", dto)
        const id = Number(result?.id)

        if (!Number.isFinite(id) || id <= 0) {
          throw new Error("El backend no devolvió un identificador válido para la transferencia.")
        }

        await fetchTransferencias()
        return id
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Error al registrar transferencia"
        setError(message)
        throw new Error(message)
      }
    },
    [fetchTransferencias]
  )

  return {
    transferencias,
    loading,
    error,
    registrar,
    refetch: fetchTransferencias,
  }
}
