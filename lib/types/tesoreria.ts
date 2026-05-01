export interface TesoreriaMovimiento {
  id: number
  sucursalId: number
  cajaCuentaId: number
  cajaCuentaDescripcion?: string
  fecha: string
  tipoOperacion: string
  sentido: string
  terceroId?: number | null
  terceroNombre?: string | null
  importe: number
  monedaId: number
  monedaCodigo?: string
  cotizacion: number
  referenciaTipo?: string | null
  referenciaId?: number | null
  observacion?: string | null
  anulado: boolean
  createdAt: string
  createdBy?: number | null
}

export interface Vale extends TesoreriaMovimiento {
  reintegrado: boolean
  fechaReintegro?: string | null
}

export interface Reintegro extends TesoreriaMovimiento {
  valeId?: number | null
}

export interface RegistrarValeDto {
  sucursalId: number
  cajaCuentaId: number
  fecha: string
  importe: number
  monedaId: number
  cotizacion: number
  terceroId?: number | null
  observacion?: string | null
}

export interface RegistrarReintegroValeDto {
  sucursalId: number
  cajaCuentaId: number
  fecha: string
  importe: number
  monedaId: number
  cotizacion: number
  terceroId?: number | null
  observacion?: string | null
}
