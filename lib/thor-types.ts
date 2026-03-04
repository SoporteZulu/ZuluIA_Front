// Base Entity
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// Productos para THOR
export interface ThorProduct extends BaseEntity {
  sku: string
  nombre: string
  categoria: string
  marca: string
  costoProm: number
  precioVenta: number
  stock: number
  unidadMedida: string
  proveedor: string
  margenPorcentaje: number
  margenDolar: number
  rotacionDias: number
  ventasUltimos3Meses: number
  ventasUltimos6Meses: number
  ventasUltimos12Meses: number
}

// Recomendaciones IA
export interface AIRecommendation extends BaseEntity {
  productId: string
  producto: ThorProduct
  puntuacionConfianza: number // 0-100
  razon: string
  tendencia: 'al_alza' | 'estable' | 'baja'
  impactoEstimado: number
  sugerenciaAccion: 'reabastecer' | 'promocionar' | 'evaluar'
  correlacionados: string[] // SKUs de productos correlacionados
}

// Vendedor
export interface Vendedor extends BaseEntity {
  nombre: string
  apellido: string
  email: string
  telefono: string
  foto?: string
  estado: 'activo' | 'inactivo'
  fechaAlta: Date
}

// Métrica Vendedor
export interface VendedorMetrica {
  vendedorId: string
  vendedor: Vendedor
  periodo: Date // mes/año
  totalVendido: number
  numeroTransacciones: number
  ticketPromedio: number
  tasaConversion: number
  productosTopVendidos: Array<{
    sku: string
    nombre: string
    unidades: number
    monto: number
  }>
  cambioVsPeriodoAnterior: number // porcentaje
}

// Cajero
export interface Cajero extends BaseEntity {
  nombre: string
  apellido: string
  numCaja: number
  email: string
  foto?: string
  estado: 'activo' | 'inactivo' | 'ausente'
}

// Métrica Cajero
export interface CajeroMetrica {
  cajeroId: string
  cajero: Cajero
  fecha: Date
  hora?: string
  tiempoPromedioAtension: number // segundos
  numeroClientesAtendidos: number
  totalFacturado: number
  tasaErrores: number // porcentaje
  satisfaccionCliente?: number // 0-5
}

// Competidor
export interface Competidor extends BaseEntity {
  nombre: string
  sitioWeb?: string
  telefono?: string
}

// Precio Competidor
export interface PrecioCompetidor extends BaseEntity {
  competidorId: string
  productoSku: string
  productoNombre: string
  nuestroPrecio: number
  precioCompetidor: number
  diferenciaProcentaje: number
  ultimaActualizacion: Date
  fuente: 'web_scraping' | 'ocr_imagen' | 'manual'
}

// Análisis Competencia
export interface AnalisisCompetencia {
  productId: string
  producto: ThorProduct
  preciosCompetencia: PrecioCompetidor[]
  precioPromedio: number
  posicionMercado: 'mas_barato' | 'competitivo' | 'mas_caro'
  oportunidadDetectada: boolean
  sugerenciaPrecio?: number
  impactoEstimado: string
}

// Predicción IA
export interface Prediccion {
  periodo: Date
  ventasPredicho: number
  intervaloConfianzaBajo: number
  intervaloConfianzaAlto: number
  confianza: number // 0-100
  factoresInfluyentes: string[]
}

// KPI
export interface KPI {
  nombre: string
  valor: number
  unidad: string
  cambioMesAnterior: number
  cambioAnoAnterior: number
  metaProyectada?: number
  tendencia: 'al_alza' | 'estable' | 'baja'
}

// Histórico Venta
export interface HistoricoVenta {
  fecha: Date
  ventas: number
  transacciones: number
  ticketPromedio: number
  productosMasVendidos: string[]
}

// Simulación Escenario
export interface SimulacionEscenario {
  nombre: string
  descripcion: string
  cambiaPrecios: number // porcentaje
  cambioTrafico: number // porcentaje
  nuevosProductos: number
  ventasProyectadas: number
  margenProyectado: number
  impactoNeto: number
}
