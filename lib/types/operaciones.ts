export interface MonitorExportacionDto {
  id: number
  codigo: string
  descripcion: string
  ultimoJobId?: number | null
  ultimaEjecucion?: string | null
  ultimoEstado?: string | null
  registrosPendientes: number
  ultimoMensaje?: string | null
}

export interface BatchProgramacionDto {
  id: number
  tipo: string
  nombre: string
  intervaloMinutos: number
  proximaEjecucion: string
  ultimaEjecucion?: string | null
  activa: boolean
  observacion?: string | null
}

export interface BatchJobDto {
  id: number
  tipo: string
  nombre: string
  claveIdempotencia?: string | null
  estado: string
  fechaInicio: string
  fechaFin?: string | null
  totalRegistros: number
  registrosProcesados: number
  registrosExitosos: number
  registrosConError: number
  observacion?: string | null
}

export interface OperacionesBatchJob {
  id: string
  tipo: "imputacion-masiva" | "listas-imprimir" | "monitor-facturas" | "remitos-masivos"
  descripcion: string
  registros: number
  estado: "preparacion" | "ejecucion" | "control" | "cerrado"
  responsable: string
  observacion: string
  source: "programacion" | "job"
  backendId: number
  activa?: boolean
  intervaloMinutos?: number
  proximaEjecucion?: string | null
  ultimaEjecucion?: string | null
}
