export interface TipoComprobante {
  id: number
  codigo: string
  descripcion: string
  esVenta: boolean
  esCompra: boolean
  esInterno: boolean
  afectaStock: boolean
  afectaCuentaCorriente: boolean
  generaAsiento: boolean
  tipoAfip: string | null
  letraAfip: string | null
}

export interface ComprobanteItem {
  id: number
  itemId: number
  descripcion: string
  cantidad: number
  cantidadBonificada?: number
  precioUnitario: number
  descuento: number
  alicuotaIvaId?: number
  alicuotaIvaPct: number
  subtotal: number
  totalLinea?: number
  depositoId?: number | null
  depositoDescripcion?: string | null
  comprobanteItemOrigenId?: number | null
  cantidadDocumentoOrigen?: number | null
  precioDocumentoOrigen?: number | null
}

export interface Comprobante {
  id: number
  sucursalId: number
  terceroId: number
  tipoComprobanteId: number
  tipoComprobanteDescripcion?: string
  nroComprobante: string | null
  fecha: string
  fechaVto: string | null
  estado: string // "BORRADOR" | "EMITIDO" | "PAGADO_PARCIAL" | "PAGADO" | "ANULADO"
  netoGravado: number
  netoNoGravado: number
  ivaRi: number
  ivaRni: number
  total: number
  saldo: number
  cae: string | null
  caeFechaVto: string | null
  qrData: string | null
  observacion: string | null
  createdAt: string
}

export interface ComprobanteDetalle extends Comprobante {
  comprobanteOrigenId?: number | null
  comprobanteOrigenNumero?: string | null
  comprobanteOrigenTipo?: string | null
  motivoDevolucion?: number | null
  motivoDevolucionDescripcion?: string | null
  tipoDevolucion?: number | null
  tipoDevolucionDescripcion?: string | null
  autorizadorDevolucionId?: number | null
  autorizadorDevolucionNombre?: string | null
  fechaAutorizacionDevolucion?: string | null
  observacionDevolucion?: string | null
  reingresaStock?: boolean
  acreditaCuentaCorriente?: boolean
  cuentaCorrienteDebe?: number | null
  cuentaCorrienteHaber?: number | null
  cuentaCorrienteSaldoPosterior?: number | null
  cuentaCorrienteDescripcion?: string | null
  cuentaCorrienteRegistradaAt?: string | null
  items: ComprobanteItem[]
}

export interface SaldoPendiente {
  terceroId: number
  sucursalId: number | null
  comprobantes: Comprobante[]
  totalSaldo: number
}

export interface EmitirComprobanteDto {
  sucursalId: number
  terceroId: number
  tipoComprobanteId: number
  fecha: string
  fechaVto?: string | null
  observacion?: string | null
  items: {
    itemId: number
    descripcion?: string
    cantidad: number
    precioUnitario: number
    descuento?: number
    alicuotaIvaId: number
  }[]
}

export interface ComprobanteEstadistica {
  tipoComprobanteId: number
  tipoComprobanteDescripcion: string
  cantidad: number
  totalNeto: number
  totalIva: number
  total: number
  saldoPendiente: number
}

export interface EstadisticasComprobantes {
  sucursalId: number
  desde: string
  hasta: string
  porTipo: ComprobanteEstadistica[]
}
