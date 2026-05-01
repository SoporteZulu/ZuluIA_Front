export interface Timbrado {
  id: number
  sucursalId: number
  puntoFacturacionId: number
  tipoComprobanteId?: number | null
  nroTimbrado: string
  fechaInicio: string
  fechaFin: string
  nroComprobanteDesde?: number | null
  nroComprobanteHasta?: number | null
  activo: boolean
  observacion?: string | null
  createdAt?: string
  updatedAt?: string | null
}

export interface TimbradoDetalle extends Timbrado {}
