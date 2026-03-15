export interface Caja {
  id: number
  sucursalId: number
  tipoCajaId: number
  tipoCajaDescripcion?: string
  nombre: string
  descripcion?: string
  monedaId?: number
  activa: boolean
  saldoActual?: number
  fechaApertura?: string
  saldoInicial?: number
}

export interface TipoCaja {
  id: number
  descripcion: string
  esCaja: boolean
}

export interface CreateCajaDto {
  sucursalId: number
  tipoCajaId: number
  nombre: string
  descripcion?: string
  monedaId?: number
}

export interface CajaFormaPago {
  id: number
  formaPagoId: number
  formaPagoDescripcion?: string
}
