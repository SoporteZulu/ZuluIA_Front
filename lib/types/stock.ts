export interface StockPorDeposito {
  id: number
  itemId: number
  depositoId: number
  depositoDescripcion: string
  esDefault: boolean
  cantidad: number
  updatedAt: string
}

export interface StockResumenItem {
  itemId: number
  totalStock: number
  depositos: StockPorDeposito[]
}

export interface StockResumenSucursal {
  sucursalId: number
  totalItemsConStock: number
  itemsBajoMinimo: number
  itemsSinStock: number
  totalDepositos: number
  movimientosTotales?: number
  movimientosPorDeposito?: Array<{
    id: number
    descripcion: string
    movimientos: number
    alertasBajoMinimo: number
  }>
  conteosPorEstado?: Array<{
    estado: string
    total: number
  }>
}

export interface StockBajoMinimo {
  itemId: number
  codigo: string
  descripcion: string
  stockActual: number
  stockMinimo: number
  depositoId: number
  depositoDescripcion: string
}

export interface MovimientoStock {
  id: number
  itemId: number
  depositoId: number
  fecha: string
  tipoMovimiento: string
  cantidad: number
  saldoResultante: number
  observacion: string | null
}

export interface AjusteStockDto {
  itemId: number
  depositoId: number
  nuevaCantidad: number
  observacion?: string
}

export interface TransferenciaStockDto {
  itemId: number
  depositoOrigenId: number
  depositoDestinoId: number
  cantidad: number
  observacion?: string
}

export interface StockInicialItem {
  itemId: number
  depositoId: number
  cantidad: number
}

export interface StockInicialDto {
  items: StockInicialItem[]
}
