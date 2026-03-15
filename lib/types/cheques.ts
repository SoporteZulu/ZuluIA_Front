import type { PagedResult } from './items'

export interface Cheque {
  id: number
  cajaId: number
  terceroId?: number
  nroCheque: string
  banco?: string
  importe: number
  monedaId?: number
  fechaEmision?: string
  fechaVencimiento?: string
  estado: string
}

export type ChequesPagedResult = PagedResult<Cheque>

export interface CreateChequeDto {
  cajaId: number
  terceroId?: number
  nroCheque: string
  banco?: string
  importe: number
  monedaId?: number
  fechaEmision: string
  fechaVencimiento?: string
}
