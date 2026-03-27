export type TipoPersoneria = "FISICA" | "JURIDICA"

export interface TerceroPerfilComercial {
  terceroId?: number
  zonaComercialId?: number | null
  zonaComercialDescripcion?: string | null
  rubro?: string | null
  subrubro?: string | null
  sector?: string | null
  riesgoCrediticio?: string | null
  condicionCobranza?: string | null
  saldoMaximoVigente?: number | null
  vigenciaSaldo?: string | null
  condicionVenta?: string | null
  plazoCobro?: string | null
  facturadorPorDefecto?: string | null
  minimoFacturaMipymes?: number | null
  observacionComercial?: string | null
  updatedAt?: string | null
}

export interface TerceroContacto {
  id?: number | string
  terceroId?: number
  nombre?: string | null
  cargo?: string | null
  email?: string | null
  telefono?: string | null
  sector?: string | null
  principal?: boolean
  orden?: number | null
}

export interface TerceroSucursalEntrega {
  id?: number | string
  terceroId?: number
  descripcion?: string | null
  direccion?: string | null
  localidad?: string | null
  responsable?: string | null
  telefono?: string | null
  horario?: string | null
  principal?: boolean
  orden?: number | null
}

export interface TerceroTransporte {
  id?: number | string
  terceroId?: number
  transportistaId?: number | null
  transportistaNombre?: string | null
  nombre?: string | null
  servicio?: string | null
  zona?: string | null
  frecuencia?: string | null
  observacion?: string | null
  activo?: boolean
  principal?: boolean
  orden?: number | null
}

export interface TerceroVentanaCobranza {
  id?: number | string
  terceroId?: number
  dia?: string | null
  franja?: string | null
  canal?: string | null
  responsable?: string | null
  principal?: boolean
  orden?: number | null
}

export interface Tercero {
  id: number
  legajo?: string | null
  tipoPersoneria?: TipoPersoneria | null
  razonSocial: string
  nombre?: string | null
  apellido?: string | null
  nombreFantasia: string | null
  tipoDocumentoId?: number | null
  tipoDocumentoDescripcion?: string | null
  nroDocumento: string | null
  condicionIvaId: number
  condicionIvaDescripcion?: string
  esEntidadGubernamental?: boolean
  claveFiscal?: string | null
  valorClaveFiscal?: string | null
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
  categoriaDescripcion?: string | null
  limiteCredito: number | null
  facturable: boolean
  cobradorId: number | null
  cobradorNombre?: string | null
  pctComisionCobrador: number
  vendedorId: number | null
  vendedorNombre?: string | null
  pctComisionVendedor: number
  observacion: string | null
  sucursalId?: number | null
  sucursalDescripcion?: string | null
  activo: boolean
  createdAt: string
  updatedAt?: string
  deletedAt?: string | null
  perfilComercial?: TerceroPerfilComercial | null
  contactos?: TerceroContacto[]
  sucursalesEntrega?: TerceroSucursalEntrega[]
  transportes?: TerceroTransporte[]
  ventanasCobranza?: TerceroVentanaCobranza[]
}

export interface CreateTerceroDto {
  legajo?: string | null
  tipoPersoneria?: TipoPersoneria | null
  razonSocial: string
  nombre?: string | null
  apellido?: string | null
  nombreFantasia?: string | null
  tipoDocumentoId?: number | null
  nroDocumento?: string | null
  condicionIvaId: number
  esEntidadGubernamental?: boolean
  claveFiscal?: string | null
  valorClaveFiscal?: string | null
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
  sucursalId?: number | null
}

export interface UpdateTerceroDto {
  id: number
  razonSocial: string
  nombreFantasia?: string | null
  tipoPersoneria?: TipoPersoneria | null
  nombre?: string | null
  apellido?: string | null
  esEntidadGubernamental?: boolean
  claveFiscal?: string | null
  valorClaveFiscal?: string | null
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
