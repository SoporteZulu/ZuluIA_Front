import type { PagedResult } from './items'

export interface CartaPorte {
  id: number
  comprobanteId?: number
  estado: string
  ctg?: string
  coe?: string
  transportistaId?: number
  fechaEmision?: string
  desde?: string
  hasta?: string
  observacion?: string
}

export type CartaPortePaged = PagedResult<CartaPorte>

export interface CreateCartaPorteDto {
  comprobanteId?: number
  transportistaId?: number
  observacion?: string
}
