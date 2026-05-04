export interface MotivoDebitoVenta {
  id: number
  codigo: string
  descripcion: string
  esFiscal: boolean
  requiereDocumentoOrigen: boolean
  afectaCuentaCorriente: boolean
  activo: boolean
}

export interface VentaDocumentoItemInput {
  itemId: number
  descripcion?: string
  cantidad: number
  cantidadBonificada?: number
  precioUnitario: number
  descuentoPct?: number
  alicuotaIvaId: number
  depositoId?: number | null
  orden?: number
  lote?: string | null
  serie?: string | null
  fechaVencimiento?: string | null
  unidadMedidaId?: number | null
  observacionRenglon?: string | null
  precioListaOriginal?: number | null
  comisionVendedorRenglon?: number | null
  comprobanteItemOrigenId?: number | null
  cantidadDocumentoOrigen?: number | null
  precioDocumentoOrigen?: number | null
}

export interface CreateNotaDebitoVentaDto {
  sucursalId: number
  puntoFacturacionId?: number | null
  tipoComprobanteId: number
  fecha: string
  fechaVencimiento?: string | null
  terceroId: number
  monedaId: number
  cotizacion: number
  percepciones: number
  observacion?: string | null
  comprobanteOrigenId?: number | null
  motivoDebitoId: number
  motivoDebitoObservacion?: string | null
  items: VentaDocumentoItemInput[]
  listaPreciosId?: number | null
  vendedorId?: number | null
  canalVentaId?: number | null
  condicionPagoId?: number | null
  plazoDias?: number | null
  emitir?: boolean
}

export interface CreateNotaCreditoVentaDto {
  sucursalId: number
  puntoFacturacionId?: number | null
  tipoComprobanteId: number
  fecha: string
  fechaVencimiento?: string | null
  terceroId: number
  monedaId: number
  cotizacion: number
  percepciones: number
  observacion?: string | null
  comprobanteOrigenId?: number | null
  items: VentaDocumentoItemInput[]
  reingresaStock?: boolean
  acreditaCuentaCorriente?: boolean
  motivoDevolucion?: number
  observacionDevolucion?: string | null
  autorizadorDevolucionId?: number | null
}
