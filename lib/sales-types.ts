import { BaseEntity } from './types'

// Customer Types
export type CustomerType = 'lead' | 'cliente_final'
export type CustomerGroup = 'mayorista' | 'minorista' | 'distribuidor' | 'vip' | 'gobierno'
export type CustomerStatus = 'activo' | 'inactivo' | 'moroso' | 'bloqueado'

export interface Customer extends BaseEntity {
  razonSocial: string
  nombreFantasia?: string
  cuitCuil: string
  tipoDocumento: 'CUIT' | 'DNI' | 'CUIL' | 'Pasaporte'
  tipo: CustomerType
  grupo: CustomerGroup
  estado: CustomerStatus
  condicionImpositiva: 'responsable_inscripto' | 'monotributista' | 'exento' | 'consumidor_final'
  emailPrincipal: string
  telefono?: string
  sitioWeb?: string
  vendedorAsignado?: string
  fechaAlta: Date
  creditoLimite: number
  creditoUtilizado: number
  diasMora?: number
  listaAsignada?: string
  descuentoGeneral?: number
  direccionPrincipal?: string
  coordenadas?: { lat: number; lng: number }
  // Códigos Fiscales
  codigosPercepcion?: CodigoFiscal[]
  codigoRetencionGanancias?: string
  codigoRetencionIva?: string
  // Condiciones Comerciales
  condicionesPago?: CondicionPago
  // Información Financiera
  cuentasBancarias?: CustomerBankAccount[]
  tarjetasCredito?: CustomerCreditCard[]
  saldoCuentaCorriente: number
  facturasPendientes?: number
  balanceCliente?: CustomerBalance
  // Relaciones
  contactos?: CustomerContact[]
  direcciones?: CustomerAddress[]
}

export interface CodigoFiscal {
  codigo: string
  provincia: string
  tipo: 'percepcion' | 'retencion'
}

export interface CondicionPago {
  plazo: 30 | 60 | 90 | 0
  diaPagoPreferido?: number
  sinLimiteCredito?: boolean
}

export interface CustomerContact {
  id: string
  nombreCompleto: string
  cargo?: string
  email: string
  telefonoFijo?: string
  celular?: string
  esPrincipal: boolean
  notas?: string
}

export interface CustomerAddress {
  id: string
  tipo: 'fiscal' | 'entrega' | 'facturacion' | 'otra'
  calle: string
  numero: string
  piso?: string
  dpto?: string
  codigoPostal: string
  ciudad: string
  provincia: string
  pais: string
  esPrincipal: boolean
  coordenadas?: { lat: number; lng: number }
}

export interface CustomerBankAccount {
  id: string
  banco: string
  tipoCuenta: 'cuenta_corriente' | 'caja_ahorro'
  cbu?: string
  alias?: string
}

export interface CustomerCreditCard {
  id: string
  marca: 'Visa' | 'Mastercard' | 'American Express' | 'Cabal' | 'Otra'
  ultimosDigitos: string
  vencimiento: string
}

export interface CustomerBalance {
  totalComprado: number
  totalPagado: number
  totalPendiente: number
  antiguedadDeuda: {
    dias0_30: number
    dias31_60: number
    dias61_90: number
    dias90_mas: number
  }
}

// Product & Catalog
export interface Product extends BaseEntity {
  sku: string
  nombre: string
  descripcion?: string
  categoria?: string
  linea?: string
  marca?: string
  uom: string
  costoProm: number
  precioVenta: number
  stock: number
  foto?: string
  proveedor?: string
  atributos?: { [key: string]: string }
}

// Price Lists
export type PriceListType = 'minorista' | 'mayorista' | 'especial' | 'promocional'

export interface PriceList extends BaseEntity {
  nombre: string
  tipo: PriceListType
  divisa: 'ARS' | 'USD' | 'EUR'
  vigenciaDesde: Date
  vigenciaHasta?: Date
  esDefault: boolean
  prioridad: number
  clientesAsignados: string[]
  items: PriceListItem[]
}

export interface PriceListItem {
  id: string
  productoId: string
  precioBase: number
  precioLista: number
  margen: number
  variacion: number
}

// Quantity Discounts
export interface QuantityDiscount {
  id: string
  productoId: string
  desdeCant: number
  hastaCant: number
  descuento: number
  precioFinal: number
}

// Promotions
export type PromotionStatus = 'programada' | 'activa' | 'finalizada' | 'suspendida'
export type PromotionType = 'porcentaje' | 'monto_fijo' | 'precio_especial' | '2x1' | '3x2' | 'combo'

export interface Promotion extends BaseEntity {
  nombre: string
  descripcion?: string
  fechaInicio: Date
  fechaFin: Date
  estado: PromotionStatus
  tipo: PromotionType
  descuentoPorcentaje?: number
  descuentoMonto?: number
  precioEspecial?: number
  clientesAplica: 'todos' | 'lista_especifica' | 'seleccionados'
  productosAplica: 'todos' | 'categoria' | 'seleccionados'
  compraMinima?: number
  limiteUsos?: number
  stockPromocional?: number
  noAcumulable: boolean
}

// Sales Orders
export type OrderStatus = 'borrador' | 'confirmado' | 'en_preparacion' | 'despachado' | 'facturado' | 'cancelado'

export interface SalesOrder extends BaseEntity {
  codigo: string
  clienteId: string
  fecha: Date
  entregaEstimada: Date
  vendedor?: string
  fuente: 'web' | 'telefono' | 'vendedor' | 'otro'
  estado: OrderStatus
  items: OrderItem[]
  subtotal: number
  descuentos: number
  iva: number
  total: number
  observacionesCliente?: string
  notasInternas?: string
}

export interface OrderItem {
  id: string
  productoId: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuentoPorcentaje: number
  subtotal: number
  iva: number
  total: number
}

// Remitos/Dispatches
export type DispatchStatus = 'pendiente' | 'en_transito' | 'entregado'

export interface Remito extends BaseEntity {
  codigo: string
  ordenId: string
  clienteId: string
  fechaDespacho: Date
  tipoDespacho: 'total' | 'parcial'
  items: RemitoItem[]
  direccionEntrega?: string
  transporte?: string
  chofer?: string
  patente?: string
  estado: DispatchStatus
  observaciones?: string
}

export interface RemitoItem {
  id: string
  productoId: string
  descripcion: string
  cantidad: number
  uom: string
}

// Invoices
export type InvoiceType = 'factura_a' | 'factura_b' | 'factura_c'

export interface Invoice extends BaseEntity {
  codigo: string
  tipo: InvoiceType
  puntoVenta: string
  numero: string
  remitoId?: string
  ordenId?: string
  clienteId: string
  fecha: Date
  fechaVencimiento: Date
  estado: 'borrador' | 'emitida' | 'pagada' | 'cancelada'
  items: InvoiceItem[]
  subtotal: number
  iva21: number
  iva105: number
  iva27: number
  percepciones?: number
  total: number
  cae?: string
  vencimientoCae?: Date
  codigoBarras?: string
}

export interface InvoiceItem {
  id: string
  productoId: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  alicuotaIva: 21 | 10.5 | 27 | 0
  subtotal: number
  iva: number
  total: number
}

// Credit/Debit Notes
export type NoteType = 'nota_credito' | 'nota_debito'
export type NoteMotive = 'devolucion' | 'descuento' | 'error' | 'anulacion'

export interface CreditNote extends BaseEntity {
  codigo: string
  tipo: NoteType
  facturaOriginal: string
  clienteId: string
  motivo: NoteMotive
  alcance: 'total' | 'parcial'
  items: CreditNoteItem[]
  subtotal: number
  iva: number
  total: number
  observaciones?: string
  estado: 'borrador' | 'emitida' | 'cancelada'
}

export interface CreditNoteItem {
  id: string
  productoId: string
  cantidad: number
  precioUnitario: number
}

// Special Prices
export interface PrecioEspecial extends BaseEntity {
  clienteId: string
  productoId: string
  precioListaActual: number
  precioEspecial: number
  vigenciaDesde: Date
  vigenciaHasta?: Date
  esIndefinido: boolean
  motivo: string
  autorizadoPor?: string
  requiereAprobacion: boolean
  estado?: 'activo' | 'vencido' | 'pendiente'
}

// Cuenta Corriente
export interface MovimientoCC {
  id: string
  clienteId: string
  fecha: Date
  tipo: 'factura' | 'pago' | 'nota_credito' | 'nota_debito'
  comprobante: string
  debe: number
  haber: number
  saldo: number
  descripcion?: string
}
