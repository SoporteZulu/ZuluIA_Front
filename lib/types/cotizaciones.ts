export interface CotizacionMoneda {
  id: number
  monedaId: number
  monedaDescripcion?: string
  monedaCodigo?: string
  fecha: string
  cotizacion: number
}

export interface CreateCotizacionDto {
  monedaId: number
  fecha: string
  cotizacion: number
}
