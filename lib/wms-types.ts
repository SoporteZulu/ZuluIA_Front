import { BaseEntity } from './types'

// ============= ALMACENES Y UBICACIONES =============
export interface Warehouse extends BaseEntity {
  code: string
  name: string
  type: 'principal' | 'satelite' | 'crossdocking' | 'cuarentena'
  address: string
  capacity: number
  capacityUnit: 'm3' | 'pallets'
  temperature_controlled: boolean
  supervisor?: string
  zones: Zone[]
  occupancy_percentage: number
  status: 'activo' | 'inactivo'
}

export interface Zone {
  id: string
  code: string
  name: string
  type: 'picking' | 'storage' | 'staging'
  aisles: Aisle[]
}

export interface Aisle {
  id: string
  code: string
  racks: Rack[]
}

export interface Rack {
  id: string
  code: string
  levels: Location[]
}

export interface Location {
  id: string
  code: string // ej: A01-R1-N1
  capacity: number
  occupancy: number
  status: 'disponible' | 'bloqueada' | 'mantenimiento'
  content?: LocationContent[]
}

export interface LocationContent {
  id: string
  sku: string
  batch?: string
  quantity: number
  reservedQuantity: number
}

// ============= PRODUCTOS =============
export interface Product extends BaseEntity {
  sku: string
  name: string
  description?: string
  category: string
  uom: string // Unidad de medida
  requiresBatch: boolean
  requiresSerial: boolean
  requiresExpiration: boolean
  minStock: number
  maxStock: number
  reorderPoint: number
  valuationMethod: 'FIFO' | 'LIFO' | 'PROM' // Promedio
  image?: string
}

export interface StockMovement extends BaseEntity {
  type: 'entrada' | 'salida' | 'ajuste' | 'traslado'
  product: Product
  warehouse: Warehouse
  fromLocation?: Location
  toLocation?: Location
  batch?: string
  serialNumber?: string
  quantity: number
  documentType: 'OE' | 'OS' | 'AJUSTE' | 'TRASLADO' | 'PRODUCCION'
  documentNumber: string
  userId: string
  observation?: string
}

export interface InventoryBalance extends BaseEntity {
  product: Product
  warehouse: Warehouse
  location: Location
  batch?: string
  serial?: string
  availableQuantity: number
  reservedQuantity: number
  blockedQuantity: number
  expirationDate?: Date
  valuationMethod: string
  unitCost: number
  totalValue: number
}

// ============= RECEPCIONES =============
export interface ReceiptOrder extends BaseEntity {
  code: string
  type: 'compra' | 'devolucion' | 'traslado' | 'produccion'
  provider?: string
  warehouse: Warehouse
  scheduledDate: Date
  realDate?: Date
  status: 'planificada' | 'abierta' | 'enproceso' | 'parcial' | 'completada' | 'cerrada'
  items: ReceiptItem[]
  totalItems: number
  receivedItems: number
  documentReference?: string // OR o remito
  carrier?: string
  observations?: string
  approvalStatus: 'pendiente' | 'aprobada' | 'rechazada'
  approvedBy?: string
  approvalDate?: Date
}

export interface ReceiptItem {
  id: string
  sku: string
  productName: string
  expectedQuantity: number
  receivedQuantity: number
  rejectedQuantity: number
  uom: string
  unitPrice?: number
  batch?: string
  serialNumbers?: string[]
  expirationDate?: Date
  location?: Location
  qualityInspection?: 'pendiente' | 'ok' | 'rechazo'
  incidents?: ReceiptIncident[]
}

export interface ReceiptIncident {
  id: string
  type: 'cantidad_incorrecta' | 'dano' | 'falta_documentacion' | 'otro'
  description: string
  image?: string
  suggestedAction: 'rechazar' | 'recibir_parcial' | 'cuarentena'
  status: 'registrada' | 'resuelta'
}

// ============= PICKING Y SALIDAS =============
export interface ShippingOrder extends BaseEntity {
  code: string
  client: string
  destination: string
  scheduledDate: Date
  priority: 'normal' | 'alta' | 'urgente'
  status: 'planificada' | 'asignada' | 'enpreparacion' | 'lista' | 'despachada' | 'entregada' | 'cancelada'
  items: ShippingItem[]
  totalItems: number
  pickedItems: number
  operario?: string
  carrier?: string
  specialInstructions?: string
}

export interface ShippingItem {
  id: string
  sku: string
  productName: string
  quantity: number
  uom: string
  pickedQuantity: number
  requiredBatch?: string
  requiredSerial?: string
  fromLocation?: Location
  status: 'pendiente' | 'enproceso' | 'completado'
}

export interface PickingRoute {
  id: string
  shippingOrder: ShippingOrder
  locations: Location[]
  distance: number
  estimatedTime: number
  startTime?: Date
  endTime?: Date
  incidents?: PickingIncident[]
}

export interface PickingIncident {
  id: string
  type: 'stock_no_encontrado' | 'cantidad_insuficiente' | 'producto_danado' | 'ubicacion_incorrecta' | 'otro'
  description: string
  availableQuantity?: number
  realLocation?: Location
  image?: string
}

// ============= CONTEOS FÍSICOS =============
export interface InventoryCount extends BaseEntity {
  code: string
  type: 'total' | 'parcial' | 'ciclico' | 'emergencia'
  warehouse: Warehouse
  scope: 'almacen' | 'zonas' | 'categorias' | 'skus'
  scheduledDate: Date
  startDate?: Date
  endDate?: Date
  assignedTo: string[]
  status: 'planificado' | 'enprogreso' | 'completado' | 'reconciliado'
  countItems: CountItem[]
}

export interface CountItem {
  id: string
  sku: string
  productName: string
  location: Location
  systemQuantity: number
  physicalQuantity: number
  difference: number
  batch?: string
  serial?: string
  status: 'pendiente' | 'contado' | 'condiferencia'
  action: 'aceptar' | 'recontar' | 'investigar'
}

// ============= ALERTAS =============
export interface WMSAlert extends BaseEntity {
  type: 'stock_bajo' | 'vencimiento_proximo' | 'producto_vencido' | 'diferencia_inventario' | 'orden_retrasada'
  severity: 'critico' | 'advertencia' | 'info'
  product?: Product
  warehouse?: Warehouse
  message: string
  details?: string
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
}

// ============= KPIs Y MÉTRICAS =============
export interface WMSMetrics {
  occupancyPercentage: number
  totalInventoryValue: number
  activeOrders: {
    receptions: number
    shipments: number
    picking: number
  }
  criticalAlerts: number
  inventoryAccuracy: number
  lastCountDate: Date
  averageLeadTime: number
  inventoryTurnover: number
}
