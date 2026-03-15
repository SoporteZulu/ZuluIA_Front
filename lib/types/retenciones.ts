export interface RetencionesTipo {
  id: number
  codigo: string
  descripcion: string
  porcentaje: number
  activo: boolean
}

export interface RetencionPorPersona {
  id: number
  terceroId: number
  retencionTipoId: number
  retencionTipoDescripcion?: string
  porcentaje?: number
  vigente: boolean
}

export interface CreateRetencionPorPersonaDto {
  retencionTipoId: number
  porcentaje?: number
  vigente?: boolean
}
