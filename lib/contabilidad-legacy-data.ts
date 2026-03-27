export type LegacyAccountingIncome = {
  id: string
  origen: string
  caja: string
  concepto: string
  estado: "REGISTRADO" | "APLICADO" | "PENDIENTE"
  fecha: string
  importe: number
  circuito: string
  tercero: string
  medio: string
  responsable: string
  centroCosto: string
  referencia: string
  asientoReferencia: string
  backendGap: string
  observacion: string
  items: Array<{
    id: string
    concepto: string
    cuenta: string
    centroCosto: string
    importe: number
  }>
  timeline: Array<{
    id: string
    at: string
    title: string
    detail: string
  }>
}

export type LegacyAccountingExpense = {
  id: string
  destino: string
  caja: string
  concepto: string
  estado: "REGISTRADO" | "APLICADO" | "OBSERVADO"
  fecha: string
  importe: number
  circuito: string
  tercero: string
  medio: string
  responsable: string
  centroCosto: string
  referencia: string
  asientoReferencia: string
  backendGap: string
  observacion: string
  items: Array<{
    id: string
    concepto: string
    cuenta: string
    centroCosto: string
    importe: number
  }>
  timeline: Array<{
    id: string
    at: string
    title: string
    detail: string
  }>
}

export type LegacyAccountingVoucher = {
  id: string
  beneficiario: string
  sector: string
  concepto: string
  estado: "ABIERTO" | "RENDIDO" | "VENCIDO"
  fecha: string
  importe: number
  caja: string
  fechaVencimiento: string
  responsable: string
  centroCosto: string
  referencia: string
  backendGap: string
  observacion: string
  saldoPendiente: number
  rendicionEsperada: string
  items: Array<{
    id: string
    concepto: string
    cuenta: string
    centroCosto: string
    importe: number
  }>
  timeline: Array<{
    id: string
    at: string
    title: string
    detail: string
  }>
}

export type LegacyAccountingRefund = {
  id: string
  vale: string
  beneficiario: string
  estado: "PARCIAL" | "TOTAL" | "PENDIENTE"
  fecha: string
  importe: number
  cajaDestino: string
  forma: string
  responsable: string
  referencia: string
  backendGap: string
  observacion: string
  saldoVale: number
  diferencia: number
  items: Array<{
    id: string
    concepto: string
    cuenta: string
    importe: number
  }>
  timeline: Array<{
    id: string
    at: string
    title: string
    detail: string
  }>
}

export type LegacyAccountingTransfer = {
  id: string
  origen: string
  destino: string
  moneda: string
  estado: "EMITIDA" | "ACREDITADA" | "OBSERVADA"
  fecha: string
  importe: number
  circuito: string
  responsable: string
  referencia: string
  comprobanteOrigen: string
  comprobanteDestino: string
  cotizacion: number
  asientoReferencia: string
  backendGap: string
  observacion: string
  items: Array<{
    id: string
    concepto: string
    cuenta: string
    importe: number
  }>
  timeline: Array<{
    id: string
    at: string
    title: string
    detail: string
  }>
}

export type LegacyAccountingCae = {
  id: string
  circuito: string
  puntoVenta: string
  estado: "VIGENTE" | "A_VENCER" | "OBSERVADO"
  fechaSolicitud: string
  fechaVto: string
  referencia: string
  tipo: string
  responsable: string
  entorno: string
  ultimoControl: string
  backendGap: string
  observacion: string
  accionesPendientes: string[]
  timeline: Array<{
    id: string
    at: string
    title: string
    detail: string
  }>
}

export type LegacyAccountingCancellation = {
  id: string
  modulo: string
  comprobante: string
  motivo: string
  estado: "SOLICITADA" | "APROBADA" | "EJECUTADA"
  fecha: string
  impacto: string
  tercero: string
  responsable: string
  referenciaAsiento: string
  backendGap: string
  observacion: string
  documentos: string[]
  timeline: Array<{
    id: string
    at: string
    title: string
    detail: string
  }>
}

export type LegacyAccountingUnallocation = {
  id: string
  modulo: string
  comprobante: string
  cuenta: string
  estado: "PENDIENTE" | "EJECUTADA" | "OBSERVADA"
  fecha: string
  importe: number
  tercero: string
  motivo: string
  responsable: string
  referenciaAsiento: string
  backendGap: string
  observacion: string
  saldoRelacion: string
  items: Array<{
    id: string
    concepto: string
    cuenta: string
    importe: number
  }>
  timeline: Array<{
    id: string
    at: string
    title: string
    detail: string
  }>
}

export const legacyAccountingIncomes: LegacyAccountingIncome[] = [
  {
    id: "ing-001",
    origen: "Cobranza ventanilla",
    caja: "Caja Central ARS",
    concepto: "Ingreso por cobranza manual de saldo vencido",
    estado: "APLICADO",
    fecha: "2026-03-18",
    importe: 182450,
    circuito: "Cobro eventual fuera de lote",
    tercero: "Transportes Roca SA",
    medio: "Efectivo en caja",
    responsable: "Tesoreria central",
    centroCosto: "Administracion",
    referencia: "REC-MAN-00018",
    asientoReferencia: "ASI-000814",
    backendGap: "No existe API para ingresos manuales no originados en cobros.",
    observacion: "Se regularizo saldo vencido y se aplico luego sobre cuenta corriente comercial.",
    items: [
      {
        id: "ing-001-1",
        concepto: "Cobranza de saldo vencido",
        cuenta: "1.1.01 Caja central ARS",
        centroCosto: "Administracion",
        importe: 160000,
      },
      {
        id: "ing-001-2",
        concepto: "Interes punitorio",
        cuenta: "4.1.09 Resultados financieros",
        centroCosto: "Administracion",
        importe: 22450,
      },
    ],
    timeline: [
      {
        id: "ing-001-t1",
        at: "2026-03-18 08:42",
        title: "Alta manual",
        detail: "Tesoreria cargo el ingreso desde ventanilla.",
      },
      {
        id: "ing-001-t2",
        at: "2026-03-18 10:05",
        title: "Aplicacion contable",
        detail: "Se vinculo al asiento de regularizacion y quedo aplicado.",
      },
    ],
  },
  {
    id: "ing-002",
    origen: "Ajuste de tesorería",
    caja: "Caja Planta Norte",
    concepto: "Regularización de sobrante detectado al cierre",
    estado: "REGISTRADO",
    fecha: "2026-03-20",
    importe: 38720,
    circuito: "Cierre diario de caja",
    tercero: "Sin tercero",
    medio: "Ajuste interno",
    responsable: "Supervision planta norte",
    centroCosto: "Produccion",
    referencia: "CIE-PLA-NOR-2203",
    asientoReferencia: "Pendiente",
    backendGap: "El contrato actual no publica ingresos de ajuste ni sobrantes de caja.",
    observacion:
      "Queda pendiente la decision de imputar a diferencia de caja o reintegrar al circuito operativo.",
    items: [
      {
        id: "ing-002-1",
        concepto: "Sobrante al cierre",
        cuenta: "1.1.03 Caja planta norte",
        centroCosto: "Produccion",
        importe: 38720,
      },
    ],
    timeline: [
      {
        id: "ing-002-t1",
        at: "2026-03-20 18:11",
        title: "Deteccion en cierre",
        detail: "Se relevo sobrante de caja en arqueo diario.",
      },
      {
        id: "ing-002-t2",
        at: "2026-03-21 09:08",
        title: "Pendiente de imputacion",
        detail: "Contabilidad aun no definio el asiento final.",
      },
    ],
  },
  {
    id: "ing-003",
    origen: "Reintegro de viáticos",
    caja: "Caja Central ARS",
    concepto: "Devolucion parcial de viaticos no consumidos",
    estado: "PENDIENTE",
    fecha: "2026-03-22",
    importe: 12800,
    circuito: "Rendicion de vale",
    tercero: "Marina Lopez",
    medio: "Efectivo devuelto",
    responsable: "Tesoreria central",
    centroCosto: "Administracion",
    referencia: "REI-VAL-001",
    asientoReferencia: "Pendiente",
    backendGap: "No hay endpoint de rendicion que vincule reintegro contra vale y asiento.",
    observacion: "El efectivo ya ingreso a caja, pero falta la cancelacion definitiva del vale.",
    items: [
      {
        id: "ing-003-1",
        concepto: "Reintegro en efectivo",
        cuenta: "1.1.01 Caja central ARS",
        centroCosto: "Administracion",
        importe: 12800,
      },
    ],
    timeline: [
      {
        id: "ing-003-t1",
        at: "2026-03-22 11:17",
        title: "Ingreso a caja",
        detail: "Tesoreria recibe devolucion parcial del vale.",
      },
      {
        id: "ing-003-t2",
        at: "2026-03-22 11:40",
        title: "Pendiente de cierre",
        detail: "Falta desimputar saldo remanente y cerrar el vale.",
      },
    ],
  },
]

export const legacyAccountingExpenses: LegacyAccountingExpense[] = [
  {
    id: "egr-001",
    destino: "Servicios generales",
    caja: "Caja Central ARS",
    concepto: "Pago operativo menor por mantenimiento externo",
    estado: "APLICADO",
    fecha: "2026-03-17",
    importe: 94600,
    circuito: "Egreso menor de mantenimiento",
    tercero: "Servicios Delta SRL",
    medio: "Efectivo",
    responsable: "Tesoreria central",
    centroCosto: "Infraestructura",
    referencia: "ORD-SERV-449",
    asientoReferencia: "ASI-000802",
    backendGap: "Los egresos menores no tienen alta separada del circuito formal de pagos.",
    observacion: "Se aplico por fuera de orden de pago para resolver servicio urgente.",
    items: [
      {
        id: "egr-001-1",
        concepto: "Mantenimiento electrico",
        cuenta: "5.2.04 Mantenimiento general",
        centroCosto: "Infraestructura",
        importe: 94600,
      },
    ],
    timeline: [
      {
        id: "egr-001-t1",
        at: "2026-03-17 09:20",
        title: "Solicitud urgente",
        detail: "Infraestructura pidio salida inmediata de fondos.",
      },
      {
        id: "egr-001-t2",
        at: "2026-03-17 13:54",
        title: "Aplicacion contable",
        detail: "Se registro asiento de egreso y comprobante soporte.",
      },
    ],
  },
  {
    id: "egr-002",
    destino: "Logística interna",
    caja: "Caja Expedición",
    concepto: "Adelanto para combustible y peajes",
    estado: "OBSERVADO",
    fecha: "2026-03-21",
    importe: 52150,
    circuito: "Adelanto operativo",
    tercero: "Equipo de expedicion",
    medio: "Efectivo",
    responsable: "Coordinacion de logistica",
    centroCosto: "Distribucion",
    referencia: "SAL-LOG-118",
    asientoReferencia: "Pendiente",
    backendGap: "No existe circuito API para egresos operativos con rendicion posterior.",
    observacion: "Falta ticketeria de peajes y cierre de viatico asociado.",
    items: [
      {
        id: "egr-002-1",
        concepto: "Combustible ruta norte",
        cuenta: "5.4.02 Combustibles y lubricantes",
        centroCosto: "Distribucion",
        importe: 38150,
      },
      {
        id: "egr-002-2",
        concepto: "Peajes y gastos menores",
        cuenta: "5.4.09 Gastos de viaje",
        centroCosto: "Distribucion",
        importe: 14000,
      },
    ],
    timeline: [
      {
        id: "egr-002-t1",
        at: "2026-03-21 07:15",
        title: "Entrega de fondos",
        detail: "Se emitio adelanto a expedicion antes de la salida.",
      },
      {
        id: "egr-002-t2",
        at: "2026-03-22 17:22",
        title: "Observacion de rendicion",
        detail: "Faltan comprobantes y centro de costo definitivo.",
      },
    ],
  },
  {
    id: "egr-003",
    destino: "Compras menores",
    caja: "Caja Central ARS",
    concepto: "Compra urgente de insumos de embalaje",
    estado: "REGISTRADO",
    fecha: "2026-03-22",
    importe: 28750,
    circuito: "Caja chica",
    tercero: "Packaging Express",
    medio: "Debito inmediato",
    responsable: "Deposito central",
    centroCosto: "Almacen",
    referencia: "CC-2026-031",
    asientoReferencia: "Pendiente",
    backendGap: "No existe endpoint separado para caja chica ni su conciliacion automatica.",
    observacion:
      "El gasto esta registrado localmente hasta que el backend publique el egreso menor con medio bancario.",
    items: [
      {
        id: "egr-003-1",
        concepto: "Film stretch",
        cuenta: "5.1.11 Materiales de embalaje",
        centroCosto: "Almacen",
        importe: 18750,
      },
      {
        id: "egr-003-2",
        concepto: "Etiquetas termicas",
        cuenta: "5.1.11 Materiales de embalaje",
        centroCosto: "Almacen",
        importe: 10000,
      },
    ],
    timeline: [
      {
        id: "egr-003-t1",
        at: "2026-03-22 12:06",
        title: "Compra de contingencia",
        detail: "Deposito solicito salida rapida por falta de stock.",
      },
      {
        id: "egr-003-t2",
        at: "2026-03-22 12:45",
        title: "Pendiente de asiento",
        detail: "Se espera la imputacion definitiva en el diario.",
      },
    ],
  },
]

export const legacyAccountingVouchers: LegacyAccountingVoucher[] = [
  {
    id: "val-001",
    beneficiario: "Marina López",
    sector: "Administración",
    concepto: "Gastos menores de oficina",
    estado: "ABIERTO",
    fecha: "2026-03-14",
    importe: 25000,
    caja: "Caja Central ARS",
    fechaVencimiento: "2026-03-25",
    responsable: "Tesoreria central",
    centroCosto: "Administracion",
    referencia: "VAL-ADM-001",
    backendGap: "No hay emision ni rendicion de vales en API; solo pagos/cobros generales.",
    observacion: "El beneficiario ya devolvio una parte del efectivo y falta cerrar la rendicion.",
    saldoPendiente: 10800,
    rendicionEsperada: "Tickets de libreria y papeleria pendientes de carga.",
    items: [
      {
        id: "val-001-1",
        concepto: "Fondo inicial autorizado",
        cuenta: "1.1.01 Caja central ARS",
        centroCosto: "Administracion",
        importe: 25000,
      },
    ],
    timeline: [
      {
        id: "val-001-t1",
        at: "2026-03-14 09:10",
        title: "Emision del vale",
        detail: "Tesoreria entrego el adelanto a administracion.",
      },
      {
        id: "val-001-t2",
        at: "2026-03-22 11:17",
        title: "Reintegro parcial",
        detail: "Ingreso parcial en efectivo ya visible en reintegros.",
      },
    ],
  },
  {
    id: "val-002",
    beneficiario: "Raúl Benítez",
    sector: "Postventa",
    concepto: "Viáticos de soporte en cliente",
    estado: "RENDIDO",
    fecha: "2026-03-10",
    importe: 78000,
    caja: "Caja Central ARS",
    fechaVencimiento: "2026-03-16",
    responsable: "Coordinacion de servicios",
    centroCosto: "Postventa",
    referencia: "VAL-SOP-009",
    backendGap: "La rendicion total sigue fuera del backend y se consolida localmente.",
    observacion: "La rendicion quedo conciliada y cerrada contra atencion en cliente critico.",
    saldoPendiente: 0,
    rendicionEsperada: "Cerrado con comprobantes y reintegro total.",
    items: [
      {
        id: "val-002-1",
        concepto: "Viaticos soporte Rosario",
        cuenta: "5.4.09 Gastos de viaje",
        centroCosto: "Postventa",
        importe: 78000,
      },
    ],
    timeline: [
      {
        id: "val-002-t1",
        at: "2026-03-10 07:30",
        title: "Entrega de viatico",
        detail: "Se libera fondo para servicio en cliente.",
      },
      {
        id: "val-002-t2",
        at: "2026-03-12 18:40",
        title: "Rendicion cerrada",
        detail: "Reintegro total y comprobantes archivados.",
      },
    ],
  },
  {
    id: "val-003",
    beneficiario: "Leandro Sosa",
    sector: "Logistica",
    concepto: "Adelanto para peajes y descarga",
    estado: "VENCIDO",
    fecha: "2026-03-08",
    importe: 46000,
    caja: "Caja Expedicion",
    fechaVencimiento: "2026-03-13",
    responsable: "Jefatura de expedicion",
    centroCosto: "Distribucion",
    referencia: "VAL-LOG-014",
    backendGap: "El backend no emite alertas ni control de vencimiento sobre vales.",
    observacion: "Sigue abierto sin rendicion completa y con diferencia sin justificar.",
    saldoPendiente: 46000,
    rendicionEsperada: "Faltan tickets de peaje, combustible y parte de descarga.",
    items: [
      {
        id: "val-003-1",
        concepto: "Adelanto logistica zona sur",
        cuenta: "1.1.03 Caja expedicion",
        centroCosto: "Distribucion",
        importe: 46000,
      },
    ],
    timeline: [
      {
        id: "val-003-t1",
        at: "2026-03-08 06:48",
        title: "Emision",
        detail: "Se entrega vale para reparto especial de la semana.",
      },
      {
        id: "val-003-t2",
        at: "2026-03-15 10:12",
        title: "Vencimiento sin rendir",
        detail: "El responsable no completo la documentacion requerida.",
      },
    ],
  },
]

export const legacyAccountingRefunds: LegacyAccountingRefund[] = [
  {
    id: "rei-001",
    vale: "VAL-001",
    beneficiario: "Marina López",
    estado: "PARCIAL",
    fecha: "2026-03-19",
    importe: 14200,
    cajaDestino: "Caja Central ARS",
    forma: "Efectivo",
    responsable: "Tesoreria central",
    referencia: "RIN-ADM-001",
    backendGap: "No hay endpoint que aplique rendiciones parciales contra un vale abierto.",
    observacion: "Se devolvio efectivo, pero la rendicion documental sigue en curso.",
    saldoVale: 10800,
    diferencia: 0,
    items: [
      {
        id: "rei-001-1",
        concepto: "Efectivo devuelto",
        cuenta: "1.1.01 Caja central ARS",
        importe: 14200,
      },
    ],
    timeline: [
      {
        id: "rei-001-t1",
        at: "2026-03-19 15:32",
        title: "Recepcion de reintegro",
        detail: "Tesoreria recibe devolucion parcial del beneficiario.",
      },
      {
        id: "rei-001-t2",
        at: "2026-03-20 09:16",
        title: "Pendiente de cierre",
        detail: "Se espera rendicion final y respaldo de gastos.",
      },
    ],
  },
  {
    id: "rei-002",
    vale: "VAL-002",
    beneficiario: "Raúl Benítez",
    estado: "TOTAL",
    fecha: "2026-03-12",
    importe: 78000,
    cajaDestino: "Caja Central ARS",
    forma: "Transferencia interna",
    responsable: "Tesoreria central",
    referencia: "RIN-SOP-009",
    backendGap:
      "La rendicion total no se refleja en una API separada y se sigue leyendo localmente.",
    observacion: "Quedo conciliado contra comprobantes y asiento final.",
    saldoVale: 0,
    diferencia: 0,
    items: [
      {
        id: "rei-002-1",
        concepto: "Cierre total de viaticos",
        cuenta: "5.4.09 Gastos de viaje",
        importe: 78000,
      },
    ],
    timeline: [
      {
        id: "rei-002-t1",
        at: "2026-03-12 16:50",
        title: "Rendicion total",
        detail: "Se completa cierre del vale con documentacion soporte.",
      },
      {
        id: "rei-002-t2",
        at: "2026-03-12 17:10",
        title: "Conciliacion",
        detail: "Contabilidad vincula el reintegro con el asiento final.",
      },
    ],
  },
  {
    id: "rei-003",
    vale: "VAL-003",
    beneficiario: "Leandro Sosa",
    estado: "PENDIENTE",
    fecha: "2026-03-22",
    importe: 0,
    cajaDestino: "Caja Expedicion",
    forma: "Sin registrar",
    responsable: "Jefatura de expedicion",
    referencia: "RIN-LOG-014",
    backendGap: "Sin API para registrar rendicion pendiente o diferencias de vale vencido.",
    observacion: "No hay reintegro cargado; el vale esta vencido y falta definir diferencia.",
    saldoVale: 46000,
    diferencia: 46000,
    items: [
      {
        id: "rei-003-1",
        concepto: "Saldo pendiente sin rendir",
        cuenta: "1.1.03 Caja expedicion",
        importe: 46000,
      },
    ],
    timeline: [
      {
        id: "rei-003-t1",
        at: "2026-03-22 08:05",
        title: "Escalado a jefatura",
        detail: "Tesoreria reclama documentacion y devolucion del saldo.",
      },
    ],
  },
]

export const legacyAccountingTransfers: LegacyAccountingTransfer[] = [
  {
    id: "tra-001",
    origen: "Caja Central ARS",
    destino: "Cuenta Banco Nación ARS",
    moneda: "ARS",
    estado: "ACREDITADA",
    fecha: "2026-03-18",
    importe: 640000,
    circuito: "Deposito de recaudacion",
    responsable: "Tesoreria central",
    referencia: "TR-BNA-0318",
    comprobanteOrigen: "DEP-000184",
    comprobanteDestino: "BNA-ACR-88712",
    cotizacion: 1,
    asientoReferencia: "ASI-000815",
    backendGap: "No existe API para transferencias caja-banco con doble referencia y acreditacion.",
    observacion:
      "La recaudacion diaria ya impacto en banco, pero la boleta de deposito sigue archivada fuera del sistema.",
    items: [
      {
        id: "tra-001-1",
        concepto: "Salida de caja por deposito",
        cuenta: "1.1.01 Caja central ARS",
        importe: 640000,
      },
      {
        id: "tra-001-2",
        concepto: "Ingreso en banco nacion",
        cuenta: "1.1.10 Banco Nacion cuenta corriente",
        importe: 640000,
      },
    ],
    timeline: [
      {
        id: "tra-001-t1",
        at: "2026-03-18 14:10",
        title: "Emision de transferencia",
        detail: "Tesoreria prepara deposito bancario desde caja central.",
      },
      {
        id: "tra-001-t2",
        at: "2026-03-18 17:42",
        title: "Acreditacion",
        detail: "Banco confirma acreditacion total del deposito.",
      },
    ],
  },
  {
    id: "tra-002",
    origen: "Caja USD",
    destino: "Cuenta Galicia USD",
    moneda: "USD",
    estado: "EMITIDA",
    fecha: "2026-03-21",
    importe: 3200,
    circuito: "Cobertura bancaria en moneda extranjera",
    responsable: "Tesoreria financiera",
    referencia: "TR-USD-045",
    comprobanteOrigen: "SAL-USD-045",
    comprobanteDestino: "Pendiente",
    cotizacion: 1095.5,
    asientoReferencia: "Pendiente",
    backendGap:
      "No hay endpoint para seguimiento de transferencias emitidas pendientes de acreditacion.",
    observacion: "Falta confirmacion bancaria y asiento final en moneda de origen y cierre.",
    items: [
      {
        id: "tra-002-1",
        concepto: "Transferencia emitida desde caja USD",
        cuenta: "1.1.04 Caja USD",
        importe: 3200,
      },
      {
        id: "tra-002-2",
        concepto: "Cuenta Galicia USD pendiente de acreditacion",
        cuenta: "1.1.12 Banco Galicia USD",
        importe: 3200,
      },
    ],
    timeline: [
      {
        id: "tra-002-t1",
        at: "2026-03-21 12:04",
        title: "Emision",
        detail: "Se ordena transferencia a cuenta bancaria en USD.",
      },
      {
        id: "tra-002-t2",
        at: "2026-03-21 18:20",
        title: "Pendiente de acreditacion",
        detail: "Banco aun no devolvio comprobante ni acreditacion definitiva.",
      },
    ],
  },
  {
    id: "tra-003",
    origen: "Caja Expedición",
    destino: "Cuenta Macro ARS",
    moneda: "ARS",
    estado: "OBSERVADA",
    fecha: "2026-03-22",
    importe: 185400,
    circuito: "Retiro y reubicacion de fondos",
    responsable: "Jefatura de expedicion",
    referencia: "TR-EXP-019",
    comprobanteOrigen: "RET-EXP-019",
    comprobanteDestino: "MAC-OBS-3321",
    cotizacion: 1,
    asientoReferencia: "Pendiente",
    backendGap:
      "No existe seguimiento de transferencias observadas ni diferencia entre retiro y acreditacion.",
    observacion: "Se detecto diferencia en el monto acreditado y falta regularizacion documental.",
    items: [
      {
        id: "tra-003-1",
        concepto: "Retiro de caja expedicion",
        cuenta: "1.1.03 Caja expedicion",
        importe: 185400,
      },
      {
        id: "tra-003-2",
        concepto: "Transferencia bancaria observada",
        cuenta: "1.1.13 Banco Macro ARS",
        importe: 185400,
      },
    ],
    timeline: [
      {
        id: "tra-003-t1",
        at: "2026-03-22 10:15",
        title: "Retiro de fondos",
        detail: "Expedicion entrega efectivo para deposito bancario.",
      },
      {
        id: "tra-003-t2",
        at: "2026-03-22 16:58",
        title: "Observacion bancaria",
        detail: "El banco informa inconsistencia y deja la operacion observada.",
      },
    ],
  },
]

export const legacyAccountingCaeItems: LegacyAccountingCae[] = [
  {
    id: "cae-001",
    circuito: "Ventas A",
    puntoVenta: "0001 Casa Central",
    estado: "VIGENTE",
    fechaSolicitud: "2026-03-01",
    fechaVto: "2026-03-31",
    referencia: "CAE 74928100477192",
    tipo: "CAE",
    responsable: "Fiscal central",
    entorno: "AFIP produccion",
    ultimoControl: "2026-03-21",
    backendGap: "No hay solicitud, consulta ni renovacion CAE desde el frontend actual.",
    observacion: "La autorizacion sigue vigente pero el control se realiza fuera del sistema.",
    accionesPendientes: [
      "Verificar consumo del rango autorizado antes del cierre mensual.",
      "Preparar renovacion si AFIP cambia vigencia o lote.",
    ],
    timeline: [
      {
        id: "cae-001-t1",
        at: "2026-03-01 08:30",
        title: "Solicitud aprobada",
        detail: "AFIP devuelve CAE vigente para el punto de venta principal.",
      },
      {
        id: "cae-001-t2",
        at: "2026-03-21 17:10",
        title: "Control interno",
        detail: "Fiscal revisa vigencia y consumo del talonario autorizado.",
      },
    ],
  },
  {
    id: "cae-002",
    circuito: "Compras importación",
    puntoVenta: "Timbrado interno",
    estado: "A_VENCER",
    fechaSolicitud: "2026-02-26",
    fechaVto: "2026-03-26",
    referencia: "Timbrado lote M03",
    tipo: "Timbrado",
    responsable: "Administracion fiscal",
    entorno: "Control interno",
    ultimoControl: "2026-03-22",
    backendGap: "No hay workflow de alerta, renovacion ni actualizacion de timbrado en backend.",
    observacion:
      "La renovacion debe iniciarse esta semana para no cortar el circuito de compras importacion.",
    accionesPendientes: [
      "Solicitar renovacion del timbrado lote M03.",
      "Validar nuevo vencimiento contra el calendario fiscal.",
    ],
    timeline: [
      {
        id: "cae-002-t1",
        at: "2026-02-26 11:15",
        title: "Alta de timbrado",
        detail: "Se registra lote interno para compras de importacion.",
      },
      {
        id: "cae-002-t2",
        at: "2026-03-22 09:48",
        title: "Alerta de vencimiento",
        detail: "El equipo fiscal marca la renovacion como critica.",
      },
    ],
  },
  {
    id: "cae-003",
    circuito: "Ventas B interior",
    puntoVenta: "0004 Sucursal Cordoba",
    estado: "OBSERVADO",
    fechaSolicitud: "2026-03-18",
    fechaVto: "2026-04-17",
    referencia: "CAE observacion lote B04",
    tipo: "CAE",
    responsable: "Fiscal regional",
    entorno: "AFIP homologacion",
    ultimoControl: "2026-03-23",
    backendGap: "No existe parsing de respuesta AFIP ni seguimiento de observaciones del CAE.",
    observacion: "AFIP devolvio observacion por certificados y no se pudo cerrar desde el sistema.",
    accionesPendientes: [
      "Reemitir solicitud con certificado corregido.",
      "Confirmar habilitacion del punto de venta 0004.",
    ],
    timeline: [
      {
        id: "cae-003-t1",
        at: "2026-03-18 15:05",
        title: "Solicitud observada",
        detail: "El organismo devuelve inconsistencia en certificado.",
      },
      {
        id: "cae-003-t2",
        at: "2026-03-23 08:22",
        title: "Pendiente de correccion",
        detail: "Se espera nueva presentacion y habilitacion definitiva.",
      },
    ],
  },
]

export const legacyAccountingCancellations: LegacyAccountingCancellation[] = [
  {
    id: "anu-001",
    modulo: "Financiero",
    comprobante: "PAG-000184",
    motivo: "Pago duplicado detectado en conciliación diaria",
    estado: "APROBADA",
    fecha: "2026-03-20",
    impacto: "Revierte egreso y libera saldo en caja",
    tercero: "Servicios Delta SRL",
    responsable: "Jefatura de tesoreria",
    referenciaAsiento: "ASI-000821",
    backendGap: "No existe workflow transversal de aprobacion y ejecucion de anulaciones.",
    observacion:
      "La anulacion fue aprobada pero aun requiere ejecucion contable y documental coordinada.",
    documentos: ["Pago original", "Conciliacion diaria", "Orden de anulacion"],
    timeline: [
      {
        id: "anu-001-t1",
        at: "2026-03-20 09:18",
        title: "Solicitud",
        detail: "Tesoreria detecta duplicidad y solicita anulacion.",
      },
      {
        id: "anu-001-t2",
        at: "2026-03-20 12:40",
        title: "Aprobacion",
        detail: "La jefatura autoriza revertir pago y asiento asociado.",
      },
    ],
  },
  {
    id: "anu-002",
    modulo: "Ventas",
    comprobante: "COB-000233",
    motivo: "Cobro cargado sobre tercero incorrecto",
    estado: "SOLICITADA",
    fecha: "2026-03-22",
    impacto: "Pendiente de reversión e imputación correcta",
    tercero: "Cliente Industrial Patagonico",
    responsable: "Administracion comercial",
    referenciaAsiento: "ASI-000836",
    backendGap: "No hay endpoint que coordine anulacion de cobro con desimputacion y reimputacion.",
    observacion: "Se debe revertir el cobro y reaplicarlo sobre el cliente correcto.",
    documentos: ["Recibo COB-000233", "Cuenta corriente cliente", "Pedido de correccion"],
    timeline: [
      {
        id: "anu-002-t1",
        at: "2026-03-22 10:12",
        title: "Deteccion de error",
        detail: "Se detecta que el cobro fue imputado a un tercero equivocado.",
      },
      {
        id: "anu-002-t2",
        at: "2026-03-22 10:45",
        title: "Escalado",
        detail: "Se solicita anulacion antes de reimputar el recibo.",
      },
    ],
  },
  {
    id: "anu-003",
    modulo: "Compras",
    comprobante: "OP-000071",
    motivo: "Orden de pago emitida sin retencion fiscal obligatoria",
    estado: "EJECUTADA",
    fecha: "2026-03-21",
    impacto: "Se revierte pago, se corrige retencion y se reemite la orden",
    tercero: "Proveedora Litoral SA",
    responsable: "Contaduria",
    referenciaAsiento: "ASI-000829",
    backendGap:
      "La ejecucion de anulacion sigue siendo manual y no queda automatizada en el backend.",
    observacion: "El circuito ya fue corregido, pero la trazabilidad vive en esta consola local.",
    documentos: ["Orden de pago", "Retencion corregida", "Asiento de reversa"],
    timeline: [
      {
        id: "anu-003-t1",
        at: "2026-03-21 11:08",
        title: "Solicitud y aprobacion",
        detail: "Contaduria valida la ausencia de retencion y aprueba la reversa.",
      },
      {
        id: "anu-003-t2",
        at: "2026-03-21 16:32",
        title: "Ejecucion",
        detail: "Se anula el pago, se corrige la retencion y se reemite la orden.",
      },
    ],
  },
]

export const legacyAccountingUnallocations: LegacyAccountingUnallocation[] = [
  {
    id: "des-001",
    modulo: "Ventas",
    comprobante: "FC-A-0001-00000024",
    cuenta: "1.1.02 Deudores por ventas",
    estado: "PENDIENTE",
    fecha: "2026-03-21",
    importe: 312400,
    tercero: "Cliente Industrial Patagonico",
    motivo: "Factura aplicada contra recibo incorrecto",
    responsable: "Administracion comercial",
    referenciaAsiento: "ASI-000834",
    backendGap: "No existe servicio para desimputar y reaplicar documentos desde cuenta corriente.",
    observacion: "Debe liberarse el comprobante para reimputarlo sobre otro recibo.",
    saldoRelacion: "Pendiente de reimputacion total",
    items: [
      {
        id: "des-001-1",
        concepto: "Liberacion de factura de ventas",
        cuenta: "1.1.02 Deudores por ventas",
        importe: 312400,
      },
    ],
    timeline: [
      {
        id: "des-001-t1",
        at: "2026-03-21 09:58",
        title: "Pedido de desimputacion",
        detail: "Comercial detecta aplicacion errada en cuenta corriente.",
      },
      {
        id: "des-001-t2",
        at: "2026-03-21 10:30",
        title: "Pendiente de ejecucion",
        detail: "Se espera liberacion para reaplicar el comprobante.",
      },
    ],
  },
  {
    id: "des-002",
    modulo: "Compras",
    comprobante: "FC-B-0002-00000011",
    cuenta: "2.1.03 Proveedores locales",
    estado: "EJECUTADA",
    fecha: "2026-03-15",
    importe: 198540,
    tercero: "Proveedora Litoral SA",
    motivo: "Factura de compra imputada sobre orden de pago incorrecta",
    responsable: "Contaduria",
    referenciaAsiento: "ASI-000792",
    backendGap: "La desimputacion ejecutada no queda registrada mediante endpoint dedicado.",
    observacion: "Se libero el comprobante y se reaplico correctamente en el circuito de compras.",
    saldoRelacion: "Reimputado y conciliado",
    items: [
      {
        id: "des-002-1",
        concepto: "Liberacion de proveedor local",
        cuenta: "2.1.03 Proveedores locales",
        importe: 198540,
      },
    ],
    timeline: [
      {
        id: "des-002-t1",
        at: "2026-03-15 10:06",
        title: "Liberacion del comprobante",
        detail: "Contaduria ejecuta desimputacion sobre orden equivocada.",
      },
      {
        id: "des-002-t2",
        at: "2026-03-15 12:18",
        title: "Reimputacion correcta",
        detail: "La factura vuelve a quedar conciliada contra la orden correcta.",
      },
    ],
  },
  {
    id: "des-003",
    modulo: "Tesoreria",
    comprobante: "VAL-LOG-014",
    cuenta: "1.1.03 Caja expedicion",
    estado: "OBSERVADA",
    fecha: "2026-03-22",
    importe: 46000,
    tercero: "Leandro Sosa",
    motivo: "Vale vencido pendiente de liberar para registrar diferencia",
    responsable: "Jefatura de expedicion",
    referenciaAsiento: "Pendiente",
    backendGap:
      "No hay circuito backend para liberar vales vencidos y registrar diferencias de rendicion.",
    observacion:
      "Antes de cerrar el vale debe liberarse la imputacion y definir recupero o castigo.",
    saldoRelacion: "Saldo observado sin rendicion",
    items: [
      {
        id: "des-003-1",
        concepto: "Liberacion de saldo de vale",
        cuenta: "1.1.03 Caja expedicion",
        importe: 46000,
      },
    ],
    timeline: [
      {
        id: "des-003-t1",
        at: "2026-03-22 08:40",
        title: "Observacion de saldo",
        detail: "Tesoreria pide liberar el vale para registrar la diferencia.",
      },
      {
        id: "des-003-t2",
        at: "2026-03-22 13:05",
        title: "Pendiente de definicion",
        detail: "Falta validar si el saldo se recupera o se castiga.",
      },
    ],
  },
]
