export interface FormulaProduccion {
  id: number
  codigo?: string
  descripcion: string
  itemProductoId: number
  cantidadProducida: number
  activa: boolean
  componentes?: FormulaComponente[]
}

export interface FormulaComponente {
  id: number
  itemId: number
  itemDescripcion?: string
  cantidad: number
}

export interface CreateFormulaProduccionDto {
  codigo?: string
  descripcion: string
  itemProductoId: number
  cantidadProducida: number
  activa?: boolean
  componentes?: { itemId: number; cantidad: number }[]
}
