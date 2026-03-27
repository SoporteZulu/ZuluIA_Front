export type LegacyJurisdiction = {
  id: string
  codigo: string
  nombre: string
  provincia: string
  alicuota: number
  convenio: string
  riesgo: "alto" | "medio" | "bajo"
  estado: "activa" | "revision" | "inactiva"
  observacion: string
}

export type LegacySucursalContact = {
  id: string
  sucursalId: number
  nombre: string
  cargo: string
  email: string
  telefono: string
  circuito: string
}

export type LegacySchoolBilling = {
  id: string
  alumno: string
  familia: string
  sede: string
  nivel: string
  comprobante: string
  fechaEmision: string
  fechaVencimiento: string
  total: number
  saldo: number
  automatica: boolean
  estado: "emitida" | "parcial" | "vencida" | "cerrada"
  observacion: string
}

export type LegacySchoolCedulon = {
  id: string
  alumno: string
  familia: string
  plan: string
  lote: string
  fechaVencimiento: string
  importe: number
  saldo: number
  gestion: string
  estado: "emitido" | "gestion" | "cancelado" | "vencido"
}

export type LegacySchoolReceipt = {
  id: string
  numero: string
  alumno: string
  caja: string
  medio: string
  fecha: string
  total: number
  aplicadoA: string
  estado: "registrado" | "pendiente" | "revertido"
}

export type LegacySchoolPlan = {
  id: string
  nombre: string
  tipo: string
  alumnos: number
  cuotas: number
  bonificacionPct: number
  vigencia: string
  estado: "vigente" | "borrador" | "cerrado"
  observacion: string
}

export type LegacySchoolLot = {
  id: string
  codigo: string
  tipo: string
  periodo: string
  registros: number
  responsable: string
  estado: "preparacion" | "emitido" | "control" | "cerrado"
  observacion: string
}

export const legacyJurisdictions: LegacyJurisdiction[] = [
  {
    id: "j-901",
    codigo: "AR-BA-901",
    nombre: "ARBA Convenio Local",
    provincia: "Buenos Aires",
    alicuota: 3.5,
    convenio: "Convenio multilateral",
    riesgo: "alto",
    estado: "activa",
    observacion:
      "Jurisdiccion usada para ventas recurrentes y conciliacion fiscal del area metropolitana.",
  },
  {
    id: "j-902",
    codigo: "AR-CBA-440",
    nombre: "Rentas Cordoba",
    provincia: "Cordoba",
    alicuota: 2.9,
    convenio: "Padron local",
    riesgo: "medio",
    estado: "activa",
    observacion: "Alta para circuitos de retail y contratos de soporte con sede secundaria.",
  },
  {
    id: "j-903",
    codigo: "AR-SFE-210",
    nombre: "API Santa Fe",
    provincia: "Santa Fe",
    alicuota: 3.2,
    convenio: "Convenio multilateral",
    riesgo: "medio",
    estado: "revision",
    observacion:
      "Pendiente de validar regimen especial para servicios educativos con percepciones mixtas.",
  },
  {
    id: "j-904",
    codigo: "AR-MZA-120",
    nombre: "ATM Mendoza",
    provincia: "Mendoza",
    alicuota: 2.5,
    convenio: "Padron local",
    riesgo: "bajo",
    estado: "inactiva",
    observacion:
      "Se mantiene por trazabilidad historica de operaciones ya cerradas en ejercicios previos.",
  },
]

export const legacySucursalContacts: LegacySucursalContact[] = [
  {
    id: "sc-1",
    sucursalId: 1,
    nombre: "Marina Ferreyra",
    cargo: "Administracion Colegio",
    email: "marina.ferreyra@zulu.edu.ar",
    telefono: "011-4300-1001",
    circuito: "Facturacion y recibos",
  },
  {
    id: "sc-2",
    sucursalId: 1,
    nombre: "Carlos Nunez",
    cargo: "Tesoreria",
    email: "carlos.nunez@zulu.edu.ar",
    telefono: "011-4300-1002",
    circuito: "Cedulones y planes",
  },
  {
    id: "sc-3",
    sucursalId: 2,
    nombre: "Micaela Prado",
    cargo: "Coordinacion Academica",
    email: "micaela.prado@zulu.edu.ar",
    telefono: "351-440-0098",
    circuito: "Fin de proyecto y seguimiento de legajos",
  },
]

export const legacySchoolBillings: LegacySchoolBilling[] = [
  {
    id: "cb-1001",
    alumno: "Valentino Pereyra",
    familia: "Pereyra - Lopez",
    sede: "Casa Central",
    nivel: "Secundario",
    comprobante: "FAC-CO-000123",
    fechaEmision: "2026-03-01",
    fechaVencimiento: "2026-03-10",
    total: 148000,
    saldo: 148000,
    automatica: true,
    estado: "emitida",
    observacion:
      "Lote mensual de arancel con descuento por debito automatico pendiente de confirmacion.",
  },
  {
    id: "cb-1002",
    alumno: "Juana Coria",
    familia: "Coria - Mendez",
    sede: "Sede Norte",
    nivel: "Primario",
    comprobante: "FAC-CO-000124",
    fechaEmision: "2026-02-20",
    fechaVencimiento: "2026-03-05",
    total: 132500,
    saldo: 42000,
    automatica: false,
    estado: "parcial",
    observacion: "Factura con pago parcial por ventanilla y saldo a refinanciar.",
  },
  {
    id: "cb-1003",
    alumno: "Ambar Sosa",
    familia: "Sosa - Riquelme",
    sede: "Casa Central",
    nivel: "Inicial",
    comprobante: "FAC-CO-000119",
    fechaEmision: "2026-02-01",
    fechaVencimiento: "2026-02-10",
    total: 119000,
    saldo: 119000,
    automatica: true,
    estado: "vencida",
    observacion: "Pendiente de regularizacion antes de emitir fin de proyecto del bimestre.",
  },
]

export const legacySchoolCedulones: LegacySchoolCedulon[] = [
  {
    id: "cc-2001",
    alumno: "Valentino Pereyra",
    familia: "Pereyra - Lopez",
    plan: "Beca deportiva",
    lote: "MAR-2026-A",
    fechaVencimiento: "2026-03-15",
    importe: 48000,
    saldo: 48000,
    gestion: "Emision inicial",
    estado: "emitido",
  },
  {
    id: "cc-2002",
    alumno: "Juana Coria",
    familia: "Coria - Mendez",
    plan: "Plan 3 cuotas",
    lote: "FEB-2026-R",
    fechaVencimiento: "2026-03-08",
    importe: 42000,
    saldo: 12000,
    gestion: "Cobinpro en revision",
    estado: "gestion",
  },
  {
    id: "cc-2003",
    alumno: "Ambar Sosa",
    familia: "Sosa - Riquelme",
    plan: "Regularizacion 2025",
    lote: "ENE-2026-C",
    fechaVencimiento: "2026-02-05",
    importe: 36000,
    saldo: 36000,
    gestion: "Cancelacion de deuda sugerida",
    estado: "vencido",
  },
]

export const legacySchoolReceipts: LegacySchoolReceipt[] = [
  {
    id: "cr-3001",
    numero: "REC-000451",
    alumno: "Juana Coria",
    caja: "Caja Casa Central",
    medio: "Transferencia",
    fecha: "2026-03-04",
    total: 90500,
    aplicadoA: "FAC-CO-000124 + PLAN FEB-2026-R",
    estado: "registrado",
  },
  {
    id: "cr-3002",
    numero: "REC-000452",
    alumno: "Matias Ferreiro",
    caja: "Caja Sede Norte",
    medio: "Tarjeta",
    fecha: "2026-03-06",
    total: 118000,
    aplicadoA: "Lote automatico MAR-2026",
    estado: "pendiente",
  },
]

export const legacySchoolPlans: LegacySchoolPlan[] = [
  {
    id: "cp-4001",
    nombre: "Plan 3 cuotas arancel",
    tipo: "Financiacion",
    alumnos: 124,
    cuotas: 3,
    bonificacionPct: 5,
    vigencia: "2026-03 a 2026-05",
    estado: "vigente",
    observacion: "Plan general para cuentas con buen historial y validacion de tesoreria.",
  },
  {
    id: "cp-4002",
    nombre: "Beca hermanos",
    tipo: "Bonificacion",
    alumnos: 38,
    cuotas: 10,
    bonificacionPct: 12,
    vigencia: "Ciclo lectivo 2026",
    estado: "vigente",
    observacion: "Se aplica sobre segundo y tercer alumno de la misma familia.",
  },
  {
    id: "cp-4003",
    nombre: "Refinanciacion deuda 2025",
    tipo: "Regularizacion",
    alumnos: 17,
    cuotas: 6,
    bonificacionPct: 0,
    vigencia: "2026-01 a 2026-06",
    estado: "borrador",
    observacion: "Pendiente de aprobacion final por administracion central.",
  },
]

export const legacySchoolLots: LegacySchoolLot[] = [
  {
    id: "cl-5001",
    codigo: "LOT-MAR-FACT",
    tipo: "Facturacion automatica",
    periodo: "Marzo 2026",
    registros: 482,
    responsable: "Marina Ferreyra",
    estado: "emitido",
    observacion: "Incluye aranceles, comedor y actividades optativas de casa central.",
  },
  {
    id: "cl-5002",
    codigo: "LOT-MAR-CED",
    tipo: "Cedulones y cobranzas",
    periodo: "Marzo 2026",
    registros: 96,
    responsable: "Carlos Nunez",
    estado: "control",
    observacion: "Lote con observaciones de deuda historica y cancelaciones parciales.",
  },
  {
    id: "cl-5003",
    codigo: "LOT-ABR-PROY",
    tipo: "Fin de proyecto",
    periodo: "Abril 2026",
    registros: 42,
    responsable: "Micaela Prado",
    estado: "preparacion",
    observacion: "Generacion de cierres administrativos para actividades extracurriculares.",
  },
]
