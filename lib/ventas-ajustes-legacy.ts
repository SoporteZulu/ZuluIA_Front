import type { LegacySalesAdjustment } from "@/lib/ventas-legacy-data"

export interface LegacyAdjustmentAction {
  id: string
  descripcion: string
  destino: string
  importe: string
}

export interface LegacyAdjustmentProfile {
  adjustmentId: string
  origen: "Punto de venta" | "Comercial" | "Fiscal" | "Logístico"
  prioridad: "Alta" | "Media" | "Baja"
  resolucion: "Nota de crédito" | "Nota de débito" | "Ajuste interno"
  puntoVenta: string
  canal: string
  autorizadoPor: string
  requiereAprobacion: boolean
  conciliado: boolean
  documentoReferencia: string
  observaciones: string
  acciones: LegacyAdjustmentAction[]
}

export function buildLegacyAdjustmentProfile(row: LegacySalesAdjustment): LegacyAdjustmentProfile {
  return {
    adjustmentId: row.id,
    origen: row.motivo.toLowerCase().includes("punto") ? "Punto de venta" : "Comercial",
    prioridad: row.estado === "BORRADOR" ? "Alta" : row.estado === "EMITIDO" ? "Media" : "Baja",
    resolucion: row.tipo === "Débito" ? "Nota de débito" : "Nota de crédito",
    puntoVenta: "",
    canal: "",
    autorizadoPor: "",
    requiereAprobacion: row.estado !== "APLICADO",
    conciliado: row.estado === "APLICADO",
    documentoReferencia: "",
    observaciones: row.motivo,
    acciones: [
      {
        id: `adjustment-action-${row.id}-1`,
        descripcion: row.motivo,
        destino: row.tipo === "Débito" ? "Emitir nota débito" : "Emitir nota crédito",
        importe: String(row.total),
      },
    ],
  }
}
