export interface PeriodoIvaDto {
  id: number
  ejercicioId: number
  sucursalId: number
  periodo: string
  periodoDescripcion?: string
  cerrado: boolean
  createdAt?: string
}

export interface AbrirPeriodoIvaDto {
  sucursalId: number
  ejercicioId: number
  periodo: string
}
