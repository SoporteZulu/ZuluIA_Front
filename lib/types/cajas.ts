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
  esCaja?: boolean
  banco?: string
  nroCuenta?: string
  cbu?: string
  usuarioId?: number
  nroCierreActual?: number
}

export interface TipoCaja {
  id: number
  descripcion: string
  esCaja: boolean
}

export interface CreateCajaDto {
  sucursalId: number
  tipoId: number
  descripcion: string
  monedaId: number
  esCaja: boolean
  banco?: string
  nroCuenta?: string
  cbu?: string
  usuarioId?: number
}

export interface UpdateCajaDto {
  id: number
  descripcion: string
  tipoId: number
  monedaId: number
  esCaja: boolean
  banco?: string
  nroCuenta?: string
  cbu?: string
  usuarioId?: number
}

export interface CajaFormaPago {
  id: number
  formaPagoId: number
  formaPagoDescripcion?: string
}
