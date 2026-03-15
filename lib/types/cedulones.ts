import type { PagedResult } from './items'

export interface Cedulon {
  id: number
  terceroId: number
  sucursalId?: number
  numero?: string
  descripcion?: string
  importe: number
  saldo: number
  estado: string
  fechaEmision?: string
  fechaVencimiento?: string
}

export type CedulonesPagedResult = PagedResult<Cedulon>

export interface CreateCedulonDto {
  terceroId: number
  sucursalId?: number
  descripcion?: string
  importe: number
  fechaVencimiento?: string
}
