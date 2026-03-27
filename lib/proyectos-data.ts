import type { Entidad, Procedimiento, Obra, Proyecto, Miembro, Cliente } from "./proyectos-types"

export const entidades: Entidad[] = [
  {
    id: "ent-001",
    nombre: "Ministerio de Obras Públicas",
    tipo: "Público",
    cuitCuil: "30-12345678-9",
    direccion: "Av. 9 de Julio 1000, CABA",
    telefono: "(011) 4349-8000",
    email: "info@mopu.gob.ar",
    personaContacto: "Ing. Roberto Silva",
    cargoContacto: "Director General",
    estado: "Activo",
    notas: "Entidad nacional responsable de obras públicas",
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
  },
  {
    id: "ent-002",
    nombre: "Municipalidad de Córdoba",
    tipo: "Público",
    cuitCuil: "30-67890123-4",
    direccion: "Av. Colón 500, Córdoba",
    telefono: "(0351) 433-0000",
    email: "contacto@cordoba.gob.ar",
    personaContacto: "Arq. María González",
    cargoContacto: "Gerente de Obras",
    estado: "Activo",
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-01-20"),
  },
]

export const procedimientos: Procedimiento[] = [
  {
    id: "proc-001",
    tipo: "Licitación Pública",
    numeroExpediente: "001/2026",
    objeto: "Pavimentación Av. Colón",
    entidadContratante: "Municipalidad de Córdoba",
    montoEstimado: 2500000,
    fechaApertura: new Date("2026-02-01"),
    fechaAdjudicacion: new Date("2026-03-15"),
    adjudicatario: "Constructora del Sur S.A.",
    montoAdjudicado: 2450000,
    estado: "Adjudicado",
    plazoEjecucion: 180,
    garantiasRequeridas: "Póliza de cumplimiento 10%",
    observaciones: "Proyecto de ampliación vial",
    createdAt: new Date("2026-01-25"),
    updatedAt: new Date("2026-03-15"),
  },
]

export const obras: Obra[] = [
  {
    id: "obra-001",
    nombre: "Pavimentación Av. Colón (3km)",
    descripcion: "Pavimentación de 3 km de la Av. Colón con nuevas veredas y red cloacal",
    procedimientoAsociado: "proc-001",
    entidadEjecutora: "Municipalidad de Córdoba",
    contratista: "Constructora del Sur S.A.",
    inspector: "Ing. Carlos Méndez",
    ubicacion: "Av. Colón, Córdoba",
    fechaInicio: new Date("2026-03-20"),
    fechaFinPrevista: new Date("2026-09-20"),
    presupuestoOficial: 2450000,
    montoEjecutado: 1274000,
    avanceFisico: 45,
    avanceFinanciero: 52,
    estado: "En Ejecución",
    certificadosEmitidos: 2,
    redeterminaciones: 1,
    ampliaciones: "Sin ampliaciones",
    observaciones: "Avance dentro de lo previsto",
    createdAt: new Date("2026-03-20"),
    updatedAt: new Date("2026-05-10"),
  },
]

export const proyectos: Proyecto[] = [
  {
    id: "proy-001",
    nombre: "Desarrollo Web Corporativo",
    cliente: "TechCorp S.A.",
    descripcion: "Nuevo portal corporativo con gestión de contenidos",
    fechaInicio: new Date("2026-01-10"),
    fechaFin: new Date("2026-06-30"),
    presupuesto: 450000,
    avance: 65,
    estado: "En Curso",
    equipo: ["Ana García", "Carlos Méndez", "Juan Peralta"],
    prioridad: "Alta",
    etiquetas: ["web", "cms", "corporativo"],
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-05-15"),
  },
]

export const miembros: Miembro[] = [
  {
    id: "miem-001",
    nombre: "Ana García",
    rol: "Directora de Proyectos",
    departamento: "Gestión",
    estado: "Online",
    tareasAsignadas: 15,
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2026-05-15"),
  },
]

export const clientes: Cliente[] = [
  {
    id: "cli-001",
    nombre: "TechCorp S.A.",
    sector: "Tecnología",
    proyectos: 2,
    ingresos: 450000,
    estado: "Activo",
    createdAt: new Date("2025-08-01"),
    updatedAt: new Date("2026-01-10"),
  },
]
