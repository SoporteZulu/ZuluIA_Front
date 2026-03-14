export interface PuntoFacturacion {
  id: number
  sucursalId: number
  numero: number
  descripcion: string
  tipoPuntoFacturacionId?: number
  tipoPuntoFacturacionDescripcion?: string
  activo: boolean
}

export interface TipoPuntoFacturacion {
  id: number
  descripcion: string
  porDefecto: boolean
}

export interface CreatePuntoFacturacionDto {
  sucursalId: number
  numero: number
  descripcion: string
  tipoPuntoFacturacionId: number
}
