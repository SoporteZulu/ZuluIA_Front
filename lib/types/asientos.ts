export interface AsientoLinea {
  id: number
  cuentaId: number
  codigoCuenta?: string | null
  denominacion?: string | null
  debe: number
  haber: number
  observacion: string | null
}

export interface Asiento {
  id: number
  numero?: number | null
  ejercicioId: number
  sucursalId: number | null
  fecha: string
  descripcion: string
  estado: string // "BORRADOR" | "PUBLICADO" | "ANULADO"
  totalDebe?: number | null
  totalHaber?: number | null
  createdAt: string
}

export interface AsientoDetalle extends Asiento {
  lineas: AsientoLinea[]
}

export interface PlanCuenta {
  id: number
  ejercicioId: number
  integradoraId: number | null
  codigoCuenta: string
  denominacion: string
  nivel: number
  ordenNivel: string | null
  imputable: boolean
  tipo: string | null
  saldoNormal: string | null
}

export interface CreateAsientoDto {
  ejercicioId: number
  sucursalId?: number | null
  fecha: string
  descripcion: string
  lineas: {
    cuentaId: number
    debe: number
    haber: number
    observacion?: string
  }[]
}

export interface BalanceLinea {
  cuentaId: number
  codigoCuenta: string
  denominacion: string
  nivel: number
  sumasDebe: number
  sumasHaber: number
  saldoDeudor: number
  saldoAcreedor: number
}

export interface BalanceSumasYSaldos {
  ejercicioId: number
  ejercicioDescripcion: string
  desde: string
  hasta: string
  lineas: BalanceLinea[]
  totalDebe: number
  totalHaber: number
  totalSaldoDeudor: number
  totalSaldoAcreedor: number
}

export interface MayorLinea {
  id: number
  asientoId: number
  numero: number | null
  fecha: string
  asientoDescripcion: string
  ejercicioId: number
  sucursalId: number | null
  debe: number
  haber: number
  lineaDescripcion: string | null
  centroCostoId: number | null
}

export interface MayorResult {
  lineas: MayorLinea[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}
