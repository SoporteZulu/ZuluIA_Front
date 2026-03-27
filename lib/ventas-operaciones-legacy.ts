export type LegacySalesMonitorRow = {
  id: string
  circuito: string
  cliente: string
  documento: string
  prioridad: "alta" | "media" | "baja"
  estado: "pendiente" | "gestion" | "resuelto"
  responsable: string
  observacion: string
}

export type LegacySalesAutomationRule = {
  id: string
  nombre: string
  circuito: "facturacion-automatica" | "facturacion-masiva" | "remitos-masivos" | "recibos-masivos"
  alcance: string
  frecuencia: string
  estado: "activa" | "pausada" | "revision"
  ultimaEjecucion: string
  observacion: string
}

export type LegacySalesWindowTurn = {
  id: string
  caja: string
  operador: string
  cola: number
  importeObjetivo: number
  estado: "abierta" | "pausa" | "cerrada"
  observacion: string
}

export type LegacySalesBatchJob = {
  id: string
  tipo: "imputacion-masiva" | "listas-imprimir" | "monitor-facturas" | "remitos-masivos"
  descripcion: string
  registros: number
  estado: "preparacion" | "ejecucion" | "control" | "cerrado"
  responsable: string
  observacion: string
}

export const legacySalesMonitorRows: LegacySalesMonitorRow[] = [
  {
    id: "mon-001",
    circuito: "Factura monitor",
    cliente: "Electrohogar Cuyo SA",
    documento: "FC-A-0001-00000002",
    prioridad: "alta",
    estado: "pendiente",
    responsable: "Mesa comercial",
    observacion: "Factura vencida con remito asociado y reclamo pendiente de cobranza.",
  },
  {
    id: "mon-002",
    circuito: "Cobro ventanilla",
    cliente: "Hospital Regional Paraná",
    documento: "REC-000451",
    prioridad: "media",
    estado: "gestion",
    responsable: "Caja central",
    observacion: "Cobro parcial recibido; resta conciliación con cuenta corriente.",
  },
]

export const legacySalesAutomationRules: LegacySalesAutomationRule[] = [
  {
    id: "aut-001",
    nombre: "Abonos mensuales mayoristas",
    circuito: "facturacion-automatica",
    alcance: "Clientes con lista mayorista y punto Casa Central",
    frecuencia: "Mensual",
    estado: "activa",
    ultimaEjecucion: "2026-03-18",
    observacion: "Regla preparada para disparo manual hasta contar con orquestación backend.",
  },
  {
    id: "aut-002",
    nombre: "Remitos semanales canal retail",
    circuito: "remitos-masivos",
    alcance: "Pedidos emitidos con entrega agrupada por zona",
    frecuencia: "Semanal",
    estado: "revision",
    ultimaEjecucion: "2026-03-16",
    observacion:
      "El lote se revisa en frontend; la emisión masiva real sigue bloqueada por backend.",
  },
]

export const legacySalesWindowTurns: LegacySalesWindowTurn[] = [
  {
    id: "ven-001",
    caja: "Caja Casa Central",
    operador: "María Sosa",
    cola: 8,
    importeObjetivo: 850000,
    estado: "abierta",
    observacion: "Turno principal de cobros rápidos y recibos mostrador.",
  },
  {
    id: "ven-002",
    caja: "Caja Sede Norte",
    operador: "Pablo Molina",
    cola: 3,
    importeObjetivo: 340000,
    estado: "pausa",
    observacion: "Caja secundaria para cobranzas y rendición de cheques.",
  },
]

export const legacySalesBatchJobs: LegacySalesBatchJob[] = [
  {
    id: "job-001",
    tipo: "imputacion-masiva",
    descripcion: "Aplicación masiva de cobranzas del cierre diario",
    registros: 24,
    estado: "preparacion",
    responsable: "Tesorería",
    observacion: "Pendiente de endpoint dedicado para confirmación real.",
  },
  {
    id: "job-002",
    tipo: "listas-imprimir",
    descripcion: "Impresión y distribución de listas de precios vigentes",
    registros: 12,
    estado: "control",
    responsable: "Comercial",
    observacion: "El frontend deja lista la tanda y la trazabilidad del reparto.",
  },
]
