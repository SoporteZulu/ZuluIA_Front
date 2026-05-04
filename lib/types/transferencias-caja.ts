export interface TransferenciaCajaApiItem {
  id: number
  fecha: string
  cajaOrigenId: number
  cajaDestinoId: number
  importe: number
  monedaId: number
  cotizacion: number
  concepto?: string | null
  tipo?: string
}

export interface TransferenciaCaja {
  id: number
  fecha: string
  cajaOrigenId: number
  cajaDestinoId: number
  origenNombre: string
  destinoNombre: string
  importe: number
  monedaId: number
  cotizacion: number
  concepto: string
  equivalenteArs: number
}

export interface RegistrarTransferenciaCajaDto {
  sucursalId: number
  cajaOrigenId: number
  cajaDestinoId: number
  fecha: string
  importe: number
  monedaId: number
  cotizacion: number
  concepto?: string
}
