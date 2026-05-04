export interface Item {
  id: number
  codigo: string
  codigoAlternativo?: string | null
  codigoBarras: string | null
  descripcion: string
  descripcionAdicional: string | null
  categoriaId: number | null
  categoriaDescripcion?: string
  marcaId?: number | null
  marcaDescripcion?: string | null
  unidadMedidaId: number
  unidadMedidaDescripcion?: string
  alicuotaIvaId: number
  alicuotaIvaDescripcion?: string | null
  alicuotaIvaPorcentaje?: number
  alicuotaIvaCompraId?: number | null
  alicuotaIvaCompraDescripcion?: string | null
  alicuotaIvaCompraPorcentaje?: number | null
  monedaId: number
  monedaSimbol?: string
  esProducto: boolean
  esServicio: boolean
  esFinanciero: boolean
  manejaStock: boolean
  precioCosto: number
  precioVenta: number
  stock?: number
  stockDisponible?: number
  stockComprometido?: number
  stockReservado?: number
  stockEnTransito?: number
  stockMinimo: number
  stockMaximo: number | null
  puntoReposicion?: number | null
  stockSeguridad?: number | null
  peso?: number | null
  volumen?: number | null
  esTrazable?: boolean
  permiteFraccionamiento?: boolean
  diasVencimientoLimite?: number | null
  depositoDefaultId?: number | null
  depositoDefaultDescripcion?: string | null
  codigoAfip: string | null
  sucursalId: number | null
  aplicaVentas?: boolean
  aplicaCompras?: boolean
  porcentajeGanancia?: number | null
  porcentajeMaximoDescuento?: number | null
  esRpt?: boolean
  esSistema?: boolean
  esPack?: boolean
  puedeEditar?: boolean
  atributos?: ItemAtributoValor[]
  activo: boolean
  createdAt: string
  updatedAt?: string | null
}

export interface CreateItemDto {
  codigo: string
  codigoAlternativo?: string | null
  codigoBarras?: string | null
  descripcion: string
  descripcionAdicional?: string | null
  categoriaId?: number | null
  marcaId?: number | null
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
  depositoDefaultId?: number | null
  esTrazable?: boolean
  permiteFraccionamiento?: boolean
  codigoAfip?: string | null
}

export interface PagedResult<T> {
  items: T[]
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
  parentId?: number | null
  descripcion: string
  codigo: string
  nivel?: number
  ordenNivel?: string | null
  activo?: boolean
  hijos?: CategoriaItem[]
}

export interface UnidadMedida {
  id: number
  descripcion: string
  codigo: string
  disminutivo?: string | null
  multiplicador?: number
  esUnidadBase?: boolean
  unidadBaseId?: number | null
  activa?: boolean
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

export interface MarcaComercial {
  id: number
  descripcion: string
  activo: boolean
}

export interface AtributoInventario {
  id: number
  descripcion: string
  tipo: string
  requerido: boolean
  activo: boolean
}

export interface ItemAtributoValor {
  id: number
  itemId?: number
  atributoId: number
  descripcion?: string
  tipo?: string
  valor: string
}

export interface CreateCategoriaItemDto {
  parentId?: number | null
  codigo: string
  descripcion: string
  nivel: number
  ordenNivel?: string | null
}

export interface UpdateCategoriaItemDto {
  codigo: string
  descripcion: string
  ordenNivel?: string | null
}

export interface CreateMarcaDto {
  descripcion: string
}

export interface CreateAtributoDto {
  descripcion: string
  tipo: string
  requerido: boolean
}

export interface CreateUnidadMedidaDto {
  codigo: string
  descripcion: string
  disminutivo?: string | null
  multiplicador: number
  esUnidadBase: boolean
  unidadBaseId?: number | null
}

export interface UpdateUnidadMedidaDto {
  descripcion: string
  disminutivo?: string | null
  multiplicador: number
  esUnidadBase: boolean
  unidadBaseId?: number | null
}
