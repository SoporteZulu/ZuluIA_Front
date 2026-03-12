export interface Item {
  id: number
  codigo: string
  codigoBarras: string | null
  descripcion: string
  descripcionAdicional: string | null
  categoriaId: number | null
  categoriaDescripcion?: string
  unidadMedidaId: number
  unidadMedidaDescripcion?: string
  alicuotaIvaId: number
  alicuotaIvaPorcentaje?: number
  monedaId: number
  monedaSimbol?: string
  esProducto: boolean
  esServicio: boolean
  esFinanciero: boolean
  manejaStock: boolean
  precioCosto: number
  precioVenta: number
  stock?: number
  stockMinimo: number
  stockMaximo: number | null
  codigoAfip: string | null
  sucursalId: number | null
  activo: boolean
  createdAt: string
}

export interface CreateItemDto {
  codigo: string
  codigoBarras?: string | null
  descripcion: string
  descripcionAdicional?: string | null
  categoriaId?: number | null
  unidadMedidaId: number
  alicuotaIvaId: number
  monedaId: number
  esProducto: boolean
  esServicio: boolean
  esFinanciero: boolean
  manejaStock: boolean
  precioCosto: number
  precioVenta: number
  stockMinimo: number
  stockMaximo?: number | null
  codigoAfip?: string | null
}

export interface PagedResult<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface StockItem {
  itemId: number
  depositoId: number
  depositoDescripcion: string
  cantidad: number
}

export interface StockResumen {
  totalItems: number
  depositos: StockItem[]
}

export interface CategoriaItem {
  id: number
  descripcion: string
  codigo: string
}

export interface UnidadMedida {
  id: number
  descripcion: string
  codigo: string
}

export interface AlicuotaIva {
  id: number
  descripcion: string
  porcentaje: number
}

export interface Moneda {
  id: number
  descripcion: string
  simbolo: string
  codigo: string
}
