export interface Sucursal {
  id: number
  descripcion: string
  activo: boolean
  direccion?: string | null
  cuit?: string | null
  codigoPostal?: string | null
  telefono?: string | null
  email?: string | null
  razonSocial?: string | null
}

export interface CreateSucursalDto {
  descripcion: string
  razonSocial?: string
  cuit?: string
  direccion?: string
  codigoPostal?: string
  telefono?: string
  email?: string
}
