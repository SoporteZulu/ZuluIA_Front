export interface EjercicioSucursal {
  id: number
  sucursalId: number
  sucursalDescripcion: string
  usaContabilidad: boolean
}

export interface Ejercicio {
  id: number
  descripcion: string
  fechaInicio: string
  fechaFin: string
  mascaraCuentaContable: string
  cerrado: boolean
  createdAt: string
  sucursales: EjercicioSucursal[]
}

export interface CreateEjercicioDto {
  descripcion: string
  fechaInicio: string
  fechaFin: string
  mascaraCuentaContable: string
  sucursalIds?: number[]
}
