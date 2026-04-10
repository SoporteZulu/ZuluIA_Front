import type { PagedResult } from "@/lib/types/items"

export interface CompraRemitoItem {
  id: string
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  recibido: number
  diferencia: number
}

export interface CompraRemitoResumen {
  id: number
  tipo: "Valorizado" | "No valorizado" | string
  proveedor: string
  numero: string
  fecha: string
  deposito: string
  estado: "PENDIENTE" | "RECIBIDO" | "ANULADO" | string
  ordenCompraReferencia: string | null
  recepcionReferencia: string | null
  transportista: string
  responsableRecepcion: string
  observacion: string
  diferenciasClave: string[]
  total: number
  items: CompraRemitoItem[]
  comprobante?: string
  comprobanteReferencia?: string
}

export interface CompraNotaCreditoItem {
  id: string
  concepto: string
  importe: number
}

export interface CompraNotaCreditoResumen {
  id: number
  proveedor: string
  comprobanteReferencia: string
  motivo: string
  estado: "BORRADOR" | "EMITIDA" | "APLICADA" | string
  fecha: string
  total: number
  ordenCompraReferencia: string | null
  devolucionReferencia: string | null
  responsable: string
  impactoCuentaCorriente: string
  observacion: string
  detallesClave: string[]
  items: CompraNotaCreditoItem[]
  comprobante?: string
}

export interface CompraAjusteItem {
  id: string
  concepto: string
  cuenta: string
  importe: number
}

export interface CompraAjusteResumen {
  id: number
  tipo: string
  proveedor: string
  comprobanteReferencia: string
  motivo: string
  estado: string
  fecha: string
  total: number
  ordenCompraReferencia: string | null
  devolucionReferencia: string | null
  responsable: string
  impactoCuentaCorriente: string
  observacion: string
  circuito: string
  requiereNotaCredito: boolean
  detallesClave: string[]
  items: CompraAjusteItem[]
  comprobante?: string
}

export interface CompraDevolucionItem {
  id: string
  codigo: string
  descripcion: string
  cantidad: number
  motivo: string
}

export interface CompraDevolucionResumen {
  id: number
  tipo: "Stock" | "No valorizada" | string
  proveedor: string
  comprobante: string
  motivo: string
  estado: "ABIERTA" | "PROCESADA" | "ANULADA" | string
  fecha: string
  deposito: string
  ordenCompraReferencia: string | null
  remitoReferencia: string | null
  recepcionReferencia: string | null
  responsable: string
  resolucion: string
  impactoStock: string
  requiereNotaCredito: boolean
  diferenciasClave: string[]
  total: number
  items: CompraDevolucionItem[]
  comprobanteReferencia?: string
}

export interface CompraSolicitudResumen {
  id: string
  sucursalId: number
  sucursalDescripcion: string
  depositoId: number
  depositoDescripcion: string
  itemId: number
  codigo: string
  descripcion: string
  stockActual: number
  stockMinimo: number
  faltante: number
  sugerido: number
  costoEstimado: number
  severidad: "critica" | "urgente" | "normal" | string
  estadoReposicion: string
  coberturaObjetivo: string
  precioCosto: number
  stockMaximo: number | null
  categoriaDescripcion: string | null
  unidadMedidaDescripcion: string | null
  manejaStock: boolean
  proveedorPreferido: string | null
}

export interface CotizacionCompraItem {
  id: number
  itemId: number | null
  codigo: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  total: number
  subtotal: number
}

export interface CotizacionCompraListItem {
  id: number
  sucursalId: number
  requisicionId: number | null
  proveedorId: number
  proveedorRazonSocial: string
  proveedor: string
  requisicionReferencia: string | null
  fecha: string
  fechaVencimiento: string | null
  total: number
  estado: string
  estadoLegacy: string
  cantidadItems: number
  createdAt: string
}

export interface CotizacionCompraDetalle extends CotizacionCompraListItem {
  observacion: string | null
  items: CotizacionCompraItem[]
}

export interface CrearCotizacionCompraItemDto {
  itemId: number | null
  descripcion: string
  cantidad: number
  precioUnitario: number
}

export interface CrearCotizacionCompraDto {
  sucursalId: number
  requisicionId: number | null
  proveedorId: number
  fecha: string
  fechaVencimiento: string | null
  observacion: string | null
  items: CrearCotizacionCompraItemDto[]
}

export interface RequisicionCompraItem {
  id: number
  itemId: number | null
  codigo: string
  descripcion: string
  cantidad: number
  unidadMedida: string
  observacion: string | null
}

export interface RequisicionCompraListItem {
  id: number
  sucursalId: number
  solicitanteId: number
  solicitanteNombre: string
  solicitante: string
  fecha: string
  descripcion: string
  motivo: string
  estado: string
  estadoLegacy: string
  requisicionReferencia: string
  cantidadItems: number
  createdAt: string
}

export interface RequisicionCompraDetalle extends RequisicionCompraListItem {
  observacion: string | null
  items: RequisicionCompraItem[]
}

export interface CrearRequisicionCompraItemDto {
  itemId: number | null
  descripcion: string
  cantidad: number
  unidadMedida: string
  observacion: string | null
}

export interface CrearRequisicionCompraDto {
  sucursalId: number
  solicitanteId: number
  fecha: string
  descripcion: string
  observacion: string | null
  items: CrearRequisicionCompraItemDto[]
}

export type ComprasPagedResult<T> = PagedResult<T>
