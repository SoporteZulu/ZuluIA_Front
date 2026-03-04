import type {
  HDTicket,
  HDTicketComment,
  HDServicio,
  HDCategoriaServicio,
  HDOrdenServicio,
  HDSLA,
  HDCliente,
  HDFacturaServicio,
  HDContrato,
  HDArticulo,
  HDAgente,
  HDDepartamento,
} from "./types"

// Departamentos
export const departamentos: HDDepartamento[] = [
  {
    id: "dep-001",
    nombre: "Soporte Tecnico",
    descripcion: "Atencion de incidentes tecnicos y configuraciones",
    responsableId: "ag-001",
    email: "soporte@zulutech.com",
    ticketsPendientes: 12,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "dep-002",
    nombre: "Atencion al Cliente",
    descripcion: "Consultas generales y reclamos",
    responsableId: "ag-002",
    email: "atencion@zulutech.com",
    ticketsPendientes: 8,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "dep-003",
    nombre: "Servicios en Campo",
    descripcion: "Instalaciones y mantenimiento presencial",
    responsableId: "ag-003",
    email: "campo@zulutech.com",
    ticketsPendientes: 5,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
]

// Agentes
export const agentes: HDAgente[] = [
  {
    id: "ag-001",
    nombre: "Carlos",
    apellido: "Rodriguez",
    email: "carlos.rodriguez@zulutech.com",
    telefono: "+54 11 5555-0001",
    departamentoId: "dep-001",
    rol: "supervisor",
    estado: "activo",
    habilidades: ["redes", "servidores", "cloud"],
    ticketsAsignados: 8,
    ticketsResueltos: 245,
    tiempoPromedioResolucion: 120,
    calificacionPromedio: 4.8,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "ag-002",
    nombre: "Maria",
    apellido: "Gonzalez",
    email: "maria.gonzalez@zulutech.com",
    telefono: "+54 11 5555-0002",
    departamentoId: "dep-002",
    rol: "supervisor",
    estado: "activo",
    habilidades: ["atencion_cliente", "facturacion", "contratos"],
    ticketsAsignados: 5,
    ticketsResueltos: 312,
    tiempoPromedioResolucion: 45,
    calificacionPromedio: 4.9,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "ag-003",
    nombre: "Juan",
    apellido: "Martinez",
    email: "juan.martinez@zulutech.com",
    telefono: "+54 11 5555-0003",
    departamentoId: "dep-003",
    rol: "tecnico",
    estado: "activo",
    habilidades: ["instalaciones", "mantenimiento", "cableado"],
    ticketsAsignados: 3,
    ticketsResueltos: 156,
    tiempoPromedioResolucion: 180,
    calificacionPromedio: 4.7,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "ag-004",
    nombre: "Ana",
    apellido: "Lopez",
    email: "ana.lopez@zulutech.com",
    telefono: "+54 11 5555-0004",
    departamentoId: "dep-001",
    rol: "agente",
    estado: "activo",
    habilidades: ["software", "office", "email"],
    ticketsAsignados: 12,
    ticketsResueltos: 189,
    tiempoPromedioResolucion: 90,
    calificacionPromedio: 4.6,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "ag-005",
    nombre: "Pedro",
    apellido: "Sanchez",
    email: "pedro.sanchez@zulutech.com",
    telefono: "+54 11 5555-0005",
    departamentoId: "dep-001",
    rol: "agente",
    estado: "activo",
    habilidades: ["hardware", "impresoras", "perifericos"],
    ticketsAsignados: 7,
    ticketsResueltos: 134,
    tiempoPromedioResolucion: 150,
    calificacionPromedio: 4.5,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
]

// SLAs
export const slas: HDSLA[] = [
  {
    id: "sla-001",
    nombre: "SLA VIP",
    descripcion: "Acuerdo de nivel de servicio para clientes VIP",
    tipoCliente: "vip",
    tiempoRespuesta: 30, // 30 minutos
    tiempoResolucion: 240, // 4 horas
    horasOperacion: { inicio: "00:00", fin: "23:59" }, // 24/7
    aplicaFinesSemana: true,
    prioridadCriticaMultiplier: 0.5,
    prioridadAltaMultiplier: 0.75,
    prioridadMediaMultiplier: 1,
    prioridadBajaMultiplier: 1.5,
    estado: "activo",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "sla-002",
    nombre: "SLA Estandar",
    descripcion: "Acuerdo de nivel de servicio estandar",
    tipoCliente: "estandar",
    tiempoRespuesta: 120, // 2 horas
    tiempoResolucion: 480, // 8 horas
    horasOperacion: { inicio: "09:00", fin: "18:00" },
    aplicaFinesSemana: false,
    prioridadCriticaMultiplier: 0.5,
    prioridadAltaMultiplier: 0.75,
    prioridadMediaMultiplier: 1,
    prioridadBajaMultiplier: 1.5,
    estado: "activo",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "sla-003",
    nombre: "SLA Basico",
    descripcion: "Acuerdo de nivel de servicio basico",
    tipoCliente: "basico",
    tiempoRespuesta: 480, // 8 horas
    tiempoResolucion: 1440, // 24 horas
    horasOperacion: { inicio: "09:00", fin: "18:00" },
    aplicaFinesSemana: false,
    prioridadCriticaMultiplier: 0.5,
    prioridadAltaMultiplier: 0.75,
    prioridadMediaMultiplier: 1,
    prioridadBajaMultiplier: 2,
    estado: "activo",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
]

// Clientes Help Desk
export const clientesHD: HDCliente[] = [
  {
    id: "hdc-001",
    codigo: "CLI-VIP-001",
    nombre: "Banco Nacional S.A.",
    tipoCliente: "vip",
    email: "soporte@banconacional.com",
    telefono: "+54 11 4444-1111",
    direccion: "Av. Corrientes 1234, CABA",
    slaId: "sla-001",
    contratoActivo: true,
    fechaInicioContrato: new Date("2024-01-01"),
    fechaFinContrato: new Date("2025-12-31"),
    limiteTicketsMes: 999,
    ticketsUsadosMes: 15,
    contactos: [
      {
        id: "cont-001",
        clienteId: "hdc-001",
        nombre: "Roberto",
        apellido: "Fernandez",
        email: "rfernandez@banconacional.com",
        telefono: "+54 11 4444-1112",
        cargo: "Gerente de IT",
        esPrincipal: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ],
    notas: "Cliente prioritario, atencion inmediata",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "hdc-002",
    codigo: "CLI-STD-001",
    nombre: "Comercial del Sur SRL",
    tipoCliente: "estandar",
    email: "sistemas@comercialsur.com",
    telefono: "+54 11 4444-2222",
    direccion: "Av. San Martin 567, Provincia de Buenos Aires",
    slaId: "sla-002",
    contratoActivo: true,
    fechaInicioContrato: new Date("2024-03-01"),
    fechaFinContrato: new Date("2025-02-28"),
    limiteTicketsMes: 20,
    ticketsUsadosMes: 8,
    contactos: [
      {
        id: "cont-002",
        clienteId: "hdc-002",
        nombre: "Laura",
        apellido: "Gomez",
        email: "lgomez@comercialsur.com",
        telefono: "+54 11 4444-2223",
        cargo: "Encargada de Sistemas",
        esPrincipal: true,
        createdAt: new Date("2024-03-01"),
        updatedAt: new Date("2024-03-01"),
      },
    ],
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
  },
  {
    id: "hdc-003",
    codigo: "CLI-BAS-001",
    nombre: "Consultora ABC",
    tipoCliente: "basico",
    email: "info@consultoraabc.com",
    telefono: "+54 11 4444-3333",
    direccion: "Calle Florida 890, CABA",
    slaId: "sla-003",
    contratoActivo: true,
    fechaInicioContrato: new Date("2024-06-01"),
    fechaFinContrato: new Date("2025-05-31"),
    limiteTicketsMes: 10,
    ticketsUsadosMes: 3,
    contactos: [
      {
        id: "cont-003",
        clienteId: "hdc-003",
        nombre: "Diego",
        apellido: "Ruiz",
        email: "druiz@consultoraabc.com",
        telefono: "+54 11 4444-3334",
        cargo: "Director",
        esPrincipal: true,
        createdAt: new Date("2024-06-01"),
        updatedAt: new Date("2024-06-01"),
      },
    ],
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2024-06-01"),
  },
  {
    id: "hdc-004",
    codigo: "CLI-VIP-002",
    nombre: "Hospital Central",
    tipoCliente: "vip",
    email: "sistemas@hospitalcentral.com",
    telefono: "+54 11 4444-4444",
    direccion: "Av. Las Heras 2500, CABA",
    slaId: "sla-001",
    contratoActivo: true,
    fechaInicioContrato: new Date("2024-02-01"),
    fechaFinContrato: new Date("2026-01-31"),
    limiteTicketsMes: 999,
    ticketsUsadosMes: 22,
    contactos: [
      {
        id: "cont-004",
        clienteId: "hdc-004",
        nombre: "Silvia",
        apellido: "Torres",
        email: "storres@hospitalcentral.com",
        telefono: "+54 11 4444-4445",
        cargo: "Jefa de Informatica",
        esPrincipal: true,
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
      },
    ],
    notas: "Atencion critica, sistemas de salud",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
]

// Categorias de Servicios
export const categoriasServicio: HDCategoriaServicio[] = [
  {
    id: "cat-001",
    nombre: "Soporte Tecnico",
    descripcion: "Servicios de soporte y asistencia tecnica",
    icono: "wrench",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "cat-002",
    nombre: "Instalaciones",
    descripcion: "Instalacion de equipos y software",
    icono: "download",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "cat-003",
    nombre: "Mantenimiento",
    descripcion: "Mantenimiento preventivo y correctivo",
    icono: "settings",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "cat-004",
    nombre: "Consultoria",
    descripcion: "Servicios de consultoria y asesoria",
    icono: "lightbulb",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
]

// Servicios
export const servicios: HDServicio[] = [
  {
    id: "srv-001",
    codigo: "SRV-001",
    nombre: "Soporte Remoto",
    descripcion: "Asistencia tecnica remota via TeamViewer o similar",
    categoriaId: "cat-001",
    duracionEstimada: 60,
    precioBase: 50,
    tipoPrecio: "por_hora",
    estado: "activo",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "srv-002",
    codigo: "SRV-002",
    nombre: "Visita Tecnica",
    descripcion: "Visita presencial para diagnostico y reparacion",
    categoriaId: "cat-001",
    duracionEstimada: 120,
    precioBase: 150,
    tipoPrecio: "fijo",
    estado: "activo",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "srv-003",
    codigo: "SRV-003",
    nombre: "Instalacion de Software",
    descripcion: "Instalacion y configuracion de aplicaciones",
    categoriaId: "cat-002",
    duracionEstimada: 90,
    precioBase: 80,
    tipoPrecio: "fijo",
    estado: "activo",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "srv-004",
    codigo: "SRV-004",
    nombre: "Instalacion de Red",
    descripcion: "Instalacion y configuracion de redes LAN/WiFi",
    categoriaId: "cat-002",
    duracionEstimada: 240,
    precioBase: 500,
    tipoPrecio: "por_proyecto",
    estado: "activo",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "srv-005",
    codigo: "SRV-005",
    nombre: "Mantenimiento Preventivo",
    descripcion: "Revision y limpieza de equipos",
    categoriaId: "cat-003",
    duracionEstimada: 60,
    precioBase: 40,
    tipoPrecio: "fijo",
    garantiaDias: 30,
    estado: "activo",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "srv-006",
    codigo: "SRV-006",
    nombre: "Consultoria IT",
    descripcion: "Asesoria en infraestructura y sistemas",
    categoriaId: "cat-004",
    duracionEstimada: 120,
    precioBase: 200,
    tipoPrecio: "por_hora",
    estado: "activo",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
]

// Tickets
export const tickets: HDTicket[] = [
  {
    id: "tk-001",
    numero: "TK-2024-0001",
    asunto: "Sistema ERP no carga",
    descripcion: "El sistema ERP muestra error 500 al intentar acceder. Afecta a todos los usuarios.",
    clienteId: "hdc-001",
    contactoId: "cont-001",
    categoria: "soporte_tecnico",
    prioridad: "critica",
    estado: "en_progreso",
    canal: "telefono",
    asignadoAId: "ag-001",
    departamentoId: "dep-001",
    slaId: "sla-001",
    fechaCreacion: new Date("2024-01-15T09:00:00"),
    fechaPrimeraRespuesta: new Date("2024-01-15T09:15:00"),
    tiempoRespuesta: 15,
    cumpleSLA: true,
    tags: ["urgente", "erp", "produccion"],
    createdAt: new Date("2024-01-15T09:00:00"),
    updatedAt: new Date("2024-01-15T10:30:00"),
  },
  {
    id: "tk-002",
    numero: "TK-2024-0002",
    asunto: "Solicitud de nuevo usuario",
    descripcion: "Necesitamos crear un nuevo usuario para el empleado Juan Perez del area de Ventas.",
    clienteId: "hdc-002",
    contactoId: "cont-002",
    categoria: "solicitud_servicio",
    prioridad: "media",
    estado: "asignado",
    canal: "email",
    asignadoAId: "ag-004",
    departamentoId: "dep-001",
    slaId: "sla-002",
    fechaCreacion: new Date("2024-01-15T10:30:00"),
    cumpleSLA: true,
    createdAt: new Date("2024-01-15T10:30:00"),
    updatedAt: new Date("2024-01-15T10:30:00"),
  },
  {
    id: "tk-003",
    numero: "TK-2024-0003",
    asunto: "Impresora no funciona",
    descripcion: "La impresora del piso 3 no imprime. Muestra error de conexion.",
    clienteId: "hdc-001",
    categoria: "soporte_tecnico",
    prioridad: "alta",
    estado: "esperando_cliente",
    canal: "chat",
    asignadoAId: "ag-005",
    departamentoId: "dep-001",
    slaId: "sla-001",
    fechaCreacion: new Date("2024-01-14T14:00:00"),
    fechaPrimeraRespuesta: new Date("2024-01-14T14:20:00"),
    tiempoRespuesta: 20,
    cumpleSLA: true,
    tags: ["impresora", "hardware"],
    createdAt: new Date("2024-01-14T14:00:00"),
    updatedAt: new Date("2024-01-15T09:00:00"),
  },
  {
    id: "tk-004",
    numero: "TK-2024-0004",
    asunto: "Consulta sobre facturacion",
    descripcion: "Quisiera saber el detalle de la ultima factura recibida.",
    clienteId: "hdc-003",
    contactoId: "cont-003",
    categoria: "consulta",
    prioridad: "baja",
    estado: "resuelto",
    canal: "web",
    asignadoAId: "ag-002",
    departamentoId: "dep-002",
    slaId: "sla-003",
    fechaCreacion: new Date("2024-01-13T11:00:00"),
    fechaPrimeraRespuesta: new Date("2024-01-13T15:00:00"),
    fechaResolucion: new Date("2024-01-13T15:30:00"),
    tiempoRespuesta: 240,
    tiempoResolucion: 270,
    cumpleSLA: true,
    createdAt: new Date("2024-01-13T11:00:00"),
    updatedAt: new Date("2024-01-13T15:30:00"),
  },
  {
    id: "tk-005",
    numero: "TK-2024-0005",
    asunto: "Servidor lento",
    descripcion: "El servidor de archivos esta muy lento desde ayer. Afecta la productividad.",
    clienteId: "hdc-004",
    categoria: "soporte_tecnico",
    prioridad: "alta",
    estado: "nuevo",
    canal: "telefono",
    departamentoId: "dep-001",
    slaId: "sla-001",
    fechaCreacion: new Date("2024-01-15T11:00:00"),
    cumpleSLA: true,
    tags: ["servidor", "performance"],
    createdAt: new Date("2024-01-15T11:00:00"),
    updatedAt: new Date("2024-01-15T11:00:00"),
  },
  {
    id: "tk-006",
    numero: "TK-2024-0006",
    asunto: "Reclamo por demora en servicio",
    descripcion: "Llevamos 3 dias esperando la instalacion del nuevo servidor.",
    clienteId: "hdc-002",
    categoria: "reclamo",
    prioridad: "alta",
    estado: "asignado",
    canal: "email",
    asignadoAId: "ag-002",
    departamentoId: "dep-002",
    slaId: "sla-002",
    fechaCreacion: new Date("2024-01-15T08:00:00"),
    fechaPrimeraRespuesta: new Date("2024-01-15T09:30:00"),
    tiempoRespuesta: 90,
    cumpleSLA: true,
    tags: ["reclamo", "instalacion"],
    createdAt: new Date("2024-01-15T08:00:00"),
    updatedAt: new Date("2024-01-15T09:30:00"),
  },
]

// Comentarios de Tickets
export const ticketComments: HDTicketComment[] = [
  {
    id: "com-001",
    ticketId: "tk-001",
    usuarioId: "ag-001",
    texto: "Iniciando diagnostico del servidor. Revisando logs de error.",
    esInterno: false,
    fechaHora: new Date("2024-01-15T09:15:00"),
    createdAt: new Date("2024-01-15T09:15:00"),
    updatedAt: new Date("2024-01-15T09:15:00"),
  },
  {
    id: "com-002",
    ticketId: "tk-001",
    usuarioId: "ag-001",
    texto: "Problema identificado: memoria del servidor al 100%. Reiniciando servicios.",
    esInterno: true,
    fechaHora: new Date("2024-01-15T09:45:00"),
    createdAt: new Date("2024-01-15T09:45:00"),
    updatedAt: new Date("2024-01-15T09:45:00"),
  },
  {
    id: "com-003",
    ticketId: "tk-003",
    usuarioId: "ag-005",
    texto: "Necesitamos acceso a la impresora para revisar la configuracion. Por favor confirmar disponibilidad.",
    esInterno: false,
    fechaHora: new Date("2024-01-14T14:20:00"),
    createdAt: new Date("2024-01-14T14:20:00"),
    updatedAt: new Date("2024-01-14T14:20:00"),
  },
]

// Ordenes de Servicio
export const ordenesServicio: HDOrdenServicio[] = [
  {
    id: "os-001",
    numero: "OS-2024-0001",
    ticketId: "tk-002",
    clienteId: "hdc-002",
    contactoId: "cont-002",
    servicioId: "srv-003",
    tecnicoAsignadoId: "ag-004",
    estado: "programada",
    prioridad: "media",
    fechaProgramada: new Date("2024-01-16T10:00:00"),
    descripcionTrabajo: "Crear usuario Juan Perez en dominio y configurar accesos",
    createdAt: new Date("2024-01-15T11:00:00"),
    updatedAt: new Date("2024-01-15T11:00:00"),
  },
  {
    id: "os-002",
    numero: "OS-2024-0002",
    clienteId: "hdc-001",
    servicioId: "srv-005",
    tecnicoAsignadoId: "ag-003",
    estado: "completada",
    prioridad: "baja",
    fechaProgramada: new Date("2024-01-10T09:00:00"),
    fechaInicio: new Date("2024-01-10T09:15:00"),
    fechaFin: new Date("2024-01-10T11:00:00"),
    duracionReal: 105,
    direccionServicio: "Av. Corrientes 1234, Piso 5",
    descripcionTrabajo: "Mantenimiento preventivo de servidores",
    observaciones: "Se realizo limpieza de filtros y revision de temperaturas",
    calificacion: 5,
    comentarioCliente: "Excelente servicio, muy profesional",
    createdAt: new Date("2024-01-08T10:00:00"),
    updatedAt: new Date("2024-01-10T11:00:00"),
  },
  {
    id: "os-003",
    numero: "OS-2024-0003",
    clienteId: "hdc-004",
    servicioId: "srv-004",
    tecnicoAsignadoId: "ag-003",
    estado: "en_proceso",
    prioridad: "alta",
    fechaProgramada: new Date("2024-01-15T14:00:00"),
    fechaInicio: new Date("2024-01-15T14:10:00"),
    direccionServicio: "Av. Las Heras 2500, Area de Administracion",
    descripcionTrabajo: "Instalacion de red WiFi en nuevo pabellon",
    createdAt: new Date("2024-01-12T09:00:00"),
    updatedAt: new Date("2024-01-15T14:10:00"),
  },
]

// Contratos
export const contratos: HDContrato[] = [
  {
    id: "ctr-001",
    numero: "CTR-2024-001",
    clienteId: "hdc-001",
    nombre: "Soporte Premium 24/7",
    tipo: "soporte",
    estado: "activo",
    fechaInicio: new Date("2024-01-01"),
    fechaFin: new Date("2025-12-31"),
    valorMensual: 5000,
    serviciosIncluidos: ["srv-001", "srv-002", "srv-005"],
    horasIncluidas: 40,
    horasConsumidas: 12,
    slaId: "sla-001",
    renovacionAutomatica: true,
    condiciones: "Incluye soporte 24/7, visitas ilimitadas y mantenimiento preventivo mensual",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "ctr-002",
    numero: "CTR-2024-002",
    clienteId: "hdc-002",
    nombre: "Mantenimiento Anual",
    tipo: "mantenimiento",
    estado: "activo",
    fechaInicio: new Date("2024-03-01"),
    fechaFin: new Date("2025-02-28"),
    valorMensual: 1500,
    serviciosIncluidos: ["srv-001", "srv-005"],
    horasIncluidas: 10,
    horasConsumidas: 4,
    slaId: "sla-002",
    renovacionAutomatica: false,
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
  },
  {
    id: "ctr-003",
    numero: "CTR-2024-003",
    clienteId: "hdc-004",
    nombre: "Soporte Hospitalario",
    tipo: "soporte",
    estado: "activo",
    fechaInicio: new Date("2024-02-01"),
    fechaFin: new Date("2026-01-31"),
    valorMensual: 8000,
    serviciosIncluidos: ["srv-001", "srv-002", "srv-003", "srv-005", "srv-006"],
    horasIncluidas: 80,
    horasConsumidas: 35,
    slaId: "sla-001",
    renovacionAutomatica: true,
    condiciones: "Soporte critico para sistemas de salud, atencion prioritaria",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
]

// Facturas de Servicio
export const facturasServicio: HDFacturaServicio[] = [
  {
    id: "fac-001",
    numero: "FAC-2024-0001",
    clienteId: "hdc-001",
    ordenesServicioIds: ["os-002"],
    fecha: new Date("2024-01-10"),
    fechaVencimiento: new Date("2024-02-10"),
    estado: "pagada",
    items: [
      {
        id: "item-001",
        descripcion: "Mantenimiento Preventivo - Servidores",
        servicioId: "srv-005",
        ordenServicioId: "os-002",
        cantidad: 1,
        precioUnitario: 40,
        descuento: 0,
        impuesto: 8.4,
        total: 48.4,
      },
    ],
    subtotal: 40,
    descuento: 0,
    impuestos: 8.4,
    total: 48.4,
    moneda: "USD",
    metodoPago: "transferencia",
    referenciaPago: "TRF-20240115-001",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "fac-002",
    numero: "FAC-2024-0002",
    clienteId: "hdc-001",
    ordenesServicioIds: [],
    fecha: new Date("2024-01-01"),
    fechaVencimiento: new Date("2024-01-31"),
    estado: "pagada",
    items: [
      {
        id: "item-002",
        descripcion: "Contrato Soporte Premium 24/7 - Enero 2024",
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
    metodoPago: "transferencia",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-05"),
  },
]

// Articulos Base de Conocimientos
export const articulos: HDArticulo[] = [
  {
    id: "art-001",
    titulo: "Como reiniciar el servicio de impresion en Windows",
    contenido: `# Reiniciar servicio de impresion

## Pasos a seguir:

1. Presionar Win + R para abrir Ejecutar
2. Escribir "services.msc" y presionar Enter
3. Buscar "Cola de impresion" o "Print Spooler"
4. Click derecho > Reiniciar

## Metodo alternativo via CMD:

\`\`\`
net stop spooler
net start spooler
\`\`\`

Si el problema persiste, contactar a soporte tecnico.`,
    categoriaId: "cat-001",
    tags: ["impresora", "windows", "spooler"],
    estado: "publicado",
    vistas: 245,
    utilidad: 42,
    autorId: "ag-005",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "art-002",
    titulo: "Configurar correo en Outlook",
    contenido: `# Configuracion de correo en Microsoft Outlook

## Requisitos previos:
- Direccion de email
- Contrasena
- Servidor IMAP/POP y SMTP

## Pasos:

1. Abrir Outlook
2. Ir a Archivo > Agregar cuenta
3. Ingresar email y seleccionar "Configuracion manual"
4. Completar datos del servidor:
   - IMAP: mail.servidor.com (puerto 993)
   - SMTP: mail.servidor.com (puerto 587)
5. Finalizar configuracion

Para problemas de conexion, verificar firewall y antivirus.`,
    categoriaId: "cat-001",
    tags: ["email", "outlook", "configuracion"],
    estado: "publicado",
    vistas: 189,
    utilidad: 35,
    autorId: "ag-004",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-05"),
  },
  {
    id: "art-003",
    titulo: "Problemas de conexion a VPN",
    contenido: `# Solucion de problemas de VPN

## Verificaciones iniciales:

1. Comprobar conexion a internet
2. Verificar credenciales de VPN
3. Reiniciar cliente VPN

## Soluciones comunes:

### Error de autenticacion:
- Verificar usuario y contrasena
- Comprobar que la cuenta no este bloqueada

### Conexion lenta:
- Probar otro servidor VPN
- Verificar ancho de banda disponible

### No conecta:
- Verificar firewall corporativo
- Reinstalar cliente VPN`,
    categoriaId: "cat-001",
    tags: ["vpn", "conexion", "remoto"],
    estado: "publicado",
    vistas: 156,
    utilidad: 28,
    autorId: "ag-001",
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-08"),
  },
]

// Helpers para obtener datos relacionados
export function getClienteById(id: string): HDCliente | undefined {
  return clientesHD.find((c) => c.id === id)
}

export function getAgenteById(id: string): HDAgente | undefined {
  return agentes.find((a) => a.id === id)
}

export function getDepartamentoById(id: string): HDDepartamento | undefined {
  return departamentos.find((d) => d.id === id)
}

export function getSLAById(id: string): HDSLA | undefined {
  return slas.find((s) => s.id === id)
}

export function getServicioById(id: string): HDServicio | undefined {
  return servicios.find((s) => s.id === id)
}

export function getTicketsByClienteId(clienteId: string): HDTicket[] {
  return tickets.filter((t) => t.clienteId === clienteId)
}

export function getOrdenesServicioByClienteId(clienteId: string): HDOrdenServicio[] {
  return ordenesServicio.filter((os) => os.clienteId === clienteId)
}

export function getContratosByClienteId(clienteId: string): HDContrato[] {
  return contratos.filter((c) => c.clienteId === clienteId)
}

// Estadisticas
export function getTicketStats() {
  const total = tickets.length
  const nuevos = tickets.filter((t) => t.estado === "nuevo").length
  const enProgreso = tickets.filter((t) => t.estado === "en_progreso" || t.estado === "asignado").length
  const resueltos = tickets.filter((t) => t.estado === "resuelto" || t.estado === "cerrado").length
  const esperandoCliente = tickets.filter((t) => t.estado === "esperando_cliente").length
  const cumpleSLA = tickets.filter((t) => t.cumpleSLA).length
  const fueraSLA = total - cumpleSLA

  return {
    total,
    nuevos,
    enProgreso,
    resueltos,
    esperandoCliente,
    cumpleSLA,
    fueraSLA,
    tasaCumplimientoSLA: total > 0 ? ((cumpleSLA / total) * 100).toFixed(1) : 0,
  }
}

export function getOrdenStats() {
  const total = ordenesServicio.length
  const pendientes = ordenesServicio.filter((o) => o.estado === "pendiente" || o.estado === "programada").length
  const enProceso = ordenesServicio.filter((o) => o.estado === "en_proceso").length
  const completadas = ordenesServicio.filter((o) => o.estado === "completada").length

  return { total, pendientes, enProceso, completadas }
}
