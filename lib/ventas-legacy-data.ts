export type LegacySalesDebitNote = {
  id: string
  cliente: string
  referencia: string
  motivo: string
  alcance: string
  estado: "BORRADOR" | "EMITIDA" | "APLICADA"
  fecha: string
  total: number
  observacion: string
}

export type LegacySalesReturn = {
  id: string
  cliente: string
  factura: string
  remito: string
  motivo: string
  estado: "ABIERTA" | "APROBADA" | "CERRADA"
  fecha: string
  deposito: string
  total: number
}

export type LegacySalesAdjustment = {
  id: string
  cliente: string
  tipo: "Débito" | "Crédito"
  motivo: string
  estado: "BORRADOR" | "EMITIDO" | "APLICADO"
  fecha: string
  total: number
}

export type LegacySalesAllocation = {
  id: string
  cliente: string
  comprobante: string
  cuenta: string
  centroCosto: string
  estado: "PENDIENTE" | "IMPUTADA" | "OBSERVADA"
  fecha: string
  importe: number
}

export const legacySalesDebitNotes: LegacySalesDebitNote[] = [
  {
    id: "nd-001",
    cliente: "Electrohogar Cuyo SA",
    referencia: "FC-A-0001-00000002",
    motivo: "Recargo por diferencia de cambio",
    alcance: "Total",
    estado: "EMITIDA",
    fecha: "2026-03-10",
    total: 184500,
    observacion: "Ajuste documentado tras cierre comercial y actualización de condiciones.",
  },
  {
    id: "nd-002",
    cliente: "Hospital Regional Paraná",
    referencia: "FC-C-0001-00000011",
    motivo: "Cargo logístico extraordinario",
    alcance: "Parcial",
    estado: "APLICADA",
    fecha: "2026-03-14",
    total: 62250,
    observacion: "Diferencia por entrega reprogramada fuera de la ruta original.",
  },
]

export const legacySalesReturns: LegacySalesReturn[] = [
  {
    id: "dev-001",
    cliente: "Constructora Andina SRL",
    factura: "FC-A-0001-00000006",
    remito: "REM-000011",
    motivo: "UPS defectuosa al instalar",
    estado: "APROBADA",
    fecha: "2026-03-09",
    deposito: "Central",
    total: 237402,
  },
  {
    id: "dev-002",
    cliente: "Supermercados Regionales SA",
    factura: "FC-B-0001-00000005",
    remito: "REM-000006",
    motivo: "Diferencia de presentación en herramientas",
    estado: "ABIERTA",
    fecha: "2026-03-16",
    deposito: "Planta Norte",
    total: 99757,
  },
]

export const legacySalesAdjustments: LegacySalesAdjustment[] = [
  {
    id: "adj-001",
    cliente: "Automatizaciones del Centro",
    tipo: "Débito",
    motivo: "Recálculo comercial posterior al cierre",
    estado: "EMITIDO",
    fecha: "2026-03-12",
    total: 95300,
  },
  {
    id: "adj-002",
    cliente: "Electro Patagonia SRL",
    tipo: "Crédito",
    motivo: "Bonificación por volumen y fidelidad",
    estado: "APLICADO",
    fecha: "2026-03-07",
    total: 73120,
  },
]

export const legacySalesAllocations: LegacySalesAllocation[] = [
  {
    id: "imp-001",
    cliente: "Electrohogar Cuyo SA",
    comprobante: "FC-A-0001-00000002",
    cuenta: "1.1.02 Deudores por ventas",
    centroCosto: "Canal mayorista",
    estado: "PENDIENTE",
    fecha: "2026-03-11",
    importe: 1665444,
  },
  {
    id: "imp-002",
    cliente: "Constructora Andina SRL",
    comprobante: "NC-A-0001-00000001",
    cuenta: "4.1.03 Devoluciones sobre ventas",
    centroCosto: "Postventa",
    estado: "IMPUTADA",
    fecha: "2026-03-12",
    importe: 237402,
  },
]
