export type LegacyInventoryBrand = {
  id: string
  nombre: string
  familia: string
  origen: string
  estado: "activa" | "revision" | "descontinuada"
  catalogo: number
  lineas: string[]
  cobertura: string
  observacion: string
}

export type LegacyAttributeSet = {
  id: string
  nombre: string
  alcance: "catalogo" | "logistica" | "fiscal" | "produccion"
  categoria: string
  obligatorios: string[]
  opcionales: string[]
  validacion: string
  observacion: string
}

export type LegacyWarehouseZone = {
  id: string
  deposito: string
  codigo: string
  tipo: string
  temperatura: string
  capacidadPct: number
  criticidad: "baja" | "media" | "alta"
  supervisor: string
  observacion: string
}

export type LegacyWarehouseRegion = {
  id: string
  nombre: string
  planta: string
  responsable: string
  zonas: string[]
  servicio: string
  nivelOcupacion: number
  observacion: string
}

export type LegacyWarehouseCountPlan = {
  id: string
  deposito: string
  zona: string
  frecuencia: string
  proximoConteo: string
  estado: "programado" | "en-ejecucion" | "observado"
  divergenciaPct: number
  responsable: string
  observacion: string
}

export const legacyInventoryBrands: LegacyInventoryBrand[] = [
  {
    id: "brand-001",
    nombre: "BoschPRO",
    familia: "Herramientas",
    origen: "Nacional",
    estado: "activa",
    catalogo: 42,
    lineas: ["Taladros", "Amoladoras", "Accesorios"],
    cobertura: "Taller y mantenimiento",
    observacion: "Marca historica con rotacion estable y reposicion frecuente.",
  },
  {
    id: "brand-002",
    nombre: "CableMaster",
    familia: "Insumos",
    origen: "Importada",
    estado: "revision",
    catalogo: 18,
    lineas: ["UTP", "Fibra", "Conectividad"],
    cobertura: "Redes e infraestructura",
    observacion: "Pendiente homogeneizar presentaciones y atributos de trazabilidad.",
  },
  {
    id: "brand-003",
    nombre: "ElectraTrans",
    familia: "Electronica",
    origen: "Importada",
    estado: "activa",
    catalogo: 9,
    lineas: ["Transformadores", "PLC", "Control"],
    cobertura: "Tableros y automatizacion",
    observacion: "Requiere control documental y soporte de series por lote.",
  },
  {
    id: "brand-004",
    nombre: "SafeLine",
    familia: "Seguridad industrial",
    origen: "Nacional",
    estado: "descontinuada",
    catalogo: 6,
    lineas: ["Cintas", "Senialetica"],
    cobertura: "Obras y seguridad",
    observacion: "El legacy la conserva visible por historico comercial y equivalencias.",
  },
]

export const legacyAttributeSets: LegacyAttributeSet[] = [
  {
    id: "attr-001",
    nombre: "Ficha tecnica base",
    alcance: "catalogo",
    categoria: "General",
    obligatorios: ["codigo interno", "descripcion corta", "unidad", "iva"],
    opcionales: ["ean", "descripcion adicional", "marca"],
    validacion: "No publicar item si faltan unidad o tratamiento fiscal.",
    observacion: "Replica la validacion minima del maestro historico de items.",
  },
  {
    id: "attr-002",
    nombre: "Trazabilidad logistica",
    alcance: "logistica",
    categoria: "Stock",
    obligatorios: ["maneja stock", "stock minimo", "deposito default"],
    opcionales: ["zona sugerida", "rotacion", "familia picking"],
    validacion: "Controlar circuito de reposicion y cobertura por deposito.",
    observacion: "Pensado para picking, recepciones y conteos ciclicos.",
  },
  {
    id: "attr-003",
    nombre: "Bloque fiscal AFIP",
    alcance: "fiscal",
    categoria: "Fiscal",
    obligatorios: ["codigo AFIP", "alicuota", "moneda"],
    opcionales: ["ncm", "proveedor homologado", "origen"],
    validacion: "No emitir comprobantes con codigo fiscal incompleto.",
    observacion: "Visible aunque hoy el backend no publique todos los campos extendidos.",
  },
  {
    id: "attr-004",
    nombre: "Produccion y formulas",
    alcance: "produccion",
    categoria: "Manufactura",
    obligatorios: ["es producto", "formula", "unidad base"],
    opcionales: ["rendimiento", "merma", "familia de obra"],
    validacion: "Revisar consistencia entre formula, unidades y stock comprometido.",
    observacion: "Soporta el puente con formulas y ordenes de trabajo.",
  },
]

export const legacyWarehouseZones: LegacyWarehouseZone[] = [
  {
    id: "zone-001",
    deposito: "Central",
    codigo: "A1-PICK",
    tipo: "Picking rapido",
    temperatura: "Ambiente",
    capacidadPct: 84,
    criticidad: "alta",
    supervisor: "Paula Gomez",
    observacion: "Zona de alta rotacion para pedidos y reposicion diaria.",
  },
  {
    id: "zone-002",
    deposito: "Central",
    codigo: "A2-RES",
    tipo: "Reserva",
    temperatura: "Ambiente",
    capacidadPct: 61,
    criticidad: "media",
    supervisor: "Paula Gomez",
    observacion: "Reserva de pallets y consolidacion previa a transferencias.",
  },
  {
    id: "zone-003",
    deposito: "Planta Norte",
    codigo: "B1-MP",
    tipo: "Materia prima",
    temperatura: "Controlada",
    capacidadPct: 73,
    criticidad: "media",
    supervisor: "Martin Sosa",
    observacion: "Asegura insumos para linea con control de lote visible.",
  },
  {
    id: "zone-004",
    deposito: "Obra Delta",
    codigo: "C1-OBR",
    tipo: "Frente de obra",
    temperatura: "Exterior",
    capacidadPct: 49,
    criticidad: "baja",
    supervisor: "Rocio Leiva",
    observacion: "Acopio temporal para materiales de obra y remitos valorizados.",
  },
]

export const legacyWarehouseRegions: LegacyWarehouseRegion[] = [
  {
    id: "reg-001",
    nombre: "Region Central",
    planta: "Casa Central",
    responsable: "Paula Gomez",
    zonas: ["A1-PICK", "A2-RES"],
    servicio: "Picking y consolidacion",
    nivelOcupacion: 77,
    observacion: "Concentra mayor volumen de movimientos y despachos del circuito actual.",
  },
  {
    id: "reg-002",
    nombre: "Region Produccion",
    planta: "Planta Norte",
    responsable: "Martin Sosa",
    zonas: ["B1-MP"],
    servicio: "Abastecimiento a produccion",
    nivelOcupacion: 73,
    observacion: "Vinculada a formulas y ordenes de trabajo con reposicion recurrente.",
  },
  {
    id: "reg-003",
    nombre: "Region Obras",
    planta: "Obra Delta",
    responsable: "Rocio Leiva",
    zonas: ["C1-OBR"],
    servicio: "Acopio y consumo en obra",
    nivelOcupacion: 49,
    observacion: "Opera como buffer de materiales y devoluciones desde frente activo.",
  },
]

export const legacyWarehouseCountPlans: LegacyWarehouseCountPlan[] = [
  {
    id: "count-001",
    deposito: "Central",
    zona: "A1-PICK",
    frecuencia: "Semanal",
    proximoConteo: "2026-03-26",
    estado: "programado",
    divergenciaPct: 1.8,
    responsable: "Equipo Picking AM",
    observacion: "Conteo corto de alta rotacion previo al cierre semanal.",
  },
  {
    id: "count-002",
    deposito: "Planta Norte",
    zona: "B1-MP",
    frecuencia: "Quincenal",
    proximoConteo: "2026-03-24",
    estado: "en-ejecucion",
    divergenciaPct: 3.6,
    responsable: "Control de planta",
    observacion: "Revision focalizada sobre materia prima critica y merma visible.",
  },
  {
    id: "count-003",
    deposito: "Obra Delta",
    zona: "C1-OBR",
    frecuencia: "Mensual",
    proximoConteo: "2026-03-29",
    estado: "observado",
    divergenciaPct: 6.2,
    responsable: "Capataz de obra",
    observacion: "Requiere conciliacion entre remitos consumidos y stock remanente.",
  },
]
