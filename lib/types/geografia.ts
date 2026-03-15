export interface Pais {
  id: number
  codigo: string
  descripcion: string
}

export interface Provincia {
  id: number
  paisId: number
  codigo?: string
  descripcion: string
}

export interface Localidad {
  id: number
  provinciaId: number
  codigoPostal?: string
  descripcion: string
}

export interface Barrio {
  id: number
  localidadId: number
  descripcion: string
}
