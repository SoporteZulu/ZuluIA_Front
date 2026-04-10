import type { PagedResult } from "./items"

export type EstadoOrdenPreparacion = "PENDIENTE" | "EN_PROCESO" | "COMPLETADA" | "ANULADA"

export interface OrdenPreparacionDetalle {
  id: number
  itemId: number
  depositoId: number
  cantidad: number
  cantidadEntregada: number
  estaCompleto: boolean
  observacion?: string
}

export interface OrdenPreparacion {
  id: number
  sucursalId: number
  comprobanteOrigenId?: number
  terceroId?: number
  fecha: string
  estado: EstadoOrdenPreparacion
  observacion?: string
  fechaConfirmacion?: string
  cantidadRenglones?: number
  detalles?: OrdenPreparacionDetalle[]
}

export type OrdenesPreparacionPaged = PagedResult<OrdenPreparacion>

export interface CreateOrdenPreparacionDetalleDto {
  itemId: number
  depositoId: number
  cantidad: number
  observacion?: string
}

export interface CreateOrdenPreparacionDto {
  sucursalId: number
  comprobanteOrigenId?: number
  terceroId?: number
  fecha: string
  observacion?: string
  detalles: CreateOrdenPreparacionDetalleDto[]
}

export interface RegistrarPickingDetalleDto {
  detalleId: number
  cantidadEntregada: number
}

export interface RegistrarPickingOrdenPreparacionDto {
  detalles: RegistrarPickingDetalleDto[]
}

export interface DespacharOrdenPreparacionDto {
  depositoDestinoId: number
  fecha: string
  observacion?: string
}

export interface OrdenPreparacionEvento {
  id: number
  tipo: string
  fecha: string
  descripcion?: string
  createdAt?: string
}

export interface TransferenciaTrazabilidad {
  id: number
  depositoOrigenId: number
  depositoDestinoId: number
  estado: string
  fecha: string
  fechaConfirmacion?: string
  eventos: OrdenPreparacionEvento[]
}

export interface OrdenPreparacionTimelineEvento extends OrdenPreparacionEvento {
  ordenPreparacionId?: number
  transferenciaDepositoId?: number
}

export interface OrdenPreparacionTrazabilidad {
  id: number
  estado: EstadoOrdenPreparacion
  fecha: string
  fechaConfirmacion?: string
  cantidadRenglones: number
  cantidadSolicitada: number
  cantidadEntregada: number
  transferencias: TransferenciaTrazabilidad[]
  eventos: OrdenPreparacionEvento[]
  timeline: OrdenPreparacionTimelineEvento[]
}

export interface OrdenPreparacionResumen {
  cantidad: number
  pendientes: number
  enProceso: number
  completadas: number
  anuladas: number
  cantidadSolicitada: number
  cantidadEntregada: number
}
