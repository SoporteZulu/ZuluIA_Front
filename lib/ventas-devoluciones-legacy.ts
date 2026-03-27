import type { LegacySalesReturn } from "@/lib/ventas-legacy-data"

export interface LegacyReturnResolutionLine {
  id: string
  descripcion: string
  accion: string
  cantidad: string
}

export interface LegacyReturnProfile {
  returnId: string
  modalidad: "No valorizada" | "Con stock" | "Mixta"
  canalIngreso: string
  prioridad: "Alta" | "Media" | "Baja"
  sectorResponsable: string
  condicionMercaderia: string
  depositoDestino: string
  requiereRetiro: boolean
  generaNotaCredito: boolean
  notaCreditoReferencia: string
  reingresaStock: boolean
  autorizadoPor: string
  causaRaiz: string
  observaciones: string
  items: LegacyReturnResolutionLine[]
}

export function buildLegacyReturnProfile(row: LegacySalesReturn): LegacyReturnProfile {
  return {
    returnId: row.id,
    modalidad: row.deposito.toLowerCase().includes("planta") ? "Con stock" : "No valorizada",
    canalIngreso: "Postventa",
    prioridad: row.estado === "ABIERTA" ? "Alta" : row.estado === "APROBADA" ? "Media" : "Baja",
    sectorResponsable: "Ventas / Postventa",
    condicionMercaderia: row.estado === "CERRADA" ? "Resuelta" : "Pendiente de inspección",
    depositoDestino: row.deposito,
    requiereRetiro: true,
    generaNotaCredito: row.estado !== "ABIERTA",
    notaCreditoReferencia: "",
    reingresaStock:
      row.deposito.toLowerCase().includes("central") ||
      row.deposito.toLowerCase().includes("planta"),
    autorizadoPor: "",
    causaRaiz: row.motivo,
    observaciones: "",
    items: [
      {
        id: `return-line-${row.id}-1`,
        descripcion: row.motivo,
        accion: row.estado === "ABIERTA" ? "Inspección" : "Resolución comercial",
        cantidad: "1",
      },
    ],
  }
}
