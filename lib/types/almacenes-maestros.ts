export type ConteoEstado = "programado" | "en-ejecucion" | "observado"

export interface ConteoCiclico {
  id: number
  deposito: string
  zona: string
  frecuencia: string
  proximoConteo: string
  estado: ConteoEstado
  divergenciaPct: number
  responsable: string
  observacion: string
  nextStep: string
  executionNote: string
}

export interface UpsertConteoCiclicoDto {
  deposito: string
  zona: string
  frecuencia: string
  proximoConteo: string
  estado: ConteoEstado
  divergenciaPct: number
  responsable?: string
  observacion?: string
  nextStep?: string
  executionNote?: string
}

export interface SeedConteosResponse {
  itemsProcesados: number
  mensaje: string
}

export interface ZonaMaestro {
  id: number
  descripcion: string
  activo: boolean
}

export interface ZonaRequest {
  descripcion: string
}

export interface RegionMaestro {
  id: number
  codigo: string
  descripcion: string
  regionIntegradoraId: number | null
  orden: number
  nivel: number
  codigoEstructura: string | null
  esRegionIntegradora: boolean
  observacion: string | null
}

export interface CreateRegionDto {
  codigo: string
  descripcion: string
  regionIntegradoraId?: number | null
  orden?: number
  nivel?: number
  codigoEstructura?: string | null
  esRegionIntegradora?: boolean
  observacion?: string | null
}

export interface UpdateRegionDto {
  descripcion: string
  regionIntegradoraId?: number | null
  orden?: number
  nivel?: number
  codigoEstructura?: string | null
  esRegionIntegradora?: boolean
  observacion?: string | null
}
