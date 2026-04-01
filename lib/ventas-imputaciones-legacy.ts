import type { LegacySalesAllocation } from "@/lib/ventas-legacy-data"

export interface LegacyAllocationLine {
  id: string
  referencia: string
  tipo: string
  importe: string
}

export interface LegacyAllocationProfile {
  allocationId: string
  cliente: string
  terceroId: number | null
  sucursalId: number | null
  estado: LegacySalesAllocation["estado"]
  modalidad: "Manual" | "Masiva" | "Desimputación"
  fechaAplicacion: string
  fechaOrigen: string
  fechaDestino: string
  origen: string
  sucursal: string
  prioridad: "Alta" | "Media" | "Baja"
  conciliado: boolean
  permiteDesimputar: boolean
  cuentaPuente: string
  comprobanteOrigen: string
  comprobanteDestino: string
  saldoComprobante: string
  saldoDestino: string
  importeAplicado: string
  operador: string
  lote: string
  observaciones: string
  lineas: LegacyAllocationLine[]
}

export function buildLegacyAllocationProfile(row: LegacySalesAllocation): LegacyAllocationProfile {
  return {
    allocationId: row.id,
    cliente: row.cliente,
    terceroId: null,
    sucursalId: null,
    estado: row.estado,
    modalidad: row.estado === "PENDIENTE" ? "Manual" : "Masiva",
    fechaAplicacion: row.fecha,
    fechaOrigen: row.fecha,
    fechaDestino: "",
    origen: row.centroCosto,
    sucursal: "Sucursal principal",
    prioridad: row.estado === "PENDIENTE" ? "Alta" : row.estado === "OBSERVADA" ? "Media" : "Baja",
    conciliado: row.estado === "IMPUTADA",
    permiteDesimputar: row.estado !== "PENDIENTE",
    cuentaPuente: row.cuenta,
    comprobanteOrigen: row.comprobante,
    comprobanteDestino: "",
    saldoComprobante: String(row.importe),
    saldoDestino: String(row.importe),
    importeAplicado: String(row.importe),
    operador: "",
    lote: "",
    observaciones: "",
    lineas: [
      {
        id: `allocation-line-${row.id}-1`,
        referencia: row.comprobante,
        tipo: row.estado === "IMPUTADA" ? "Aplicación" : "Pendiente",
        importe: String(row.importe),
      },
    ],
  }
}
