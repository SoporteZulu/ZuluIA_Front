import type { LegacySalesAllocation } from "@/lib/ventas-legacy-data"

export interface LegacyAllocationLine {
  id: string
  referencia: string
  tipo: string
  importe: string
}

export interface LegacyAllocationProfile {
  allocationId: string
  modalidad: "Manual" | "Masiva" | "Desimputación"
  origen: string
  prioridad: "Alta" | "Media" | "Baja"
  conciliado: boolean
  permiteDesimputar: boolean
  cuentaPuente: string
  operador: string
  lote: string
  observaciones: string
  lineas: LegacyAllocationLine[]
}

export function buildLegacyAllocationProfile(row: LegacySalesAllocation): LegacyAllocationProfile {
  return {
    allocationId: row.id,
    modalidad: row.estado === "PENDIENTE" ? "Manual" : "Masiva",
    origen: row.centroCosto,
    prioridad: row.estado === "PENDIENTE" ? "Alta" : row.estado === "OBSERVADA" ? "Media" : "Baja",
    conciliado: row.estado === "IMPUTADA",
    permiteDesimputar: row.estado !== "PENDIENTE",
    cuentaPuente: row.cuenta,
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
