export interface CentroCosto {
  id: number
  codigo: string
  descripcion: string
  activo: boolean
  padre?: number
}

export interface CreateCentroCostoDto {
  codigo: string
  descripcion: string
  activo?: boolean
  padre?: number
}
