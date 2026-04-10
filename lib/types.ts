import React from "react"
// Shared types for ZULU ERP

// Common entities
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// Inventory Module
export interface Product extends BaseEntity {
  code: string
  name: string
  description?: string
  category: string
  unit: string
  price: number
  cost: number
  stock: number
  minStock: number
  warehouseId: string
}

export interface Warehouse extends BaseEntity {
  code: string
  name: string
  address?: string
  isActive: boolean
}

export interface Category extends BaseEntity {
  name: string
  description?: string
  parentId?: string
}

export interface StockMovement extends BaseEntity {
  productId: string
  warehouseId: string
  type: "entrada" | "salida" | "ajuste" | "transferencia"
  quantity: number
  reference?: string
  notes?: string
}

// Sales Module
export interface Customer extends BaseEntity {
  code: string
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  creditLimit: number
  balance: number
}

export interface SalesOrder extends BaseEntity {
  orderNumber: string
  customerId: string
  status: "borrador" | "confirmado" | "enviado" | "facturado" | "cancelado"
  date: Date
  dueDate?: Date
  items: SalesOrderItem[]
  subtotal: number
  tax: number
  total: number
  notes?: string
}

export interface SalesOrderItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

export interface Invoice extends BaseEntity {
  invoiceNumber: string
  customerId: string
  orderId?: string
  status: "borrador" | "emitida" | "pagada" | "vencida" | "anulada"
  date: Date
  dueDate: Date
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  paidAmount: number
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  tax: number
  total: number
}

// Accounting Module
export interface Account extends BaseEntity {
  code: string
  name: string
  type: "activo" | "pasivo" | "patrimonio" | "ingreso" | "gasto"
  parentId?: string
  balance: number
  isActive: boolean
}

export interface JournalEntry extends BaseEntity {
  entryNumber: string
  date: Date
  description: string
  status: "borrador" | "publicado" | "anulado"
  lines: JournalLine[]
}

export interface JournalLine {
  id: string
  accountId: string
  description?: string
  debit: number
  credit: number
}

export interface Payment extends BaseEntity {
  paymentNumber: string
  type: "cobro" | "pago"
  entityType: "customer" | "supplier"
  entityId: string
  date: Date
  amount: number
  method: "efectivo" | "transferencia" | "cheque" | "tarjeta"
  reference?: string
  invoiceIds?: string[]
}

// CRM Module - Clientes
export interface CRMClient extends BaseEntity {
  nombre: string
  tipoCliente: "prospecto" | "activo" | "inactivo" | "perdido"
  segmento: "pyme" | "corporativo" | "gobierno" | "startup" | "otro"
  industria?: string
  cuit?: string
  pais: string
  provincia?: string
  ciudad?: string
  direccion?: string
  telefonoPrincipal?: string
  emailPrincipal?: string
  sitioWeb?: string
  origenCliente: "campana" | "referido" | "web" | "llamada" | "evento" | "otro"
  estadoRelacion: "nuevo" | "en_negociacion" | "en_riesgo" | "fidelizado"
  responsableId?: string
  fechaAlta: Date
  notasGenerales?: string
}

// CRM Module - Contactos
export interface CRMContact extends BaseEntity {
  clienteId: string
  nombre: string
  apellido: string
  cargo?: string
  email?: string
  telefono?: string
  canalPreferido: "email" | "telefono" | "whatsapp" | "presencial"
  estadoContacto: "activo" | "no_contactar" | "bounced" | "inactivo"
  notas?: string
}

// CRM Module - Oportunidades
export interface CRMOpportunity extends BaseEntity {
  clienteId: string
  contactoPrincipalId?: string
  titulo: string
  etapa: "lead" | "calificado" | "propuesta" | "negociacion" | "cerrado_ganado" | "cerrado_perdido"
  probabilidad: number
  montoEstimado: number
  moneda: "USD" | "ARS" | "EUR" | "MXN"
  fechaApertura: Date
  fechaEstimadaCierre?: Date
  responsableId?: string
  origen: "campana" | "referido" | "web" | "llamada" | "evento" | "otro"
  motivoPerdida?: string
  notas?: string
}

// CRM Module - Interacciones
export interface CRMInteraction extends BaseEntity {
  clienteId: string
  contactoId?: string
  oportunidadId?: string
  tipoInteraccion: "llamada" | "email" | "reunion" | "visita" | "ticket" | "mensaje"
  canal: "telefono" | "email" | "whatsapp" | "presencial" | "videollamada"
  fechaHora: Date
  usuarioResponsableId: string
  resultado: "exitosa" | "sin_respuesta" | "reprogramada" | "cancelada"
  descripcion?: string
  adjuntos?: string[]
}

// CRM Module - Tareas
export interface CRMTask extends BaseEntity {
  clienteId?: string
  oportunidadId?: string
  asignadoAId: string
  titulo: string
  descripcion?: string
  tipoTarea: "llamar" | "enviar_email" | "preparar_propuesta" | "visitar" | "seguimiento" | "otro"
  fechaVencimiento: Date
  prioridad: "alta" | "media" | "baja"
  estado: "pendiente" | "en_curso" | "completada" | "vencida"
  fechaCompletado?: Date
}

// CRM Module - Campañas
export interface CRMCampaign extends BaseEntity {
  sucursalId?: number
  nombre: string
  tipoCampana: "email" | "evento" | "llamadas" | "redes_sociales" | "publicidad"
  objetivo: "generacion_leads" | "upselling" | "fidelizacion" | "recuperacion" | "branding"
  segmentoObjetivoId?: string
  fechaInicio: Date
  fechaFin?: Date
  presupuestoEstimado: number
  presupuestoGastado: number
  responsableId?: string
  notas?: string
  leadsGenerados: number
  oportunidadesGeneradas: number
  negociosGanados: number
  activa?: boolean
}

// CRM Module - Segmentos
export interface CRMSegment extends BaseEntity {
  nombre: string
  descripcion?: string
  criterios: SegmentCriteria[]
  tipoSegmento: "estatico" | "dinamico"
  cantidadClientes: number
}

export interface SegmentCriteria {
  campo: string
  operador: "igual" | "contiene" | "mayor_que" | "menor_que" | "entre"
  valor: string | number
}

// CRM Module - Usuarios
export interface CRMUser extends BaseEntity {
  nombre: string
  apellido: string
  email: string
  rol: "administrador" | "supervisor" | "comercial" | "marketing" | "soporte"
  estado: "activo" | "inactivo"
  avatar?: string
}

export interface CRMComunicado {
  id: string
  sucursalId: number
  terceroId: string
  campanaId?: string
  tipoId?: string
  fecha: Date
  asunto: string
  contenido?: string
  usuarioId?: string
}

export interface CRMSeguimiento {
  id: string
  sucursalId: number
  terceroId: string
  motivoId?: string
  interesId?: string
  campanaId?: string
  fecha: Date
  descripcion: string
  proximaAccion?: Date
  usuarioId?: string
}

export interface CRMRelacionContacto {
  id: string
  personaId: string
  personaContactoId: string
  tipoRelacionId?: string
}

// CRM Module - Comentarios
export interface CRMComment extends BaseEntity {
  usuarioId: string
  referenciaId: string
  referenciaTipo: "cliente" | "oportunidad" | "tarea" | "campana"
  texto: string
  fechaHora: Date
}

export interface CrmCatalogOption {
  id: string
  nombre: string
}

export interface CrmCatalogDetailOption {
  id: string
  codigo: string
  descripcion: string
  activo: boolean
}

export interface CrmCatalogoClienteOption {
  id: string
  nombre: string
  tipoCliente: CRMClient["tipoCliente"]
  segmento: CRMClient["segmento"]
  estadoRelacion: CRMClient["estadoRelacion"]
}

export interface CrmCatalogoContactoOption {
  id: string
  clienteId: string
  nombre: string
  cargo?: string
  estadoContacto: CRMContact["estadoContacto"]
}

export interface CrmCatalogoUsuarioOption {
  id: string
  nombre: string
  rol: CRMUser["rol"]
}

export interface CrmCatalogoSegmentoOption {
  id: string
  nombre: string
  tipoSegmento: CRMSegment["tipoSegmento"]
}

export interface CrmCatalogos {
  tiposCliente: CrmCatalogOption[]
  segmentosCliente: CrmCatalogOption[]
  origenesCliente: CrmCatalogOption[]
  estadosRelacion: CrmCatalogOption[]
  canalesContacto: CrmCatalogOption[]
  estadosContacto: CrmCatalogOption[]
  etapasOportunidad: CrmCatalogOption[]
  monedas: CrmCatalogOption[]
  origenesOportunidad: CrmCatalogOption[]
  tiposInteraccion: CrmCatalogOption[]
  canalesInteraccion: CrmCatalogOption[]
  resultadosInteraccion: CrmCatalogOption[]
  tiposTarea: CrmCatalogOption[]
  prioridadesTarea: CrmCatalogOption[]
  estadosTarea: CrmCatalogOption[]
  tiposCampana: CrmCatalogOption[]
  objetivosCampana: CrmCatalogOption[]
  tiposSegmento: CrmCatalogOption[]
  rolesUsuario: CrmCatalogOption[]
  estadosUsuario: CrmCatalogOption[]
  tiposRelacion: CrmCatalogDetailOption[]
  clientes: CrmCatalogoClienteOption[]
  contactos: CrmCatalogoContactoOption[]
  usuarios: CrmCatalogoUsuarioOption[]
  segmentos: CrmCatalogoSegmentoOption[]
}

export interface CrmSegmentoMiembro {
  id: string
  nombre: string
  tipoCliente: CRMClient["tipoCliente"]
  segmento: CRMClient["segmento"]
  industria?: string
  origenCliente: CRMClient["origenCliente"]
  estadoRelacion: CRMClient["estadoRelacion"]
  pais: string
  provincia?: string
  ciudad?: string
}

export interface CrmSegmentoPreviewResult {
  cantidadClientes: number
  clientes: CrmSegmentoMiembro[]
}

export interface CrmResumenComercial {
  clientesActivos: number
  pipelineAbierto: number
  cierresVencidos: number
  seguimientoVencido: number
}

export interface CrmPipelineEtapa {
  etapa: string
  cantidad: number
  monto: number
}

export interface CrmProbabilidad {
  rango: string
  cantidad: number
}

export interface CrmRankingVendedor {
  usuarioId: string
  nombre: string
  oportunidadesGanadas: number
  montoGanado: number
  oportunidadesActivas: number
  pipeline: number
}

export interface CrmRadarOportunidad {
  id: string
  titulo: string
  cliente: string
  responsable: string
  montoEstimado: number
  fechaEstimadaCierre?: Date
  ultimaGestion?: Date
  origen: string
  riesgo: number
}

export interface CrmRadarCliente {
  id: string
  nombre: string
  responsable: string
  segmento: string
  ultimaGestion?: Date
  pipeline: number
  estadoRelacion: string
  criticidad: number
}

export interface CrmResumenMarketing {
  campanasActivas: number
  desvioPresupuestario: number
  leads: number
  conversion: number
}

export interface CrmDistribucion {
  nombre: string
  cantidad: number
}

export interface CrmResultadoCampana {
  id: string
  nombre: string
  tipoCampana: string
  presupuesto: number
  gastado: number
  leadsGenerados: number
  oportunidadesGeneradas: number
  negociosGanados: number
}

export interface CrmRadarCampana {
  id: string
  nombre: string
  objetivo: string
  responsable: string
  fechaInicio: Date
  fechaFin: Date
  desvio: number
  costoPorLead: number
  oportunidadesGeneradas: number
  tasaConversion: number
}

export interface CrmActividadUsuario {
  usuarioId: string
  nombre: string
  llamadas: number
  emails: number
  reuniones: number
  visitas: number
  total: number
}

export interface CrmActividadReciente {
  id: string
  fechaHora: Date
  tipoInteraccion: string
  canal: string
  resultado: string
  cliente: string
  usuario: string
  descripcion?: string
}

export interface CrmReportes {
  resumenComercial: CrmResumenComercial
  pipelinePorEtapa: CrmPipelineEtapa[]
  distribucionProbabilidad: CrmProbabilidad[]
  rankingVendedores: CrmRankingVendedor[]
  radarOportunidades: CrmRadarOportunidad[]
  radarClientes: CrmRadarCliente[]
  resumenMarketing: CrmResumenMarketing
  clientesPorSegmento: CrmDistribucion[]
  clientesPorIndustria: CrmDistribucion[]
  resultadosCampanas: CrmResultadoCampana[]
  radarCampanas: CrmRadarCampana[]
  actividadPorUsuario: CrmActividadUsuario[]
  actividadReciente: CrmActividadReciente[]
}

// Help Desk Module - Tickets
export interface HDTicket extends BaseEntity {
  numero: string
  asunto: string
  descripcion: string
  clienteId: string
  contactoId?: string
  categoria: "soporte_tecnico" | "consulta" | "reclamo" | "solicitud_servicio" | "sugerencia"
  prioridad: "critica" | "alta" | "media" | "baja"
  estado: "nuevo" | "asignado" | "en_progreso" | "esperando_cliente" | "resuelto" | "cerrado"
  canal: "email" | "telefono" | "chat" | "web" | "presencial"
  asignadoAId?: string
  departamentoId?: string
  slaId?: string
  fechaCreacion: Date
  fechaPrimeraRespuesta?: Date
  fechaResolucion?: Date
  fechaCierre?: Date
  tiempoRespuesta?: number // en minutos
  tiempoResolucion?: number // en minutos
  cumpleSLA: boolean
  ticketsRelacionados?: string[]
  adjuntos?: string[]
  tags?: string[]
}

export interface HDTicketComment extends BaseEntity {
  ticketId: string
  usuarioId: string
  texto: string
  esInterno: boolean // comentario interno vs visible al cliente
  fechaHora: Date
  adjuntos?: string[]
}

// Help Desk Module - Servicios
export interface HDServicio extends BaseEntity {
  codigo: string
  nombre: string
  descripcion?: string
  categoriaId: string
  duracionEstimada: number // en minutos
  precioBase: number
  tipoPrecio: "fijo" | "por_hora" | "por_proyecto" | "escalonado"
  requiereRecursos?: string[]
  garantiaDias?: number
  condiciones?: string
  estado: "activo" | "inactivo"
}

export interface HDCategoriaServicio extends BaseEntity {
  nombre: string
  descripcion?: string
  icono?: string
}

// Help Desk Module - Ordenes de Servicio
export interface HDOrdenServicio extends BaseEntity {
  numero: string
  ticketId?: string
  clienteId: string
  contactoId?: string
  servicioId: string
  tecnicoAsignadoId?: string
  estado: "pendiente" | "programada" | "en_proceso" | "pausada" | "completada" | "cancelada"
  prioridad: "alta" | "media" | "baja"
  fechaProgramada?: Date
  fechaInicio?: Date
  fechaFin?: Date
  duracionReal?: number // en minutos
  direccionServicio?: string
  descripcionTrabajo?: string
  observaciones?: string
  recursosUtilizados?: HDRecursoUtilizado[]
  firmaCliente?: string
  calificacion?: number
  comentarioCliente?: string
}

export interface HDRecursoUtilizado {
  recursoId: string
  cantidad: number
  costoUnitario: number
}

// Help Desk Module - SLAs
export interface HDSLA extends BaseEntity {
  nombre: string
  descripcion?: string
  tipoCliente?: "vip" | "estandar" | "basico"
  tiempoRespuesta: number // en minutos
  tiempoResolucion: number // en minutos
  horasOperacion: HDHorarioOperacion
  aplicaFinesSemana: boolean
  prioridadCriticaMultiplier: number
  prioridadAltaMultiplier: number
  prioridadMediaMultiplier: number
  prioridadBajaMultiplier: number
  estado: "activo" | "inactivo"
}

export interface HDHorarioOperacion {
  inicio: string // "09:00"
  fin: string // "18:00"
}

// Help Desk Module - Clientes Help Desk
export interface HDCliente extends BaseEntity {
  codigo: string
  nombre: string
  tipoCliente: "vip" | "estandar" | "basico"
  email?: string
  telefono?: string
  direccion?: string
  slaId?: string
  contratoActivo: boolean
  fechaInicioContrato?: Date
  fechaFinContrato?: Date
  limiteTicketsMes?: number
  ticketsUsadosMes: number
  contactos: HDContactoCliente[]
  notas?: string
}

export interface HDContactoCliente extends BaseEntity {
  clienteId: string
  nombre: string
  apellido: string
  email?: string
  telefono?: string
  cargo?: string
  esPrincipal: boolean
}

// Help Desk Module - Facturacion
export interface HDFacturaServicio extends BaseEntity {
  numero: string
  clienteId: string
  ordenesServicioIds: string[]
  fecha: Date
  fechaVencimiento: Date
  estado: "borrador" | "emitida" | "pagada" | "vencida" | "anulada"
  items: HDFacturaItem[]
  subtotal: number
  descuento: number
  impuestos: number
  total: number
  moneda: "USD" | "ARS" | "EUR" | "MXN"
  metodoPago?: string
  referenciaPago?: string
  notas?: string
}

export interface HDFacturaItem {
  id: string
  descripcion: string
  servicioId?: string
  ordenServicioId?: string
  cantidad: number
  precioUnitario: number
  descuento: number
  impuesto: number
  total: number
}

// Help Desk Module - Contratos
export interface HDContrato extends BaseEntity {
  numero: string
  clienteId: string
  nombre: string
  tipo: "mantenimiento" | "soporte" | "suscripcion" | "proyecto"
  estado: "activo" | "pausado" | "vencido" | "cancelado"
  fechaInicio: Date
  fechaFin: Date
  valorMensual?: number
  valorTotal?: number
  serviciosIncluidos: string[]
  horasIncluidas?: number
  horasConsumidas: number
  slaId?: string
  renovacionAutomatica: boolean
  condiciones?: string
}

// Help Desk Module - Base de Conocimientos
export interface HDArticulo extends BaseEntity {
  titulo: string
  contenido: string
  categoriaId: string
  tags?: string[]
  estado: "borrador" | "publicado" | "archivado"
  vistas: number
  utilidad: number // votos positivos
  autorId: string
}

// Help Desk Module - Usuarios/Agentes
export interface HDAgente extends BaseEntity {
  nombre: string
  apellido: string
  email: string
  telefono?: string
  departamentoId?: string
  rol: "administrador" | "supervisor" | "agente" | "tecnico"
  estado: "activo" | "inactivo" | "vacaciones"
  avatar?: string
  habilidades?: string[]
  ticketsAsignados: number
  ticketsResueltos: number
  tiempoPromedioResolucion: number
  calificacionPromedio: number
}

export interface HDDepartamento extends BaseEntity {
  nombre: string
  descripcion?: string
  responsableId?: string
  email?: string
  ticketsPendientes: number
}

// Navigation types
export interface NavItem {
  title: string
  url: string
  icon?: React.ComponentType<{ className?: string }>
  isActive?: boolean
  items?: NavSubItem[]
}

export interface NavSubItem {
  title: string
  url: string
}
