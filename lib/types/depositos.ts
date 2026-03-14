export interface Deposito {
  id: number
  sucursalId: number
  descripcion: string
  esDefault: boolean
  activo: boolean
}

export interface CreateDepositoDto {
  sucursalId: number
  descripcion: string
  esDefault?: boolean
}
