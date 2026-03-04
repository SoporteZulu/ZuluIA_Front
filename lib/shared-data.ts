// Datos compartidos entre CRM y Help Desk
// Los clientes del CRM son la fuente principal de datos

import { crmClients, crmContacts, crmUsers } from "./crm-data"
import { slas, agentes, departamentos, servicios, categoriasServicio, tickets as hdTickets, ordenesServicio as hdOrdenesServicio } from "./helpdesk-data"
import type { CRMClient, CRMContact, HDSLA, HDContrato, HDFacturaServicio } from "./types"

// Función para mapear tipo de cliente CRM a tipo Help Desk
export function mapClienteToHDType(cliente: CRMClient): 'vip' | 'estandar' | 'basico' {
  if (cliente.segmento === 'corporativo' || cliente.segmento === 'gobierno') return 'vip'
  if (cliente.segmento === 'pyme') return 'estandar'
  return 'basico'
}

// Función para obtener el SLA apropiado para un cliente
export function getSLAForCliente(cliente: CRMClient): HDSLA | undefined {
  const tipoHD = mapClienteToHDType(cliente)
  return slas.find(sla => sla.tipoCliente === tipoHD && sla.estado === 'activo')
}

// Obtener clientes activos del CRM para usar en Help Desk
export function getClientesActivos(): CRMClient[] {
  return crmClients.filter(c => c.tipoCliente === 'activo' || c.tipoCliente === 'prospecto')
}

// Obtener todos los clientes del CRM
export function getAllClientes(): CRMClient[] {
  return crmClients
}

// Obtener contactos de un cliente
export function getContactosByCliente(clienteId: string): CRMContact[] {
  return crmContacts.filter(c => c.clienteId === clienteId)
}

// Obtener cliente por ID
export function getClienteById(clienteId: string): CRMClient | undefined {
  return crmClients.find(c => c.id === clienteId)
}

// Contratos vinculados a clientes del CRM
export const contratos: HDContrato[] = [
  {
    id: "con-001",
    numero: "CON-2024-001",
    clienteId: "cli-001", // Tecnología Avanzada S.A.
    nombre: "Contrato de Soporte Anual",
    tipo: "soporte",
    estado: "activo",
    fechaInicio: new Date("2024-01-01"),
    fechaFin: new Date("2024-12-31"),
    valorMensual: 5000,
    valorTotal: 60000,
    serviciosIncluidos: ["srv-001", "srv-002", "srv-003"],
    horasIncluidas: 40,
    horasConsumidas: 28,
    slaId: "sla-001",
    renovacionAutomatica: true,
    condiciones: "Soporte técnico 24/7, respuesta prioritaria, visitas mensuales incluidas",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-06-01"),
  },
  {
    id: "con-002",
    numero: "CON-2024-002",
    clienteId: "cli-002", // Distribuidora del Norte
    nombre: "Mantenimiento Preventivo",
    tipo: "mantenimiento",
    estado: "activo",
    fechaInicio: new Date("2024-03-01"),
    fechaFin: new Date("2025-02-28"),
    valorMensual: 2500,
    valorTotal: 30000,
    serviciosIncluidos: ["srv-004", "srv-005"],
    horasIncluidas: 20,
    horasConsumidas: 12,
    slaId: "sla-002",
    renovacionAutomatica: true,
    condiciones: "Mantenimiento preventivo mensual de equipos",
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-06-01"),
  },
  {
    id: "con-003",
    numero: "CON-2024-003",
    clienteId: "cli-004", // StartupX Innovation
    nombre: "Suscripcion Cloud",
    tipo: "suscripcion",
    estado: "activo",
    fechaInicio: new Date("2024-02-15"),
    fechaFin: new Date("2025-02-14"),
    valorMensual: 1500,
    valorTotal: 18000,
    serviciosIncluidos: ["srv-006", "srv-007"],
    horasIncluidas: 10,
    horasConsumidas: 6,
    slaId: "sla-002",
    renovacionAutomatica: true,
    condiciones: "Soporte cloud, monitoreo 24/7, backups diarios",
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-06-01"),
  },
  {
    id: "con-004",
    numero: "CON-2024-004",
    clienteId: "cli-006", // Global Services Corp
    nombre: "Proyecto Implementacion ERP",
    tipo: "proyecto",
    estado: "activo",
    fechaInicio: new Date("2024-04-01"),
    fechaFin: new Date("2024-09-30"),
    valorTotal: 85000,
    serviciosIncluidos: ["srv-008"],
    horasIncluidas: 500,
    horasConsumidas: 320,
    slaId: "sla-001",
    renovacionAutomatica: false,
    condiciones: "Implementación completa de sistema ERP, capacitación incluida",
    createdAt: new Date("2024-04-01"),
    updatedAt: new Date("2024-06-15"),
  },
  {
    id: "con-005",
    numero: "CON-2023-008",
    clienteId: "cli-005", // Construcciones del Sur
    nombre: "Soporte Basico",
    tipo: "soporte",
    estado: "vencido",
    fechaInicio: new Date("2023-06-01"),
    fechaFin: new Date("2024-05-31"),
    valorMensual: 800,
    valorTotal: 9600,
    serviciosIncluidos: ["srv-001"],
    horasIncluidas: 8,
    horasConsumidas: 8,
    slaId: "sla-003",
    renovacionAutomatica: false,
    condiciones: "Soporte técnico básico en horario laboral",
    createdAt: new Date("2023-06-01"),
    updatedAt: new Date("2024-05-31"),
  },
]

// Facturas vinculadas a clientes del CRM
export const facturas: HDFacturaServicio[] = [
  {
    id: "fac-001",
    numero: "FAC-2024-0001",
    clienteId: "cli-001",
    ordenesServicioIds: ["os-001", "os-002"],
    fecha: new Date("2024-06-01"),
    fechaVencimiento: new Date("2024-06-30"),
    estado: "pagada",
    items: [
      {
        id: "item-001",
        descripcion: "Contrato de Soporte - Junio 2024",
        servicioId: "srv-001",
        cantidad: 1,
        precioUnitario: 5000,
        descuento: 0,
        impuesto: 1050,
        total: 6050,
      },
      {
        id: "item-002",
        descripcion: "Horas adicionales de soporte (5 horas)",
        servicioId: "srv-002",
        cantidad: 5,
        precioUnitario: 150,
        descuento: 0,
        impuesto: 157.5,
        total: 907.5,
      },
    ],
    subtotal: 5750,
    descuento: 0,
    impuestos: 1207.5,
    total: 6957.5,
    moneda: "USD",
    metodoPago: "transferencia",
    referenciaPago: "TRF-2024-06-001",
    notas: "Pago recibido el 15/06/2024",
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2024-06-15"),
  },
  {
    id: "fac-002",
    numero: "FAC-2024-0002",
    clienteId: "cli-002",
    ordenesServicioIds: ["os-003"],
    fecha: new Date("2024-06-05"),
    fechaVencimiento: new Date("2024-07-05"),
    estado: "emitida",
    items: [
      {
        id: "item-003",
        descripcion: "Mantenimiento Preventivo - Junio 2024",
        servicioId: "srv-004",
        cantidad: 1,
        precioUnitario: 2500,
        descuento: 0,
        impuesto: 525,
        total: 3025,
      },
    ],
    subtotal: 2500,
    descuento: 0,
    impuestos: 525,
    total: 3025,
    moneda: "USD",
    notas: "Pendiente de pago",
    createdAt: new Date("2024-06-05"),
    updatedAt: new Date("2024-06-05"),
  },
  {
    id: "fac-003",
    numero: "FAC-2024-0003",
    clienteId: "cli-004",
    ordenesServicioIds: ["os-004", "os-005"],
    fecha: new Date("2024-06-10"),
    fechaVencimiento: new Date("2024-06-25"),
    estado: "vencida",
    items: [
      {
        id: "item-004",
        descripcion: "Suscripcion Cloud - Junio 2024",
        servicioId: "srv-006",
        cantidad: 1,
        precioUnitario: 1500,
        descuento: 0,
        impuesto: 315,
        total: 1815,
      },
      {
        id: "item-005",
        descripcion: "Migracion de datos adicional",
        servicioId: "srv-007",
        cantidad: 1,
        precioUnitario: 800,
        descuento: 100,
        impuesto: 147,
        total: 847,
      },
    ],
    subtotal: 2200,
    descuento: 100,
    impuestos: 462,
    total: 2562,
    moneda: "USD",
    notas: "Factura vencida - Contactar al cliente",
    createdAt: new Date("2024-06-10"),
    updatedAt: new Date("2024-06-26"),
  },
  {
    id: "fac-004",
    numero: "FAC-2024-0004",
    clienteId: "cli-006",
    ordenesServicioIds: ["os-006"],
    fecha: new Date("2024-06-15"),
    fechaVencimiento: new Date("2024-07-15"),
    estado: "emitida",
    items: [
      {
        id: "item-006",
        descripcion: "Proyecto ERP - Fase 2 (40%)",
        servicioId: "srv-008",
        cantidad: 1,
        precioUnitario: 34000,
        descuento: 0,
        impuesto: 7140,
        total: 41140,
      },
    ],
    subtotal: 34000,
    descuento: 0,
    impuestos: 7140,
    total: 41140,
    moneda: "USD",
    notas: "Segundo pago del proyecto - 40% del total",
    createdAt: new Date("2024-06-15"),
    updatedAt: new Date("2024-06-15"),
  },
  {
    id: "fac-005",
    numero: "FAC-2024-0005",
    clienteId: "cli-001",
    ordenesServicioIds: [],
    fecha: new Date("2024-07-01"),
    fechaVencimiento: new Date("2024-07-31"),
    estado: "borrador",
    items: [
      {
        id: "item-007",
        descripcion: "Contrato de Soporte - Julio 2024",
        servicioId: "srv-001",
        cantidad: 1,
        precioUnitario: 5000,
        descuento: 0,
        impuesto: 1050,
        total: 6050,
      },
    ],
    subtotal: 5000,
    descuento: 0,
    impuestos: 1050,
    total: 6050,
    moneda: "USD",
    createdAt: new Date("2024-07-01"),
    updatedAt: new Date("2024-07-01"),
  },
]

// Re-exportar datos de otros módulos para acceso centralizado
export { crmClients, crmContacts, crmUsers }
export { slas, agentes, departamentos, servicios, categoriasServicio }
export const tickets = hdTickets;
export const ordenesServicio = hdOrdenesServicio;
