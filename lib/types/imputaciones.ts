export interface ImputacionDto {
  id: number
  comprobanteOrigenId: number
  numeroOrigen: string
  tipoComprobanteOrigenId?: number | null
  tipoComprobanteOrigen: string
  comprobanteDestinoId: number
  numeroDestino: string
  tipoComprobanteDestinoId?: number | null
  tipoComprobanteDestino: string
  importe: number
  fecha: string
  createdAt: string
  anulada: boolean
  fechaDesimputacion?: string | null
  motivoDesimputacion?: string | null
  desimputadaAt?: string | null
  rolComprobante: string
}

export interface DesimputarImputacionDto {
  imputacionId: number
  fecha: string
  motivo?: string | null
}
