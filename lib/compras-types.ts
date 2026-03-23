import type { BaseEntity } from "./types"

// ============================================
// PROVEEDORES
// ============================================

export interface Supplier extends BaseEntity {
  codigo: string
  razonSocial: string
  nombreComercial?: string
  cuit: string
  condicionImpositiva: "responsable_inscripto" | "monotributista" | "exento" | "consumidor_final"
  categoria: string[]
  sitioWeb?: string
  estado: "activo" | "inactivo"
  proveedorPreferido: boolean
  requiereAprobacionEspecial: boolean
  rating: number
  observaciones?: string
}

export interface SupplierContact extends BaseEntity {
  proveedorId: string
  nombre: string
  cargo?: string
  email?: string
  telefono?: string
  esPrincipal: boolean
}

export interface SupplierAddress extends BaseEntity {
  proveedorId: string
  tipo: "fiscal" | "entrega" | "facturacion"
  calle: string
  numero?: string
  piso?: string
  ciudad: string
  provincia: string
  codigoPostal: string
  pais: string
}

export interface PaymentCondition extends BaseEntity {
  codigo: string
  descripcion: string
  tipo: "contado" | "plazo"
  diasPlazo: number
  activo: boolean
}

export interface SupplierCommercialTerms extends BaseEntity {
  proveedorId: string
  condicionPagoId: string
  tiempoEntregaDias: number
  montoMinimo: number
  divisa: "ARS" | "USD" | "EUR"
  incoterms?: string
  metodoEnvioPreferido?: string
}

export interface SupplierBankAccount extends BaseEntity {
  proveedorId: string
  banco: string
  tipoCuenta: "cuenta_corriente" | "caja_ahorro"
  numeroCuenta: string
  cbu: string
  titular: string
}

export interface SupplierProductCatalog extends BaseEntity {
  proveedorId: string
  productoId: string
  codigoProveedor: string
  precioUnitario: number
  uom: string
  vigenciaPrecio: Date
  tiempoEntrega: number
  moq: number
}

// ============================================
// ÓRDENES DE COMPRA
// ============================================

export interface PurchaseOrder extends BaseEntity {
  codigo: string
  proveedorId: string
  fechaEmision: Date
  fechaEntregaEsperada: Date
  almacenId: string
  condicionPagoId: string
  divisa: "ARS" | "USD" | "EUR"
  estado:
    | "borrador"
    | "enviada"
    | "confirmada"
    | "en_transito"
    | "recibida_parcial"
    | "recibida_total"
    | "cerrada"
    | "cancelada"
  estadoAprobacion: "pendiente" | "aprobada" | "rechazada"
  aprobadorId?: string
  prioridad: "normal" | "urgente" | "critica"
  referencia?: string
  subtotal: number
  descuento: number
  impuestos: number
  total: number
  items: PurchaseOrderItem[]
  metodoEnvio?: string
  direccionEntrega?: string
  terminosPago?: string
  notasEspeciales?: string
  documentacionRequerida?: string[]
}

export interface PurchaseOrderItem {
  id: string
  ordenCompraId: string
  productoId: string
  codigoProveedor?: string
  descripcion: string
  cantidad: number
  cantidadRecibida: number
  cantidadRechazada: number
  uom: string
  precioUnitario: number
  descuentoPorcentaje: number
  subtotal: number
}

// ============================================
// RECEPCIONES
// ============================================

export interface MerchandiseReceipt extends BaseEntity {
  codigo: string
  ordenCompraId: string
  fechaRecepcion: Date
  almacenId: string
  usuarioReceptorId: string
  estado: "completa" | "con_rechazos"
  observaciones?: string
  items: MerchandiseReceiptItem[]
}

export interface MerchandiseReceiptItem {
  id: string
  ordenRecepcionId: string
  itemOcId: string
  productoId: string
  cantidadRecibida: number
  cantidadRechazada: number
  motivoRechazo?: string
  conforme: boolean
}

export interface MerchandiseReturn extends BaseEntity {
  codigo: string
  ordenRecepcionId?: string
  proveedorId: string
  fechaDevolucion: Date
  motivoDetallado: string
  metodoDevolucion: "retiro_proveedor" | "envio" | "credito_directo"
  items: MerchandiseReturnItem[]
  estado: "pendiente" | "procesada" | "completada"
}

export interface MerchandiseReturnItem {
  id: string
  devolucionId: string
  productoId: string
  cantidad: number
  motivoEspecifico: string
}

// ============================================
// EVALUACIÓN DE PROVEEDORES
// ============================================

export interface SupplierEvaluation extends BaseEntity {
  proveedorId: string
  ordenCompraId: string
  fecha: Date
  puntualidadScore: number
  conformidadScore: number
  cumplimientoScore: number
  comentarioCualitativo?: string
  usuarioEvaluadorId: string
}

// ============================================
// SOLICITUDES DE COMPRA
// ============================================

export interface PurchaseRequest extends BaseEntity {
  codigo: string
  origen: "automatico" | "manual"
  estado: "pendiente" | "aprobada" | "convertida_oc" | "rechazada" | "cancelada"
  fechaCreacion: Date
  proveedorSugeridoId?: string
  usuarioSolicitanteId: string
  motivo?: string
  prioridad: "normal" | "urgente" | "critica"
  items: PurchaseRequestItem[]
}

export interface PurchaseRequestItem {
  id: string
  solicitudId: string
  productoId: string
  cantidadSolicitada: number
  cantidadAprobada: number
  motivo?: string
}

// ============================================
// PARÁMETROS DE REABASTECIMIENTO
// ============================================

export interface ReplenishmentParams extends BaseEntity {
  productoId: string
  stockMinimo: number
  puntoReorden: number
  stockMaximo: number
  cantidadReorden?: number
  leadTimeDias: number
  proveedorPreferidoId: string
  reabastecimientoAutoHabilitado: boolean
  metodoCalculo: "cantidad_fija" | "hasta_maximo" | "dias_cobertura" | "sugerencia_ia"
  diasCoberturaDeseados?: number
}

// ============================================
// DOCUMENTOS DE COMPRA
// ============================================

export interface PurchaseDocument extends BaseEntity {
  tipo: "factura" | "nota_credito" | "nota_debito" | "remito"
  numero: string
  puntoVenta: string
  letra: "A" | "B" | "C"
  fecha: Date
  fechaVencimiento?: Date
  proveedorId: string
  ordenCompraId?: string
  recepcionId?: string
  estado: "borrador" | "pendiente" | "aprobada" | "pagada" | "anulada"
  divisa: "ARS" | "USD" | "EUR"
  tipoCambio: number
  items: PurchaseDocumentItem[]
  subtotal: number
  descuento: number
  iva21: number
  iva105: number
  iva27: number
  otrosImpuestos: number
  total: number
  observaciones?: string
  archivoAdjunto?: string
}

export interface PurchaseDocumentItem {
  id: string
  productoId?: string
  descripcion: string
  cantidad: number
  uom: string
  precioUnitario: number
  descuentoPorcentaje: number
  alicuotaIva: 21 | 10.5 | 27 | 0
  subtotal: number
  iva: number
  total: number
}

// ============================================
// CUENTA CORRIENTE
// ============================================

export interface SupplierCurrentAccount extends BaseEntity {
  proveedorId: string
  tipoMovimiento: "debito" | "credito"
  documentoId?: string
  fecha: Date
  descripcion: string
  importe: number
  saldo: number
}

// ============================================
// NOTIFICACIONES
// ============================================

export interface Notification extends BaseEntity {
  tipo: "alerta" | "info" | "exito" | "error"
  usuarioId: string
  titulo: string
  mensaje: string
  fecha: Date
  leida: boolean
  enlaceEntidad?: string
  metadata?: Record<string, unknown>
}

// ============================================
// FLUJOS DE APROBACIÓN
// ============================================

export interface ApprovalFlow extends BaseEntity {
  documentoTipo: "orden_compra" | "solicitud_compra"
  nivel: number
  montoMinimo: number
  montoMaximo: number
  aprobadorUsuarioId: string
  departamentoId?: string
}

// ============================================
// TIPOS AUXILIARES
// ============================================

export interface Warehouse extends BaseEntity {
  codigo: string
  nombre: string
  direccion: string
  activo: boolean
}

export interface Product extends BaseEntity {
  sku: string
  nombre: string
  descripcion?: string
  categoria: string
  uom: string
  stockActual: number
  precioUnitario: number
  activo: boolean
}

export interface User {
  id: string
  nombre: string
  email: string
  rol: string
}
