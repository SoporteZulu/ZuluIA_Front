import type { DescuentoComercial } from "@/lib/types/descuentos-comerciales"

export interface LegacyDiscountWindow {
  id: string
  descripcion: string
  desde: string
  hasta: string
}

export interface LegacyDiscountProfile {
  discountId: number
  campania: string
  zona: string
  canal: string
  sucursal: string
  listaEspecial: string
  rubro: string
  subrubro: string
  requiereAprobacion: boolean
  aprobado: boolean
  aprobadoPor: string
  fechaAprobacion: string
  combinable: boolean
  prioridad: number
  reglaBase: string
  observaciones: string
  franjas: LegacyDiscountWindow[]
}

export function buildLegacyDiscountProfile(
  descuento: Pick<DescuentoComercial, "id" | "desde" | "hasta">
): LegacyDiscountProfile {
  return {
    discountId: descuento.id,
    campania: "",
    zona: "",
    canal: "",
    sucursal: "",
    listaEspecial: "",
    rubro: "",
    subrubro: "",
    requiereAprobacion: false,
    aprobado: false,
    aprobadoPor: "",
    fechaAprobacion: "",
    combinable: false,
    prioridad: 50,
    reglaBase: "",
    observaciones: "",
    franjas:
      descuento.desde || descuento.hasta
        ? [
            {
              id: `window-${descuento.id}-1`,
              descripcion: "Vigencia principal",
              desde: descuento.desde ?? "",
              hasta: descuento.hasta ?? "",
            },
          ]
        : [],
  }
}
