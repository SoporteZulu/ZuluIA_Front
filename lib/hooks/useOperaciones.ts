"use client"

import { useCallback, useEffect, useState } from "react"
import { apiGet, apiPost, apiPut } from "@/lib/api"
import type {
  BatchJobDto,
  BatchProgramacionDto,
  MonitorExportacionDto,
  OperacionesBatchJob,
} from "@/lib/types/operaciones"
import type { LegacySalesMonitorRow } from "@/lib/ventas-operaciones-legacy"

function mapPriority(registrosPendientes: number): LegacySalesMonitorRow["prioridad"] {
  if (registrosPendientes > 10) return "alta"
  if (registrosPendientes > 0) return "media"
  return "baja"
}

function mapMonitorState(estado?: string | null, pendientes = 0): LegacySalesMonitorRow["estado"] {
  const normalized = (estado ?? "").toUpperCase()
  if (normalized === "FINALIZADO" && pendientes <= 0) return "resuelto"
  if (normalized === "FALLIDO" || normalized === "FINALIZADOCONERRORES" || pendientes > 0)
    return "gestion"
  return "pendiente"
}

function mapMonitorRow(item: MonitorExportacionDto): LegacySalesMonitorRow {
  return {
    id: `mon-${item.id}`,
    circuito: item.descripcion,
    cliente: item.codigo,
    documento: item.ultimoJobId ? `JOB-${item.ultimoJobId}` : item.codigo,
    prioridad: mapPriority(item.registrosPendientes),
    estado: mapMonitorState(item.ultimoEstado, item.registrosPendientes),
    responsable: "Integraciones",
    observacion:
      item.ultimoMensaje?.trim() ||
      (item.registrosPendientes > 0
        ? `${item.registrosPendientes} registros pendientes de sincronización.`
        : "Sin pendientes informados."),
  }
}

function mapBatchType(value: string): OperacionesBatchJob["tipo"] {
  const normalized = value.toUpperCase()
  if (normalized.includes("AUTOMATICA") || normalized.includes("MASIVA")) return "remitos-masivos"
  if (normalized.includes("IMPORTACION") || normalized.includes("SYNC")) return "monitor-facturas"
  return "listas-imprimir"
}

function mapBatchState(value: string, active?: boolean): OperacionesBatchJob["estado"] {
  const normalized = value.toUpperCase()
  if (normalized === "ENPROCESO" || normalized === "PENDIENTE") return "ejecucion"
  if (normalized === "FINALIZADO") return "cerrado"
  if (normalized === "FINALIZADOCONERRORES" || normalized === "FALLIDO") return "control"
  if (active === false) return "control"
  return "preparacion"
}

function mapProgramacion(item: BatchProgramacionDto): OperacionesBatchJob {
  return {
    id: `prog-${item.id}`,
    tipo: mapBatchType(item.tipo),
    descripcion: item.nombre,
    registros: item.intervaloMinutos,
    estado: mapBatchState(item.activa ? "PENDIENTE" : "FINALIZADOCONERRORES", item.activa),
    responsable: "Scheduler batch",
    observacion: item.observacion ?? "Programación operativa sincronizada desde backend.",
    source: "programacion",
    backendId: item.id,
    activa: item.activa,
    intervaloMinutos: item.intervaloMinutos,
    proximaEjecucion: item.proximaEjecucion,
    ultimaEjecucion: item.ultimaEjecucion ?? null,
  }
}

function mapJob(item: BatchJobDto): OperacionesBatchJob {
  return {
    id: `job-${item.id}`,
    tipo: mapBatchType(item.tipo),
    descripcion: item.nombre,
    registros: item.totalRegistros,
    estado: mapBatchState(item.estado, true),
    responsable: "Facturación batch",
    observacion: item.observacion ?? "Job sincronizado desde backend.",
    source: "job",
    backendId: item.id,
    proximaEjecucion: item.fechaInicio,
    ultimaEjecucion: item.fechaFin ?? item.fechaInicio,
  }
}

export function useMonitoresExportacion() {
  const [rows, setRows] = useState<LegacySalesMonitorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<MonitorExportacionDto[]>(
        "/api/integraciones/monitores-exportacion/legacy"
      )
      setRows((Array.isArray(result) ? result : []).map(mapMonitorRow))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar monitores de exportación")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  return { rows, loading, error, refetch: fetchRows }
}

export function useFacturacionBatch() {
  const [jobs, setJobs] = useState<OperacionesBatchJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [programaciones, backendJobs] = await Promise.all([
        apiGet<BatchProgramacionDto[]>("/api/facturacionbatch/programaciones"),
        apiGet<BatchJobDto[]>("/api/facturacionbatch/jobs"),
      ])

      const rows = [
        ...(Array.isArray(programaciones) ? programaciones : []).map(mapProgramacion),
        ...(Array.isArray(backendJobs) ? backendJobs : []).map(mapJob),
      ].sort((a, b) =>
        `${b.proximaEjecucion ?? ""}-${b.id}`.localeCompare(`${a.proximaEjecucion ?? ""}-${a.id}`)
      )

      setJobs(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar jobs batch")
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const actualizarProgramacion = useCallback(
    async (row: OperacionesBatchJob): Promise<boolean> => {
      if (row.source !== "programacion") return false
      try {
        setError(null)
        await apiPut<void>(`/api/facturacionbatch/programaciones/${row.backendId}`, {
          intervaloMinutos: row.intervaloMinutos ?? 60,
          proximaEjecucion: row.proximaEjecucion,
          observacion: row.observacion,
        })

        if (row.activa === false) {
          await apiPost<void>(`/api/facturacionbatch/programaciones/${row.backendId}/desactivar`, {
            observacion: row.observacion,
          })
        } else {
          await apiPost<void>(`/api/facturacionbatch/programaciones/${row.backendId}/reactivar`, {
            proximaEjecucion: row.proximaEjecucion,
            observacion: row.observacion,
          })
        }

        await fetchJobs()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar programación batch")
        return false
      }
    },
    [fetchJobs]
  )

  return { jobs, loading, error, actualizarProgramacion, refetch: fetchJobs }
}
