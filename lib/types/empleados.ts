import type { PagedResult } from './items'

export interface Empleado {
  id: number
  terceroId: number
  sucursalId: number
  legajo?: string
  razonSocial?: string
  cuit?: string
  categoria?: string
  estado: string
  fechaIngreso?: string
  sueldoBasico?: number
}

export type EmpleadosPagedResult = PagedResult<Empleado>

export interface CreateEmpleadoDto {
  terceroId: number
  sucursalId: number
  legajo?: string
  categoria?: string
  fechaIngreso?: string
  sueldoBasico?: number
}
