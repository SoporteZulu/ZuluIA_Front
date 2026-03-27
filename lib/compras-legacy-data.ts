import type { ComprobanteDetalle, EmitirComprobanteDto } from "@/lib/types/comprobantes"
import type { OrdenCompra } from "@/lib/types/configuracion"
import type { Tercero } from "@/lib/types/terceros"

export type LegacyPurchaseQuotation = {
  id: number
  proveedor: string
  estado: "BORRADOR" | "ENVIADA" | "NEGOCIACION" | "APROBADA"
  moneda: string
  prioridad: "Alta" | "Media" | "Baja"
  modalidad: "Puntual" | "Masiva"
  origen: "Requisición" | "Reposición" | "Servicio"
  condicionCompra: string
  plazoPago: string
  fecha: string
  fechaEntrega: string
  vigenteHasta: string
  solicitudOrigen: string
  requisicionReferencia: string
  requisicionId: number | null
  depositoDestino: string
  sectorSolicitante: string
  comprador: string
  aprobador: string
  ordenCompraReferencia: string | null
  readyForOrder: boolean
  observacion: string
  vendedor: string
  subtotal: number
  iva: number
  total: number
  diferenciasClave: string[]
  items: LegacyPurchaseQuotationLine[]
  comparativa: LegacyPurchaseQuotationOption[]
}

export type LegacyPurchaseQuotationLine = {
  id: string
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  precioUnitario: number
  bonificacionPct: number
  subtotal: number
}

export type LegacyPurchaseQuotationOption = {
  proveedor: string
  condicionPago: string
  plazoEntregaDias: number
  moneda: string
  total: number
  seleccionada: boolean
  observacion: string
}

export type LegacyPurchaseRequisition = {
  id: number
  tipo: "Compra" | "Obra"
  solicitante: string
  area: string
  prioridad: "Alta" | "Media" | "Baja"
  modalidad: "Manual" | "Planificada" | "Urgente"
  origen: string
  destino: string
  motivo: string
  fecha: string
  vencimiento: string
  moneda: string
  estado: "ABIERTA" | "EN_PROCESO" | "COTIZADA" | "CANCELADA"
  centroCosto: string
  aprobador: string
  compradorAsignado: string
  proveedorSugerido: string | null
  presupuestoEstimado: number
  requiereValidacionTecnica: boolean
  cotizacionReferencia: string | null
  cotizacionId: number | null
  ordenCompraReferencia: string | null
  detallesClave: string[]
  observacion: string
  items: LegacyPurchaseRequisitionLine[]
}

export type LegacyPurchaseRequisitionLine = {
  id: string
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  faltante: number
  destino: string
}

export type LegacyPurchaseReturn = {
  id: number
  tipo: "No valorizada" | "Stock"
  proveedor: string
  comprobante: string
  motivo: string
  estado: "ABIERTA" | "PROCESADA" | "ANULADA"
  fecha: string
  deposito: string
  ordenCompraReferencia: string | null
  remitoReferencia: string | null
  recepcionReferencia: string | null
  responsable: string
  resolucion: string
  impactoStock: string
  requiereNotaCredito: boolean
  diferenciasClave: string[]
  total: number
  items: LegacyPurchaseReturnLine[]
}

export type LegacyPurchaseRemito = {
  id: number
  tipo: "No valorizado" | "Valorizado"
  proveedor: string
  numero: string
  fecha: string
  deposito: string
  estado: "PENDIENTE" | "RECIBIDO" | "ANULADO"
  ordenCompraReferencia: string | null
  recepcionReferencia: string | null
  transportista: string
  responsableRecepcion: string
  observacion: string
  diferenciasClave: string[]
  total: number
  items: LegacyPurchaseRemitoLine[]
}

export type LegacyPurchaseReturnLine = {
  id: string
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  motivo: string
}

export type LegacyPurchaseRemitoLine = {
  id: string
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  recibido: number
  diferencia: number
}

export type LegacyPurchaseAdjustment = {
  id: number
  tipo: "Débito" | "Crédito"
  proveedor: string
  motivo: string
  estado: "BORRADOR" | "EMITIDO" | "APLICADO"
  fecha: string
  comprobanteReferencia: string
  ordenCompraReferencia: string | null
  responsable: string
  circuito: string
  requiereNotaCredito: boolean
  observacion: string
  detallesClave: string[]
  total: number
  items: LegacyPurchaseAdjustmentLine[]
}

export type LegacyPurchaseAllocation = {
  id: number
  tipo: "Compras" | "Importación"
  proveedor: string
  comprobante: string
  cuenta: string
  centroCosto: string
  estado: "PENDIENTE" | "IMPUTADA" | "OBSERVADA"
  fecha: string
  importe: number
  ordenCompraReferencia: string | null
  recepcionReferencia: string | null
  responsable: string
  moneda: string
  circuitoOrigen: string
  observacion: string
  detallesClave: string[]
  distribucion: LegacyPurchaseAllocationLine[]
}

export type LegacyPurchaseCreditNote = {
  id: number
  proveedor: string
  comprobanteReferencia: string
  motivo: string
  estado: "BORRADOR" | "EMITIDA" | "APLICADA"
  fecha: string
  total: number
  ordenCompraReferencia: string | null
  devolucionReferencia: string | null
  responsable: string
  impactoCuentaCorriente: string
  observacion: string
  detallesClave: string[]
  items: LegacyPurchaseCreditNoteLine[]
}

export type LegacyPurchaseAdjustmentLine = {
  id: string
  concepto: string
  cuenta: string
  importe: number
}

export type LegacyPurchaseAllocationLine = {
  id: string
  cuenta: string
  centroCosto: string
  porcentaje: number
  importe: number
}

export type LegacyPurchaseCreditNoteLine = {
  id: string
  concepto: string
  importe: number
}

export const legacyPurchaseQuotations: LegacyPurchaseQuotation[] = [
  {
    id: 4101,
    proveedor: "Acero Federal SRL",
    estado: "NEGOCIACION",
    moneda: "ARS",
    prioridad: "Alta",
    modalidad: "Puntual",
    origen: "Requisición",
    condicionCompra: "30 días FF",
    plazoPago: "30/60 días",
    fecha: "2026-03-08",
    fechaEntrega: "2026-03-28",
    vigenteHasta: "2026-03-22",
    solicitudOrigen: "Mantenimiento industrial",
    requisicionReferencia: "REQ-5201",
    requisicionId: 5201,
    depositoDestino: "Planta Norte",
    sectorSolicitante: "Mantenimiento",
    comprador: "Paula Gómez",
    aprobador: "Jefe de compras",
    ordenCompraReferencia: null,
    readyForOrder: false,
    observacion: "Cotización vinculada a requisición de mantenimiento industrial.",
    vendedor: "Lucía Márquez",
    subtotal: 820000,
    iva: 172200,
    total: 992200,
    diferenciasClave: [
      "Entrega parcial admitida en dos lotes semanales.",
      "Incluye bonificación por volumen sólo si se confirma antes del vencimiento.",
      "Requiere validación técnica final sobre dureza del material.",
    ],
    items: [
      {
        id: "cot-4101-1",
        codigo: "MAT-ACR-12",
        descripcion: "Planchuela acero SAE 1010 1/2 pulgada",
        cantidad: 120,
        unidad: "unid",
        precioUnitario: 4200,
        bonificacionPct: 5,
        subtotal: 478800,
      },
      {
        id: "cot-4101-2",
        codigo: "TOR-M16",
        descripcion: "Tornillo hexagonal galvanizado M16",
        cantidad: 600,
        unidad: "unid",
        precioUnitario: 380,
        bonificacionPct: 0,
        subtotal: 228000,
      },
      {
        id: "cot-4101-3",
        codigo: "SER-CORTE",
        descripcion: "Servicio de corte y biselado industrial",
        cantidad: 1,
        unidad: "srv",
        precioUnitario: 113200,
        bonificacionPct: 0,
        subtotal: 113200,
      },
    ],
    comparativa: [
      {
        proveedor: "Acero Federal SRL",
        condicionPago: "30/60 días",
        plazoEntregaDias: 20,
        moneda: "ARS",
        total: 992200,
        seleccionada: true,
        observacion: "Mejor equilibrio entre plazo y calidad técnica.",
      },
      {
        proveedor: "Burgos Insumos Industriales",
        condicionPago: "Contado",
        plazoEntregaDias: 12,
        moneda: "ARS",
        total: 1048800,
        seleccionada: false,
        observacion: "Entrega más rápida, pero penaliza caja por pago inmediato.",
      },
      {
        proveedor: "Metalúrgica Delta",
        condicionPago: "45 días FF",
        plazoEntregaDias: 25,
        moneda: "ARS",
        total: 1014200,
        seleccionada: false,
        observacion: "Pendiente confirmar stock de tornillería.",
      },
    ],
  },
  {
    id: 4102,
    proveedor: "Servicios Integrales del Litoral",
    estado: "APROBADA",
    moneda: "USD",
    prioridad: "Media",
    modalidad: "Masiva",
    origen: "Servicio",
    condicionCompra: "Contado contra entrega",
    plazoPago: "Contado",
    fecha: "2026-03-12",
    fechaEntrega: "2026-04-02",
    vigenteHasta: "2026-03-25",
    solicitudOrigen: "Montaje y puesta en marcha",
    requisicionReferencia: "REQ-5202",
    requisicionId: 5202,
    depositoDestino: "Obra Delta",
    sectorSolicitante: "Obras",
    comprador: "Mariano Cid",
    aprobador: "Gerencia operativa",
    ordenCompraReferencia: "OC-000214",
    readyForOrder: true,
    observacion: "Incluye ítems de instalación y servicio técnico.",
    vendedor: "Mariano Cid",
    subtotal: 4800,
    iva: 1008,
    total: 5808,
    diferenciasClave: [
      "Cotización masiva consolidada para materiales y servicio de montaje.",
      "Proveedor ya validado por obra con antecedentes positivos.",
      "Lista para emitir orden manual sobre el backend actual.",
    ],
    items: [
      {
        id: "cot-4102-1",
        codigo: "TAB-CTRL",
        descripcion: "Tablero de control IP65",
        cantidad: 2,
        unidad: "unid",
        precioUnitario: 1350,
        bonificacionPct: 0,
        subtotal: 2700,
      },
      {
        id: "cot-4102-2",
        codigo: "SER-MONT",
        descripcion: "Servicio de montaje e instalación en obra",
        cantidad: 1,
        unidad: "srv",
        precioUnitario: 2100,
        bonificacionPct: 0,
        subtotal: 2100,
      },
    ],
    comparativa: [
      {
        proveedor: "Servicios Integrales del Litoral",
        condicionPago: "Contado",
        plazoEntregaDias: 21,
        moneda: "USD",
        total: 5808,
        seleccionada: true,
        observacion: "Aprobada por compatibilidad con cronograma de obra.",
      },
      {
        proveedor: "Global Parts LLC",
        condicionPago: "50% anticipo / 50% embarque",
        plazoEntregaDias: 35,
        moneda: "USD",
        total: 5610,
        seleccionada: false,
        observacion: "Más económica, pero no llega en la ventana operativa.",
      },
    ],
  },
  {
    id: 4103,
    proveedor: "Burgos Insumos Industriales",
    estado: "ENVIADA",
    moneda: "ARS",
    prioridad: "Alta",
    modalidad: "Masiva",
    origen: "Reposición",
    condicionCompra: "Cuenta corriente",
    plazoPago: "15/30 días",
    fecha: "2026-03-17",
    fechaEntrega: "2026-03-26",
    vigenteHasta: "2026-03-24",
    solicitudOrigen: "Reabastecimiento depósitos críticos",
    requisicionReferencia: "RADAR-STK-0317",
    requisicionId: null,
    depositoDestino: "Central",
    sectorSolicitante: "Abastecimiento",
    comprador: "Lucía Márquez",
    aprobador: "Circuito automático",
    ordenCompraReferencia: null,
    readyForOrder: false,
    observacion: "Lote consolidado desde faltantes críticos detectados por stock mínimo.",
    vendedor: "Carolina Ferreyra",
    subtotal: 658000,
    iva: 138180,
    total: 796180,
    diferenciasClave: [
      "Se consolidan tres familias de insumos de alta rotación.",
      "Falta respuesta de un proveedor alternativo para validar precio testigo.",
      "Conviene definir si la compra se parte por depósito o se centraliza la recepción.",
    ],
    items: [
      {
        id: "cot-4103-1",
        codigo: "INS-GRA-20",
        descripcion: "Grasa industrial multipropósito 20 kg",
        cantidad: 18,
        unidad: "balde",
        precioUnitario: 18200,
        bonificacionPct: 3,
        subtotal: 317772,
      },
      {
        id: "cot-4103-2",
        codigo: "FILT-AIR",
        descripcion: "Filtro de aire línea compresores",
        cantidad: 25,
        unidad: "unid",
        precioUnitario: 6210,
        bonificacionPct: 0,
        subtotal: 155250,
      },
      {
        id: "cot-4103-3",
        codigo: "MANG-IND",
        descripcion: "Manguera industrial alta presión 1 pulgada",
        cantidad: 90,
        unidad: "m",
        precioUnitario: 2055.31,
        bonificacionPct: 0,
        subtotal: 184978,
      },
    ],
    comparativa: [
      {
        proveedor: "Burgos Insumos Industriales",
        condicionPago: "15/30 días",
        plazoEntregaDias: 9,
        moneda: "ARS",
        total: 796180,
        seleccionada: true,
        observacion: "Proveedor con disponibilidad inmediata en dos familias de producto.",
      },
      {
        proveedor: "Acero Federal SRL",
        condicionPago: "30 días FF",
        plazoEntregaDias: 14,
        moneda: "ARS",
        total: 821940,
        seleccionada: false,
        observacion: "Cubre sólo parte del lote y obliga a compra complementaria.",
      },
    ],
  },
  {
    id: 4104,
    proveedor: "Global Parts LLC",
    estado: "BORRADOR",
    moneda: "USD",
    prioridad: "Baja",
    modalidad: "Puntual",
    origen: "Servicio",
    condicionCompra: "50% anticipo / 50% despacho",
    plazoPago: "Anticipo",
    fecha: "2026-03-18",
    fechaEntrega: "2026-04-24",
    vigenteHasta: "2026-03-29",
    solicitudOrigen: "Repuesto crítico importado",
    requisicionReferencia: "REQ-IMP-8801",
    requisicionId: null,
    depositoDestino: "Planta Norte",
    sectorSolicitante: "Ingeniería",
    comprador: "Paula Gómez",
    aprobador: "Gerencia financiera",
    ordenCompraReferencia: null,
    readyForOrder: false,
    observacion: "Borrador pendiente de confirmar cotización de flete y nacionalización.",
    vendedor: "Ethan Brooks",
    subtotal: 9200,
    iva: 1932,
    total: 11132,
    diferenciasClave: [
      "Restan costos de importación y fecha cierta de embarque.",
      "No debe pasar a orden hasta validar disponibilidad de divisas.",
    ],
    items: [
      {
        id: "cot-4104-1",
        codigo: "DRV-PLC-900",
        descripcion: "Drive PLC serie 900",
        cantidad: 2,
        unidad: "unid",
        precioUnitario: 4600,
        bonificacionPct: 0,
        subtotal: 9200,
      },
    ],
    comparativa: [
      {
        proveedor: "Global Parts LLC",
        condicionPago: "Anticipo",
        plazoEntregaDias: 37,
        moneda: "USD",
        total: 11132,
        seleccionada: true,
        observacion: "Cotización preliminar sin costos cerrados de importación.",
      },
      {
        proveedor: "Distribuidora Tecnológica SRL",
        condicionPago: "Contado",
        plazoEntregaDias: 18,
        moneda: "USD",
        total: 12840,
        seleccionada: false,
        observacion: "Disponible localmente, pero con precio fuera del presupuesto anual.",
      },
    ],
  },
]

export const legacyPurchaseRequisitions: LegacyPurchaseRequisition[] = [
  {
    id: 5201,
    tipo: "Compra",
    solicitante: "Paula Gómez",
    area: "Mantenimiento",
    prioridad: "Alta",
    modalidad: "Urgente",
    origen: "Depósito Central",
    destino: "Planta Norte",
    motivo: "Reposición urgente de insumos de línea",
    fecha: "2026-03-11",
    vencimiento: "2026-03-26",
    moneda: "ARS",
    estado: "EN_PROCESO",
    centroCosto: "Mantenimiento industrial",
    aprobador: "Jefe de planta",
    compradorAsignado: "Paula Gómez",
    proveedorSugerido: "Acero Federal SRL",
    presupuestoEstimado: 980000,
    requiereValidacionTecnica: true,
    cotizacionReferencia: "COT-4101",
    cotizacionId: 4101,
    ordenCompraReferencia: null,
    detallesClave: [
      "Nació por quiebre de stock en línea de mantenimiento.",
      "Requiere validar especificación metalúrgica antes de adjudicar.",
      "Ya tiene una cotización en negociación y todavía no pasa a orden.",
    ],
    observacion: "Requiere más datos de proveedor y validación técnica.",
    items: [
      {
        id: "req-5201-1",
        codigo: "MAT-ACR-12",
        descripcion: "Planchuela acero SAE 1010 1/2 pulgada",
        cantidad: 120,
        unidad: "unid",
        faltante: 120,
        destino: "Mantenimiento correctivo",
      },
      {
        id: "req-5201-2",
        codigo: "TOR-M16",
        descripcion: "Tornillo hexagonal galvanizado M16",
        cantidad: 600,
        unidad: "unid",
        faltante: 480,
        destino: "Línea de montaje norte",
      },
    ],
  },
  {
    id: 5202,
    tipo: "Obra",
    solicitante: "Martín Sosa",
    area: "Obras",
    prioridad: "Media",
    modalidad: "Planificada",
    origen: "Obra Delta",
    destino: "Obra Delta",
    motivo: "Requisición de materiales para frente sanitario",
    fecha: "2026-03-15",
    vencimiento: "2026-03-30",
    moneda: "ARS",
    estado: "ABIERTA",
    centroCosto: "Obra Delta - Frente sanitario",
    aprobador: "Gerencia operativa",
    compradorAsignado: "Mariano Cid",
    proveedorSugerido: "Servicios Integrales del Litoral",
    presupuestoEstimado: 5600,
    requiereValidacionTecnica: false,
    cotizacionReferencia: "COT-4102",
    cotizacionId: 4102,
    ordenCompraReferencia: "OC-000214",
    detallesClave: [
      "La necesidad ya fue consolidada con servicio de montaje.",
      "La cotización comercial está aprobada y la orden ya fue emitida.",
      "Se mantiene visible para trazabilidad del origen de obra.",
    ],
    observacion: "Pendiente de cotización a tres proveedores.",
    items: [
      {
        id: "req-5202-1",
        codigo: "TAB-CTRL",
        descripcion: "Tablero de control IP65",
        cantidad: 2,
        unidad: "unid",
        faltante: 2,
        destino: "Frente sanitario",
      },
      {
        id: "req-5202-2",
        codigo: "SER-MONT",
        descripcion: "Servicio de montaje e instalación en obra",
        cantidad: 1,
        unidad: "srv",
        faltante: 1,
        destino: "Coordinación técnica",
      },
    ],
  },
  {
    id: 5203,
    tipo: "Compra",
    solicitante: "Lucía Márquez",
    area: "Abastecimiento",
    prioridad: "Alta",
    modalidad: "Planificada",
    origen: "Radar de stock mínimo",
    destino: "Depósito Central",
    motivo: "Consolidación semanal de faltantes críticos de insumos industriales",
    fecha: "2026-03-17",
    vencimiento: "2026-03-24",
    moneda: "ARS",
    estado: "EN_PROCESO",
    centroCosto: "Abastecimiento recurrente",
    aprobador: "Circuito automático",
    compradorAsignado: "Lucía Márquez",
    proveedorSugerido: "Burgos Insumos Industriales",
    presupuestoEstimado: 800000,
    requiereValidacionTecnica: false,
    cotizacionReferencia: "COT-4103",
    cotizacionId: 4103,
    ordenCompraReferencia: null,
    detallesClave: [
      "Se originó desde el radar de reposición actual del frontend.",
      "Agrupa tres familias de alta rotación para una sola ronda comercial.",
      "Está a la espera de cerrar precio testigo antes de emitir orden.",
    ],
    observacion: "Pendiente respuesta final del proveedor alternativo para validar precio testigo.",
    items: [
      {
        id: "req-5203-1",
        codigo: "INS-GRA-20",
        descripcion: "Grasa industrial multipropósito 20 kg",
        cantidad: 18,
        unidad: "balde",
        faltante: 18,
        destino: "Taller central",
      },
      {
        id: "req-5203-2",
        codigo: "FILT-AIR",
        descripcion: "Filtro de aire línea compresores",
        cantidad: 25,
        unidad: "unid",
        faltante: 25,
        destino: "Compresores planta",
      },
      {
        id: "req-5203-3",
        codigo: "MANG-IND",
        descripcion: "Manguera industrial alta presión 1 pulgada",
        cantidad: 90,
        unidad: "m",
        faltante: 90,
        destino: "Mantenimiento general",
      },
    ],
  },
  {
    id: 5204,
    tipo: "Compra",
    solicitante: "Nicolás Vera",
    area: "Ingeniería",
    prioridad: "Baja",
    modalidad: "Manual",
    origen: "Ingeniería de planta",
    destino: "Planta Norte",
    motivo: "Repuesto crítico importado para PLC de línea 4",
    fecha: "2026-03-18",
    vencimiento: "2026-03-29",
    moneda: "USD",
    estado: "ABIERTA",
    centroCosto: "Ingeniería y automatización",
    aprobador: "Gerencia financiera",
    compradorAsignado: "Paula Gómez",
    proveedorSugerido: "Global Parts LLC",
    presupuestoEstimado: 11132,
    requiereValidacionTecnica: true,
    cotizacionReferencia: "COT-4104",
    cotizacionId: 4104,
    ordenCompraReferencia: null,
    detallesClave: [
      "Requiere análisis de importación y disponibilidad de divisas.",
      "No debe pasar a orden sin cerrar costos logísticos y fecha de embarque.",
    ],
    observacion: "Pendiente cerrar viabilidad financiera y costos de nacionalización.",
    items: [
      {
        id: "req-5204-1",
        codigo: "DRV-PLC-900",
        descripcion: "Drive PLC serie 900",
        cantidad: 2,
        unidad: "unid",
        faltante: 2,
        destino: "Línea 4 - automatización",
      },
    ],
  },
]

export const legacyPurchaseReturns: LegacyPurchaseReturn[] = [
  {
    id: 6101,
    tipo: "No valorizada",
    proveedor: "Acero Federal SRL",
    comprobante: "FC-0004-000182",
    motivo: "Material recibido con daño superficial",
    estado: "ABIERTA",
    fecha: "2026-03-16",
    deposito: "Central",
    ordenCompraReferencia: "OC-000198",
    remitoReferencia: "RNC-001-000043",
    recepcionReferencia: "REC-000198",
    responsable: "Lucía Márquez",
    resolucion: "Pendiente validación del proveedor y emisión de nota de crédito.",
    impactoStock: "Mercadería retenida en cuarentena, sin reingreso a libre disponibilidad.",
    requiereNotaCredito: true,
    diferenciasClave: [
      "Se detectó daño superficial en planchuelas durante recepción.",
      "La devolución todavía no fue aceptada formalmente por el proveedor.",
      "Hasta resolverla, la recepción original queda con observación abierta.",
    ],
    total: 142000,
    items: [
      {
        id: "dev-6101-1",
        codigo: "MAT-ACR-12",
        descripcion: "Planchuela acero SAE 1010 1/2 pulgada",
        cantidad: 24,
        unidad: "unid",
        motivo: "Golpes y deformación superficial",
      },
      {
        id: "dev-6101-2",
        codigo: "TOR-M16",
        descripcion: "Tornillo hexagonal galvanizado M16",
        cantidad: 120,
        unidad: "unid",
        motivo: "Lote con oxidación temprana",
      },
    ],
  },
  {
    id: 6102,
    tipo: "Stock",
    proveedor: "Burgos Insumos Industriales",
    comprobante: "FC-0002-000918",
    motivo: "Error en especificación de lote",
    estado: "PROCESADA",
    fecha: "2026-03-05",
    deposito: "Planta Norte",
    ordenCompraReferencia: "OC-000176",
    remitoReferencia: "RVC-001-000039",
    recepcionReferencia: "REC-000176",
    responsable: "Paula Gómez",
    resolucion: "Proveedor aceptó reposición y la devolución ya impactó en stock.",
    impactoStock: "Se descargó stock libre y quedó trazado como devolución valorizada.",
    requiereNotaCredito: false,
    diferenciasClave: [
      "El material no coincidía con la especificación aprobada en orden.",
      "La reposición quedó programada en una recepción posterior.",
    ],
    total: 88500,
    items: [
      {
        id: "dev-6102-1",
        codigo: "FILT-AIR",
        descripcion: "Filtro de aire línea compresores",
        cantidad: 15,
        unidad: "unid",
        motivo: "Especificación de malla incorrecta",
      },
    ],
  },
  {
    id: 6103,
    tipo: "Stock",
    proveedor: "Servicios Integrales del Litoral",
    comprobante: "FC-0006-000214",
    motivo: "Servicio parcialmente no ejecutado",
    estado: "PROCESADA",
    fecha: "2026-03-12",
    deposito: "Obra Delta",
    ordenCompraReferencia: "OC-000214",
    remitoReferencia: "RVC-001-000044",
    recepcionReferencia: "REC-000214",
    responsable: "Mariano Cid",
    resolucion: "Se acordó descuento posterior sin reenvío físico.",
    impactoStock: "Sin impacto físico, solo ajuste económico del circuito.",
    requiereNotaCredito: true,
    diferenciasClave: [
      "Se devolvió económicamente parte del servicio de montaje.",
      "La devolución funciona como antesala de nota de crédito del proveedor.",
    ],
    total: 18500,
    items: [
      {
        id: "dev-6103-1",
        codigo: "SER-MONT",
        descripcion: "Servicio de montaje e instalación en obra",
        cantidad: 1,
        unidad: "srv",
        motivo: "Horas no ejecutadas según certificado de avance",
      },
    ],
  },
]

export const legacyPurchaseRemitos: LegacyPurchaseRemito[] = [
  {
    id: 7101,
    tipo: "No valorizado",
    proveedor: "Acero Federal SRL",
    numero: "RNC-001-000043",
    fecha: "2026-03-14",
    deposito: "Central",
    estado: "PENDIENTE",
    ordenCompraReferencia: "OC-000198",
    recepcionReferencia: "REC-000198",
    transportista: "Transporte Norte",
    responsableRecepcion: "Sofía Quiroga",
    observacion: "Pendiente cierre de diferencias y validación final del depósito.",
    diferenciasClave: [
      "Ingresó un lote con daños superficiales y quedó con observación abierta.",
      "Todavía no se cerró la valorización definitiva del ingreso.",
    ],
    total: 0,
    items: [
      {
        id: "rem-7101-1",
        codigo: "MAT-ACR-12",
        descripcion: "Planchuela acero SAE 1010 1/2 pulgada",
        cantidad: 120,
        unidad: "unid",
        recibido: 96,
        diferencia: -24,
      },
      {
        id: "rem-7101-2",
        codigo: "TOR-M16",
        descripcion: "Tornillo hexagonal galvanizado M16",
        cantidad: 600,
        unidad: "unid",
        recibido: 600,
        diferencia: 0,
      },
    ],
  },
  {
    id: 7102,
    tipo: "Valorizado",
    proveedor: "Servicios Integrales del Litoral",
    numero: "RVC-001-000044",
    fecha: "2026-03-10",
    deposito: "Obra Delta",
    estado: "RECIBIDO",
    ordenCompraReferencia: "OC-000214",
    recepcionReferencia: "REC-000214",
    transportista: "Logística Delta",
    responsableRecepcion: "Mariano Cid",
    observacion: "Recepción cerrada con servicio certificado por obra.",
    diferenciasClave: [
      "Remito valorizado recibido y conciliado con orden y factura.",
      "Queda una devolución económica parcial por horas no ejecutadas.",
    ],
    total: 356000,
    items: [
      {
        id: "rem-7102-1",
        codigo: "TAB-CTRL",
        descripcion: "Tablero de control IP65",
        cantidad: 2,
        unidad: "unid",
        recibido: 2,
        diferencia: 0,
      },
      {
        id: "rem-7102-2",
        codigo: "SER-MONT",
        descripcion: "Servicio de montaje e instalación en obra",
        cantidad: 1,
        unidad: "srv",
        recibido: 1,
        diferencia: 0,
      },
    ],
  },
  {
    id: 7103,
    tipo: "Valorizado",
    proveedor: "Burgos Insumos Industriales",
    numero: "RVC-001-000047",
    fecha: "2026-03-18",
    deposito: "Planta Norte",
    estado: "PENDIENTE",
    ordenCompraReferencia: "OC-000221",
    recepcionReferencia: null,
    transportista: "Expreso Industrial Sur",
    responsableRecepcion: "Paula Gómez",
    observacion: "Remito recibido físicamente pero pendiente de conformidad administrativa.",
    diferenciasClave: [
      "Hay diferencia pendiente en filtros de aire contra el pedido.",
      "El backend real de recepciones todavía no modela diferencias por renglón.",
    ],
    total: 184500,
    items: [
      {
        id: "rem-7103-1",
        codigo: "FILT-AIR",
        descripcion: "Filtro de aire línea compresores",
        cantidad: 25,
        unidad: "unid",
        recibido: 20,
        diferencia: -5,
      },
      {
        id: "rem-7103-2",
        codigo: "INS-GRA-20",
        descripcion: "Grasa industrial multipropósito 20 kg",
        cantidad: 18,
        unidad: "balde",
        recibido: 18,
        diferencia: 0,
      },
    ],
  },
]

export const legacyPurchaseAdjustments: LegacyPurchaseAdjustment[] = [
  {
    id: 8101,
    tipo: "Débito",
    proveedor: "Burgos Insumos Industriales",
    motivo: "Diferencia de precio por actualización de lista",
    estado: "EMITIDO",
    fecha: "2026-03-09",
    comprobanteReferencia: "FC-0002-000918",
    ordenCompraReferencia: "OC-000176",
    responsable: "Paula Gómez",
    circuito: "Ajuste comercial posterior a recepción",
    requiereNotaCredito: false,
    observacion: "Se regulariza diferencia de precio aceptada tras recepción y control documental.",
    detallesClave: [
      "El proveedor actualizó la lista después del ingreso físico.",
      "El ajuste mantiene la conciliación con factura sin rehacer la recepción.",
    ],
    total: 27500,
    items: [
      {
        id: "adj-8101-1",
        concepto: "Diferencia precio filtros de aire",
        cuenta: "6.1.08 Ajustes comerciales",
        importe: 27500,
      },
    ],
  },
  {
    id: 8102,
    tipo: "Crédito",
    proveedor: "Acero Federal SRL",
    motivo: "Bonificación posterior por volumen",
    estado: "APLICADO",
    fecha: "2026-03-07",
    comprobanteReferencia: "FC-0004-000182",
    ordenCompraReferencia: "OC-000198",
    responsable: "Lucía Márquez",
    circuito: "Regularización por bonificación comercial",
    requiereNotaCredito: true,
    observacion: "La bonificación quedó aplicada como compensación sobre el comprobante base.",
    detallesClave: [
      "El ajuste acompaña una mejora de precio negociada luego del cierre comercial.",
      "Su trazabilidad económica converge con la nota de crédito del proveedor.",
    ],
    total: 19300,
    items: [
      {
        id: "adj-8102-1",
        concepto: "Bonificación por volumen planchuelas",
        cuenta: "6.1.09 Bonificaciones de compra",
        importe: 19300,
      },
    ],
  },
  {
    id: 8103,
    tipo: "Crédito",
    proveedor: "Servicios Integrales del Litoral",
    motivo: "Regularización por horas de servicio no ejecutadas",
    estado: "BORRADOR",
    fecha: "2026-03-19",
    comprobanteReferencia: "FC-0006-000214",
    ordenCompraReferencia: "OC-000214",
    responsable: "Mariano Cid",
    circuito: "Ajuste previo a nota de crédito",
    requiereNotaCredito: true,
    observacion:
      "Se está preparando la regularización económica derivada de la devolución de servicio.",
    detallesClave: [
      "Depende del cierre formal de la nota de crédito del proveedor.",
      "No modifica stock, sólo impacto económico y contable.",
    ],
    total: 18500,
    items: [
      {
        id: "adj-8103-1",
        concepto: "Horas no ejecutadas en montaje",
        cuenta: "6.1.12 Ajustes por servicios",
        importe: 18500,
      },
    ],
  },
]

export const legacyPurchaseAllocations: LegacyPurchaseAllocation[] = [
  {
    id: 9101,
    tipo: "Compras",
    proveedor: "Acero Federal SRL",
    comprobante: "FC-0004-000182",
    cuenta: "6.1.01 Materias primas",
    centroCosto: "Producción",
    estado: "PENDIENTE",
    fecha: "2026-03-16",
    importe: 992200,
    ordenCompraReferencia: "OC-000198",
    recepcionReferencia: "REC-000198",
    responsable: "Lucía Márquez",
    moneda: "ARS",
    circuitoOrigen: "Factura de compra local con recepción observada",
    observacion:
      "Pendiente distribución definitiva por diferencia abierta entre remito y devolución.",
    detallesClave: [
      "La imputación no cierra hasta resolver la devolución abierta del proveedor.",
      "Parte del monto sigue en observación por mercadería retenida.",
    ],
    distribucion: [
      {
        id: "alloc-9101-1",
        cuenta: "6.1.01 Materias primas",
        centroCosto: "Producción",
        porcentaje: 70,
        importe: 694540,
      },
      {
        id: "alloc-9101-2",
        cuenta: "1.1.09 Mercadería en observación",
        centroCosto: "Calidad",
        porcentaje: 30,
        importe: 297660,
      },
    ],
  },
  {
    id: 9102,
    tipo: "Importación",
    proveedor: "Global Parts LLC",
    comprobante: "IMP-2026-0007",
    cuenta: "6.1.04 Importaciones",
    centroCosto: "Logística",
    estado: "OBSERVADA",
    fecha: "2026-03-13",
    importe: 1845000,
    ordenCompraReferencia: null,
    recepcionReferencia: null,
    responsable: "Paula Gómez",
    moneda: "USD",
    circuitoOrigen: "Despacho de importación con costos indirectos pendientes",
    observacion:
      "Restan cerrar gastos de nacionalización y distribución entre logística e ingeniería.",
    detallesClave: [
      "Caso típico de importación que no se resuelve con el backend actual.",
      "La observación proviene de costos accesorios todavía no prorrateados.",
    ],
    distribucion: [
      {
        id: "alloc-9102-1",
        cuenta: "6.1.04 Importaciones",
        centroCosto: "Logística",
        porcentaje: 55,
        importe: 1014750,
      },
      {
        id: "alloc-9102-2",
        cuenta: "6.1.11 Ingeniería de planta",
        centroCosto: "Ingeniería",
        porcentaje: 45,
        importe: 830250,
      },
    ],
  },
  {
    id: 9103,
    tipo: "Compras",
    proveedor: "Servicios Integrales del Litoral",
    comprobante: "FC-0006-000214",
    cuenta: "6.1.12 Servicios contratados",
    centroCosto: "Obra Delta",
    estado: "IMPUTADA",
    fecha: "2026-03-11",
    importe: 356000,
    ordenCompraReferencia: "OC-000214",
    recepcionReferencia: "REC-000214",
    responsable: "Mariano Cid",
    moneda: "ARS",
    circuitoOrigen: "Servicio valorizado conciliado con obra",
    observacion:
      "Imputación principal cerrada; solo queda pendiente el ajuste parcial por servicio no ejecutado.",
    detallesClave: [
      "La imputación principal está cerrada y conciliada con obra.",
      "Existe un ajuste económico posterior ya identificado en notas de crédito.",
    ],
    distribucion: [
      {
        id: "alloc-9103-1",
        cuenta: "6.1.12 Servicios contratados",
        centroCosto: "Obra Delta",
        porcentaje: 100,
        importe: 356000,
      },
    ],
  },
]

export const legacyPurchaseCreditNotes: LegacyPurchaseCreditNote[] = [
  {
    id: 10101,
    proveedor: "Acero Federal SRL",
    comprobanteReferencia: "FC-0004-000182",
    motivo: "Descuento por calidad y rehacer entrega",
    estado: "EMITIDA",
    fecha: "2026-03-18",
    total: 42000,
    ordenCompraReferencia: "OC-000198",
    devolucionReferencia: "DEV-6101",
    responsable: "Lucía Márquez",
    impactoCuentaCorriente: "Disminuye saldo abierto del proveedor y libera observación parcial.",
    observacion: "La nota de crédito está emitida pero resta aplicarla sobre la factura base.",
    detallesClave: [
      "Nace de la devolución de mercadería dañada detectada en recepción.",
      "Todavía debe reflejarse formalmente en la imputación pendiente.",
    ],
    items: [
      {
        id: "nc-10101-1",
        concepto: "Bonificación por mercadería observada",
        importe: 42000,
      },
    ],
  },
  {
    id: 10102,
    proveedor: "Servicios Integrales del Litoral",
    comprobanteReferencia: "FC-0006-000214",
    motivo: "Ajuste por servicios no prestados",
    estado: "APLICADA",
    fecha: "2026-03-06",
    total: 18500,
    ordenCompraReferencia: "OC-000214",
    devolucionReferencia: "DEV-6103",
    responsable: "Mariano Cid",
    impactoCuentaCorriente: "Aplicada sobre saldo del comprobante y conciliada con ajuste de obra.",
    observacion:
      "La nota quedó aplicada y la obra ya muestra el descuento económico correspondiente.",
    detallesClave: [
      "Regulariza la devolución económica de servicio no ejecutado.",
      "El caso quedó conciliado con imputación y ajuste asociado.",
    ],
    items: [
      {
        id: "nc-10102-1",
        concepto: "Horas de montaje no ejecutadas",
        importe: 18500,
      },
    ],
  },
  {
    id: 10103,
    proveedor: "Burgos Insumos Industriales",
    comprobanteReferencia: "FC-0002-000918",
    motivo: "Regularización por especificación incorrecta",
    estado: "BORRADOR",
    fecha: "2026-03-20",
    total: 27500,
    ordenCompraReferencia: "OC-000176",
    devolucionReferencia: "DEV-6102",
    responsable: "Paula Gómez",
    impactoCuentaCorriente: "Pendiente emisión para compensar el ajuste de débito comercial.",
    observacion:
      "Todavía en borrador mientras se define si se compensa con factura futura o nota de crédito formal.",
    detallesClave: [
      "La devolución física ya fue procesada, resta su cierre económico.",
      "Debe coordinarse con el ajuste comercial para evitar doble impacto.",
    ],
    items: [
      {
        id: "nc-10103-1",
        concepto: "Especificación incorrecta de filtros",
        importe: 27500,
      },
    ],
  },
]

export type LegacySupplierOverlay = {
  tipoPersona: string
  personeria: string
  condicionPago: string
  categoriaRiesgo: string
  cuentaContable: string
  cbu: string
  fechaAlta: string
  ultimaActualizacion: string
  usuarioAlta: string
  observacionExtendida: string
  retenciones: string[]
}

export type LegacyOrderOverlay = {
  depositoDestino: string
  sectorSolicitante: string
  condicionCompra: string
  plazoPago: string
  moneda: string
  comprador: string
  autorizacion: string
  circuitoRecepcion: string
  remitoEsperado: string
  observacionInterna: string
}

export type LegacyPurchaseInvoiceOverlay = {
  centroCosto: string
  imputacionPrincipal: string
  recepcionAsociada: string
  remitoProveedor: string
  circuitoFiscal: string
  retenciones: string[]
  condicionPago: string
  responsableCarga: string
  controlDocumental: string
  observacionInterna: string
}

function getSeed(value?: number | string | null) {
  if (typeof value === "number") return value
  if (!value) return 0
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function formatSeedDate(seed: number, monthBase: number) {
  const day = String((seed % 27) + 1).padStart(2, "0")
  const month = String(((monthBase + seed) % 12) + 1).padStart(2, "0")
  return `${day}/${month}/2024`
}

export function buildLegacySupplierOverlay(supplier?: Tercero | null): LegacySupplierOverlay {
  const seed = getSeed(supplier?.id ?? supplier?.razonSocial)
  const tipoPersona =
    supplier?.nroDocumento && supplier.nroDocumento.length > 11 ? "Jurídica" : "Física"
  const retentionSets = [
    ["Ganancias RG", "SUSS"],
    ["Ingresos Brutos", "IVA percepción"],
    ["Ganancias RG", "Ingresos Brutos", "Tasa municipal"],
  ]

  return {
    tipoPersona,
    personeria: tipoPersona === "Jurídica" ? "Responsable inscripto" : "Autónomo",
    condicionPago: ["30 días FF", "Contado contra entrega", "15/30 días"][(seed + 1) % 3],
    categoriaRiesgo: ["Normal", "Revisión documental", "Crédito controlado"][seed % 3],
    cuentaContable: ["2.1.01 Proveedores locales", "2.1.04 Servicios", "2.1.08 Importaciones"][
      seed % 3
    ],
    cbu: `2850 5900 ${String(1000 + (seed % 9000)).padStart(4, "0")} ${String(2000 + (seed % 7000)).padStart(4, "0")}`,
    fechaAlta: formatSeedDate(seed, 1),
    ultimaActualizacion: formatSeedDate(seed + 7, 3),
    usuarioAlta: ["compras", "tesoreria", "admin"][(seed + 2) % 3],
    observacionExtendida:
      supplier?.observacion ??
      "Registro legado con control de documentación, cuenta corriente y regímenes de retención.",
    retenciones: retentionSets[seed % retentionSets.length],
  }
}

export function buildLegacyOrderOverlay(
  order?: Pick<OrdenCompra, "id" | "condicionesEntrega" | "fechaEntregaReq"> | null,
  providerName?: string | null
): LegacyOrderOverlay {
  const seed = getSeed(order?.id ?? providerName)

  return {
    depositoDestino: ["Central", "Planta Norte", "Obra Delta"][seed % 3],
    sectorSolicitante: ["Producción", "Mantenimiento", "Obras"][(seed + 1) % 3],
    condicionCompra: ["Pedido abierto", "Cierre contra remito", "Recepción parcial habilitada"][
      (seed + 2) % 3
    ],
    plazoPago: ["30/60 días", "Contado", "Cheque a 15 días"][seed % 3],
    moneda: ["ARS", "USD", "ARS ajustable"][seed % 3],
    comprador: ["Lucía Márquez", "Mariano Cid", "Paula Gómez"][(seed + 1) % 3],
    autorizacion: ["Jefe de compras", "Gerencia operativa", "Circuito automático"][(seed + 2) % 3],
    circuitoRecepcion: order?.fechaEntregaReq
      ? `Recepción prevista para ${order.fechaEntregaReq}`
      : "Recepción sin fecha comprometida",
    remitoEsperado: `REM-${String(4000 + (seed % 500)).padStart(4, "0")}`,
    observacionInterna:
      order?.condicionesEntrega ??
      `Proveedor ${providerName ?? "sin asignar"} con circuito legado de aprobación comercial y remito asociado.`,
  }
}

export function buildLegacyPurchaseInvoiceOverlay(
  invoice?: Pick<
    ComprobanteDetalle | EmitirComprobanteDto,
    "id" | "observacion" | "fechaVto"
  > | null,
  supplierName?: string | null
): LegacyPurchaseInvoiceOverlay {
  const seed = getSeed(invoice?.id ?? supplierName)

  return {
    centroCosto: ["Administración", "Producción", "Logística"][(seed + 1) % 3],
    imputacionPrincipal: [
      "6.1.01 Materias primas",
      "6.1.04 Servicios contratados",
      "6.1.08 Mantenimiento",
    ][seed % 3],
    recepcionAsociada: `REC-${String(2000 + (seed % 700)).padStart(4, "0")}`,
    remitoProveedor: `RCP-${String(800 + (seed % 150)).padStart(4, "0")}`,
    circuitoFiscal: ["CAE controlado", "Validación manual", "Recepción con respaldo PDF"][
      (seed + 2) % 3
    ],
    retenciones: [["Ganancias", "IVA"], ["Ingresos Brutos"], ["SUSS", "Ganancias"]][seed % 3],
    condicionPago: ["Cuenta corriente", "Contado", "Cheque diferido"][seed % 3],
    responsableCarga: ["analista.compras", "tesoreria", "contabilidad"][(seed + 1) % 3],
    controlDocumental: invoice?.fechaVto
      ? `Vencimiento controlado al ${invoice.fechaVto}`
      : "Sin vencimiento documental informado",
    observacionInterna:
      invoice?.observacion ??
      `Factura de ${supplierName ?? "proveedor no identificado"} con trazabilidad ampliada del circuito legacy.`,
  }
}
