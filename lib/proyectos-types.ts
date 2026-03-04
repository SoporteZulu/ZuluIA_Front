export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface Entidad extends BaseEntity {
  nombre: string
  tipo: 'Público' | 'Privado' | 'Mixto'
  cuitCuil: string
  direccion: string
  telefono: string
  email: string
  personaContacto: string
  cargoContacto: string
  estado: 'Activo' | 'Inactivo' | 'Suspendido'
  notas?: string
}

export interface Procedimiento extends BaseEntity {
  tipo: 'Licitación Pública' | 'Licitación Privada' | 'Contratación Directa' | 'Concurso'
  numeroExpediente: string
  objeto: string
  entidadContratante: string
  montoEstimado: number
  fechaApertura: Date
  fechaAdjudicacion?: Date
  adjudicatario?: string
  montoAdjudicado?: number
  estado: 'En Preparación' | 'Publicado' | 'En Evaluación' | 'Adjudicado' | 'Cancelado'
  plazoEjecucion: number
  garantiasRequeridas: string
  documentosAsociados?: string[]
  observaciones?: string
}

export interface Obra extends BaseEntity {
  nombre: string
  descripcion: string
  procedimientoAsociado: string
  entidadEjecutora: string
  contratista: string
  inspector: string
  ubicacion: string
  fechaInicio: Date
  fechaFinPrevista: Date
  fechaFinReal?: Date
  presupuestoOficial: number
  montoEjecutado: number
  avanceFisico: number
  avanceFinanciero: number
  estado: 'No Iniciada' | 'En Ejecución' | 'Paralizada' | 'Finalizada' | 'En Garantía'
  certificadosEmitidos: number
  redeterminaciones: number
  ampliaciones: string
  documentosAsociados?: string[]
  observaciones?: string
}

export interface Proyecto extends BaseEntity {
  nombre: string
  cliente: string
  descripcion: string
  fechaInicio: Date
  fechaFin: Date
  presupuesto: number
  avance: number
  estado: 'En Planificación' | 'En Curso' | 'En Riesgo' | 'Completado' | 'Retrasado' | 'En Espera'
  equipo: string[]
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica'
  etiquetas?: string[]
}

export interface Tarea extends BaseEntity {
  titulo: string
  descripcion?: string
  proyecto: string
  asignado?: string
  estado: 'Por Hacer' | 'En Progreso' | 'En Revisión' | 'Hecho'
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica'
  fechaVencimiento?: Date
  etiquetas?: string[]
  subtareas?: Subtarea[]
  comentarios?: Comentario[]
  tiempoRegistrado: number
}

export interface Subtarea {
  id: string
  titulo: string
  completada: boolean
}

export interface Comentario {
  id: string
  autor: string
  contenido: string
  fechaCreacion: Date
}

export interface Miembro extends BaseEntity {
  nombre: string
  rol: string
  departamento: string
  estado: 'Online' | 'Ocupado' | 'Disponible' | 'Ausente' | 'Desconectado'
  tareasAsignadas: number
  avatar?: string
}

export interface RegistroTiempo extends BaseEntity {
  usuario: string
  tarea: string
  proyecto: string
  duracion: number
  descripcion?: string
  facturable: boolean
  fecha: Date
}

export interface Cliente extends BaseEntity {
  nombre: string
  sector: string
  proyectos: number
  ingresos: number
  estado: 'Activo' | 'Prospecto' | 'Inactivo'
}
