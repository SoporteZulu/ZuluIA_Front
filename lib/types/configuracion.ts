export interface FormaPago {
  id: number
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
  estadoOc: string // "PENDIENTE" | "RECIBIDA" | "CANCELADA"
  habilitada: boolean
  createdAt: string
}

export interface CreateOrdenCompraDto {
  comprobanteId: number
  proveedorId: number
  fechaEntregaReq?: string | null
  condicionesEntrega?: string | null
}
