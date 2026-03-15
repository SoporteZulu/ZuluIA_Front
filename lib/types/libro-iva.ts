export interface LibroIvaLinea {
  comprobanteId: number
  fecha: string
  tipoComprobante: string
  puntoVenta?: string
  numero?: string
  terceroRazonSocial?: string
  terceroCuit?: string
  netoGravado: number
  netoNoGravado: number
  exento?: number
  ivaRi: number
  ivaRni?: number
  total: number
}

export interface LibroIvaDto {
  sucursalId: number
  desde: string
  hasta: string
  tipo: string
  lineas: LibroIvaLinea[]
  totalNetoGravado: number
  totalNetoNoGravado: number
  totalIvaRi: number
  totalIvaRni?: number
  totalGeneral: number
}
