export interface AsientoLinea {
  id: number
  cuentaId: number
  codigoCuenta: string
  denominacion: string
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
  totalDebe: number
  totalHaber: number
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
