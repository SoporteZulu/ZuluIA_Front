export interface CobroMedio {
  id: number
  formaPagoId: number
  formaPagoDescripcion: string
  cajaId: number
  cajaDescripcion: string
  chequeId: number | null
  importe: number
  monedaId: number
  monedaSimbolo: string
  cotizacion: number
}

export interface Cobro {
  id: number
  sucursalId: number
  terceroId: number
  fecha: string
  total: number
  estado: string
  createdAt: string
}

export interface CobroDetalle extends Cobro {
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
