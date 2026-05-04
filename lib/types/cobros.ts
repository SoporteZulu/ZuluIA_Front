export interface CobroMedio {
  id: number
  formaPagoId: number
  formaPagoDescripcion: string
  cajaId: number
  cajaDescripcion: string
  chequeId: number | null
  chequeNumero?: string | null
  chequeBanco?: string | null
  importe: number
  monedaId: number
  monedaSimbolo: string
  cotizacion: number
  bancoOrigen?: string | null
  bancoDestino?: string | null
  numeroOperacion?: string | null
  fechaAcreditacion?: string | null
  terminalPOS?: string | null
  numeroCupon?: string | null
  numeroLote?: string | null
  codigoAutorizacion?: string | null
  cantidadCuotas?: number | null
  planCuotas?: string | null
  fechaAcreditacionEstimada?: string | null
}

export interface Cobro {
  id: number
  sucursalId: number
  terceroId: number
  terceroRazonSocial?: string | null
  fecha: string
  monedaId?: number
  monedaSimbolo?: string | null
  cotizacion?: number
  total: number
  estado: string
  nroCierre?: number | null
  createdAt?: string
}

export interface CobroDetalle extends Cobro {
  sucursalDescripcion?: string | null
  terceroLegajo?: string | null
  terceroCuit?: string | null
  terceroCondicionIva?: string | null
  terceroDomicilioSnapshot?: string | null
  observacion?: string | null
  observacionInterna?: string | null
  vendedorId?: number | null
  vendedorNombre?: string | null
  vendedorLegajo?: string | null
  cobradorId?: number | null
  cobradorNombre?: string | null
  cobradorLegajo?: string | null
  zonaComercialId?: number | null
  zonaComercialDescripcion?: string | null
  usuarioCajeroId?: number | null
  usuarioCajeroNombre?: string | null
  ventanillaTurno?: string | null
  tipoCobro?: string | null
  totalEfectivo?: number
  totalCheques?: number
  totalElectronico?: number
  createdBy?: number | null
  createdByUsuario?: string | null
  updatedAt?: string | null
  updatedBy?: number | null
  updatedByUsuario?: string | null
  medios: CobroMedio[]
}

export interface RegistrarCobroDto {
  sucursalId: number
  terceroId: number
  fecha: string
  monedaId: number
  cotizacion: number
  observacion?: string
  medios: {
    formaPagoId: number
    cajaId: number
    importe: number
    monedaId: number
    cotizacion?: number
    chequeId?: number | null
  }[]
  comprobantesAImputar: {
    comprobanteId: number
    importe: number
  }[]
}
