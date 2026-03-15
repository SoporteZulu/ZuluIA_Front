import type { PagedResult } from './items'

export interface OrdenPreparacion {
  id: number
  sucursalId: number
  terceroId?: number
  estado: string
  fecha: string
  observacion?: string
}

export type OrdenesPreparacionPaged = PagedResult<OrdenPreparacion>

export interface CreateOrdenPreparacionDto {
  sucursalId: number
  terceroId?: number
  fecha: string
  observacion?: string
}
