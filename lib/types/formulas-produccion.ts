export interface FormulaProduccion {
  id: number
  codigo?: string
  descripcion: string
  itemProductoId: number
  itemProductoCodigo?: string
  itemProductoDescripcion?: string
  cantidadProducida: number
  unidadMedidaId?: number | null
  unidadMedidaDescripcion?: string | null
  activa: boolean
  observacion?: string | null
  createdAt?: string
  componentes?: FormulaComponente[]
}

export interface FormulaComponente {
  id: number
  itemId: number
  itemCodigo?: string
  itemDescripcion?: string
  cantidad: number
  unidadMedidaId?: number | null
  unidadMedidaDescripcion?: string | null
  esOpcional?: boolean
  orden?: number
}

export interface CreateFormulaProduccionDto {
  codigo: string
  descripcion: string
  itemProductoId: number
  cantidadProducida: number
  activa?: boolean
  observacion?: string | null
  componentes?: { itemId: number; cantidad: number }[]
}

export interface UpdateFormulaProduccionDto {
  descripcion: string
  cantidadProducida: number
  observacion?: string | null
}

export interface FormulaProduccionHistorial {
  id: number
  formulaId: number
  version: number
  codigo: string
  descripcion: string
  cantidadResultado: number
  motivo?: string | null
  snapshotJson?: string | null
  createdAt?: string
  createdBy?: string | number | null
}
