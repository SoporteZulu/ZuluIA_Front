import type { PagedResult } from "./items"

export type EstadoCartaPorte =
  | "PENDIENTE"
  | "ORDEN_CARGA_ASIGNADA"
  | "CTG_SOLICITADO"
  | "CTG_ERROR"
  | "ACTIVA"
  | "CONFIRMADA"
  | "ANULADA"

export interface CartaPorte {
  id: number
  comprobanteId?: number
  ordenCargaId?: number
  estado: EstadoCartaPorte
  nroCtg?: string
  transportistaId?: number
  cuitRemitente: string
  cuitDestinatario: string
  cuitTransportista?: string
  fechaEmision?: string
  fechaSolicitudCtg?: string
  intentosCtg: number
  ultimoErrorCtg?: string
  observacion?: string
  createdAt?: string
  updatedAt?: string
}

export type CartaPortePaged = PagedResult<CartaPorte>

export interface CreateCartaPorteDto {
  comprobanteId?: number
  cuitRemitente: string
  cuitDestinatario: string
  cuitTransportista?: string
  fechaEmision: string
  observacion?: string
}

export interface AsignarCtgCartaPorteDto {
  nroCtg: string
}

export interface CrearOrdenCargaDto {
  transportistaId?: number
  fechaCarga: string
  origen: string
  destino: string
  patente?: string
  observacion?: string
}

export interface OrdenCarga {
  id: number
  cartaPorteId: number
  transportistaId?: number
  transportistaRazonSocial?: string
  fechaCarga: string
  origen: string
  destino: string
  patente?: string
  confirmada: boolean
  observacion?: string
}

export interface SolicitarCtgCartaPorteDto {
  fechaSolicitud: string
  observacion?: string
}

export interface ConsultarCtgCartaPorteDto {
  fechaConsulta: string
  nroCtg?: string
  error?: string
  observacion?: string
}

export interface AnularCartaPorteDto {
  fecha?: string
  observacion?: string
}

export interface CartaPorteEvento {
  id: number
  cartaPorteId: number
  ordenCargaId?: number
  tipoEvento: string
  estadoAnterior?: string
  estadoNuevo: string
  fechaEvento: string
  mensaje?: string
  nroCtg?: string
  intentoCtg: number
  createdAt: string
  createdBy?: number
}
