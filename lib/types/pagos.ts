export interface PagoMedio {
  id: number
  cajaId: number
  cajaDescripcion: string
  formaPagoId: number
  formaPagoDescripcion: string
  chequeId: number | null
  importe: number
  monedaId: number
  monedaSimbolo: string
  cotizacion: number
}

export interface Retencion {
  id: number
  tipo: string
  importe: number
  nroCertificado: string | null
  fecha: string
}

export interface Pago {
  id: number
  sucursalId: number
  terceroId: number
  terceroRazonSocial: string
  fecha: string
  monedaId: number
  monedaSimbolo: string
  total: number
  estado: string
  createdAt: string
}

export interface PagoDetalle extends Pago {
  cotizacion: number
  observacion: string | null
  medios: PagoMedio[]
  retenciones: Retencion[]
}

export interface RegistrarPagoDto {
  sucursalId: number
  terceroId: number
  fecha: string
  monedaId: number
  cotizacion?: number
  observacion?: string
  medios: {
    formaPagoId: number
    cajaId: number
    importe: number
    monedaId: number
    cotizacion?: number
    chequeId?: number | null
  }[]
  retenciones?: {
    tipo: string
    importe: number
    nroCertificado?: string
    fecha: string
  }[]
  imputaciones?: {
    comprobanteId: number
    importe: number
  }[]
}
