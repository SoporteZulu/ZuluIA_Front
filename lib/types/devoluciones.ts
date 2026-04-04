import type { ComprobanteDetalle } from "@/lib/types/comprobantes"

export const MOTIVOS_DEVOLUCION = [
  { value: 1, label: "Producto defectuoso" },
  { value: 2, label: "Error de entrega" },
  { value: 3, label: "Desistimiento del cliente" },
  { value: 4, label: "Producto vencido" },
  { value: 5, label: "Diferencia de precio" },
  { value: 6, label: "Daño en tránsito" },
  { value: 7, label: "Garantía" },
  { value: 8, label: "Sobrante" },
  { value: 9, label: "Cambio" },
  { value: 10, label: "Ajuste de inventario" },
  { value: 99, label: "Otro" },
] as const

export interface RegistrarDevolucionVentaDto {
  sucursalId: number
  puntoFacturacionId: number | null
  tipoComprobanteId: number
  fecha: string
  fechaVencimiento?: string | null
  terceroId: number
  monedaId: number
  cotizacion: number
  percepciones: number
  observacion?: string | null
  comprobanteOrigenId?: number | null
  items: Array<{
    itemId: number
    descripcion?: string
    cantidad: number
    precioUnitario: number
    descuento?: number
    alicuotaIvaId: number
  }>
  reingresaStock?: boolean
  acreditaCuentaCorriente?: boolean
  motivoDevolucion?: number
  observacionDevolucion?: string | null
  autorizadorDevolucionId?: number | null
}

export interface VentaDevolucionLiveRecord {
  detalle: ComprobanteDetalle
  cliente: string
  sucursal: string
  deposito: string
}
