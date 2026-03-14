export interface SaldoCuentaCorriente {
  terceroId: number
  sucursalId: number | null
  monedaId: number
  monedaSimbolo: string
  saldo: number
  updatedAt: string
}

export interface MovimientoCuentaCorriente {
  id: number
  fecha: string
  tipoMovimiento: string
  descripcion: string
  debe: number
  haber: number
  saldo: number
  comprobanteId: number | null
}

export interface Deudor {
  terceroId: number
  terceroRazonSocial: string
  sucursalId: number | null
  monedaId: number
  monedaSimbolo: string
  saldo: number
  updatedAt: string
}
