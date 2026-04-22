import type { PagedResult } from "./items"

export interface OrdenTrabajo {
  id: number
  sucursalId: number
  formulaId: number
  depositoOrigenId?: number
  depositoDestinoId?: number
  fecha: string
  fechaFinPrevista?: string
  fechaFinReal?: string
  cantidad: number
  estado: string
  observacion?: string
}

export interface ConsumoOrdenTrabajoDetalle {
  id: number
  itemId: number
  itemCodigo: string
  itemDescripcion: string
  depositoId: number
  cantidadPlanificada: number
  cantidadConsumida: number
  movimientoStockId?: number | null
  observacion?: string | null
  createdAt?: string
}

export interface OrdenEmpaqueDetalle {
  id: number
  itemId: number
  itemCodigo: string
  itemDescripcion: string
  depositoId: number
  fecha: string
  cantidad: number
  lote?: string | null
  estado: string
  observacion?: string | null
  createdAt?: string
}

export interface OrdenTrabajoProduccionDetalle extends OrdenTrabajo {
  itemResultadoId?: number | null
  itemResultadoCodigo?: string
  itemResultadoDescripcion?: string
  formulaCodigo: string
  formulaDescripcion: string
  depositoOrigenDescripcion: string
  depositoDestinoDescripcion: string
  cantidadProducida?: number | null
  consumos: ConsumoOrdenTrabajoDetalle[]
  empaques: OrdenEmpaqueDetalle[]
}

export type OrdenesTrabajoPaged = PagedResult<OrdenTrabajo>

export interface CreateOrdenTrabajoDto {
  sucursalId: number
  formulaId: number
  depositoOrigenId?: number
  depositoDestinoId?: number
  fecha: string
  fechaFinPrevista?: string
  cantidad: number
  observacion?: string
}

export interface FinalizarOrdenTrabajoDto {
  fechaFinReal: string
  cantidadProducida?: number
  consumos?: Array<{
    itemId: number
    cantidadConsumida: number
    observacion?: string
  }>
}

export interface RegistrarAjusteProduccionDto {
  formulaId: number
  depositoOrigenId: number
  depositoDestinoId: number
  cantidad: number
  observacion?: string
}

export interface CrearOrdenEmpaqueDto {
  ordenTrabajoId: number
  itemId: number
  depositoId: number
  fecha: string
  cantidad: number
  lote?: string
  observacion?: string
}
