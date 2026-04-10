export interface FormaPago {
  id: number
  descripcion: string
}

export interface AlicuotaIva {
  id: number
  codigo: string
  descripcion: string
  porcentaje: number
}

export interface UnidadMedida {
  id: number
  codigo: string
  descripcion: string
}

export interface CondicionIva {
  id: number
  codigo: string
  descripcion: string
}

export interface Moneda {
  id: number
  codigo: string
  descripcion: string
}

export interface CategoriaTercero {
  id: number
  descripcion: string
  esImportador: boolean
}

export interface TipoDocumento {
  id: number
  codigo: number
  descripcion: string
}

export interface OrdenCompra {
  id: number
  comprobanteId: number
  proveedorId: number
  fechaEntregaReq: string | null
  condicionesEntrega: string | null
  cantidadTotal: number
  cantidadRecibida: number
  saldoPendiente: number
  fechaUltimaRecepcion?: string | null
  estadoOc: string // "PENDIENTE" | "RECIBIDA" | "CANCELADA"
  estadoOperativo?: string
  recepcionParcial?: boolean
  habilitada: boolean
  createdAt: string
}

export interface CreateOrdenCompraDto {
  comprobanteId: number
  proveedorId: number
  fechaEntregaReq?: string | null
  condicionesEntrega?: string | null
}

export interface RecibirOrdenCompraDto {
  fechaRecepcion?: string | null
  cantidadRecibida?: number | null
  tipoComprobanteRemitoId?: number | null
  remitoValorizado?: boolean
  observacion?: string | null
}
