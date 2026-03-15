import type { PagedResult } from './items'

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
