export interface DescuentoComercial {
  id: number
  terceroId?: number
  itemId?: number
  porcentaje: number
  desde?: string
  hasta?: string
  activo: boolean
}

export interface CreateDescuentoComercialDto {
  terceroId?: number
  itemId?: number
  porcentaje: number
  desde?: string
  hasta?: string
}
