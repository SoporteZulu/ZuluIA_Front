export interface Tercero {
  id: number
  razonSocial: string
  nombreFantasia: string | null
  nroDocumento: string | null
  condicionIvaId: number
  condicionIvaDescripcion?: string
  esCliente: boolean
  esProveedor: boolean
  esEmpleado: boolean
  calle: string | null
  nro: string | null
  piso: string | null
  dpto: string | null
  codigoPostal: string | null
  localidadId: number | null
  localidadDescripcion?: string
  barrioId: number | null
  nroIngresosBrutos: string | null
  nroMunicipal: string | null
  telefono: string | null
  celular: string | null
  email: string | null
  web: string | null
  monedaId: number | null
  categoriaId: number | null
  limiteCredito: number | null
  facturable: boolean
  cobradorId: number | null
  pctComisionCobrador: number
  vendedorId: number | null
  pctComisionVendedor: number
  observacion: string | null
  activo: boolean
  createdAt: string
}

export interface CreateTerceroDto {
  razonSocial: string
  nombreFantasia?: string | null
  nroDocumento?: string | null
  condicionIvaId: number
  esCliente: boolean
  esProveedor: boolean
  esEmpleado: boolean
  calle?: string | null
  nro?: string | null
  piso?: string | null
  dpto?: string | null
  codigoPostal?: string | null
  localidadId?: number | null
  barrioId?: number | null
  nroIngresosBrutos?: string | null
  nroMunicipal?: string | null
  telefono?: string | null
  celular?: string | null
  email?: string | null
  web?: string | null
  monedaId?: number | null
  categoriaId?: number | null
  limiteCredito?: number | null
  facturable: boolean
  cobradorId?: number | null
  pctComisionCobrador: number
  vendedorId?: number | null
  pctComisionVendedor: number
  observacion?: string | null
}

export interface CondicionIva {
  id: number
  codigo: number
  descripcion: string
}
