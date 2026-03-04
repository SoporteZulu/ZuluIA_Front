import type {
  Supplier,
  SupplierContact,
  SupplierAddress,
  PaymentCondition,
  SupplierCommercialTerms,
  SupplierBankAccount,
  PurchaseOrder,
  PurchaseOrderItem,
  MerchandiseReceipt,
  SupplierEvaluation,
  PurchaseRequest,
  ReplenishmentParams,
  PurchaseDocument,
  SupplierCurrentAccount,
  Warehouse,
  Product,
} from "./compras-types"

// ============================================
// CONDICIONES DE PAGO
// ============================================

export const paymentConditions: PaymentCondition[] = [
  {
    id: "pc-001",
    codigo: "CONTADO",
    descripcion: "Contado",
    tipo: "contado",
    diasPlazo: 0,
    activo: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "pc-002",
    codigo: "30D",
    descripcion: "30 días",
    tipo: "plazo",
    diasPlazo: 30,
    activo: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "pc-003",
    codigo: "60D",
    descripcion: "60 días",
    tipo: "plazo",
    diasPlazo: 60,
    activo: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
]

// ============================================
// ALMACENES
// ============================================

export const warehouses: Warehouse[] = [
  {
    id: "alm-001",
    codigo: "CENTRAL",
    nombre: "Almacén Central",
    direccion: "Av. Industrial 1234, CABA",
    activo: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "alm-002",
    codigo: "SUCURSAL",
    nombre: "Almacén Sucursal Norte",
    direccion: "Calle Norte 567, GBA",
    activo: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
]

// ============================================
// PRODUCTOS
// ============================================

export const products: Product[] = [
  {
    id: "prod-001",
    sku: "MP-001",
    nombre: "Materia Prima A",
    descripcion: "Materia prima estándar tipo A",
    categoria: "Materias Primas",
    uom: "kg",
    stockActual: 150,
    precioUnitario: 1200,
    activo: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "prod-002",
    sku: "INS-001",
    nombre: "Insumo Industrial X",
    descripcion: "Insumo para proceso productivo",
    categoria: "Insumos",
    uom: "unid",
    stockActual: 45,
    precioUnitario: 850,
    activo: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "prod-003",
    sku: "EQ-001",
    nombre: "Componente Electrónico Y",
    descripcion: "Componente para ensamblaje",
    categoria: "Componentes",
    uom: "unid",
    stockActual: 20,
    precioUnitario: 2500,
    activo: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
]

// ============================================
// PROVEEDORES
// ============================================

export const suppliers: Supplier[] = [
  {
    id: "prov-001",
    codigo: "PROV-001",
    razonSocial: "Industrias del Norte S.A.",
    nombreComercial: "INSA",
    cuit: "30-12345678-9",
    condicionImpositiva: "responsable_inscripto",
    categoria: ["Materias Primas", "Insumos"],
    sitioWeb: "https://insa.com.ar",
    estado: "activo",
    proveedorPreferido: true,
    requiereAprobacionEspecial: false,
    rating: 4.5,
    observaciones: "Proveedor confiable con entregas puntuales",
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date("2024-02-01"),
  },
  {
    id: "prov-002",
    codigo: "PROV-002",
    razonSocial: "Distribuidora Tecnológica SRL",
    nombreComercial: "DisTech",
    cuit: "30-98765432-1",
    condicionImpositiva: "responsable_inscripto",
    categoria: ["Componentes", "Equipamiento"],
    sitioWeb: "https://distech.com",
    estado: "activo",
    proveedorPreferido: false,
    requiereAprobacionEspecial: false,
    rating: 4.2,
    createdAt: new Date("2023-08-20"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "prov-003",
    codigo: "PROV-003",
    razonSocial: "Servicios Integrales XYZ S.A.",
    nombreComercial: "Servicios XYZ",
    cuit: "30-55555555-5",
    condicionImpositiva: "responsable_inscripto",
    categoria: ["Servicios"],
    estado: "activo",
    proveedorPreferido: false,
    requiereAprobacionEspecial: true,
    rating: 3.8,
    observaciones: "Requiere aprobación de gerencia para órdenes superiores a $500,000",
    createdAt: new Date("2023-11-10"),
    updatedAt: new Date("2024-01-20"),
  },
]

export const supplierContacts: SupplierContact[] = [
  {
    id: "cont-001",
    proveedorId: "prov-001",
    nombre: "Juan Pérez",
    cargo: "Gerente Comercial",
    email: "jperez@insa.com.ar",
    telefono: "+54 11 4444-5555",
    esPrincipal: true,
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date("2023-06-15"),
  },
  {
    id: "cont-002",
    proveedorId: "prov-001",
    nombre: "María González",
    cargo: "Coordinadora de Ventas",
    email: "mgonzalez@insa.com.ar",
    telefono: "+54 11 4444-5556",
    esPrincipal: false,
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date("2023-06-15"),
  },
  {
    id: "cont-003",
    proveedorId: "prov-002",
    nombre: "Carlos Rodríguez",
    cargo: "Director Comercial",
    email: "crodriguez@distech.com",
    telefono: "+54 11 5555-6666",
    esPrincipal: true,
    createdAt: new Date("2023-08-20"),
    updatedAt: new Date("2023-08-20"),
  },
]

export const supplierAddresses: SupplierAddress[] = [
  {
    id: "dir-001",
    proveedorId: "prov-001",
    tipo: "fiscal",
    calle: "Av. Libertador",
    numero: "1500",
    ciudad: "Buenos Aires",
    provincia: "CABA",
    codigoPostal: "C1112AAA",
    pais: "Argentina",
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date("2023-06-15"),
  },
  {
    id: "dir-002",
    proveedorId: "prov-001",
    tipo: "entrega",
    calle: "Av. del Trabajo",
    numero: "3200",
    piso: "Depósito",
    ciudad: "Buenos Aires",
    provincia: "CABA",
    codigoPostal: "C1424CHN",
    pais: "Argentina",
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date("2023-06-15"),
  },
  {
    id: "dir-003",
    proveedorId: "prov-002",
    tipo: "fiscal",
    calle: "Calle Tecnología",
    numero: "850",
    ciudad: "Córdoba",
    provincia: "Córdoba",
    codigoPostal: "X5000",
    pais: "Argentina",
    createdAt: new Date("2023-08-20"),
    updatedAt: new Date("2023-08-20"),
  },
]

export const supplierCommercialTerms: SupplierCommercialTerms[] = [
  {
    id: "term-001",
    proveedorId: "prov-001",
    condicionPagoId: "pc-002",
    tiempoEntregaDias: 7,
    montoMinimo: 50000,
    divisa: "ARS",
    metodoEnvioPreferido: "Transporte propio",
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date("2024-01-10"),
  },
  {
    id: "term-002",
    proveedorId: "prov-002",
    condicionPagoId: "pc-003",
    tiempoEntregaDias: 10,
    montoMinimo: 100000,
    divisa: "ARS",
    incoterms: "EXW",
    metodoEnvioPreferido: "Correo privado",
    createdAt: new Date("2023-08-20"),
    updatedAt: new Date("2024-01-15"),
  },
]

export const supplierBankAccounts: SupplierBankAccount[] = [
  {
    id: "bank-001",
    proveedorId: "prov-001",
    banco: "Banco Nación",
    tipoCuenta: "cuenta_corriente",
    numeroCuenta: "123456789",
    cbu: "0110123456789012345678",
    titular: "Industrias del Norte S.A.",
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date("2023-06-15"),
  },
  {
    id: "bank-002",
    proveedorId: "prov-002",
    banco: "Banco Galicia",
    tipoCuenta: "cuenta_corriente",
    numeroCuenta: "987654321",
    cbu: "0070987654321098765432",
    titular: "Distribuidora Tecnológica SRL",
    createdAt: new Date("2023-08-20"),
    updatedAt: new Date("2023-08-20"),
  },
]

// ============================================
// ÓRDENES DE COMPRA
// ============================================

const purchaseOrderItems: PurchaseOrderItem[] = [
  {
    id: "item-oc-001",
    ordenCompraId: "oc-001",
    productoId: "prod-001",
    codigoProveedor: "INSA-MP-A",
    descripcion: "Materia Prima A",
    cantidad: 100,
    cantidadRecibida: 100,
    cantidadRechazada: 0,
    uom: "kg",
    precioUnitario: 1200,
    descuentoPorcentaje: 5,
    subtotal: 114000,
  },
  {
    id: "item-oc-002",
    ordenCompraId: "oc-001",
    productoId: "prod-002",
    codigoProveedor: "INSA-INS-X",
    descripcion: "Insumo Industrial X",
    cantidad: 50,
    cantidadRecibida: 50,
    cantidadRechazada: 0,
    uom: "unid",
    precioUnitario: 850,
    descuentoPorcentaje: 0,
    subtotal: 42500,
  },
  {
    id: "item-oc-003",
    ordenCompraId: "oc-002",
    productoId: "prod-003",
    codigoProveedor: "DT-COMP-Y",
    descripcion: "Componente Electrónico Y",
    cantidad: 30,
    cantidadRecibida: 0,
    cantidadRechazada: 0,
    uom: "unid",
    precioUnitario: 2500,
    descuentoPorcentaje: 10,
    subtotal: 67500,
  },
]

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: "oc-001",
    codigo: "OC-2024-001",
    proveedorId: "prov-001",
    fechaEmision: new Date("2024-01-15"),
    fechaEntregaEsperada: new Date("2024-01-22"),
    almacenId: "alm-001",
    condicionPagoId: "pc-002",
    divisa: "ARS",
    estado: "recibida_total",
    estadoAprobacion: "aprobada",
    prioridad: "normal",
    referencia: "COT-INSA-2024-01",
    subtotal: 156500,
    descuento: 5700,
    impuestos: 31668,
    total: 182468,
    items: purchaseOrderItems.filter(i => i.ordenCompraId === "oc-001"),
    metodoEnvio: "Transporte propio del proveedor",
    direccionEntrega: "Almacén Central - Av. Industrial 1234, CABA",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-25"),
  },
  {
    id: "oc-002",
    codigo: "OC-2024-002",
    proveedorId: "prov-002",
    fechaEmision: new Date("2024-02-01"),
    fechaEntregaEsperada: new Date("2024-02-15"),
    almacenId: "alm-001",
    condicionPagoId: "pc-003",
    divisa: "ARS",
    estado: "confirmada",
    estadoAprobacion: "aprobada",
    prioridad: "urgente",
    subtotal: 75000,
    descuento: 7500,
    impuestos: 14175,
    total: 81675,
    items: purchaseOrderItems.filter(i => i.ordenCompraId === "oc-002"),
    notasEspeciales: "Entrega urgente - Coordinada para el 15/02",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-05"),
  },
  {
    id: "oc-003",
    codigo: "OC-2024-003",
    proveedorId: "prov-001",
    fechaEmision: new Date("2024-02-05"),
    fechaEntregaEsperada: new Date("2024-02-20"),
    almacenId: "alm-002",
    condicionPagoId: "pc-002",
    divisa: "ARS",
    estado: "borrador",
    estadoAprobacion: "pendiente",
    prioridad: "normal",
    subtotal: 250000,
    descuento: 0,
    impuestos: 52500,
    total: 302500,
    items: [],
    createdAt: new Date("2024-02-05"),
    updatedAt: new Date("2024-02-05"),
  },
]

// ============================================
// RECEPCIONES
// ============================================

export const merchandiseReceipts: MerchandiseReceipt[] = [
  {
    id: "rec-001",
    codigo: "REC-2024-001",
    ordenCompraId: "oc-001",
    fechaRecepcion: new Date("2024-01-23"),
    almacenId: "alm-001",
    usuarioReceptorId: "user-001",
    estado: "completa",
    observaciones: "Recepción conforme sin observaciones",
    items: [
      {
        id: "item-rec-001",
        ordenRecepcionId: "rec-001",
        itemOcId: "item-oc-001",
        productoId: "prod-001",
        cantidadRecibida: 100,
        cantidadRechazada: 0,
        conforme: true,
      },
      {
        id: "item-rec-002",
        ordenRecepcionId: "rec-001",
        itemOcId: "item-oc-002",
        productoId: "prod-002",
        cantidadRecibida: 50,
        cantidadRechazada: 0,
        conforme: true,
      },
    ],
    createdAt: new Date("2024-01-23"),
    updatedAt: new Date("2024-01-23"),
  },
]

// ============================================
// EVALUACIONES
// ============================================

export const supplierEvaluations: SupplierEvaluation[] = [
  {
    id: "eval-001",
    proveedorId: "prov-001",
    ordenCompraId: "oc-001",
    fecha: new Date("2024-01-25"),
    puntualidadScore: 5,
    conformidadScore: 5,
    cumplimientoScore: 5,
    comentarioCualitativo: "Excelente desempeño en todos los aspectos",
    usuarioEvaluadorId: "user-001",
    createdAt: new Date("2024-01-25"),
    updatedAt: new Date("2024-01-25"),
  },
]

// ============================================
// SOLICITUDES DE COMPRA
// ============================================

export const purchaseRequests: PurchaseRequest[] = [
  {
    id: "req-001",
    codigo: "REQ-2024-001",
    origen: "automatico",
    estado: "pendiente",
    fechaCreacion: new Date("2024-02-06"),
    proveedorSugeridoId: "prov-001",
    usuarioSolicitanteId: "system",
    motivo: "Reabastecimiento automático - Stock bajo punto de reorden",
    prioridad: "normal",
    items: [
      {
        id: "item-req-001",
        solicitudId: "req-001",
        productoId: "prod-003",
        cantidadSolicitada: 50,
        cantidadAprobada: 0,
        motivo: "Stock actual: 20, Punto de reorden: 30",
      },
    ],
    createdAt: new Date("2024-02-06"),
    updatedAt: new Date("2024-02-06"),
  },
]

// ============================================
// ESTADÍSTICAS PARA DASHBOARD
// ============================================

export const comprasKPIs = {
  ordenesActivas: 8,
  recepcionesPendientes: 3,
  valorComprasMes: 1245000,
  proximosVencimientos: 2,
  solicitudesPendientes: 1,
  ratingPromedioProveedores: 4.2,
  ordenesRetrasadas: 1,
  proveedoresBajoRating: 0,
  productosStockBajo: 5,
}

export const comprasPorMes = [
  { mes: "Ago", monto: 850000 },
  { mes: "Sep", monto: 920000 },
  { mes: "Oct", monto: 1100000 },
  { mes: "Nov", monto: 980000 },
  { mes: "Dic", monto: 1050000 },
  { mes: "Ene", monto: 1150000 },
  { mes: "Feb", monto: 1245000 },
]

export const comprasPorCategoria = [
  { categoria: "Materias Primas", valor: 45, color: "#6366f1" },
  { categoria: "Insumos", valor: 30, color: "#10b981" },
  { categoria: "Componentes", valor: 15, color: "#f59e0b" },
  { categoria: "Servicios", valor: 10, color: "#8b5cf6" },
]

// ============================================
// FACTURAS DE COMPRA
// ============================================

export const purchaseInvoices: PurchaseDocument[] = [
  {
    id: "inv-001",
    tipo: "factura",
    numero: "00001-00012345",
    puntoVenta: "00001",
    letra: "A",
    fecha: new Date("2024-01-20"),
    fechaVencimiento: new Date("2024-02-20"),
    proveedorId: "prov-001",
    ordenCompraId: "oc-001",
    recepcionId: "rec-001",
    estado: "aprobada",
    divisa: "ARS",
    tipoCambio: 1,
    items: [
      {
        id: "inv-item-001",
        productoId: "prod-001",
        descripcion: "Materia Prima A - Alta calidad",
        cantidad: 100,
        uom: "kg",
        precioUnitario: 5000,
        descuentoPorcentaje: 0,
        alicuotaIva: 21,
        subtotal: 500000,
        iva: 105000,
        total: 605000,
      },
      {
        id: "inv-item-002",
        productoId: "prod-002",
        descripcion: "Componente Electrónico X",
        cantidad: 50,
        uom: "unid",
        precioUnitario: 3000,
        descuentoPorcentaje: 5,
        alicuotaIva: 21,
        subtotal: 142500,
        iva: 29925,
        total: 172425,
      },
    ],
    subtotal: 642500,
    descuento: 7500,
    iva21: 134925,
    iva105: 0,
    iva27: 0,
    otrosImpuestos: 0,
    total: 777425,
    observaciones: "Factura según OC-001",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "inv-002",
    tipo: "factura",
    numero: "00002-00005678",
    puntoVenta: "00002",
    letra: "B",
    fecha: new Date("2024-02-01"),
    fechaVencimiento: new Date("2024-03-03"),
    proveedorId: "prov-002",
    estado: "pendiente",
    divisa: "USD",
    tipoCambio: 850,
    items: [
      {
        id: "inv-item-003",
        descripcion: "Servicio de mantenimiento",
        cantidad: 1,
        uom: "mes",
        precioUnitario: 500,
        descuentoPorcentaje: 0,
        alicuotaIva: 21,
        subtotal: 500,
        iva: 105,
        total: 605,
      },
    ],
    subtotal: 500,
    descuento: 0,
    iva21: 105,
    iva105: 0,
    iva27: 0,
    otrosImpuestos: 0,
    total: 605,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
  {
    id: "inv-003",
    tipo: "factura",
    numero: "00001-00098765",
    puntoVenta: "00001",
    letra: "A",
    fecha: new Date("2024-02-05"),
    fechaVencimiento: new Date("2024-02-15"),
    proveedorId: "prov-001",
    estado: "borrador",
    divisa: "ARS",
    tipoCambio: 1,
    items: [
      {
        id: "inv-item-004",
        productoId: "prod-003",
        descripcion: "Insumo Industrial Z",
        cantidad: 200,
        uom: "lts",
        precioUnitario: 1200,
        descuentoPorcentaje: 10,
        alicuotaIva: 21,
        subtotal: 216000,
        iva: 45360,
        total: 261360,
      },
    ],
    subtotal: 216000,
    descuento: 24000,
    iva21: 45360,
    iva105: 0,
    iva27: 0,
    otrosImpuestos: 0,
    total: 261360,
    observaciones: "Pendiente de aprobación",
    createdAt: new Date("2024-02-05"),
    updatedAt: new Date("2024-02-05"),
  },
]

export const topProveedores = [
  { proveedor: "Industrias del Norte S.A.", volumen: 3250000, ordenes: 12 },
  { proveedor: "Distribuidora Tecnológica SRL", volumen: 1890000, ordenes: 8 },
  { proveedor: "Servicios Integrales XYZ S.A.", volumen: 1120000, ordenes: 5 },
]
